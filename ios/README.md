# Rondje voor iPhone (native)

Een echte iPhone-app in SwiftUI, naast de website. Hij praat met dezelfde server (`web/`) via een kleine app-API (`web/src/app/api/v1`), dus alle regels (18+, kennismaking eerst, quiz, vertrouwen, privacy) gelden precies zoals op de website.

## Wat de app doet

- **Inloggen** met e-mail en wachtwoord, en (zodra aangezet, zie hieronder) met Apple of Google: hetzelfde account als op de website. De sessie staat alleen in de Keychain van het toestel.
- **Intro en rol**: bij de eerste start kies je "Ik wil wandelen", "Ik heb een hond" of "Allebei". De intro, de tabs en het beginscherm passen zich daarop aan; eigenaren krijgen een eigen Thuis-scherm. Wisselen kan altijd onder Jij.
- **Profiel maken** in vier korte stappen, met de gedragscode en voorwaarden.
- **Ontdekken**: honden in de buurt als lijst of op de kaart (op hun buurt, nooit op een adres), filters, zoeken en groepswandelingen bij opvangen.
- **Hondpagina** met alles wat een wandelaar moet weten, een aanvraag voor een kennismaking of een zelfstandig rondje, en melden of blokkeren.
- **Afspraken** voor wandelaars en eigenaren: accepteren, weigeren, annuleren, contact (pas na acceptatie) en vertrouwen geven (ID gezien, zelfstandig wandelen).
- **Live wandelen**: GPS-route, tijd en afstand, een SOS-scherm (112, eigenaar, dierenarts, wat te doen), afronden door vast te houden, en privé-feedback. Op het toegangsscherm en in het Dynamic Island loopt een Live Activity mee.
- **Meekijken** voor de eigenaar of opvang, live op de kaart.
- **Jij**: kenmerken, veiligheidsquiz, eigen honden toevoegen (met foto's), meldingen, account verwijderen in de app.
- **Lid worden**: de belofte (gratis, geen reclame) en de goede doelen. Geven gaat via de website in Safari, tot Rondje een stichting met ANBI-status is.
- **Rondje-rapport**: tijdens het wandelen plas, poep en drinken aantikken en foto's sturen; de eigenaar ziet het live.
- **Chat** per afspraak tussen wandelaar en eigenaar, met een waarschuwing bij berichten over geld.
- **Pushmeldingen** voor aanvragen, chat en rondjes, zodra de Apple-pushsleutel op de server staat.
- **Herinneringen** een half uur vóór elke geaccepteerde afspraak (lokaal op de telefoon, zonder server).
- **Widget** "Volgende rondje" voor het beginscherm en het toegangsscherm.

## Veiligheid en privacy

- Het sessietoken staat in de Keychain (`AfterFirstUnlockThisDeviceOnly`), nooit in UserDefaults of in de code. Een nieuwe installatie gebruikt nooit een oude sessie.
- De app-API accepteert alleen `Authorization: Bearer`. Een cookie uit een browser kan deze API dus niet aanroepen (geen CSRF).
- Er staan geen sleutels of geheimen in de app. De server-URL komt uit de build-instelling `RONDJE_API_BASE_URL`.
- Locatie: voor het zoeken van honden wordt je plek afgerond op ongeveer 1 km en niet opgeslagen. Precieze GPS loopt alleen tijdens een rondje, met de blauwe locatie-indicator van iOS, en stopt bij het afronden.
- Foto's worden in de app verkleind en opnieuw opgeslagen, zodat er geen locatie of andere EXIF-gegevens meegaan.
- `PrivacyInfo.xcprivacy` beschrijft welke gegevens de app gebruikt: geen tracking.

## Zelf draaien

Je hebt Xcode 26 en [XcodeGen](https://github.com/yonaskolb/XcodeGen) nodig (`brew install xcodegen`).

```bash
cd web && npx next dev -p 3100
```

```bash
cd ios && ./build.sh
```

Open daarna `ios/Rondje.xcodeproj` in Xcode en kies een iPhone-simulator. Debug-builds praten met `http://localhost:3100`, release-builds met `https://rondje-five.vercel.app`. De productie-API werkt pas als deze branch daar is uitgerold.

Voor een echte iPhone of de App Store: zet je team bij `DEVELOPMENT_TEAM` in `project.yml` en zet de App Group `group.app.rondje.mobile` aan in het Apple Developer-portaal.

## Inloggen met Apple en Google aanzetten

Staat standaard uit (`RONDJE_FEATURE_SOCIAL_LOGIN: NO` in `project.yml`). De knoppen verschijnen pas als die schakelaar op `YES` staat én de server de aanbieder noemt in `GET /api/v1/config` (`auth.providers`, en `auth.appleNative` voor het Apple-venster in de app).

1. Apple Developer-account (betaald): zet bij de App ID `app.rondje.mobile` de capability **Sign in with Apple** aan.
2. Server (Vercel): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` en `APPLE_APP_BUNDLE_ID=app.rondje.mobile` (zie `web/README.md`).
3. In `project.yml`, onder `settings.base`:
   - `RONDJE_FEATURE_SOCIAL_LOGIN: YES`
   - `RONDJE_APP_ENTITLEMENTS: Rondje/Resources/Rondje.capabilities.entitlements` (dezelfde rechten als `Rondje.entitlements`, plus Sign in with Apple)
4. `xcodegen generate` en opnieuw bouwen.

Zonder stap 1 mislukt het ondertekenen met `Rondje.capabilities.entitlements`; laat dan `Rondje.entitlements` staan. Een build zonder de capability (ook `./device.sh` met een gratis Apple ID) toont Apple via de website in plaats van het Apple-venster. Google loopt altijd via een veilig browservenster (ASWebAuthenticationSession met PKCE), zonder extra SDK.

Om de knoppen lokaal te bekijken zonder sleutels: start een Debug-build met het launch-argument `-RondjeForceSocial YES`.

## Talen

De app is er in het Nederlands (de brontaal), Engels, Frans en Spaans, net als de website. Alle teksten staan in `Rondje/Resources/Localizable.xcstrings`. Nieuwe of gewijzigde tekst vertalen gaat zo:

1. Zet de Nederlandse tekst met de vertalingen in `design/translations.py`.
2. Draai `python3 design/localize.py` in `ios/`. Het script meldt welke teksten nog geen vertaling hebben.

## De naam veranderen

De naam staat op één plek: `APP_DISPLAY_NAME` in `project.yml`. `Brand.swift` leest hem uit, dus alle schermen volgen vanzelf. De goede doelen staan ook in `Brand.swift`.

## Beelden

Het app-icoon (licht, donker en getint) komt uit `design/icon.mjs`: het merkteken van de website (het rondje met de bal) met een hond erin. De hondenportretten in de app zijn dezelfde getekende portretten als op de website (`DogFace`), geen foto's van echte honden.

## Nog te doen

- Pushmeldingen werken pas als APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY en APNS_BUNDLE_ID in Vercel staan (zie docs/LAUNCH.md). Daarvoor is een Apple Developer-account nodig.
- Inloggen met Apple en Google aanzetten (zie hierboven; wacht op het Apple Developer-account en de sleutels). Passkeys in de app.
- De app in App Store Connect zetten (wacht op jouw akkoord: dat is een account en een publicatie).
