#!/bin/bash
# PostToolUse (Edit|Write): typecheck + lint after every source edit.
# Exit 2 feeds errors straight back to Claude. No-ops until the app is scaffolded.
set -u
PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_DIR="$PROJ/.claude/hooks/.state"
COUNT_FILE="$STATE_DIR/fail-count"
mkdir -p "$STATE_DIR"

input=$(cat)
f=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')

case "$f" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac
[ -f "$PROJ/package.json" ] || exit 0
[ -d "$PROJ/node_modules" ] || exit 0

cd "$PROJ" || exit 0
errors=""

if [ -f tsconfig.json ]; then
  out=$(npx --no-install tsc --noEmit 2>&1) || errors="[tsc]
$out
"
fi
if ls eslint.config.* >/dev/null 2>&1; then
  out=$(npx --no-install eslint "$f" 2>&1) || errors="$errors[eslint $f]
$out
"
fi

if [ -n "$errors" ]; then
  n=$(($(cat "$COUNT_FILE" 2>/dev/null || echo 0) + 1))
  echo "$n" > "$COUNT_FILE"
  printf '%s' "$errors" | head -60 >&2
  exit 2
fi
echo 0 > "$COUNT_FILE"
exit 0
