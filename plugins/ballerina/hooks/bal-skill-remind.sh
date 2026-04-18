#!/usr/bin/env bash
input=$(cat)
fp=$(echo "$input" | jq -r '.tool_input.file_path // ""')

[[ "$fp" == *.bal ]] || exit 0

# Marker keyed on PPID — fires once per Claude Code process (session)
MARKER="${TMPDIR:-/tmp}/.ballerina-skill-${PPID}"
[[ -f "$MARKER" ]] && exit 0

touch "$MARKER"
cat <<'EOF'
You are about to write a Ballerina (.bal) file but the 'ballerina' skill has not been activated yet.
Invoke the 'ballerina' skill now to load the mandatory code rules, then retry this file operation.
EOF
exit 2
