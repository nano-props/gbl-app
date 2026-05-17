#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Go through bun to match `package.json`'s `build` script — the build
# script itself shells out to `bun install` / `bun run ...`, so requiring
# bun here keeps the toolchain assumption in one place.
exec bun scripts/build.ts install
