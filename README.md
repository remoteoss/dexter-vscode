# Dexter for VS Code / Cursor

Fast Elixir go-to-definition powered by the [Dexter](https://gitlab.com/remote-com/employ-starbase/dexter) LSP server.

## Installation

### From source

```sh
git clone git@gitlab.com:remote-com/employ-starbase/dexter-vscode.git
cd dexter-vscode
make install-vscode   # or make install-cursor for Cursor
```

## Requirements

Install and index your project with Dexter first:

```sh
mise plugin add dexter git@gitlab.com:remote-com/employ-starbase/dexter.git
mise install dexter@latest
mise use dexter@latest

cd ~/code/my-elixir-project
dexter init .
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `dexter.binary` | `"dexter"` | Path to the dexter binary. Defaults to `dexter` on PATH. |

If dexter is not on your PATH, set the full path:

```json
{
  "dexter.binary": "/Users/you/.local/share/mise/shims/dexter"
}
```

## Commands

- **Dexter: Restart** — Restart the language server

## How it works

The extension starts `dexter lsp` as a language server for Elixir files. Dexter handles `textDocument/definition` requests by querying its local SQLite index, resolving aliases, imports, and `defdelegate` chains.

See the [Dexter repo](https://gitlab.com/remote-com/employ-starbase/dexter) for full documentation.
