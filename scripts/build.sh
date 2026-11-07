#!/usr/bin/env bash
# Baut das Upload-Paket für Chrome Web Store / Edge Add-ons: dist/riff-looper-<version>.zip
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' extension/manifest.json)
mkdir -p dist
OUT="dist/riff-looper-${VERSION}.zip"
rm -f "$OUT"
(cd extension && zip -rq -X "../$OUT" . -x '.*' -x '__MACOSX/*')
echo "Fertig: $OUT"
unzip -l "$OUT"
