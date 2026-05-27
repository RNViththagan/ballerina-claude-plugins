# ballerina-claude-plugins

Ballerina plugin for Claude Code — LSP code intelligence and AI coding assistant in a single plugin.

## Plugins

| Plugin | Description |
|--------|-------------|
| [ballerina](plugins/ballerina/README.md) | LSP code intelligence + AI coding skill |

## Installation

This repository is a Claude Code plugin **marketplace**. Installing is two steps — add the marketplace, then install the plugin.

**1. Add the marketplace**

From GitHub:

```
/plugin marketplace add RNViththagan/ballerina-claude-plugins
```

Or from a local clone:

```
/plugin marketplace add /path/to/ballerina-claude-plugins
```

**2. Install the plugin**

```
/plugin install ballerina@ballerina-claude-plugins
```

Then **restart Claude Code** to activate the language server, skill, `library` agent, and hooks.

### Prerequisites

| Requirement | Why | Notes |
|---|---|---|
| [Ballerina](https://ballerina.io/downloads/) >= 2201.12.0, `bal` on PATH | Language server + skill | The skill walks you through install if `bal` is missing |
| Node.js >= 18 | Bundled `ballerina-library` MCP server | No `npm install` — the server ships pre-bundled |
| `jq` (optional) | Skill-reminder hooks | Hooks degrade silently if absent |

### Update or remove

```
/plugin uninstall ballerina@ballerina-claude-plugins
/plugin marketplace remove ballerina-claude-plugins
```

Restart Claude Code after either.

## Architecture

### Plugin design

A single `ballerina` plugin combines four capabilities:

- **LSP** — `lspServers` in `plugin.json` points to `.lsp.json`, which starts `bal start-language-server` and maps `.bal` files. Provides completions, go-to-definition, hover, and semantic highlighting.
- **Skill** — `skills/ballerina/` contains the `ballerina` skill for writing, running, and testing Ballerina code.
- **`library` sub-agent** — `agents/library.md` defines a discovery agent powered by a bundled MCP server (`mcp/`, declared in `.mcp.json`) that wraps `bal search` and the Ballerina Central API. The server ships as a self-contained esbuild bundle (`mcp/dist/server.js`) — no `npm install` after `/plugin install`. Node.js >= 18 is the only added prerequisite.
- **Hooks** — `hooks/hooks.json` registers PreToolUse/PostToolUse hooks that nudge Claude to activate the `ballerina` skill before editing `.bal` files (requires `jq` on PATH; degrades silently if absent).

All four are activated after installing the plugin and restarting Claude Code.

### Skill progressive disclosure

Only `SKILL.md` is loaded when the skill triggers — it is kept intentionally lean (workflow steps only). Reference files are loaded by Claude on demand, keeping context usage low:

| File | Loaded when |
|---|---|
| `code-rules.md` | Writing or modifying Ballerina code |
| `langlib-reference.md` | Looking up built-in language library APIs |
| `setup.md` | `bal` is not found on the machine |

## Repo structure

```
ballerina-claude-plugins/
├── .claude-plugin/
│   └── marketplace.json
├── LICENSE
├── README.md
└── plugins/
    └── ballerina/
        ├── .claude-plugin/
        │   └── plugin.json          ← lspServers + plugin metadata
        ├── .lsp.json                ← Ballerina language server config
        ├── .mcp.json                ← ballerina-library MCP server registration
        ├── README.md
        ├── agents/
        │   └── library.md           ← library discovery sub-agent
        ├── hooks/
        │   ├── hooks.json           ← PreToolUse/PostToolUse registration
        │   ├── bal-skill-remind.sh  ← nudge to activate the skill
        │   └── bal-skill-mark.sh    ← marks skill as activated
        ├── mcp/
        │   ├── dist/server.js       ← bundled, self-contained MCP server (shipped)
        │   ├── server.js            ← entry point
        │   └── src/                 ← central-client, tools, errors, net, exec, post-process
        └── skills/
            └── ballerina/
                ├── SKILL.md         ← skill trigger + lean workflow
                ├── code-rules.md    ← Ballerina coding rules reference
                ├── langlib-reference.md  ← built-in langlib API reference
                ├── setup.md         ← install guide (loaded only if bal missing)
                └── troubleshooting/ ← symptom-routed troubleshooting topics
```
