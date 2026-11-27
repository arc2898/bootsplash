#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-4173}"
printf 'Bootsplash Studio is available at http://127.0.0.1:%s\n' "$PORT"
printf 'Press Ctrl+C to stop. The server only listens on localhost.\n'
exec python3 -m http.server "$PORT" --bind 127.0.0.1
