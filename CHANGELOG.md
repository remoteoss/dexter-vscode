# Changelog

## Unreleased

- Automatically download a checksum-verified Dexter binary from GitHub releases when one is not already installed
- Check extension-managed binaries for updates daily without modifying system installations
- Prefer an explicitly configured binary, then a Dexter installation on `PATH`, before using the extension-managed binary

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
