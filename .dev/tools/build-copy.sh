#!/bin/bash
# Copies only the app's own files (what goes into the ZAB) into a folder of their own, for `zeus build` and
# `zeus preview`. zeus packs every file it finds outside dot folders, so docs/ (pictures, scripts) and
# arhiva/ must not be next to the app when it builds. Nothing in the target is deleted; its node_modules and
# dist stay.
#
# Usage: bash .dev/tools/build-copy.sh ~/Claude/rallypal-store
#        cd ~/Claude/rallypal-store && npm install && zeus build

set -e
DEST="${1:?usage: build-copy.sh <target folder>}"
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "$DEST"
for f in app.js app.json package.json jsconfig.json global.d.ts .gitignore; do
  cp "$SRC/$f" "$DEST/$f"
done
for d in page shared utils app-service app-side app-widget setting assets; do
  rm -rf "$DEST/$d"
  cp -R "$SRC/$d" "$DEST/$d"
done
echo "App files copied to $DEST"
