#!/bin/bash
# Download database from GitHub Releases for Vercel deployment.
#
# Called by vercel.json buildCommand before TypeScript compilation.
# The database.db.gz asset must be published to the matching
# GitHub Release (vX.Y.Z tag) before deploying.
#
# To publish:
#   gzip -k data/database.db
#   gh release create v$(node -p "require('./package.json').version") data/database.db.gz
set -e

VERSION=$(node -p "require('./package.json').version")
REPO="Ansvar-Systems/Ireland-law-mcp"
TAG="v${VERSION}"
ASSET="database.db.gz"
OUTPUT="data/database.db"

# Skip if already exists (local development)
if [ -f "$OUTPUT" ]; then
  echo "[download-db] Database already exists at $OUTPUT, skipping download"
  exit 0
fi

URL="https://github.com/${REPO}/releases/download/${TAG}/${ASSET}"
echo "[download-db] Downloading database..."
echo "  URL: ${URL}"

mkdir -p data
curl -fSL --retry 3 --retry-delay 5 "$URL" | gunzip > "${OUTPUT}.tmp"
mv "${OUTPUT}.tmp" "$OUTPUT"

SIZE=$(ls -lh "$OUTPUT" | awk '{print $5}')
echo "[download-db] Database ready: $OUTPUT ($SIZE)"
