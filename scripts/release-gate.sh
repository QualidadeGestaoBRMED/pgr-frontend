#!/usr/bin/env bash
set -euo pipefail

echo "[release-gate] npm ci"
npm ci

echo "[release-gate] lint"
npm run lint

echo "[release-gate] build"
npm run build

echo "[release-gate] OK"
