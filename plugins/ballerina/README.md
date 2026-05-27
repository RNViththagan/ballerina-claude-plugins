# ballerina

Ballerina language support for Claude Code — LSP code intelligence and AI coding assistant.

## What it provides

- **Language Server**: code completions, go-to-definition, hover, semantic highlighting, and diagnostics for `.bal` files
- **`ballerina` skill**: write integrations and services, run and test projects

## Prerequisites

- Ballerina >= 2201.12.0 (Swan Lake Update 12+)
- `bal` command available in PATH
- Node.js >= 18 (for the bundled `ballerina-library` MCP server that powers the `library` discovery sub-agent)

The `library` sub-agent discovers Ballerina libraries via the bundled MCP server (`mcp/dist/server.js`), which uses `bal search` plus the Ballerina Central API. The server ships as a self-contained bundled JavaScript file — no `npm install` required after `/plugin install`. The bundle is regenerated with `npm run build` inside `plugins/ballerina/mcp/` whenever its source changes.

## Installation

**1. Add the marketplace** (from GitHub, or a local clone):

```
/plugin marketplace add RNViththagan/ballerina-claude-plugins
# or: /plugin marketplace add /path/to/ballerina-claude-plugins
```

**2. Install the plugin:**

```
/plugin install ballerina@ballerina-claude-plugins
```

**3. Restart Claude Code.** This activates all four components:

- the **language server** for `.bal` files (completions, hover, diagnostics),
- the **`ballerina` skill** for writing/running/testing code,
- the **`library` discovery agent** (bundled `ballerina-library` MCP server),
- the **skill-reminder hooks**.

No `npm install` step is required — the MCP server ships pre-bundled at `mcp/dist/server.js`.

### Verify

```
/plugin              # confirm `ballerina` is listed and enabled
```

Open a `.bal` file and confirm completions appear, or ask Claude to "write a Ballerina HTTP service".

## Using the skill

After restart, the `ballerina` skill is available in two ways:

**Automatically** — Claude loads it when your request matches Ballerina work:
> "Write a Ballerina HTTP service" / "Run the Ballerina project" / "Fix this .bal file"

**Manually** — invoke directly:
```
/ballerina <your request>
```

## Uninstall

```
/plugin uninstall ballerina@ballerina-claude-plugins
/plugin marketplace remove ballerina-claude-plugins
```

Then restart Claude Code.

## Skill reference files

The `ballerina` skill uses progressive disclosure — Claude loads these on demand:

| File | Loaded when |
|------|-------------|
| `code-rules.md` | Writing or modifying Ballerina code |
| `langlib-reference.md` | Looking up built-in language library APIs |
| `setup.md` | `bal` not found on the machine |
