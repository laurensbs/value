#!/bin/zsh
# Build for the simulator and (re)install: ./build.sh
set -e
cd "$(dirname "$0")"
xcodegen generate --quiet
xcodebuild -project Rondje.xcodeproj -scheme Rondje -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath build/dd build 2>&1 | grep -E "error:|BUILD" | sort -u
