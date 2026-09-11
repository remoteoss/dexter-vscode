import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { constants, promises as fs } from 'fs';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execFileAsync = promisify(execFile);
const releasesUrl = 'https://api.github.com/repos/remoteoss/dexter/releases/latest';
const installationUrl = 'https://github.com/remoteoss/dexter#quick-start';
const updateCheckInterval = 24 * 60 * 60 * 1000;
const lastUpdateCheckKey = 'dexter.lastUpdateCheck';

interface ReleaseAsset {
	name: string;
	browser_download_url: string;
}

interface Release {
	tag_name: string;
	assets: ReleaseAsset[];
}

interface PlatformRelease {
	archiveName: string;
	archiveDirectory: string;
}

export interface ResolvedBinary {
	path: string;
	source: 'configured' | 'path' | 'managed';
}

export class BinaryInstallError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BinaryInstallError';
	}
}

export async function resolveDexterBinary(
	context: vscode.ExtensionContext,
	configuredBinary: string,
	autoInstall: boolean,
	output: vscode.OutputChannel,
): Promise<ResolvedBinary> {
	if (configuredBinary !== 'dexter') {
		const configured = await resolveConfiguredBinary(configuredBinary);
		if (!configured) {
			throw new BinaryInstallError(
				`the configured Dexter binary was not found or is not executable: ${configuredBinary}. `
					+ 'Correct the "dexter.binary" setting, or set it back to "dexter" to let the '
					+ 'extension find or install one.',
			);
		}
		output.appendLine(`Using configured Dexter binary: ${configured}`);
		return { path: configured, source: 'configured' };
	}

	const installedBinary = await findOnPath('dexter');
	if (installedBinary) {
		output.appendLine(`Using Dexter from PATH: ${installedBinary}`);
		return { path: installedBinary, source: 'path' };
	}

	const managedBinary = path.join(context.globalStorageUri.fsPath, 'bin', executableName());
	if (await isExecutableFile(managedBinary)) {
		output.appendLine(`Using extension-managed Dexter: ${managedBinary}`);
		return { path: managedBinary, source: 'managed' };
	}

	if (!autoInstall) {
		throw new BinaryInstallError(
			'Dexter was not found on PATH and automatic installation is disabled.',
		);
	}

	const installed = await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Installing Dexter language server…',
			cancellable: false,
		},
		() => installLatestRelease(context, managedBinary, output),
	);
	await context.globalState.update(lastUpdateCheckKey, Date.now());

	vscode.window.showInformationMessage(
		`Dexter ${installed.version} was installed for this extension.`,
	);
	return { path: installed.path, source: 'managed' };
}

export async function showInstallError(error: unknown): Promise<void> {
	const detail = error instanceof Error ? error.message : String(error);
	const action = await vscode.window.showErrorMessage(
		`Dexter setup failed: ${detail}`,
		'Install manually',
	);
	if (action === 'Install manually') {
		await vscode.env.openExternal(vscode.Uri.parse(installationUrl));
	}
}

