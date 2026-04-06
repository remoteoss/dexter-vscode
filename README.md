# Dexter for VS Code / Cursor

A fast, full-featured Elixir language server for VS Code and Cursor, powered by the [Dexter](https://gitlab.com/remote-com/employ-starbase/dexter) LSP. Built for large codebases where ElixirLS and Lexical are too slow or don't work at all — everything is backed by a local SQLite index, so there's no compilation required and no resource exhaustion.

## Features

- **Go-to-definition** — modules, functions, types, variables, `defdelegate` chains, `use` statements, `__MODULE__` references, and module attributes (`@my_attr`)
- **Go-to-declaration** — jump to the `@callback` (or `@macrocallback`) definition for any `@impl`-annotated function; resolves through `@behaviour` declarations and `use` chains
- **Go-to-implementation** — jump from a `@callback` definition to every module that implements it
- **Autocompletion** — modules, functions, types, and variables with full snippet support, with one completion entry per callable arity. Resolves through aliases, imports, `use` injections, and the Elixir stdlib. Works for qualified calls (`MyApp.Repo.|`), bare function calls, and module prefixes
- **Hover documentation** — `@doc`, `@moduledoc`, `@typedoc`, and `@spec` annotations rendered as Markdown. Cursor-position-aware: hovering on `MyApp.Repo` in `MyApp.Repo.all` shows module docs; hovering on `all` shows function docs
- **Find references** — all usages of a function or module across the codebase, including calls through `import`, `use` chains, and `defdelegate`; also finds all bindings and uses of a local variable within its scope
- **Rename** — rename modules, functions, and variables project-wide (F2). Module renames update all submodules, aliases, call sites, and move the file to its conventional path automatically
- **Format on save** — near-instant formatting via a persistent Elixir process per `.formatter.exs`. Formatter plugins (Styler, `Phoenix.LiveView.HTMLFormatter`) load from your project's `_build` — no extra install needed. Syntax errors surface as inline diagnostics
- **Signature help** — parameter hints as you type function calls, including which argument is active
- **Document symbols** — outline view of all functions, modules, types, and protocols in the current file
- **Workspace symbols** — fuzzy search for any module or function across the entire codebase (Cmd+T)
- **Code actions** — "Add alias" quick fix for unaliased module references
- **Type definition** — jump to `@type` / `@opaque` declarations
- **Document highlight** — highlight all occurrences of the symbol under the cursor
- **Call hierarchy** — navigate incoming and outgoing calls
- **Folding ranges** — collapse `do...end` blocks and heredocs
- **Elixir stdlib** — all of the above work for `Enum`, `String`, `Map`, and other standard library modules
- **Monorepo-aware** — walks up from any file to find the right `.formatter.exs` and project root; go-to-definition works across all apps in a monorepo
- **Git branch detection** — automatically reindexes when you switch branches

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

That's it. Open any Elixir file and all LSP features will work. Dexter builds its index automatically in the background on first use — you'll see a notification when it's ready.

For monorepos, run dexter from the root (next to `.git`):

```sh
cd ~/code/my-elixir-project   # where .git lives
dexter init .
echo ".dexter.db*" >> .gitignore
```

> **Note:** If you skip the manual `dexter init`, the LSP server will build the index automatically on first startup. This takes ~11 seconds on large codebases (55k files, 337k definitions).

## Format on save

To enable format-on-save, add this to your VS Code settings:

```json
{
  "[elixir]": { "editor.formatOnSave": true },
  "[phoenix-heex]": { "editor.formatOnSave": true }
}
```

Formatting is near-instant after the first save in each project — Dexter keeps a persistent Elixir process alive per `.formatter.exs` to eliminate VM startup cost. If the persistent process can't start, it falls back to `mix format` directly.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `dexter.binary` | `"dexter"` | Path to the dexter binary |
| `dexter.followDelegates` | `true` | Follow `defdelegate` to the target function definition |
| `dexter.stdlibPath` | `""` | Path to the Elixir stdlib `lib/` directory. Auto-detected if not set; use this for non-standard installs |
| `dexter.debug` | `false` | Enable verbose LSP logging to stderr (view with **Output → Dexter**). Also settable via `DEXTER_DEBUG=true` |

If dexter is not on your PATH, set the full path:

```json
{
  "dexter.binary": "/Users/you/.local/share/mise/shims/dexter"
}
```

## Commands

- **Dexter: Restart** — Restart the language server

## Performance

Measured on a 55k-file Elixir monorepo (337k definitions, 2.7M references):

| Operation | Time |
|-----------|------|
| Full init | ~11s |
| Lookup (go-to-definition, hover, etc.) | ~10ms |
| Single file reindex (on save) | ~10ms |
| Full reindex (no changes) | ~2s |
| Format on save | <1ms |

## How it works

The extension starts `dexter lsp` as a language server for Elixir files. Dexter maintains a local SQLite index of all definitions, references, and types across your project and its dependencies. The index is kept up to date automatically on file save and on git branch switches.

See the [Dexter repo](https://gitlab.com/remote-com/employ-starbase/dexter) for full documentation.

## Releasing

1. Create a release branch, bump the version in `package.json`, and update `CHANGELOG.md`
2. Merge the branch into `main`
3. Tag and push:
   ```sh
   make release VERSION=0.2.0
   ```

CI will pick up the tag and publish the extension automatically.
