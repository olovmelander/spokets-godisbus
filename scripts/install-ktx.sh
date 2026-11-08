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

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
# GitHub's release downloads sometimes answer 504 for a moment (CI, 5 November 2026), and on 8 November for the best
# part of an hour, off and on, which failed a deploy: try again for up to ten minutes before failing.
FETCH=(curl --fail --silent --show-error --location --retry 30 --retry-delay 20 --retry-max-time 600 --retry-all-errors)
"${FETCH[@]}" --output "$WORK/$FILE" "$BASE/$FILE"
"${FETCH[@]}" --output "$WORK/$FILE.sha1" "$BASE/$FILE.sha1"
EXPECTED="$(awk '{print $1}' "$WORK/$FILE.sha1")"
ACTUAL="$(sha1sum "$WORK/$FILE" | awk '{print $1}')"
if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "install-ktx: the checksum of $FILE does not match" >&2
  exit 1
fi
sudo dpkg -i "$WORK/$FILE"
ktx --version
