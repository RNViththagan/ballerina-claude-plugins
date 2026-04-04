# Library Search Research: Bringing LS Tools to Claude Code

## Status: In Progress
Last updated: 2026-04-03

---

## Goal

Add library search capability to the Ballerina Claude Code plugin, similar to the `library-search` and `library-get` tools in the BI Copilot (vscode-extensions repo).

---

## How the Existing Tools Work (vscode-extensions)

### Source Location
`/Users/viththagan/WSO2/vscode-extensions/workspaces/ballerina/ballerina-extension/src/features/ai/agent/tools/`

### Two Tools

| Tool | File | LSP Wire Method | Input | Output |
|------|------|----------------|-------|--------|
| Library Search | `library-search.ts` | `copilotLibraryManager/getLibrariesBySearch` | `keywords: string[]` | `MinifiedLibrary[]` (name + description, up to 9) |
| Library Get | `library-get.ts` | `copilotLibraryManager/getFilteredLibraries` | `libNames: string[], userPrompt: string` | Full `Library[]` with clients, functions, typeDefs |

### LSP Client
Defined in `extended-language-client.ts` (lines 1479-1485, enum at 491-493):
```typescript
getCopilotLibrariesBySearch(params) → sendRequest("copilotLibraryManager/getLibrariesBySearch", params)
getCopilotFilteredLibraries(params) → sendRequest("copilotLibraryManager/getFilteredLibraries", params)
```
Types imported from `@wso2/ballerina-core` → `src/rpc-types/ai-panel/interfaces.ts` (lines 331-337).

---

## Language Server Implementation

### Source Location (local)
`/Users/viththagan/WSO2/ballerina-language-server/`

### Service
`flow-model-generator/modules/flow-model-generator-ls-extension/src/main/java/io/ballerina/flowmodelgenerator/extension/CopilotLibraryService.java`

- Registered via Java SPI + `@JsonSegment("copilotLibraryManager")`
- Three endpoints:

| Endpoint | Request | What it does |
|----------|---------|--------------|
| `getLibrariesList` | `{ mode: "CORE"/"HEALTHCARE"/"ALL" }` | All libraries (name + description only) |
| `getLibrariesBySearch` | `{ keywords: string[] }` | BM25 FTS search, up to 9 results |
| `getFilteredLibraries` | `{ libNames: string[] }` | Full library details (clients, functions, typeDefs) |

### Database
- SQLite with FTS5, ships with the LS binary
- Local path: `flow-model-generator/modules/flow-model-generator-ls-extension/src/main/resources/search-index.sqlite`
- Tables: `Package`, `PackageFTS`, `TypeFTS`, `ConnectorFTS`, `FunctionFTS`
- Search uses BM25 ranking across all 4 FTS tables

### Core Logic
`flow-model-generator/modules/flow-model-generator-core/src/main/java/io/ballerina/flowmodelgenerator/core/copilot/CopilotLibraryManager.java`

---

## Key Finding: Custom LSP Methods Are NOT Exposed as Claude Tools

The `copilotLibraryManager/*` methods are **custom JSON-RPC extensions**, not standard LSP.
Claude Code's `.lsp.json` only provides:
- Standard LSP tools (hover, diagnostics, go-to-definition, completion)
- No way to map custom LSP methods to Claude tools via config

**No `tools` or `customMethods` field exists in `.lsp.json` or `plugin.json`.**

---

## Key Finding: Plugins Support MCP Servers

From the official plugin reference (`https://code.claude.com/docs/en/plugins-reference`):

> Plugins can bundle Model Context Protocol (MCP) servers to connect Claude Code with external tools and services.

MCP servers in a plugin:
- Defined in `.mcp.json` at plugin root or inline in `plugin.json`
- Start automatically when the plugin is enabled
- Appear as **standard Claude tools** in the toolkit
- Support `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` env variables

```json
{
  "mcpServers": {
    "ballerina-tools": {
      "command": "${CLAUDE_PLUGIN_ROOT}/bin/mcp-server",
      "args": [],
      "env": {}
    }
  }
}
```

