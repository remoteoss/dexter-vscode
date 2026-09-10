# Dexter for VS Code / Cursor

[Dexter](https://github.com/remoteoss/dexter) is a lightning fast, full-featured Elixir language server optimized for speed on large codebases.

## Features

- Go-to-definition, find references, rename, and more!
- Autocompletion with snippet support across aliases, imports, and `use` injections
- Hover documentation for `@doc`, `@moduledoc`, `@typedoc`, and `@spec`
- Near-instant format on save, including support for any formatter plugins your project has configured, like Styler
- Syntax highlighting for Elixir, EEx, HEEx, and Livebook
- Monorepo-aware with automatic reindexing on git branch switches

See the [Dexter repo](https://github.com/remoteoss/dexter) for the full feature list.

## Quick start

1. Install this extension from the VS Code or Cursor marketplace
2. Either set `dexter.binary` to the Dexter binary you want to use, or let the extension set Dexter up for you
3. Open any Elixir file — the index builds automatically on first startup

When `dexter.binary` is left at its default, the extension first looks for Dexter on your `PATH`. If it
cannot find one, it downloads a checksum-verified binary into VS Code's extension storage. This does not
modify your system installation. Extension-managed binaries can also be updated automatically.

If automatic installation is unavailable, follow Dexter's [manual installation instructions](https://github.com/remoteoss/dexter#quick-start).
Native Windows support is best effort and automatic installation is unavailable. Configure a compatible
Dexter executable with `dexter.binary`, or use the extension from a WSL workspace.

Dexter stores its project index in `.dexter/`. The directory manages its own `.gitignore`, so no project
`.gitignore` entry is needed.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `dexter.binary` | `"dexter"` | Path to the dexter binary, or a command name to find on `PATH`. Accepts `~` and workspace-relative paths |
| `dexter.autoInstall` | `true` | Download Dexter into extension storage when it is not installed |
| `dexter.autoUpdate` | `true` | Keep the extension-managed Dexter binary up to date |
| `dexter.followDelegates` | `true` | Follow `defdelegate` to the target function definition |
| `dexter.maxTransientDocuments` | `50` | Buffers the server keeps for files the editor never opened. `0` disables caching |
| `dexter.stdlibPath` | `""` | Path to the Elixir stdlib `lib/` directory. Auto-detected if not set |
| `dexter.debug` | `false` | Enable verbose LSP logging (view with **Output → Dexter**) |

### Format on save

The extension does not change your format-on-save settings. To turn format on save on
globally:

```json
{
  "editor.formatOnSave": true
}
```

Or turn it on only for the languages Dexter supports:

```json
{
  "[elixir][phoenix-heex]": { "editor.formatOnSave": true }
}
```

If another Elixir extension is installed, set Dexter as the default formatter. The
extension ID is different in each editor:

```json
// VS Code
{
  "[elixir]": { "editor.defaultFormatter": "remoteoss.dexter-lsp" }
}

// Cursor
{
  "[elixir]": { "editor.defaultFormatter": "remote-com-oss.dexter-lsp" }
}
```

Dexter settings are read when the language server starts. After you change one, the
extension offers to restart the server. You can also restart it yourself from the
Command Palette.

## Commands

| Command | Description |
|---------|-------------|
| **Dexter: Restart Language Server** | Restarts the language server and applies the current settings. Use it after an update, or if the server stops responding |

## Development

```sh
git clone https://github.com/remoteoss/dexter-vscode.git
cd dexter-vscode
make install   # installs to Cursor by default, or: make install-vscode
```

### Releasing

GitHub Actions builds and packages the extension, but the two marketplaces are
published by hand. The marketplaces use different publisher namespaces, so each one
needs its own package:

| Editor | Marketplace | Extension ID |
|--------|-------------|--------------|
| VS Code | Visual Studio Marketplace | `remoteoss.dexter-lsp` |
| Cursor | Open VSX | `remote-com-oss.dexter-lsp` |

1. Create a release branch. Bump the version in `package.json` and add a `CHANGELOG.md`
   entry with a `## v<version>` heading.
2. Merge the branch into `main`, then check out `main`.
3. Tag and push. The tag must match the version in `package.json`:
   ```sh
   make release VERSION=0.3.0
   ```
   The `Release` workflow then builds both packages and creates the GitHub release,
   using that version's `CHANGELOG.md` section as the release notes. It fails if the
   tag and `package.json` disagree, or if the changelog section is missing.
4. Publish to both marketplaces:
   ```sh
   export VSCE_PAT=...   # Visual Studio Marketplace token
   export OVSX_PAT=...   # Open VSX token
   make publish
   ```
   Or publish to one at a time with `make publish-vscode` and `make publish-openvsx`.

To build the packages without publishing, run `make package` and `make package-openvsx`.
`make package-openvsx` sets the Open VSX publisher, builds the package, then restores
`package.json`.
