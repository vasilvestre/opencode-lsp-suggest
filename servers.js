// Server table: which language server handles which extension, and how to
// install it. Derived from @code-yeongyu/lsp-tools-mcp (MIT), see NOTICE.
//
// `command` is the binary OpenCode runs. `extensions` is what the server
// claims. `global` and `local` are the install commands shown to the user.

export const SERVERS = {
  typescript: {
    command: 'typescript-language-server',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'],
    global: 'npm install -g typescript-language-server typescript',
    local: 'bun add -d typescript-language-server typescript',
  },
  deno: {
    command: 'deno',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
    global: 'Install Deno from https://deno.land',
  },
  vue: {
    command: 'vue-language-server',
    extensions: ['.vue'],
    autoInstall: true,
    global: 'npm install -g @vue/language-server',
    local: 'bun add -d @vue/language-server',
  },
  eslint: {
    command: 'vscode-eslint-language-server',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.vue'],
    global: 'npm install -g vscode-langservers-extracted',
    local: 'bun add -d vscode-langservers-extracted',
  },
  oxlint: {
    command: 'oxlint',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.vue', '.astro', '.svelte'],
    global: 'npm install -g oxlint',
    local: 'bun add -d oxlint',
  },
  biome: {
    command: 'biome',
    extensions: [
      '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
      '.json', '.jsonc', '.vue', '.astro', '.svelte', '.css', '.graphql', '.gql', '.html',
    ],
    global: 'npm install -g @biomejs/biome',
    local: 'bun add -d @biomejs/biome',
  },
  gopls: {
    command: 'gopls',
    extensions: ['.go'],
    global: 'go install golang.org/x/tools/gopls@latest',
  },
  'ruby-lsp': {
    command: 'rubocop',
    extensions: ['.rb', '.rake', '.gemspec', '.ru'],
    global: 'gem install ruby-lsp',
    local: 'bundle add ruby-lsp --group development',
  },
  basedpyright: {
    command: 'basedpyright-langserver',
    extensions: ['.py', '.pyi'],
    global: 'uv tool install basedpyright  # fails with pip on PEP 668 systems',
    local: 'uv add --dev basedpyright',
  },
  pyright: {
    command: 'pyright-langserver',
    extensions: ['.py', '.pyi'],
    global: 'uv tool install pyright  # fails with pip on PEP 668 systems',
    local: 'uv add --dev pyright',
  },
  ty: {
    command: 'ty',
    extensions: ['.py', '.pyi'],
    global: 'uv tool install ty  # fails with pip on PEP 668 systems',
    local: 'uv add --dev ty',
  },
  ruff: {
    command: 'ruff',
    extensions: ['.py', '.pyi'],
    global: 'uv tool install ruff  # fails with pip on PEP 668 systems',
    local: 'uv add --dev ruff',
  },
  'elixir-ls': {
    command: 'elixir-ls',
    extensions: ['.ex', '.exs'],
    global: 'See https://github.com/elixir-lsp/elixir-ls',
  },
  zls: {
    command: 'zls',
    extensions: ['.zig', '.zon'],
    global: 'See https://github.com/zigtools/zls',
  },
  csharp: {
    command: 'csharp-ls',
    extensions: ['.cs'],
    global: 'dotnet tool install -g csharp-ls',
  },
  fsharp: {
    command: 'fsautocomplete',
    extensions: ['.fs', '.fsi', '.fsx', '.fsscript'],
    global: 'dotnet tool install -g fsautocomplete',
  },
  'sourcekit-lsp': {
    command: 'sourcekit-lsp',
    extensions: ['.swift', '.m', '.mm'],
    global: 'Included with Xcode or Swift toolchain',
  },
  rust: {
    command: 'rust-analyzer',
    extensions: ['.rs'],
    global: 'rustup component add rust-analyzer',
  },
  clangd: {
    command: 'clangd',
    extensions: ['.c', '.cpp', '.cc', '.cxx', '.c++', '.h', '.hpp', '.hh', '.hxx', '.h++'],
    autoInstall: true,
    global: 'See https://clangd.llvm.org/installation',
  },
  svelte: {
    command: 'svelteserver',
    extensions: ['.svelte'],
    autoInstall: true,
    global: 'npm install -g svelte-language-server',
    local: 'bun add -d svelte-language-server',
  },
  astro: {
    command: 'astro-ls',
    extensions: ['.astro'],
    autoInstall: true,
    global: 'npm install -g @astrojs/language-server',
    local: 'bun add -d @astrojs/language-server',
  },
  'bash-ls': {
    command: 'bash-language-server',
    extensions: ['.sh', '.bash', '.zsh'],
    autoInstall: true,
    global: 'npm install -g bash-language-server',
    local: 'bun add -d bash-language-server',
  },
  jdtls: {
    command: 'jdtls',
    extensions: ['.java'],
    global: 'See https://github.com/eclipse-jdtls/eclipse.jdt.ls',
  },
  'yaml-ls': {
    command: 'yaml-language-server',
    extensions: ['.yaml', '.yml'],
    autoInstall: true,
    global: 'npm install -g yaml-language-server',
    local: 'bun add -d yaml-language-server',
  },
  'lua-ls': {
    command: 'lua-language-server',
    extensions: ['.lua'],
    autoInstall: true,
    global: 'See https://github.com/LuaLS/lua-language-server',
  },
  php: {
    command: 'intelephense',
    extensions: ['.php'],
    autoInstall: true,
    global: 'npm install -g intelephense',
    local: 'bun add -d intelephense',
  },
  dart: {
    command: 'dart',
    extensions: ['.dart'],
    global: 'Included with Dart SDK',
  },
  'terraform-ls': {
    command: 'terraform-ls',
    extensions: ['.tf', '.tfvars'],
    autoInstall: true,
    global: 'See https://github.com/hashicorp/terraform-ls',
  },
  prisma: {
    command: 'prisma',
    extensions: ['.prisma'],
    global: 'npm install -g prisma',
    local: 'bun add -d prisma',
  },
  'ocaml-lsp': {
    command: 'ocamllsp',
    extensions: ['.ml', '.mli'],
    global: 'opam install ocaml-lsp-server',
  },
  texlab: {
    command: 'texlab',
    extensions: ['.tex', '.bib'],
    global: 'See https://github.com/latex-lsp/texlab',
  },
  dockerfile: {
    command: 'docker-langserver',
    extensions: ['.dockerfile'],
    global: 'npm install -g dockerfile-language-server-nodejs',
    local: 'bun add -d dockerfile-language-server-nodejs',
  },
  gleam: {
    command: 'gleam',
    extensions: ['.gleam'],
    global: 'See https://gleam.run/getting-started/installing/',
  },
  'clojure-lsp': {
    command: 'clojure-lsp',
    extensions: ['.clj', '.cljs', '.cljc', '.edn'],
    global: 'See https://clojure-lsp.io/installation/',
  },
  nixd: {
    command: 'nixd',
    extensions: ['.nix'],
    global: 'nix profile install nixpkgs#nixd',
  },
  tinymist: {
    command: 'tinymist',
    extensions: ['.typ'],
    autoInstall: true,
    global: 'See https://github.com/Myriad-Dreamin/tinymist',
  },
  'haskell-language-server': {
    command: 'haskell-language-server-wrapper',
    extensions: ['.hs', '.lhs'],
    global: 'ghcup install hls',
  },
  'kotlin-ls': {
    command: 'kotlin-lsp',
    extensions: ['.kt', '.kts'],
    autoInstall: true,
    global: 'See https://github.com/Kotlin/kotlin-lsp',
  },
  julials: {
    command: 'julia',
    extensions: ['.jl'],
    global: `julia -e 'using Pkg; Pkg.add("LanguageServer")'`,
  },
}

// Extensions that more than one server claims. The first server in this list
// wins, so the suggestion names the one OpenCode is most likely to start.
// Without it, `.ts` would suggest `deno` before `typescript`.
export const PRIORITY = [
  'typescript',
  'rust',
  'gopls',
  'pyright',
  'basedpyright',
  'php',
  'ruby-lsp',
  'clangd',
  'csharp',
  'fsharp',
  'sourcekit-lsp',
  'jdtls',
  'kotlin-ls',
  'elixir-ls',
  'zls',
  'dart',
  'gleam',
  'haskell-language-server',
  'ocaml-lsp',
  'clojure-lsp',
  'julials',
  'lua-ls',
  'nixd',
  'texlab',
  'tinymist',
  'terraform-ls',
  'prisma',
  'dockerfile',
  'vue',
  'svelte',
  'astro',
  'eslint',
  'oxlint',
  'biome',
  'yaml-ls',
  'bash-ls',
  'deno',
  'ruff',
  'ty',
]

// Returns the server id for an extension, or null. `order` is the priority
// list, so a test can pass its own.
export function serverForExtension(ext, order = PRIORITY) {
  for (const id of order) {
    const server = SERVERS[id]
    if (server && server.extensions.includes(ext)) return id
  }
  return null
}