---

## Key Finding: LS is stdio-only (no TCP/socket)

Checked `launchers/stdio-launcher/src/main/java/.../Main.java` — the launcher is hardcoded to `System.in` / `System.out`. There is no socket or TCP launcher. The directory is literally named `stdio-launcher`.

This means **the MCP server cannot connect to the LS instance that Claude Code already started** — that stdio pipe is owned by Claude Code.

---

## Approach: MCP Server with Dedicated LS Instance

The MCP server spawns and owns **one persistent LS child process** (`bal start-language-server`) over stdio. It keeps this process alive for the plugin session and routes all library calls through it.

```
Claude Code
  ├── LSP connection → LS instance 1  (owned by Claude Code, via .lsp.json — code intelligence)
  └── MCP server (ballerina-mcp.js)   (owned by plugin, started via .mcp.json)
        └── LS instance 2             (owned by MCP server, spawned on first tool call)
              ↓ stdio JSON-RPC
              copilotLibraryManager/getLibrariesBySearch
              copilotLibraryManager/getFilteredLibraries
```

Yes, two LS instances. The LS is a JVM process so it's heavy — but instance 2 is only started when Claude actually calls a library tool (lazy init), and stays alive for the session.

### Why not SQLite directly for search?
Possible, but the LS handles BM25 ranking, keyword sanitization (FTS5 injection prevention), and multi-table union queries. Reusing the LS means we get the exact same search quality as BI Copilot with zero duplication of that logic.

---

## MCP Server Design

### Tools exposed to Claude

| Tool | Input | What it does |
|------|-------|--------------|
| `search_libraries` | `keywords: string[]` | Calls `copilotLibraryManager/getLibrariesBySearch` → returns name+description for up to 9 libraries |
| `get_library` | `libNames: string[], userPrompt: string` | Calls `copilotLibraryManager/getFilteredLibraries` → returns full clients, functions, typeDefs |

### MCP server lifecycle

```
Plugin enabled
  → Claude Code starts ballerina-mcp.js (MCP server) via .mcp.json

First search_libraries or get_library call
  → MCP server lazily spawns `bal start-language-server` as child process
  → Sends LSP initialize handshake
  → Executes the copilotLibraryManager/* request
  → Returns result to Claude

Subsequent calls
  → Reuse the same LS child process (already initialized)

Plugin disabled / session end
  → MCP server exits → LS child process terminates
```

### Technology: Node.js
- Ships on most dev machines
- `@modelcontextprotocol/sdk` for MCP server boilerplate
- `child_process.spawn` to start the LS
- JSON-RPC over stdio to communicate with the LS

### Plugin structure

```
plugins/ballerina/
├── .claude-plugin/
│   └── plugin.json
├── .lsp.json                  ← unchanged
├── .mcp.json                  ← NEW
├── mcp/
│   ├── package.json
│   ├── server.js              ← MCP server entry point
│   └── ls-client.js           ← JSON-RPC client for the LS child process
└── skills/
    └── ballerina/
        └── SKILL.md           ← updated to mention library tools
```

`.mcp.json`:
```json
{
  "mcpServers": {
    "ballerina": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/server.js"],
      "env": {
        "PLUGIN_DATA": "${CLAUDE_PLUGIN_DATA}"
      }
    }
  }
}
```

`plugin.json` — add `SessionStart` hook to install `node_modules` once:
```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "diff -q \"${CLAUDE_PLUGIN_ROOT}/mcp/package.json\" \"${CLAUDE_PLUGIN_DATA}/package.json\" >/dev/null 2>&1 || (cd \"${CLAUDE_PLUGIN_DATA}\" && cp \"${CLAUDE_PLUGIN_ROOT}/mcp/package.json\" . && npm install) || rm -f \"${CLAUDE_PLUGIN_DATA}/package.json\""
      }]
    }]
  }
}
```

---

## Final Architecture: Agent-Based Library Discovery

The MCP server is a **dumb proxy** — no filtering logic inside it. Intelligence lives in the Library Agent.

### Key Constraints (from docs)

