import * as vscode from 'vscode';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
} from 'vscode-languageclient/node';
import { resolveDexterBinary, showInstallError, updateManagedDexter } from './binary';

let client: LanguageClient | undefined;

// Settings are read on every start, so a restart applies changed settings.
async function startClient(
	context: vscode.ExtensionContext,
	output: vscode.OutputChannel,
): Promise<void> {
	const config = vscode.workspace.getConfiguration('dexter');
	const configuredBinary = config.get<string>('binary', 'dexter');
	const autoInstall = config.get<boolean>('autoInstall', true);
	const autoUpdate = config.get<boolean>('autoUpdate', true);
	const followDelegates = config.get<boolean>('followDelegates', true);
	const debug = config.get<boolean>('debug', false);
	const stdlibPath = config.get<string>('stdlibPath', '');
	const maxTransientDocuments = config.get<number>('maxTransientDocuments', 50);

	let resolvedBinary;
	try {
		resolvedBinary = await resolveDexterBinary(context, configuredBinary, autoInstall, output);
	} catch (error) {
		output.appendLine(error instanceof Error ? error.stack ?? error.message : String(error));
		await showInstallError(error);
		return;
	}

	const serverOptions: ServerOptions = {
		command: resolvedBinary.path,
		args: ['lsp'],
	};

	const clientOptions: LanguageClientOptions = {
		outputChannel: output,
		documentSelector: [
			{ scheme: 'file', language: 'elixir' },
			{ scheme: 'file', language: 'eex' },
			{ scheme: 'file', language: 'phoenix-heex' },
			{ scheme: 'file', language: 'livebook' },
		],
		synchronize: {
			fileEvents: vscode.workspace.createFileSystemWatcher('**/*.{ex,exs}'),
		},
		initializationOptions: {
			followDelegates,
			debug,
			maxTransientDocuments,
			...(stdlibPath ? { stdlibPath } : {}),
		},
	};

	client = new LanguageClient('dexter', 'Dexter', serverOptions, clientOptions);
	try {
		await client.start();
	} catch (error) {
		output.appendLine(error instanceof Error ? error.stack ?? error.message : String(error));
		await showInstallError(error);
		return;
	}

	void updateManagedDexter(context, resolvedBinary, autoUpdate, output);
}

async function stopClient(): Promise<void> {
	const previous = client;
	client = undefined;
	await previous?.dispose();
}

export async function activate(context: vscode.ExtensionContext) {
	const output = vscode.window.createOutputChannel('Dexter');
	context.subscriptions.push(output);

	const restart = async (): Promise<void> => {
		try {
			await stopClient();
			await startClient(context, output);
		} catch (error) {
			output.appendLine(error instanceof Error ? error.stack ?? error.message : String(error));
			vscode.window.showErrorMessage(
				`Dexter could not restart: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('dexter.restart', restart),
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(async (event) => {
			if (!event.affectsConfiguration('dexter')) {
				return;
			}
			const action = await vscode.window.showInformationMessage(
				'Dexter settings changed. Restart the language server to apply them.',
				'Restart now',
			);
			if (action === 'Restart now') {
				await restart();
			}
		}),
	);

	await startClient(context, output);
}

export async function deactivate() {
	await stopClient();
}
