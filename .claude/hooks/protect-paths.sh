#!/bin/bash
# PreToolUse (Bash): block catastrophic commands. Safety net, not a sandbox —
# pattern-based, so unusual quoting can slip through; pair with low permission modes.
set -u
PROJ="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cmd=$(cat | jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

# recursive force rm: block ~, $HOME, .., and absolute paths outside project/tmp
if printf '%s' "$cmd" | grep -Eq '(^|[;&|[:space:]])rm[[:space:]]+-[a-zA-Z]*([rR][a-zA-Z]*f|f[a-zA-Z]*[rR])'; then
  if printf '%s' "$cmd" | grep -q '\.\.'; then
    deny "Blocked: rm -rf with parent-directory traversal (..)."
  fi
  if printf '%s' "$cmd" | grep -Eq '(^|[[:space:]])["'\'']?(~|\$HOME)'; then
    deny "Blocked: rm -rf targeting home directory. Delete a specific project path instead, or ask the user."
  fi
  if printf '%s' "$cmd" | grep -Eq '(^|[[:space:]])["'\'']?/' \
     && ! printf '%s' "$cmd" | grep -Eq '(^|[[:space:]])["'\'']?('"$PROJ"'|/tmp|/private/tmp)'; then
    deny "Blocked: rm -rf on an absolute path outside the project and /tmp. Ask the user."
  fi
fi

# force push: require --force-with-lease or user approval
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push' \
   && printf '%s' "$cmd" | grep -Eq '(--force([[:space:]]|$)|[[:space:]]-f([[:space:]]|$))' \
   && ! printf '%s' "$cmd" | grep -q 'force-with-lease'; then
  deny "Blocked: git push --force. Use --force-with-lease, or ask the user."
fi

# database drops
if printf '%s' "$cmd" | grep -Eiq 'drop[[:space:]]+(table|database|schema)[[:space:]]'; then
  deny "Blocked: SQL DROP statement in a shell command. Ask the user first."
fi

exit 0
