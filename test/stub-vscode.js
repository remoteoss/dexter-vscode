'use strict';
// The extension code imports `vscode`, which only exists inside the extension
// host. Install a loader hook that serves a stub instead, so the pure logic can
// be tested with plain Node. Require this before requiring anything from out/.
const Module = require('module');

const stub = {
	workspace: {
		workspaceFolders: undefined,
		getConfiguration: () => ({ get: (_key, fallback) => fallback }),
		createFileSystemWatcher: () => ({ dispose() {} }),
		onDidChangeConfiguration: () => ({ dispose() {} }),
	},
	window: {
		createOutputChannel: () => ({ appendLine() {}, dispose() {} }),
		showErrorMessage: async () => undefined,
		showInformationMessage: () => ({ then() {} }),
		withProgress: (_options, task) => task(),
	},
	commands: {
		registerCommand: () => ({ dispose() {} }),
		executeCommand: async () => undefined,
	},
	env: { openExternal: async () => true },
	Uri: { parse: (value) => value },
	ProgressLocation: { Notification: 15 },
};

const originalLoad = Module._load;
Module._load = function (request, ...rest) {
	return request === 'vscode' ? stub : originalLoad.call(this, request, ...rest);
};

module.exports = { stub };
