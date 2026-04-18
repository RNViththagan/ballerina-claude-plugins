---
name: ballerina
description: Writes, runs, and tests Ballerina programs and integrations. Use when the user
  asks to write, create, implement, update, or fix Ballerina code; create or set up a new
  Ballerina project or package; build an HTTP service, API, or integration in Ballerina;
  run, test, or build a Ballerina project; add a library or dependency; or when the user
  does not have Ballerina installed and needs help setting it up.
---

## Creating a New Project

When the user asks to create a new project, service, or program from scratch:

```bash
bal new <project-name>   # scaffolds main.bal + Ballerina.toml
cd <project-name>
bal build                # confirm baseline compiles before writing code
```

- Read the generated `Ballerina.toml` to understand the package (name, org, version)
- For a workspace (multiple packages in one repo), see workspace rules in [code-rules.md](code-rules.md)

## Writing Ballerina Code

**Step 1 — Read existing code**: Read `.bal` files and `Ballerina.toml` to understand the project structure. Prefer modifying existing files over creating new ones.

**Step 2 — Discover libraries if needed**: If the task requires an external connector or library you don't know, invoke the `library` agent. It will search, fetch, and return a compact API summary. Then add the `import` statement to your `.bal` file — Ballerina auto-resolves dependencies from Central when you run `bal build`.
- **Never edit `Dependencies.toml`** — it is auto-managed by the build tool.
- **Never edit `Ballerina.toml` to add dependencies** — imports + `bal build` handle this automatically.

**Step 3 — Write the code**: Follow all rules in [code-rules.md](code-rules.md). Key rules:
- Use records for all data — never `json` or `map<json>` directly
- Two-word camelCase for every identifier
- Named arguments for every function/method call

**Step 4 — Validate**: Run `bal build`. Fix every error before moving on. Repeat until clean. If unresolvable after multiple attempts, report what remains with file and line number.

For langlib API quick reference: [langlib-reference.md](langlib-reference.md)

## Running and Testing

- Test request → `bal test`; otherwise → `bal run`
- Always run `bal build` first — if errors, stop and report each one with file and line number
- On run: show full output; stop any started service when done
- On test: state what is being tested, show pass/fail count, fix failures and re-run

## Troubleshooting

When the user reports an error, failure, or unexpected behavior, read [troubleshooting.md](troubleshooting.md) to diagnose and resolve it. Start with the Quick Fixes Cheat Sheet — it covers the most common errors. Use the Table of Contents to find the relevant deep-dive section.

## Ballerina Not Installed

If a `bal` command fails because Ballerina is not installed, read [setup.md](setup.md) for installation instructions.
