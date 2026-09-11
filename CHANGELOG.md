# Changelog

## v0.3.0

- Automatically download a checksum-verified Dexter binary from GitHub releases when one is not already installed
- Check extension-managed binaries for updates daily without modifying system installations
- Prefer an explicitly configured binary, then a Dexter installation on `PATH`, before using the extension-managed binary
- Respect global and combined-language `editor.formatOnSave` settings — the extension no longer forces format on save off for Elixir
- Best-effort support for a Windows `dexter.binary`; automatic installation stays unavailable there
- Added the **Dexter: Restart Language Server** command to the Command Palette
- Changing a Dexter setting now offers a restart, and a restart applies the new settings
- `dexter.binary` accepts a `~` path or a workspace-relative path, and gives a clear error when the binary is missing or is not executable
- Added the `dexter.maxTransientDocuments` setting

## v0.2.1

- Expanded the documented feature list to cover autocompletion, hover documentation, rename, signature help, workspace symbols, code actions, and call hierarchy

## v0.2.0

- Syntax highlighting for Elixir, EEx, HEEx, and Livebook bundled into the extension

## v0.1.2

- Added `dexter.followDelegates` setting — when enabled, jumping to a `defdelegate` follows through to the target function definition

## v0.1.1

- Improved install flow
- Added Cursor as the default install target

## v0.1.0

- Initial release
- Go-to-definition for Elixir via the Dexter LSP server
