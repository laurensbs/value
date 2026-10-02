# Rondje voor iPhone (native)

Een echte iPhone-app in SwiftUI, naast de website. Hij praat met dezelfde server (`web/`) via een kleine app-API (`web/src/app/api/v1`), dus alle regels (18+, kennismaking eerst, quiz, vertrouwen, privacy) gelden precies zoals op de website.

## Wat de app doet

- **Inloggen** met e-mail en wachtwoord. De sessie staat alleen in de Keychain van het toestel.
- **Profiel maken** in vier korte stappen, met de gedragscode en voorwaarden.
- **Ontdekken**: honden in de buurt als lijst of op de kaart (op hun buurt, nooit op een adres), filters, zoeken en groepswandelingen bij opvangen.
- **Hondpagina** met alles wat een wandelaar moet weten, een aanvraag voor een kennismaking of een zelfstandig rondje, en melden of blokkeren.
- **Afspraken** voor wandelaars en eigenaren: accepteren, weigeren, annuleren, contact (pas na acceptatie) en vertrouwen geven (ID gezien, zelfstandig wandelen).
- **Live wandelen**: GPS-route, tijd en afstand, een SOS-scherm (112, eigenaar, dierenarts, wat te doen), afronden door vast te houden, en privé-feedback. Op het toegangsscherm en in het Dynamic Island loopt een Live Activity mee.
- **Meekijken** voor de eigenaar of opvang, live op de kaart.
- **Jij**: kenmerken, veiligheidsquiz, eigen honden toevoegen (met foto's), meldingen, account verwijderen in de app.
- **Lid worden**: de belofte (gratis, geen reclame) en de goede doelen. Geven gaat via de website in Safari, tot Rondje een stichting met ANBI-status is.
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

## De naam veranderen

De naam staat op één plek: `APP_DISPLAY_NAME` in `project.yml`. `Brand.swift` leest hem uit, dus alle schermen volgen vanzelf. De goede doelen staan ook in `Brand.swift`.

## Beelden

Het app-icoon (licht, donker en getint) komt uit `design/icon.mjs`: het merkteken van de website (het rondje met de bal) met een hond erin. De hondenportretten in de app zijn dezelfde getekende portretten als op de website (`DogFace`), geen foto's van echte honden.

## Nog te doen

- Pushmeldingen (APNs): de server stuurt nu e-mail en meldingen in de app, nog geen push.
- Inloggen met Apple en passkeys in de app.
- De app in App Store Connect zetten (wacht op jouw akkoord: dat is een account en een publicatie).
