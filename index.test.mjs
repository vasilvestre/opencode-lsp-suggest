// Tests for lsp-suggest. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import plugin, {
  decide,

  isInstalled,
  loadDecisions,
  recordDecision,
  hintText,
  fileFromArgs,
  isInside,
} from './index.js'
import { SERVERS, PRIORITY, serverForExtension } from './servers.js'

// A project directory with a fake PATH, so `isInstalled` is deterministic.
function project() {
  const root = mkdtempSync(join(tmpdir(), 'lsp-suggest-'))
  const bin = join(root, 'bin')
  mkdirSync(bin)
  return { root, bin, env: { PATH: bin } }
}

function touch(dir, name) {
  writeFileSync(join(dir, name), '')
}

const base = (over = {}) => ({
  tool: 'read',
  args: { filePath: 'src/main.rs' },
  root: '/proj',
  lspConfig: undefined,
  decisions: {},
  env: { PATH: '/nonexistent' },
  ...over,
})

test('the server table is consistent', () => {
  for (const [id, server] of Object.entries(SERVERS)) {
    assert.equal(typeof server.command, 'string', `${id} has no command`)
    assert.ok(server.extensions.length > 0, `${id} has no extensions`)
    assert.equal(typeof server.global, 'string', `${id} has no global hint`)
    for (const ext of server.extensions) {
      assert.match(ext, /^\./, `${id} extension ${ext} has no dot`)
    }
  }
  // Every priority entry must exist, or the lookup silently skips it.
  for (const id of PRIORITY) {
    assert.ok(SERVERS[id], `priority names unknown server ${id}`)
  }
})

test('every server is reachable through the priority list', () => {
  for (const id of Object.keys(SERVERS)) {
    assert.ok(PRIORITY.includes(id), `${id} is missing from PRIORITY`)
  }
})

test('typescript wins over deno for .ts', () => {
  assert.equal(serverForExtension('.ts'), 'typescript')
  assert.equal(serverForExtension('.rs'), 'rust')
  assert.equal(serverForExtension('.go'), 'gopls')
  assert.equal(serverForExtension('.py'), 'pyright')
  assert.equal(serverForExtension('.php'), 'php')
  assert.equal(serverForExtension('.unknown'), null)
})

test('a missing server produces a hint', () => {
  const found = decide(base())
  assert.equal(found.serverId, 'rust')
  assert.match(hintText(found.serverId, found.server), /rust-analyzer/)
})

test('an installed server is reported as installed, not missing', () => {
  const { root, bin, env } = project()
  touch(bin, 'rust-analyzer')
  const found = decide(base({ root, env }))
  assert.equal(found.serverId, 'rust')
  assert.equal(found.installed, true)
})

test('a server in node_modules/.bin counts as installed', () => {
  const { root, env } = project()
  mkdirSync(join(root, 'node_modules', '.bin'), { recursive: true })
  touch(join(root, 'node_modules', '.bin'), 'rust-analyzer')
  assert.equal(decide(base({ root, env })).installed, true)
})

test('a declined server stays quiet', () => {
  const found = decide(base({ decisions: { rust: { decision: 'declined' } } }))
  assert.equal(found, null)
})

test('an allowed server still gets the hint', () => {
  const found = decide(base({ decisions: { rust: { decision: 'allowed' } } }))
  assert.equal(found.serverId, 'rust')
})

test('lsp: true silences the hint for every server', () => {
  assert.equal(decide(base({ lspConfig: true })), null)
})

test('a non-boolean lsp option changes nothing', () => {
  const lspConfig = { rust: { command: ['rust-analyzer'], extensions: ['.rs'] } }
  assert.equal(decide(base({ lspConfig })).serverId, 'rust')
})

test('a disabled server in the config is still suggested', () => {
  const lspConfig = { rust: { disabled: true, extensions: ['.rs'] } }
  assert.equal(decide(base({ lspConfig })).serverId, 'rust')
})

test('lsp: false means no server runs, so the hint appears', () => {
  assert.equal(decide(base({ lspConfig: false })).serverId, 'rust')
})

