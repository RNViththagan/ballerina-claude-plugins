# `bal library` Tool Setup

Read this file when `bal library` fails with `command not found`, `unknown command 'library'`, or similar — it means the [bal-library-tool](https://github.com/RNViththagan/bal-library-tool) is not installed yet.

This tool extends the `bal` CLI with `bal library search` and `bal library get`, which the `library` discovery sub-agent depends on. It is **install-once-per-machine**.

## Prerequisites

- Ballerina is already installed (`bal version` works). If not, read [setup.md](setup.md) first.
- OpenJDK 21+ (`java -version`). The Ballerina runtime already needs this — same JDK works.
- A GitHub Personal Access Token with `read:packages` scope. The `bal-library-tool` source repo is public, but its Gradle build pulls Maven artifacts from `maven.pkg.github.com/ballerina-platform/*` — and GitHub Packages requires authentication for Maven downloads even when the artifacts themselves are public. Any GitHub account works; the token only needs `read:packages`.

## Install

```bash
# 1. Export your GitHub PAT with read:packages scope
export packageUser=<your-github-username>
export packagePAT=<your-personal-access-token>

# 2. Clone, build, install
git clone https://github.com/RNViththagan/bal-library-tool.git
cd bal-library-tool
./gradlew clean build
./install-local.sh        # registers it as a bal tool
```

## Verify

```bash
bal library search http
# Should return a ranked list of HTTP-related Ballerina libraries
```

If `bal library` still isn't found after installing:

- Run `bal tool list` — confirm `library` appears in the output.
- If it's missing, re-run `./install-local.sh` from the `bal-library-tool` directory.
- If `gradlew` failed earlier (auth error pulling dependencies), recheck `packageUser` / `packagePAT` exports.

## What this tool provides

| Command                       | Purpose                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `bal library search <terms>`  | Search Ballerina packages by keyword (returns name + description, up to 9 results) |
| `bal library get <org/name>`  | Fetch full API details for one or more packages (clients, functions, types) |

Both back the `library` sub-agent's discovery workflow.
