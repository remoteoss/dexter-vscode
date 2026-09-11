'use strict';
const { stub } = require('./stub-vscode');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
	resolveDexterBinary,
	verifyChecksum,
	platformRelease,
	normalizeVersion,
} = require('../out/binary.js');

const sha256 = (contents) => createHash('sha256').update(contents).digest('hex');

test('verifyChecksum', async (t) => {
	const archive = Buffer.from('archive contents');
	const name = 'dexter_Darwin_arm64.tar.gz';
	// The format GoReleaser publishes: "<hash>  <filename>", two spaces.
	const checksums = `${sha256(archive)}  ${name}\n${sha256('other')}  dexter_Linux_arm64.tar.gz\n`;

	await t.test('accepts a matching hash', () => {
		assert.doesNotThrow(() => verifyChecksum(archive, checksums, name));
	});

	await t.test('rejects altered contents', () => {
		assert.throws(
			() => verifyChecksum(Buffer.from('tampered'), checksums, name),
			/checksum verification failed/,
		);
	});

	await t.test('rejects an archive with no published checksum', () => {
		assert.throws(
			() => verifyChecksum(archive, checksums, 'dexter_Linux_x86_64.tar.gz'),
			/no checksum was published/,
		);
	});

	await t.test('does not match on a filename prefix', () => {
		// "dexter_Linux_arm64.tar.gz" must not satisfy a request for "dexter_Linux".
		assert.throws(() => verifyChecksum(archive, checksums, 'dexter_Linux'), /no checksum/);
	});

	await t.test('accepts the binary-mode "*" filename prefix', () => {
		assert.doesNotThrow(() => verifyChecksum(archive, `${sha256(archive)}  *${name}\n`, name));
	});

	await t.test('accepts CRLF line endings', () => {
		assert.doesNotThrow(() => verifyChecksum(archive, `${sha256(archive)}  ${name}\r\n`, name));
	});

	await t.test('ignores hex case', () => {
		const upper = `${sha256(archive).toUpperCase()}  ${name}\n`;
		assert.doesNotThrow(() => verifyChecksum(archive, upper, name));
	});
});

test('platformRelease', async (t) => {
	await t.test('maps every target upstream publishes', () => {
		assert.deepEqual(platformRelease('darwin', 'arm64'), {
			archiveName: 'dexter_Darwin_arm64.tar.gz',
			archiveDirectory: 'dexter_Darwin_arm64',
		});
		assert.deepEqual(platformRelease('linux', 'arm64'), {
			archiveName: 'dexter_Linux_arm64.tar.gz',
			archiveDirectory: 'dexter_Linux_arm64',
		});
		assert.deepEqual(platformRelease('linux', 'x64'), {
			archiveName: 'dexter_Linux_x86_64.tar.gz',
			archiveDirectory: 'dexter_Linux_x86_64',
		});
	});

	await t.test('has no target where upstream publishes none', () => {
		// Upstream ships no Intel macOS and no Windows build, so these must stay
		// undefined and produce the "not available" message rather than a 404.
		assert.equal(platformRelease('darwin', 'x64'), undefined);
		assert.equal(platformRelease('win32', 'x64'), undefined);
		assert.equal(platformRelease('linux', 'ia32'), undefined);
	});
});

test('normalizeVersion', async (t) => {
	await t.test('matches `dexter version` output against a release tag', () => {
		// `dexter version` prints "0.7.1"; the release tag is "v0.7.1".
		assert.equal(normalizeVersion('0.7.1\n'), normalizeVersion('v0.7.1'));
	});

	await t.test('does not treat different versions as equal', () => {
		assert.notEqual(normalizeVersion('0.7.1'), normalizeVersion('v0.7.2'));
	});
});

