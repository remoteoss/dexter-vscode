import * as vscode from 'vscode';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('dexter');
	const binary = config.get<string>('binary', 'dexter');
	const followDelegates = config.get<boolean>('followDelegates', true);
	const debug = config.get<boolean>('debug', false);
	const stdlibPath = config.get<string>('stdlibPath', '');

	const serverOptions: ServerOptions = {
		command: binary,
		args: ['lsp'],
	};

	const clientOptions: LanguageClientOptions = {
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
			...(stdlibPath ? { stdlibPath } : {}),
		},
	};

	client = new LanguageClient('dexter', 'Dexter', serverOptions, clientOptions);
	client.start();

	context.subscriptions.push(
		vscode.commands.registerCommand('dexter.restart', async () => {
			await client?.stop();
			client?.start();
		})
	);
}

export async function deactivate() {
	await client?.stop();
}
