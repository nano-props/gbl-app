#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME=Goblin
DEST="$HOME/Applications"
BINARY_PATH_FRAGMENT="/$APP_NAME.app/Contents/MacOS/"
WAS_RUNNING=false
if pgrep -f "$BINARY_PATH_FRAGMENT" > /dev/null; then
  WAS_RUNNING=true
fi

# Go through bun to match `package.json`'s `build` script — the build
# script itself shells out to `bun install` / `bun run ...`, so requiring
# bun here keeps the toolchain assumption in one place.
bun scripts/build.ts install

if [ "$WAS_RUNNING" = true ]; then
  echo "Restarting $APP_NAME..."
  open "$DEST/$APP_NAME.app"
fi