test('resolveDexterBinary honours dexter.binary', async (t) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dexter-test-'));
	const home = path.join(root, 'home');
	const workspace = path.join(root, 'workspace');
	fs.mkdirSync(home);
	fs.mkdirSync(path.join(workspace, 'bin'), { recursive: true });

	const executable = path.join(home, 'dexter');
	fs.writeFileSync(executable, '#!/bin/sh\necho 0.7.1\n', { mode: 0o755 });
	const workspaceExecutable = path.join(workspace, 'bin', 'dexter');
	fs.writeFileSync(workspaceExecutable, '#!/bin/sh\n', { mode: 0o755 });
	const notExecutable = path.join(root, 'not-executable');
	fs.writeFileSync(notExecutable, 'x', { mode: 0o644 });

	const originalHome = process.env.HOME;
	process.env.HOME = home; // os.homedir() reads HOME on POSIX
	stub.workspace.workspaceFolders = [{ uri: { fsPath: workspace } }];
	t.after(() => {
		process.env.HOME = originalHome;
		stub.workspace.workspaceFolders = undefined;
		fs.rmSync(root, { recursive: true, force: true });
	});

	const context = {
		globalStorageUri: { fsPath: path.join(root, 'storage') },
		globalState: { get: () => 0, update: async () => {} },
	};
	const output = { appendLine() {} };
	// autoInstall false, so a resolution failure throws instead of downloading.
	const resolve = (value) => resolveDexterBinary(context, value, false, output);

	await t.test('accepts an absolute path to an executable', async () => {
		assert.deepEqual(await resolve(executable), { path: executable, source: 'configured' });
	});

	await t.test('expands a ~ path', async () => {
		assert.equal((await resolve('~/dexter')).path, executable);
	});

	await t.test('resolves a relative path against the workspace folder', async () => {
		assert.equal((await resolve('bin/dexter')).path, workspaceExecutable);
	});

	await t.test('rejects a path that does not exist', async () => {
		await assert.rejects(() => resolve(path.join(root, 'missing')), /was not found/);
	});

	await t.test('rejects a file that is not executable', async () => {
		await assert.rejects(() => resolve(notExecutable), /was not found or is not executable/);
	});

	await t.test('rejects an empty setting', async () => {
		await assert.rejects(() => resolve('   '), /was not found/);
	});

	await t.test('looks a bare command name up on PATH', async () => {
		const binDirectory = path.join(root, 'onpath');
		fs.mkdirSync(binDirectory);
		fs.writeFileSync(path.join(binDirectory, 'my-dexter'), '#!/bin/sh\n', { mode: 0o755 });
		const originalPath = process.env.PATH;
		process.env.PATH = binDirectory;
		try {
			assert.equal((await resolve('my-dexter')).path, path.join(binDirectory, 'my-dexter'));
		} finally {
			process.env.PATH = originalPath;
		}
	});

	await t.test('rejects a bare command name that is not on PATH', async () => {
		await assert.rejects(() => resolve('definitely-not-on-path-xyz'), /was not found/);
	});

	await t.test('treats the default value as unconfigured and searches PATH', async () => {
		// The default "dexter" must fall through to PATH discovery, not be
		// treated as a configured path.
		const binDirectory = path.join(root, 'defaultpath');
		fs.mkdirSync(binDirectory);
		fs.writeFileSync(path.join(binDirectory, 'dexter'), '#!/bin/sh\n', { mode: 0o755 });
		const originalPath = process.env.PATH;
		process.env.PATH = binDirectory;
		try {
			assert.deepEqual(await resolve('dexter'), {
				path: path.join(binDirectory, 'dexter'),
				source: 'path',
			});
		} finally {
			process.env.PATH = originalPath;
		}
	});

	await t.test('reports that installation is disabled when nothing is found', async () => {
		const originalPath = process.env.PATH;
		process.env.PATH = path.join(root, 'empty');
		try {
			await assert.rejects(() => resolve('dexter'), /automatic installation is disabled/);
		} finally {
			process.env.PATH = originalPath;
		}
	});
});
