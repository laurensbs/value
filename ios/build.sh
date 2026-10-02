#!/bin/zsh
# Build for the simulator and (re)install: ./build.sh
set -e
set -o pipefail
cd "$(dirname "$0")"
xcodegen generate --quiet
log=$(mktemp)
if xcodebuild -project Rondje.xcodeproj -scheme Rondje -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath build/dd build > "$log" 2>&1; then
  echo "** BUILD SUCCEEDED **"
else
  grep -E "error:" "$log" | sort -u
  echo "** BUILD FAILED **"
  exit 1
fi
