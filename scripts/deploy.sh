#!/usr/bin/env bash
# Copies a release to the folder qBittorrent's "Files location" setting points to,
# then checks that the server is serving it.
#
# Settings, from the environment or a git-ignored .deploy.env file:
#   DEPLOY_TARGET  The "Files location" folder: user@host:/path/to/qbitwebber, or a local path
#   DEPLOY_URL     The WebUI address, with its trailing slash
#   RELEASE_REPO   owner/repo to download from (default: this clone's origin)
#
# Usage:
#   scripts/deploy.sh [--zip file.zip] [version]    version defaults to the latest release
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .deploy.env ] && . ./.deploy.env

zip_file=""
version="latest"
while [ $# -gt 0 ]; do
  case "$1" in
    --zip) zip_file="${2:?--zip needs a file}"; shift 2 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) version="$1"; shift ;;
  esac
done

: "${DEPLOY_TARGET:?Set DEPLOY_TARGET to the Files location folder}"
: "${DEPLOY_URL:?Set DEPLOY_URL to the WebUI address}"
DEPLOY_URL="${DEPLOY_URL%/}/"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

if [ -z "$zip_file" ]; then
  repo="${RELEASE_REPO:-$(git remote get-url origin | sed -E 's#(\.git)?$##; s#.*github\.com[:/]##')}"
  if [ "$version" = latest ]; then
    url="https://github.com/$repo/releases/latest/download/qbitwebber-release.zip"
  else
    url="https://github.com/$repo/releases/download/$version/qbitwebber-release.zip"
  fi
  echo "Downloading $url"
  zip_file="$work/release.zip"
  curl -fsSL "$url" -o "$zip_file"
fi

unzip -q "$zip_file" -d "$work/unpacked"
public="$work/unpacked/qbitwebber/public"
[ -f "$public/index.html" ] || { echo "The zip has no qbitwebber/public/index.html" >&2; exit 1; }
bundle="$(sed -nE 's#.*assets/(index-[^"]+\.js).*#\1#p' "$public/index.html" | head -1)"
[ -n "$bundle" ] || { echo "Couldn't find the app's file name in index.html" >&2; exit 1; }

# Refuse a wrong folder rather than creating files in it.
case "$DEPLOY_TARGET" in
  *:*)
    host="${DEPLOY_TARGET%%:*}"
    path="${DEPLOY_TARGET#*:}"
    ssh "$host" test -f "$(printf '%q' "$path")/public/index.html" \
      || { echo "No public/index.html in $DEPLOY_TARGET. Is that the Files location folder?" >&2; exit 1; }
    ;;
  *)
    [ -f "$DEPLOY_TARGET/public/index.html" ] \
      || { echo "No public/index.html in $DEPLOY_TARGET. Is that the Files location folder?" >&2; exit 1; }
    ;;
esac

echo "Copying to $DEPLOY_TARGET/public/"
# index.html goes last, so it never points to files that haven't arrived yet.
rsync -rt --exclude index.html "$public/" "$DEPLOY_TARGET/public/"
rsync -t "$public/index.html" "$DEPLOY_TARGET/public/index.html"

echo "Checking $DEPLOY_URL"
if curl -fsSL -H 'Cache-Control: no-cache' "$DEPLOY_URL" | grep -qF "assets/$bundle"; then
  echo "Done: the server is serving $bundle"
else
  echo "Copied, but the server isn't serving $bundle yet. Check the Files location setting." >&2
  exit 1
fi
