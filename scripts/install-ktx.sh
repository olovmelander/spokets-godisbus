#!/usr/bin/env bash
# Installs the KTX-Software `ktx` tool on Linux: CI, and cloud sessions (plan §6.11).
# The version is pinned, and the download is checked against the release's own SHA-1 file.
set -euo pipefail

VERSION=4.4.2
FILE="KTX-Software-${VERSION}-Linux-x86_64.deb"
BASE="https://github.com/KhronosGroup/KTX-Software/releases/download/v${VERSION}"

if command -v ktx >/dev/null 2>&1 && ktx --version | grep -q "v${VERSION}"; then
  echo "ktx ${VERSION} is already installed"
  exit 0
fi

# The download is kept in KTX_CACHE, which CI saves between runs (ci.yml, deploy.yml): most runs never fetch it.
CACHE="${KTX_CACHE:-$HOME/.cache/ktx}"
mkdir -p "$CACHE"
# GitHub's release downloads sometimes answer 504 for a moment (CI, 5 November 2026), and on 8 November for the best
# part of an hour, off and on, which failed a deploy: try again for up to ten minutes before failing.
FETCH=(curl --fail --silent --show-error --location --retry 30 --retry-delay 20 --retry-max-time 600 --retry-all-errors)
for NAME in "$FILE" "$FILE.sha1"; do
  if [ ! -s "$CACHE/$NAME" ]; then
    "${FETCH[@]}" --output "$CACHE/$NAME.part" "$BASE/$NAME"
    mv "$CACHE/$NAME.part" "$CACHE/$NAME"
  fi
done
EXPECTED="$(awk '{print $1}' "$CACHE/$FILE.sha1")"
ACTUAL="$(sha1sum "$CACHE/$FILE" | awk '{print $1}')"
if [ "$EXPECTED" != "$ACTUAL" ]; then
  # A bad copy is not kept: the next run fetches it again.
  rm -f "$CACHE/$FILE" "$CACHE/$FILE.sha1"
  echo "install-ktx: the checksum of $FILE does not match" >&2
  exit 1
fi
sudo dpkg -i "$CACHE/$FILE"
ktx --version
