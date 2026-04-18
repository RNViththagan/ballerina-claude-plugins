#!/usr/bin/env bash
input=$(cat)
tool=$(echo "$input" | jq -r '.tool_name // .tool // ""')

case "$tool" in
  Write|Edit)
    fp=$(echo "$input" | jq -r '.tool_input.file_path // ""')
    [[ "$fp" == *.bal ]] || exit 0
    ;;
  Bash)
    cmd=$(echo "$input" | jq -r '.tool_input.command // ""')
    echo "$cmd" | grep -qE '\bbal\s+(new|run|build|test|add|push|pull|format|doc)\b' || exit 0
    ;;
  *)
    exit 0
    ;;
esac

# Marker keyed on PPID — fires once per Claude Code process (session)
MARKER="${TMPDIR:-/tmp}/.ballerina-skill-${PPID}"
[[ -f "$MARKER" ]] && exit 0

touch "$MARKER"
cat <<'EOF'
<system-reminder>
You are about to work with Ballerina but the 'ballerina' skill has not been activated yet.
Invoke the 'ballerina' skill now to load the mandatory code rules, then retry this operation.
</system-reminder>
EOF
exit 2
