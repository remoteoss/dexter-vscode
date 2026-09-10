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
| `dexter.binary` | `"dexter"` | Path to the dexter binary |
| `dexter.autoInstall` | `true` | Download Dexter into extension storage when it is not installed |
| `dexter.autoUpdate` | `true` | Keep the extension-managed Dexter binary up to date |
| `dexter.followDelegates` | `true` | Follow `defdelegate` to the target function definition |
| `dexter.stdlibPath` | `""` | Path to the Elixir stdlib `lib/` directory. Auto-detected if not set |
| `dexter.debug` | `false` | Enable verbose LSP logging (view with **Output → Dexter**) |

To enable format on save globally:

```json
{
  "editor.formatOnSave": true
}
```

Or enable it only for Dexter-supported languages:

```json
{
  "[elixir][phoenix-heex]": { "editor.formatOnSave": true }
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
