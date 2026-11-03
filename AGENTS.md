# AGENTS.md

## What this repo ships

One OpenCode v2 plugin. It appends an install hint to a tool output when the
agent touches a file whose language server is missing. It installs nothing and
blocks nothing.

## Layout

| File | Role |
| --- | --- |
| `index.js` | The plugin. `decide()` holds the logic, `setup()` wires the hooks |
| `servers.js` | Server table: command, extensions, install hints |
| `index.test.mjs` | The whole test suite, `node --test` |
| `NOTICE` | Attribution for the copied tables |

## Hard rules

- The hook must never throw. A throwing `tool.execute.after` breaks the tool
  call. Every path is wrapped in `try/catch` that swallows.
- The plugin must never install anything, never run a command, never write a
  file on its own. It reads `lsp-install-decisions.json` and nothing else.
- The plugin must stay quiet when OpenCode already runs a server. `lsp: true`
  means every server runs, so the plugin says nothing.
- The server table stays data. No logic in `servers.js` beyond
  `serverForExtension`.
- No dependency. `node:` builtins only.

## The decision path

`decide()` returns `{serverId, server, installed}` or `null`. It checks, in
order:

1. the tool is `read`, `edit`, `write`, `multiedit` or `patch`;
2. the call names a file inside the project;
3. the file has an extension;
4. the plugin option `lsp` is not `true` (`true` means "OpenCode runs every
   server", so the plugin says nothing);
5. a server in the table handles the extension;
6. that server is not one OpenCode downloads itself (`autoInstall`);
7. the decision file does not say `declined`.

`installed` tells the hook which text to append: the install hint when the
binary is missing, and the shorter activation note when the binary exists. An
installed binary is not proof that OpenCode runs a server for it.

A test covers each step. Add a test with any new step.

OpenCode 2 has no `config` hook, so `lsp` can only come from the plugin
options. Do not try to read the config file from disk.

## Before you commit

```bash
npm test
node --check index.js
```

## Release

The `Release` workflow publishes when the `package.json` version is absent
from npm. Bump first, push second.

```bash
npm version patch --no-git-tag-version
git add -A && git commit -m "chore: release X.Y.Z"
git push origin main
```

## Commits

Imperative subject, 72 characters or fewer, no trailing period.
