# Dexter for VS Code / Cursor

Fast Elixir go-to-definition powered by the [Dexter](https://gitlab.com/remote-com/employ-starbase/dexter) LSP server.

## Quick start

### Using Mise
```sh
# 1. Install dependencies
brew install sqlite
mise use -g go@1.26.1

# 2. Install dexter
mise plugin add dexter git@gitlab.com:remote-com/employ-starbase/dexter.git
mise install dexter@latest
mise use -g dexter@latest

# 3. Install this extension
git clone git@gitlab.com:remote-com/employ-starbase/dexter-vscode.git
cd dexter-vscode
mise install
make install   # installs to Cursor by default, or: make install-vscode
```

### Using Asdf

```sh
# 1. Install dependencies
brew install sqlite
asdf plugin add golang
asdf install golang 1.26.1

# 2. Install dexter
asdf plugin add dexter git@gitlab.com:remote-com/employ-starbase/dexter.git
asdf install dexter latest
asdf set --home dexter latest

# 3. Install this extension
git clone git@gitlab.com:remote-com/employ-starbase/dexter-vscode.git
cd dexter-vscode
make install   # installs to Cursor by default, or: make install-vscode
```


That's it. Open any Elixir file and go-to-definition will work. Dexter builds its index automatically in the background on first use — you'll see a notification when it's ready.

For monorepos, run dexter from the root (next to `.git`):

```sh
cd ~/code/my-elixir-project   # where .git lives
dexter init .
echo ".dexter.db*" >> .gitignore
```

> **Note:** If you skip the manual `dexter init`, the LSP server will build the index automatically on first startup. This takes ~8 seconds on large codebases.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `dexter.binary` | `"dexter"` | Path to the dexter binary |
| `dexter.followDelegates` | `true` | Follow `defdelegate` to the target function definition |

If dexter is not on your PATH, set the full path:

```json
{
  "dexter.binary": "/Users/you/.local/share/mise/shims/dexter"
}
```

## Commands

- **Dexter: Restart** — Restart the language server

## How it works

The extension starts `dexter lsp` as a language server for Elixir files. Dexter handles `textDocument/definition` by querying a local SQLite index, resolving aliases, imports, and `defdelegate` chains. The index is kept up to date automatically on file save and on git branch switches.

See the [Dexter repo](https://gitlab.com/remote-com/employ-starbase/dexter) for full documentation.
