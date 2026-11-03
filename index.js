// lsp-suggest — OpenCode v2 plugin.
//
// When the agent reads or edits a file whose language server is not
// installed, append a short install hint to the tool output. The agent sees
// it and can ask you. Nothing is installed, nothing is blocked.
//
// The plugin stays quiet when:
//   - the binary is on PATH or in node_modules/.bin,
//   - OpenCode can download that server itself (see `autoInstall`),
//   - you declined that server before (lsp-install-decisions.json),
//   - the file is outside the project directory.
//
// OpenCode v2 exposes no `config` hook, so the plugin cannot read your `lsp`
// key. Mirror it in the plugin options when you run every server:
//   { "plugins": [["./plugins/opencode-lsp-suggest", { "lsp": true }]] }
//
// Modes:
//   warn    (default) append the hint to the tool output
//   silent  log the match, change nothing

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
import { delimiter, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { homedir } from 'node:os'
import { SERVERS, serverForExtension } from './servers.js'

// Tools whose arguments name a file. `read` and `edit` cover the common case;
// `write` is included so a new file gets the hint too. `patch` is the v2 name.
const FILE_TOOLS = new Set(['read', 'edit', 'write', 'multiedit', 'patch'])

// True when `command` resolves to an executable. Checks the project's
// node_modules/.bin first, then PATH. A bare name only; a path is checked
// as given.
export function isInstalled(command, cwd, env = process.env) {
  if (typeof command !== 'string' || command.length === 0) return false
  if (command.includes('/') || command.includes('\\')) {
    const full = isAbsolute(command) ? command : resolve(cwd, command)
    return existsSync(full)
  }
  const local = join(cwd, 'node_modules', '.bin', command)
  if (existsSync(local)) return true
  const path = env.PATH ?? ''
  for (const dir of path.split(delimiter)) {
    if (dir.length === 0) continue
    if (existsSync(join(dir, command))) return true
  }
  return false
}

// The decisions file lives next to the OpenCode config, the same place OmO
// writes it, so an existing file keeps working.
export function decisionsPath(configDir) {
  return join(configDir, 'lsp-install-decisions.json')
}

export function loadDecisions(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function recordDecision(file, serverId, decision, now = new Date().toISOString()) {
  const all = loadDecisions(file)
  all[serverId] = { decision, decidedAt: now }
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(`${file}.tmp`, JSON.stringify(all, null, 2))
  renameSync(`${file}.tmp`, file)
  return all
}

// The text appended to the tool output. Same shape as OmO's, so an agent that
// already knows the OmO prompt reads this one the same way.
export function hintText(serverId, server) {
  const lines = [
    '',
    `LSP server '${serverId}' for ${server.extensions.join(', ')} is NOT INSTALLED.`,
    `Command not found: ${server.command}`,
    '',
  ]
  if (server.local) {
    lines.push('To install in THIS repository (preferred, no global install needed):')
    lines.push(`  ${server.local}`)
    lines.push('')
    lines.push('Or install it globally:')
    lines.push(`  ${server.global}`)
  } else {
    lines.push('To install:')
    lines.push(`  ${server.global}`)
  }
  lines.push('')
  lines.push('ACTION REQUIRED: ASK THE USER whether to install this LSP server.')
  lines.push('If the user declines, proceed without LSP and do not ask again.')
  lines.push('Installing the binary is not enough on its own.')
  lines.push('OpenCode v2 runs no language server at all, whatever the `lsp` block')
  lines.push('says. The port is tracked in anomalyco/opencode#38528, so install')
  lines.push('now and the server works once that lands.')
  return lines.join('\n')
}

// The shorter text for an installed binary. Without it the plugin goes silent
// the moment the user installs the server, even when OpenCode still runs none.
export function activationText(serverId) {
  return [
    '',
    `LSP server '${serverId}' is installed, but OpenCode runs no server for it.`,
    'v2 runs no language server at all, so no setting turns it on. The port is',
    'tracked in https://github.com/anomalyco/opencode/issues/38528',
  ].join('\n')
}

// Returns the file path named by a tool call, or null.
export function fileFromArgs(args) {
  if (!args || typeof args !== 'object') return null
  const candidate = args.filePath ?? args.file_path ?? args.path
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
}

// True when `file` is inside `root`. A file outside the project gets no hint,
// because the project's node_modules and config do not apply to it.
export function isInside(root, file) {
  const rel = relative(resolve(root), resolve(file))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

// The decision for one tool call, or null when the plugin must stay quiet.
// Kept separate from the hook so a test can drive it without a fake ctx.
//
// `lspConfig` is the `lsp` plugin option. OpenCode 2 has no `config` hook, so
// the real config key is unreadable. `true` means "LSP is on", and the plugin
// then says nothing: OpenCode already starts every server it can.
export function decide({ tool, args, root, lspConfig, decisions, env }) {
  if (!FILE_TOOLS.has(tool)) return null
  if (typeof root !== 'string' || root.length === 0) return null
  const named = fileFromArgs(args)
  if (!named) return null
  const absolute = isAbsolute(named) ? named : resolve(root, named)
  if (!isInside(root, absolute)) return null

  const ext = extname(absolute)
  if (!ext) return null

  if (lspConfig === true) return null

  const serverId = serverForExtension(ext)
  if (!serverId) return null
  const server = SERVERS[serverId]

  // OpenCode downloads these itself when `lsp` is on. Telling the user to
  // install one by hand would fight that.
  if (server.autoInstall) return null

  if (decisions?.[serverId]?.decision === 'declined') return null

  // An installed binary is not proof that OpenCode runs it. `installed` tells
  // the hook to warn about the `lsp` key instead of about the install command.
  return { serverId, server, installed: isInstalled(server.command, root, env) }
}

// Append text to a tool result in place. v2 hands back `{title, output,
// content}`; a plain string cannot be changed in place, so it is returned for
// a caller that can replace it.
export function append(result, text) {
  if (typeof result === 'string') return result + text
  if (!result || typeof result !== 'object') return
  if (typeof result.output === 'string') {
    result.output += text
    return
  }
  if (Array.isArray(result.content)) {
    result.content.push({ type: 'text', text })
  }
}

export default {
  id: 'vasilvestre.opencode-lsp-suggest',
  async setup(ctx) {
    const options = ctx?.options ?? {}
    const mode = options.mode === 'silent' ? 'silent' : 'warn'
    const root = ctx?.directory ?? process.cwd()
    const configDir = options.configDir ?? join(homedir(), '.config', 'opencode')
    const file = decisionsPath(configDir)

    // v2 has no `config` hook, so the `lsp` value can only come from the
    // plugin options. Unset means "unknown", and the hint then mentions the
    // `lsp` key.
    const lspConfig = options.lsp

    // Nothing on v2 can record a decision, so the hint repeats on every call
    // unless the plugin remembers. One hint per server per session.
    const hinted = new Set()

    // v2 names this `execute.after` and passes one event object. The event
    // carries the tool name, its input, and the result to amend.
    await ctx.tool.hook('execute.after', (event) => {
      // A throwing hook breaks the tool call. Never let it out.
      try {
        if (event?.status === 'error') return
        const found = decide({
          tool: event?.tool,
          args: event?.input,
          root,
          lspConfig,
          decisions: loadDecisions(file),
          env: process.env,
        })
        if (!found) return
        // Separate counters: a server the user installs mid-session still gets
        // the activation note once.
        const key = found.installed ? `${found.serverId}:lsp` : found.serverId
        if (hinted.has(key)) return
        hinted.add(key)

        if (mode === 'silent') {
          console.warn(`lsp-suggest: '${found.serverId}' needs attention, silent mode`)
          return
        }
        append(
          event?.result,
          found.installed ? activationText(found.serverId) : hintText(found.serverId, found.server),
        )
      } catch {
        // Swallowed on purpose: see the comment above.
      }
    })
  },
}
