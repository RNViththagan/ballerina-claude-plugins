# ballerina

Ballerina language support for Claude Code — LSP code intelligence and AI coding assistant.

## What it provides

- **Language Server**: code completions, go-to-definition, hover, semantic highlighting, and diagnostics for `.bal` files
- **`ballerina` skill**: write integrations and services, discover libraries on Ballerina Central, run and test projects

## Prerequisites

- Ballerina >= 2201.12.0 (Swan Lake Update 12+)
- `bal` command available in PATH

If Ballerina is not installed, the skill will guide you through setup automatically.

## Installation

```
/plugin install /path/to/ballerina-claude-plugins
/plugin enable ballerina
```

## Skill reference files

The `writing-ballerina` skill uses progressive disclosure — Claude loads these on demand:

| File | Loaded when |
|------|-------------|
| `setup.md` | `bal` not found on the machine |
| `code-rules.md` | Writing or modifying Ballerina code |
| `langlib-reference.md` | Looking up built-in language library APIs |
| `library-discovery.md` | Searching for packages on Ballerina Central |
| `run-and-test.md` | Running or testing a Ballerina project |