test('a file outside the project is ignored', () => {
  assert.equal(decide(base({ args: { filePath: '/etc/hosts' } })), null)
  assert.equal(decide(base({ args: { filePath: '../other/main.rs' } })), null)
})

test('a non-file tool is ignored', () => {
  assert.equal(decide(base({ tool: 'bash' })), null)
  assert.equal(decide(base({ tool: 'grep' })), null)
})

test('a file with no extension is ignored', () => {
  assert.equal(decide(base({ args: { filePath: 'Makefile' } })), null)
})

test('a broken call does not throw', () => {
  for (const over of [
    { args: null },
    { args: {} },
    { args: { filePath: 42 } },
    { tool: undefined },
    { root: undefined },
  ]) {
    assert.doesNotThrow(() => decide(base(over)))
  }
})

test('fileFromArgs reads the three spellings', () => {
  assert.equal(fileFromArgs({ filePath: 'a.rs' }), 'a.rs')
  assert.equal(fileFromArgs({ file_path: 'a.rs' }), 'a.rs')
  assert.equal(fileFromArgs({ path: 'a.rs' }), 'a.rs')
  assert.equal(fileFromArgs({}), null)
  assert.equal(fileFromArgs(null), null)
})

test('isInside rejects a sibling directory', () => {
  assert.equal(isInside('/proj', '/proj/src/a.rs'), true)
  assert.equal(isInside('/proj', '/proj'), true)
  assert.equal(isInside('/proj', '/proj-other/a.rs'), false)
  assert.equal(isInside('/proj', '/etc/a.rs'), false)
})

test('isInstalled handles a path and a bare name', () => {
  const { root, bin, env } = project()
  touch(bin, 'gopls')
  assert.equal(isInstalled('gopls', root, env), true)
  assert.equal(isInstalled('missing', root, env), false)
  assert.equal(isInstalled('', root, env), false)
  assert.equal(isInstalled(join(bin, 'gopls'), root, env), true)
  assert.equal(isInstalled(join(bin, 'nope'), root, env), false)
})

