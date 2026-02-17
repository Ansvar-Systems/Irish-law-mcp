#!/bin/bash
# Download database from GitHub Releases for Vercel deployment.
#
# Called by vercel.json buildCommand before TypeScript compilation.
# The database.db.gz asset must be published to the matching
# GitHub Release (vX.Y.Z tag) before deploying.
#
# For private repositories, set GITHUB_TOKEN so the script can
# fetch release metadata and download the asset via GitHub API.
set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
REPO="Ansvar-Systems/Ireland-law-mcp"
TAG="v${VERSION}"
ASSET="database.db.gz"
OUTPUT="data/database.db"
TMP_OUTPUT="${OUTPUT}.tmp"
BUNDLED_GZ="data/database.db.gz"

download_public_release_asset() {
  local url
  url="https://github.com/${REPO}/releases/download/${TAG}/${ASSET}"
  echo "[download-db] Attempting public release asset download..."
  echo "  URL: ${url}"
  curl -fSL --retry 3 --retry-delay 5 "$url" | gunzip > "$TMP_OUTPUT"
}

download_private_release_asset() {
  local auth_token
  auth_token="${GH_RELEASE_TOKEN:-${GITHUB_TOKEN:-}}"

  if [ -z "$auth_token" ]; then
    return 1
  fi

  echo "[download-db] Attempting authenticated release asset download..."
  local release_api
  release_api="https://api.github.com/repos/${REPO}/releases/tags/${TAG}"

  local asset_api_url
  asset_api_url="$(
    curl -fsSL \
      -H "Authorization: Bearer ${auth_token}" \
      -H "Accept: application/vnd.github+json" \
      "$release_api" \
      | node -e "
          const fs = require('fs');
          const assetName = process.argv[1];
          const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
          const asset = payload.assets?.find((item) => item.name === assetName);
          if (!asset?.url) {
            console.error('[download-db] Release asset not found in GitHub API response.');
            process.exit(2);
          }
          process.stdout.write(asset.url);
        " "$ASSET"
  )"

  curl -fsSL \
    -H "Authorization: Bearer ${auth_token}" \
    -H "Accept: application/octet-stream" \
    "$asset_api_url" | gunzip > "$TMP_OUTPUT"
}

# Skip if already exists (local development or prebuilt context)
if [ -f "$OUTPUT" ]; then
  echo "[download-db] Database already exists at $OUTPUT, skipping download"
  exit 0
fi

mkdir -p "$(dirname "$OUTPUT")"
rm -f "$TMP_OUTPUT"

if [ -f "$BUNDLED_GZ" ]; then
  echo "[download-db] Using bundled database archive at $BUNDLED_GZ"
  gunzip -c "$BUNDLED_GZ" > "$TMP_OUTPUT"
  mv "$TMP_OUTPUT" "$OUTPUT"
  SIZE=$(ls -lh "$OUTPUT" | awk '{print $5}')
  echo "[download-db] Database ready: $OUTPUT ($SIZE)"
  exit 0
fi

if ! download_public_release_asset; then
  rm -f "$TMP_OUTPUT"
  if ! download_private_release_asset; then
    echo "[download-db] Failed to download ${ASSET} for tag ${TAG}."
    echo "[download-db] Ensure the release asset exists and set GH_RELEASE_TOKEN (or GITHUB_TOKEN) for private repos."
    exit 1
  fi
fi

mv "$TMP_OUTPUT" "$OUTPUT"

SIZE=$(ls -lh "$OUTPUT" | awk '{print $5}')
echo "[download-db] Database ready: $OUTPUT ($SIZE)"
