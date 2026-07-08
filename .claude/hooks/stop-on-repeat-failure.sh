#!/bin/bash
# Stop hook: if checks failed 2+ times in a row, block the stop once and force a reassess.
set -u
PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
COUNT_FILE="$PROJ/.claude/hooks/.state/fail-count"

input=$(cat)
active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false')
[ "$active" = "true" ] && exit 0

n=$(cat "$COUNT_FILE" 2>/dev/null || echo 0)
case "$n" in ''|*[!0-9]*) exit 0 ;; esac

if [ "$n" -ge 2 ]; then
  echo 0 > "$COUNT_FILE" # fire once per failure streak
  echo "Checks have failed $n times in a row. Stop retrying the same fix: re-read the actual error, reassess the approach, narrow the problem to a smaller repro, or ask the user. State your new hypothesis before editing again." >&2
  exit 2
fi
exit 0
