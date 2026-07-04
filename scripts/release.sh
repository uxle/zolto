#!/usr/bin/env bash
# scripts/release.sh — Tag and push a new release
set -euo pipefail
VERSION="${1:-}"
if [ -z "$VERSION" ]; then echo "Usage: ./scripts/release.sh 2.1.0"; exit 1; fi
echo "Releasing v$VERSION ..."
node tests/run-all.js
git add -A
git commit -m "chore(release): v$VERSION"
git tag "v$VERSION"
git push origin main "v$VERSION"
echo "Released v$VERSION ✓"
