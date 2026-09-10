import * as vscode from 'vscode';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
} from 'vscode-languageclient/node';
import { resolveDexterBinary, showInstallError, updateManagedDexter } from './binary';

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('dexter');
	const configuredBinary = config.get<string>('binary', 'dexter');
	const autoInstall = config.get<boolean>('autoInstall', true);
	const autoUpdate = config.get<boolean>('autoUpdate', true);
	const followDelegates = config.get<boolean>('followDelegates', true);
	const debug = config.get<boolean>('debug', false);
	const stdlibPath = config.get<string>('stdlibPath', '');
	const maxTransientDocuments = config.get<number>('maxTransientDocuments', 50);
	const output = vscode.window.createOutputChannel('Dexter');
	context.subscriptions.push(output);

	let resolvedBinary;
	try {
		resolvedBinary = await resolveDexterBinary(
			context,
			configuredBinary,
			autoInstall,
			output,
		);
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

	context.subscriptions.push(
		vscode.commands.registerCommand('dexter.restart', async () => {
			try {
				await client?.stop();
				await client?.start();
			} catch (error) {
				output.appendLine(error instanceof Error ? error.stack ?? error.message : String(error));
				vscode.window.showErrorMessage(
					`Dexter could not restart: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		})
	);

	try {
		await client.start();
	} catch (error) {
		output.appendLine(error instanceof Error ? error.stack ?? error.message : String(error));
		await showInstallError(error);
		return;
	}

	void updateManagedDexter(context, resolvedBinary, autoUpdate, output);
}

export async function deactivate() {
	await client?.stop();
}