export async function updateManagedDexter(
	context: vscode.ExtensionContext,
	binary: ResolvedBinary,
	autoUpdate: boolean,
	output: vscode.OutputChannel,
): Promise<void> {
	if (binary.source !== 'managed' || !autoUpdate) {
		return;
	}

	const lastCheck = context.globalState.get<number>(lastUpdateCheckKey, 0);
	if (Date.now() - lastCheck < updateCheckInterval) {
		return;
	}
	await context.globalState.update(lastUpdateCheckKey, Date.now());

	try {
		const [{ stdout }, release] = await Promise.all([
			execFileAsync(binary.path, ['version']),
			fetchLatestRelease(),
		]);
		if (normalizeVersion(stdout) === normalizeVersion(release.tag_name)) {
			output.appendLine(`Extension-managed Dexter ${release.tag_name} is up to date.`);
			return;
		}

		await installRelease(context, binary.path, output, release);
		vscode.window.showInformationMessage(
			`Dexter was updated to ${release.tag_name}. The update will be used after the language server restarts.`,
			'Restart now',
		).then((action) => {
			if (action === 'Restart now') {
				void vscode.commands.executeCommand('dexter.restart');
			}
		});
	} catch (error) {
		output.appendLine(
			`Could not check for a Dexter update: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export function normalizeVersion(version: string): string {
	return version.trim().replace(/^v/, '');
}

async function installLatestRelease(
	context: vscode.ExtensionContext,
	managedBinary: string,
	output: vscode.OutputChannel,
): Promise<{ path: string; version: string }> {
	const platform = platformRelease();
	if (!platform) {
		throw new BinaryInstallError(
			`automatic installation is not available for ${process.platform}/${process.arch}`,
		);
	}

	output.appendLine(`Fetching the latest Dexter release for ${process.platform}/${process.arch}…`);
	const release = await fetchLatestRelease();
	return installRelease(context, managedBinary, output, release);
}

async function installRelease(
	context: vscode.ExtensionContext,
	managedBinary: string,
	output: vscode.OutputChannel,
	release: Release,
): Promise<{ path: string; version: string }> {
	const platform = platformRelease();
	if (!platform) {
		throw new BinaryInstallError(
			`automatic installation is not available for ${process.platform}/${process.arch}`,
		);
	}
	const archive = release.assets.find((asset) => asset.name === platform.archiveName);
	const checksums = release.assets.find((asset) => asset.name === 'checksums.txt');
	if (!archive || !checksums) {
		throw new BinaryInstallError(
			`Dexter ${release.tag_name} does not include an asset for ${process.platform}/${process.arch}`,
		);
	}

	const [archiveContents, checksumContents] = await Promise.all([
		request(archive.browser_download_url),
		request(checksums.browser_download_url),
	]);
	verifyChecksum(archiveContents, checksumContents.toString('utf8'), platform.archiveName);

	await fs.mkdir(context.globalStorageUri.fsPath, { recursive: true });
	const temporaryDirectory = await fs.mkdtemp(
		path.join(context.globalStorageUri.fsPath, 'install-'),
	);
	try {
		const archivePath = path.join(temporaryDirectory, platform.archiveName);
		const extractPath = path.join(temporaryDirectory, 'extract');
		await fs.writeFile(archivePath, archiveContents, { mode: 0o600 });
		await fs.mkdir(extractPath);
		await execFileAsync('tar', [
			'-xzf',
			archivePath,
			'-C',
			extractPath,
			`${platform.archiveDirectory}/dexter`,
		]);

		const extractedBinary = path.join(extractPath, platform.archiveDirectory, 'dexter');
		await fs.chmod(extractedBinary, 0o755);
		await fs.mkdir(path.dirname(managedBinary), { recursive: true });
		await fs.rename(extractedBinary, managedBinary);
	} finally {
		await fs.rm(temporaryDirectory, { recursive: true, force: true });
	}

	output.appendLine(`Installed Dexter ${release.tag_name}: ${managedBinary}`);
	return { path: managedBinary, version: release.tag_name };
}

async function fetchLatestRelease(): Promise<Release> {
	const release = JSON.parse((await request(releasesUrl)).toString('utf8')) as Partial<Release>;
	if (!release.tag_name || !Array.isArray(release.assets)) {
		throw new BinaryInstallError('GitHub returned invalid release metadata');
	}
	return release as Release;
}

export function platformRelease(
	platform: string = process.platform,
	arch: string = process.arch,
): PlatformRelease | undefined {
	const names: Record<string, string> = {
		'darwin-arm64': 'dexter_Darwin_arm64',
		'linux-arm64': 'dexter_Linux_arm64',
		'linux-x64': 'dexter_Linux_x86_64',
	};
	const archiveDirectory = names[`${platform}-${arch}`];
	return archiveDirectory
		? { archiveName: `${archiveDirectory}.tar.gz`, archiveDirectory }
		: undefined;
}

export function verifyChecksum(contents: Buffer, checksums: string, archiveName: string): void {
	const expected = checksums
		.split(/\r?\n/)
		.map((line) => line.trim().split(/\s+/))
		.find((parts) => parts.length >= 2 && parts[1].replace(/^\*/, '') === archiveName)?.[0];
	if (!expected) {
		throw new BinaryInstallError(`no checksum was published for ${archiveName}`);
	}

	const actual = createHash('sha256').update(contents).digest('hex');
	if (actual.toLowerCase() !== expected.toLowerCase()) {
		throw new BinaryInstallError(`checksum verification failed for ${archiveName}`);
	}
}

// A configured value is either a path or a bare command name to look up on PATH.
// Paths get `~` expanded, and relative ones resolve against the workspace folder,
// because the extension host's working directory is not a useful anchor.
async function resolveConfiguredBinary(configured: string): Promise<string | undefined> {
	const trimmed = configured.trim();
	if (!trimmed) {
		return undefined;
	}

	if (!trimmed.includes('/') && !(process.platform === 'win32' && trimmed.includes('\\'))) {
		return findOnPath(trimmed);
	}

	let candidate = trimmed;
	if (candidate === '~' || candidate.startsWith('~/')) {
		candidate = path.join(os.homedir(), candidate.slice(1));
	}
	if (!path.isAbsolute(candidate)) {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		candidate = workspaceFolder
			? path.join(workspaceFolder.uri.fsPath, candidate)
			: path.resolve(candidate);
	}

	return (await isExecutableFile(candidate)) ? candidate : undefined;
}

async function findOnPath(command: string): Promise<string | undefined> {
	const pathValue = process.env.PATH;
	if (!pathValue) {
		return undefined;
	}

	const candidates = process.platform === 'win32' ? [`${command}.exe`, command] : [command];
	for (const directoryValue of pathValue.split(path.delimiter)) {
		const directory = directoryValue.replace(/^"|"$/g, '');
		if (!directory) {
			continue;
		}
		for (const candidate of candidates) {
			const candidatePath = path.join(directory, candidate);
			if (await isExecutableFile(candidatePath)) {
				return candidatePath;
			}
		}
	}
	return undefined;
}

async function isExecutableFile(candidatePath: string): Promise<boolean> {
	try {
		const stat = await fs.stat(candidatePath);
		if (!stat.isFile()) {
			return false;
		}
		await fs.access(
			candidatePath,
			process.platform === 'win32' ? constants.F_OK : constants.X_OK,
		);
		return true;
	} catch {
		return false;
	}
}

function executableName(): string {
	return process.platform === 'win32' ? 'dexter.exe' : 'dexter';
}

function request(url: string, redirectsRemaining = 5): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const req = https.get(
			url,
			{
				headers: {
					'Accept': 'application/vnd.github+json',
					'User-Agent': 'dexter-vscode',
				},
			},
			(response) => {
				const status = response.statusCode ?? 0;
				const location = response.headers.location;
				if (status >= 300 && status < 400 && location) {
					response.resume();
					if (redirectsRemaining === 0) {
						reject(new BinaryInstallError('too many redirects while downloading Dexter'));
						return;
					}
					request(new URL(location, url).toString(), redirectsRemaining - 1).then(resolve, reject);
					return;
				}
				if (status !== 200) {
					response.resume();
					reject(new BinaryInstallError(`GitHub returned HTTP ${status}`));
					return;
				}

				const chunks: Buffer[] = [];
				response.on('data', (chunk: Buffer) => chunks.push(chunk));
				response.on('end', () => resolve(Buffer.concat(chunks)));
				response.on('error', reject);
			},
		);
		req.setTimeout(30_000, () => req.destroy(new Error('the download timed out')));
		req.on('error', reject);
	});
}
