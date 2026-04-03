# ballerina-claude-plugins

Ballerina plugin for Claude Code — LSP code intelligence and AI coding assistant in a single plugin.

## Plugins

| Plugin | Description |
|--------|-------------|
| [ballerina](plugins/ballerina/README.md) | LSP code intelligence + AI coding skill |

## Architecture

### Plugin design

A single `ballerina` plugin combines two capabilities:

- **LSP** — `lspServers` in `plugin.json` points to `.lsp.json`, which starts `bal start-language-server` and maps `.bal` files. Provides completions, go-to-definition, hover, and semantic highlighting.
- **Skill** — `skills/ballerina/` contains the `ballerina` skill for writing, running, and testing Ballerina code.

Both are activated after installing the plugin and restarting Claude Code.

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
├── README.md
└── plugins/
    └── ballerina/
        ├── .claude-plugin/
        │   └── plugin.json          ← lspServers + plugin metadata
        ├── .lsp.json                ← Ballerina language server config
        ├── README.md
        └── skills/
            └── ballerina/
                ├── SKILL.md         ← skill trigger + lean workflow
                ├── code-rules.md    ← Ballerina coding rules reference
                ├── langlib-reference.md  ← built-in langlib API reference
                └── setup.md         ← install guide (loaded only if bal missing)
```
