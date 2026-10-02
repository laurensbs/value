# Rondje voor iPhone (native)

Een echte iPhone-app in SwiftUI, naast de website. Hij praat met dezelfde server (`web/`) via een kleine app-API (`web/src/app/api/v1`), dus alle regels (18+, kennismaking eerst, quiz, vertrouwen, privacy) gelden precies zoals op de website.

## Wat de app doet

- **Inloggen** met e-mail en wachtwoord. De sessie staat alleen in de Keychain van het toestel.
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
- **Geluidjes** bij belangrijke momenten: aanvraag of bericht verstuurd, geaccepteerd, rondje start en af ("Goed rondje!"), nieuw niveau of badge, de ademminuut en een zachte toon bij een fout. Niet bij elke tik. Ze volgen de stilteschakelaar, onderbreken nooit muziek en staan onder Jij uit te zetten. `design/sounds.py` maakt ze zelf (geen downloads); de website speelt dezelfde bestanden uit `web/public/sounds`.
- **Apple Gezondheid** (staat nog uit, zie hieronder): als de gebruiker het aanzet, wordt een rondje een buitenwandeling met tijd, afstand en route (zonder de eerste en laatste 200 m, zodat het huis van de eigenaar er niet in staat) en de ademminuut een mindfulness-sessie. Met een aparte schakelaar ook de stemming na een rondje. Alles blijft op de iPhone; de app leest niets uit Gezondheid.

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

## Apple Gezondheid aanzetten

De code is klaar, maar staat uit (`RONDJE_FEATURE_HEALTH: NO` in `project.yml`, voor Debug en Release). Zolang het App ID geen HealthKit heeft, zou ondertekenen anders mislukken. Met de vlag uit is er onder Jij geen Gezondheid-onderdeel en roept de app HealthKit nergens aan.

1. Zet in het Apple Developer-account bij Certificates, Identifiers & Profiles → Identifiers → `app.rondje.mobile` de capability **HealthKit** aan en bewaar.
2. Zet in `project.yml`: `RONDJE_APP_ENTITLEMENTS: Rondje/Resources/Rondje.capabilities.entitlements` (dat is `Rondje.entitlements` plus de extra capabilities, waaronder HealthKit) en `RONDJE_FEATURE_HEALTH: YES`. Draai daarna `xcodegen generate`.
3. Bouw en kijk onder Jij: "Apple Gezondheid" staat er, standaard uit voor de gebruiker.
4. App Store Connect: de gezondheidsgegevens blijven op het toestel en gaan niet naar onze server, dus in het privacylabel tellen ze niet als "verzameld". Het privacybeleid moet wel noemen wat de app in Gezondheid bewaart (Apple vraagt dat voor HealthKit-apps), en vermeld bij de review waar de koppeling zit (Jij → Apple Gezondheid).

Alleen in de simulator proberen kan zonder account: `xcodebuild … RONDJE_FEATURE_HEALTH=YES RONDJE_APP_ENTITLEMENTS=Rondje/Resources/Rondje.capabilities.entitlements CODE_SIGN_IDENTITY=-`. Met een gratis Apple ID (`device.sh`) blijft het uit.

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
- Inloggen met Apple en passkeys in de app.
- De app in App Store Connect zetten (wacht op jouw akkoord: dat is een account en een publicatie).
