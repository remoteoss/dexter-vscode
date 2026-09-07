# Dexter for VS Code / Cursor

[Dexter](https://github.com/remoteoss/dexter) is a lightning fast, full-featured Elixir language server optimized for speed on large codebases.

## Features

- Go-to-definition, find references, rename, and more!
- Autocompletion with snippet support across aliases, imports, and `use` injections
- Hover documentation for `@doc`, `@moduledoc`, `@typedoc`, and `@spec`
- Near-instant format on save, including support for any formatter plugins your project has configured, like Styler
- Syntax highlighting for Elixir, EEx, HEEx, and LiveBook
- Monorepo-aware with automatic reindexing on git branch switches

See the [Dexter repo](https://github.com/remoteoss/dexter) for the full feature list.

## Quick start

1. Install this extension from the VS Code or Cursor marketplace
2. Open any Elixir file — Dexter is downloaded automatically and the index builds on first startup

If Dexter is already installed on your `PATH`, the extension uses that copy instead. You can also set
`dexter.binary` to use a specific binary. Automatically downloaded binaries live only in VS Code's
extension storage and do not modify your system installation.

If automatic installation is unavailable, follow Dexter's [manual installation instructions](https://github.com/remoteoss/dexter#quick-start).

Add `.dexter.db` to your `.gitignore`:

```sh
echo ".dexter.db*" >> .gitignore
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `dexter.binary` | `"dexter"` | Path to the dexter binary |
| `dexter.autoInstall` | `true` | Download Dexter into extension storage when it is not installed |
| `dexter.autoUpdate` | `true` | Keep the extension-managed Dexter binary up to date |
| `dexter.followDelegates` | `true` | Follow `defdelegate` to the target function definition |
| `dexter.stdlibPath` | `""` | Path to the Elixir stdlib `lib/` directory. Auto-detected if not set |
| `dexter.debug` | `false` | Enable verbose LSP logging (view with **Output → Dexter**) |

To enable format on save:

```json
{
  "[elixir]": { "editor.formatOnSave": true },
  "[phoenix-heex]": { "editor.formatOnSave": true }
}
```

## Development

```sh
git clone https://github.com/remoteoss/dexter-vscode.git
cd dexter-vscode
make install   # installs to Cursor by default, or: make install-vscode
```

### Releasing

1. Create a release branch, bump the version in `package.json`, and update `CHANGELOG.md`
2. Merge the branch into `main`
3. Tag and push:
   ```sh
   make release VERSION=0.2.0
   ```

CI will pick up the tag and publish the extension automatically.
