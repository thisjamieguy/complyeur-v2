#!/usr/bin/env bash
set -euo pipefail

# Consume hook payload from stdin so the pipe is drained.
payload="$(cat || true)"

# Prefer hook-provided cwd when available.
hook_cwd="$(printf '%s' "$payload" | jq -r '.cwd // empty' 2>/dev/null || true)"
if [ -n "$hook_cwd" ] && [ -d "$hook_cwd" ]; then
  cd "$hook_cwd"
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  jq -n --arg msg "Claude stop hook: skipped TypeScript check (not a git repository)." '{systemMessage:$msg}'
  exit 0
fi

changed_ts_files="$(git status --porcelain --untracked-files=all -- '*.ts' '*.tsx')"
if [ -z "$changed_ts_files" ]; then
  jq -n --arg msg "Claude stop hook: no .ts/.tsx changes detected; skipped typecheck." '{systemMessage:$msg}'
  exit 0
fi

if ! tsc_output="$(npx tsc --noEmit 2>&1)"; then
  trimmed_output="$(printf '%s\n' "$tsc_output" | sed -n '1,200p')"
  reason="TypeScript errors were found after code generation. Please fix these issues before stopping:\n\n${trimmed_output}"
  jq -n --arg reason "$reason" '{decision:"block", reason:$reason}'
  exit 0
fi

jq -n --arg msg "Claude stop hook: TypeScript check passed (npx tsc --noEmit)." '{systemMessage:$msg}'