1. **Subagents cannot spawn subagents** — only the main thread can spawn agents
2. **Plugin agents cannot declare `mcpServers` in frontmatter** — MCP server must be at plugin level (`.mcp.json`), agents inherit it
3. **Main Claude's context must stay clean** — all large LS responses must stay inside the Library Agent's isolated context window

### Flow

```
User asks about libraries / needs a connector
         ↓
Main Claude (SKILL.md: "for library discovery, invoke the library agent")
         ↓ spawns Library Agent (isolated context window)
                ↓
         search_libraries(keywords)
                ↓ MCP → LS
         MinifiedLibrary[] (lightweight, up to 9)
                ↓ picks top candidates
         get_library(libNames, userPrompt)
                ↓ MCP → LS
         full Library[] — large (clients, functions, typeDefs) — stays inside agent context
                ↓ inline filtering/distillation
         compact summary: package name, client, relevant functions + signatures
                ↓
         returns ~5-10 lines to Main Claude
         ↓
Main Claude writes accurate Ballerina code
```

Large LS responses **never reach Main Claude's context**. The Library Agent absorbs them, filters inline, and returns only what Main Claude needs to write code.

### Why not a separate Filter Agent?
- Subagents can't spawn subagents — Filter Agent would have to be spawned by Main Claude
- That means raw `get_library` output would flow through Main Claude to reach Filter Agent — exactly what we want to avoid
- Library Agent doing inline filtering keeps everything isolated

### Component boundaries

| Component | Responsibility | Tool access |
|-----------|---------------|------------|
| MCP server | Proxy LS calls, no logic | n/a |
| Library Agent | search → get → distill → return compact summary | `mcp__ballerina__search_libraries`, `mcp__ballerina__get_library` only |
| Main Claude | Write Ballerina code | All tools |

Library Agent has **only the two MCP tools** — no Bash, no file read/write, no code tools. It cannot touch the codebase.

```yaml
# agents/library.md frontmatter
---
name: library
description: Discovers Ballerina libraries and returns relevant API signatures. Invoke when user needs a package, connector, or external service integration.
tools: mcp__ballerina__search_libraries, mcp__ballerina__get_library
model: haiku
---
```

---

## Plugin Structure (Final)

```
plugins/ballerina/
├── .claude-plugin/
│   └── plugin.json            ← hooks for node_modules install
├── .lsp.json                  ← LSP (unchanged)
├── .mcp.json                  ← MCP server config
├── mcp/
│   ├── package.json           ← @modelcontextprotocol/sdk dep
│   ├── server.js              ← MCP server: search_libraries + get_library tools
│   └── ls-client.js           ← JSON-RPC stdio client for LS child process
├── agents/
│   ├── library.md             ← Library Agent: search → get → spawn filter agent
│   └── filter.md              ← Filter Agent: distill full API to relevant subset
└── skills/
    └── ballerina/
        └── SKILL.md           ← updated: "for library discovery, invoke library agent"
```

---

## Next Steps

- [ ] Confirm `node` is available on target machines (most Ballerina devs have it — verify)
- [ ] Prototype `mcp/server.js` + `mcp/ls-client.js`
- [ ] Wire up `.mcp.json` and test: Claude calls `search_libraries` → MCP → LS → results
- [ ] Handle LS init/shutdown edge cases (crash, timeout, slow JVM startup)
- [ ] Write `agents/library.md` — orchestration prompt
- [ ] Write `agents/filter.md` — distillation prompt
- [ ] Update `SKILL.md` to reference the library agent
- [ ] End-to-end test: "find me a library for sending emails" → correct Ballerina imports + function calls

---

## References

- Plugin reference docs: https://code.claude.com/docs/en/plugins-reference
- BI Copilot tools: `vscode-extensions/.../src/features/ai/agent/tools/`
- LS service: `ballerina-language-server/.../CopilotLibraryService.java`
- LS core: `ballerina-language-server/.../CopilotLibraryManager.java`
- LSP client methods: `vscode-extensions/.../src/core/extended-language-client.ts` lines 1479-1485