test('decisions round-trip through the file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lsp-dec-'))
  try {
    const file = join(dir, 'lsp-install-decisions.json')
    assert.deepEqual(loadDecisions(file), {})
    recordDecision(file, 'gopls', 'declined', '2026-01-01T00:00:00.000Z')
    const written = JSON.parse(readFileSync(file, 'utf8'))
    assert.deepEqual(written, {
      gopls: { decision: 'declined', decidedAt: '2026-01-01T00:00:00.000Z' },
    })
    recordDecision(file, 'rust', 'allowed', '2026-01-02T00:00:00.000Z')
    assert.equal(loadDecisions(file).rust.decision, 'allowed')
    assert.equal(loadDecisions(file).gopls.decision, 'declined')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a corrupt decisions file reads as empty', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lsp-dec-'))
  try {
    const file = join(dir, 'lsp-install-decisions.json')
    writeFileSync(file, 'not json')
    assert.deepEqual(loadDecisions(file), {})
    writeFileSync(file, '[]')
    assert.deepEqual(loadDecisions(file), {})
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// Drive the plugin through a fake ctx, the way OpenCode v2 does. The PATH is
// emptied so a server installed on the host does not hide the hint.
async function harness(options, path = '/nonexistent', root = '/proj') {
  const savedPath = process.env.PATH
  process.env.PATH = path
  let after
  const ctx = {
    options,
    directory: root,
    tool: {
      hook: async (name, cb) => {
        if (name === 'execute.after') after = cb
        return { dispose: async () => {} }
      },
    },
  }
  await plugin.setup(ctx)
  assert.equal(typeof after, 'function', 'execute.after hook must be registered')
  return {
    run: async (event) => {
      await after(event)
      return event?.result
    },
    restore: () => {
      process.env.PATH = savedPath
    },
  }
}

test('the hook appends the hint in warn mode', async () => {
  const h = await harness({ configDir: '/tmp/lsp-suggest-test-none' })
  try {
    const result = await h.run({
      tool: 'read',
      input: { filePath: 'src/main.rs' },
      status: 'completed',
      result: { output: 'file body' },
    })
    assert.match(result.output, /^file body/)
    assert.match(result.output, /rust-analyzer/)
    assert.match(result.output, /ACTION REQUIRED/)
  } finally {
    h.restore()
  }
})

test('the hook stays quiet in silent mode', async () => {
  const h = await harness({ mode: 'silent', configDir: '/tmp/lsp-suggest-test-none' })
  const warned = []
  const original = console.warn
  console.warn = (msg) => warned.push(msg)
  try {
    const result = await h.run({
      tool: 'read',
      input: { filePath: 'src/main.rs' },
      status: 'completed',
      result: { output: 'file body' },
    })
    assert.equal(result.output, 'file body')
    assert.equal(warned.length, 1)
  } finally {
    console.warn = original
    h.restore()
  }
})

test('the hook respects the lsp plugin option', async () => {
  const h = await harness({ configDir: '/tmp/lsp-suggest-test-none', lsp: true })
  try {
    const result = await h.run({
      tool: 'read',
      input: { filePath: 'src/main.rs' },
      status: 'completed',
      result: { output: 'file body' },
    })
    assert.equal(result.output, 'file body')
  } finally {
    h.restore()
  }
})

test('the hook stays quiet when OpenCode can download the server', async () => {
  const h = await harness({ configDir: '/tmp/lsp-suggest-test-none' })
  try {
    // php is an auto-install server, so a missing binary is not news.
    const result = await h.run({
      tool: 'read',
      input: { filePath: 'src/A.php' },
      status: 'completed',
      result: { output: 'file body' },
    })
    assert.equal(result.output, 'file body')
  } finally {
    h.restore()
  }
})

test('the hook appends to a content array', async () => {
  const h = await harness({ configDir: '/tmp/lsp-suggest-test-none' })
  try {
    const result = await h.run({
      tool: 'read',
      input: { filePath: 'src/main.rs' },
      status: 'completed',
      result: { content: [{ type: 'text', text: 'file body' }] },
    })
    assert.equal(result.content.length, 2)
    assert.match(result.content[1].text, /rust-analyzer/)
  } finally {
    h.restore()
  }
})

test('the hook stays quiet when the tool errored', async () => {
  const h = await harness({ configDir: '/tmp/lsp-suggest-test-none' })
  try {
    const result = await h.run({
      tool: 'read',
      input: { filePath: 'src/main.rs' },
      status: 'error',
      result: { output: 'file body' },
    })
    assert.equal(result.output, 'file body')
  } finally {
    h.restore()
  }
})

test('the hook hints once per server per session', async () => {
  const h = await harness({ configDir: '/tmp/lsp-suggest-test-none' })
  try {
    const first = await h.run({
      tool: 'read',
      input: { filePath: 'src/main.rs' },
      status: 'completed',
      result: { output: 'file body' },
    })
    const second = await h.run({
      tool: 'read',
      input: { filePath: 'src/lib.rs' },
      status: 'completed',
      result: { output: 'file body' },
    })
    assert.match(first.output, /rust-analyzer/)
    assert.equal(second.output, 'file body')
  } finally {
    h.restore()
  }
})

test('an installed server gets the activation note, not the install hint', async () => {
  const { root } = project()
  mkdirSync(join(root, 'bin'), { recursive: true })
  touch(join(root, 'bin'), 'rust-analyzer')
  const h = await harness(
    { configDir: '/tmp/lsp-suggest-test-none' },
    join(root, 'bin'),
    root,
  )
  try {
    const result = await h.run({
      tool: 'read',
      input: { filePath: 'src/main.rs' },
      status: 'completed',
      result: { output: 'file body' },
    })
    assert.match(result.output, /is installed, but OpenCode runs no server/)
    assert.doesNotMatch(result.output, /ACTION REQUIRED/)
  } finally {
    h.restore()
  }
})

test('the hook survives a broken call', async () => {
  const h = await harness({ configDir: '/tmp/lsp-suggest-test-none' })
  try {
    for (const event of [
      undefined,
      {},
      { tool: 'read', input: null, result: { output: 42 } },
      { tool: 'read', input: { filePath: 'a.rs' }, result: null },
    ]) {
      await assert.doesNotReject(() => h.run(event))
    }
  } finally {
    h.restore()
  }
})
