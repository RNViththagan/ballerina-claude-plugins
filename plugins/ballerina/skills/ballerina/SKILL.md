---
name: ballerina
description: Writes, runs, and tests Ballerina programs and integrations. Use when the user
  asks to write, create, implement, update, or fix Ballerina code; build an HTTP service
  or integration in Ballerina; run, test, or build a Ballerina project; or when the user
  does not have Ballerina installed and needs help setting it up.
---

## Writing Ballerina Code

**Step 1 — Read existing code**: Read `.bal` files to understand the project structure. Prefer modifying existing files over creating new ones.

**Step 2 — Discover libraries if needed**: If the task requires an external connector or library you don't know, invoke the `library` agent. It will search, fetch, and return a compact API summary. Use that summary to write the code.

**Step 3 — Write the code**: Follow all rules in [code-rules.md](code-rules.md). Key rules:
- Use records for all data — never `json` or `map<json>` directly
- Two-word camelCase for every identifier
- Named arguments for every function/method call

**Step 4 — Validate**: Run `bal build`. Fix errors and re-run. Repeat until clean. If unresolvable after multiple attempts, report what remains.

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
