#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Backend build"
npm run build

echo "[2/4] Backend tests"
npm test

echo "[3/4] Frontend lint + build"
cd frontend
npm run lint
npm run build
cd ..

echo "[4/4] E2E smoke"
BOOT_STACK="${BOOT_STACK:-1}" KEEP_STACK="${KEEP_STACK:-0}" npm run test:e2e:smoke

echo "Release verification passed"
