# ballerina

Ballerina language support for Claude Code — LSP code intelligence and AI coding assistant.

## What it provides

- **Language Server**: code completions, go-to-definition, hover, semantic highlighting, and diagnostics for `.bal` files
- **`ballerina` skill**: write integrations and services, run and test projects

## Prerequisites

- Ballerina >= 2201.12.0 (Swan Lake Update 12+)
- `bal` command available in PATH

## Installation

```
/plugin marketplace add /path/to/ballerina-claude-plugins
/plugin install ballerina@ballerina-claude-plugins
```

Then restart Claude Code to activate the skill.

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
