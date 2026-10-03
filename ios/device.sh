#!/bin/zsh
# Put Rondje on your own iPhone.
#
#   ./device.sh            # with a free Apple ID (Personal Team): works for 7 days, no push, no widget sharing
#   ./device.sh --paid     # with the paid Apple Developer Program: everything, including push
#
# Once: open Xcode > Settings > Accounts, add your Apple ID. Connect the iPhone with a cable,
# unlock it, tap "Vertrouw", and turn on Instellingen > Privacy en beveiliging > Ontwikkelaarsmodus.
set -e
set -o pipefail
cd "$(dirname "$0")"

TEAM=$(defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier 2>/dev/null | grep -o 'teamID = [A-Z0-9]*' | head -1 | awk '{print $3}')
[[ -z "$TEAM" ]] && TEAM=$(security find-identity -v -p codesigning | grep -o '([A-Z0-9]\{10\})' | head -1 | tr -d '()')
if [[ -z "$TEAM" ]]; then
  echo "Geen Apple-account gevonden. Open Xcode > Settings > Accounts en voeg je Apple ID toe."
  exit 1
fi

DEVICE=$(xcrun devicectl list devices 2>/dev/null | grep -E 'iPhone.*(connected|available)' | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | head -1)
if [[ -z "$DEVICE" ]]; then
  echo "Geen iPhone gevonden. Sluit hem aan met een kabel, ontgrendel hem en tik op 'Vertrouw'."
  exit 1
fi

extra=()
if [[ "$1" != "--paid" ]]; then
  # A free Personal Team cannot use push or App Groups, and needs a bundle id of its own.
  extra=(RONDJE_APP_ENTITLEMENTS=Rondje/Resources/Rondje.free.entitlements RONDJE_WIDGET_ENTITLEMENTS=RondjeWidgets/RondjeWidgets.free.entitlements "RONDJE_BUNDLE_ID=app.rondje.mobile.${TEAM:l}")
fi

xcodegen generate --quiet
echo "Bouwen voor je iPhone (team $TEAM)…"
xcodebuild -project Rondje.xcodeproj -scheme Rondje -configuration Release \
  -destination "id=$DEVICE" -derivedDataPath build/device -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$TEAM" CODE_SIGN_STYLE=Automatic "${extra[@]}" build | grep -E "error:|BUILD" | sort -u

APP=build/device/Build/Products/Release-iphoneos/Rondje.app
xcrun devicectl device install app --device "$DEVICE" "$APP"
echo "Klaar. Open Rondje op je iPhone. Eerste keer: Instellingen > Algemeen > VPN en apparaatbeheer > vertrouw je eigen ontwikkelaar."
