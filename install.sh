#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash install.sh codex
  bash install.sh workbuddy
  bash install.sh agents /path/to/project
  bash install.sh qclaw /path/to/project

Targets:
  codex      Install to ${CODEX_HOME:-$HOME/.codex}/skills/japanese-visual-lesson-ppt
  workbuddy  Install to $HOME/.workbuddy/skills/japanese-visual-lesson-ppt
  agents     Install to <project>/.agents/skills/japanese-visual-lesson-ppt
  qclaw      Alias of agents
EOF
}

copy_skill() {
  local dest="$1"
  local src
  src="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  mkdir -p "$dest"
  rsync -a --delete \
    --exclude='.git' \
    --exclude='.DS_Store' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='README.md' \
    --exclude='install.sh' \
    "$src"/ "$dest"/

  printf 'Installed japanese-visual-lesson-ppt to %s\n' "$dest"
}

target="${1:-}"
case "$target" in
  codex)
    copy_skill "${CODEX_HOME:-$HOME/.codex}/skills/japanese-visual-lesson-ppt"
    ;;
  workbuddy)
    copy_skill "$HOME/.workbuddy/skills/japanese-visual-lesson-ppt"
    ;;
  agents|qclaw)
    project="${2:-$PWD}"
    copy_skill "$project/.agents/skills/japanese-visual-lesson-ppt"
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    printf 'Unknown target: %s\n\n' "$target" >&2
    usage >&2
    exit 2
    ;;
esac
