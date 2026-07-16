#!/usr/bin/env bash
# Install 3:00 AM overnight pipeline for generic-tutor-web
set -euo pipefail

REPO="/Users/ding/projects/generic-tutor-web"
NODE_BIN="$(dirname "$(command -v node || true)")"
if [[ -z "${NODE_BIN}" || "${NODE_BIN}" == "." ]]; then
  # common nvm path on this machine
  NODE_BIN="/Users/ding/.nvm/versions/node/v22.22.3/bin"
fi
TSX="${REPO}/node_modules/.bin/tsx"
LOG="/tmp/tutor-web-overnight.log"
MARKER="# Tutor-web overnight pipeline"

# Load DEEPSEEK from environment or shell profile if present
ENV_EXPORT=""
if [[ -f "${REPO}/.env.local" ]]; then
  # shellcheck disable=SC2016
  ENV_EXPORT="set -a; source ${REPO}/.env.local 2>/dev/null; set +a;"
fi

CRON_LINE="0 3 * * * ${ENV_EXPORT} cd ${REPO} && PATH=\"${NODE_BIN}:\$PATH\" DEEPSEEK_API_KEY=\"\${DEEPSEEK_API_KEY}\" TUTOR_DATA_DIR=\"\${TUTOR_DATA_DIR:-\$HOME/workspace/generic-tutor-web}\" ${TSX} scripts/overnight-pipeline.ts >> ${LOG} 2>&1 ${MARKER}"

# Better: write a wrapper script that sources env
WRAPPER="${REPO}/scripts/run-overnight.sh"
cat > "${WRAPPER}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "${REPO}"
export PATH="${NODE_BIN}:\$PATH"
if [[ -f "${REPO}/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${REPO}/.env.local"
  set +a
fi
# shell-level key if not in .env.local
if [[ -z "\${DEEPSEEK_API_KEY:-}" && -f "\$HOME/.zshrc" ]]; then
  # try common export line without sourcing full zshrc interactively
  KEY_LINE=\$(grep -E '^export DEEPSEEK_API_KEY=' "\$HOME/.zshrc" 2>/dev/null | tail -1 || true)
  if [[ -n "\$KEY_LINE" ]]; then
    eval "\$KEY_LINE"
  fi
fi
export TUTOR_DATA_DIR="\${TUTOR_DATA_DIR:-\$HOME/workspace/generic-tutor-web}"
exec "${TSX}" scripts/overnight-pipeline.ts
EOF
chmod +x "${WRAPPER}"

FINAL_LINE="0 3 * * * ${WRAPPER} >> ${LOG} 2>&1 ${MARKER}"

EXISTING="$(crontab -l 2>/dev/null || true)"
if echo "${EXISTING}" | grep -q "Tutor-web overnight pipeline"; then
  echo "Overnight cron already installed. Updating…"
  NEW="$(echo "${EXISTING}" | grep -v "Tutor-web overnight pipeline")"
  printf "%s\n%s\n" "${NEW}" "${FINAL_LINE}" | crontab -
else
  printf "%s\n%s\n" "${EXISTING}" "${FINAL_LINE}" | crontab -
fi

echo "Installed:"
echo "  ${FINAL_LINE}"
echo "Log: ${LOG}"
crontab -l | grep -A0 "Tutor-web overnight" || true
