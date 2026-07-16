#!/usr/bin/env bash
set -euo pipefail
cd "/Users/ding/projects/generic-tutor-web"
export PATH="/Users/ding/.nvm/versions/node/v22.22.3/bin:$PATH"
if [[ -f "/Users/ding/projects/generic-tutor-web/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "/Users/ding/projects/generic-tutor-web/.env.local"
  set +a
fi
# shell-level key if not in .env.local
if [[ -z "${DEEPSEEK_API_KEY:-}" && -f "$HOME/.zshrc" ]]; then
  # try common export line without sourcing full zshrc interactively
  KEY_LINE=$(grep -E '^export DEEPSEEK_API_KEY=' "$HOME/.zshrc" 2>/dev/null | tail -1 || true)
  if [[ -n "$KEY_LINE" ]]; then
    eval "$KEY_LINE"
  fi
fi
export TUTOR_DATA_DIR="${TUTOR_DATA_DIR:-$HOME/workspace/generic-tutor-web}"
exec "/Users/ding/projects/generic-tutor-web/node_modules/.bin/tsx" scripts/overnight-pipeline.ts
