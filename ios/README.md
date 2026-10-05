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
- **Help ons**: één rij laag onder Jij, "Help ons via Whydonate", die de crowdfunding in één tik in de browser opent (nooit betalen in de app, geen tussenscherm). Onder de titel: in het Nederlands "Geef een rondje vanaf € 5 · Doel: 600 rondjes", in het Engels, Frans en Spaans het doel in euro's ("From €5 · Goal: €3,000"), nooit als prijs per wandeling. De rij staat er alleen als `/api/v1/config` een `support` met `inApp: true` en een https-link naar een bekend platform stuurt. De app stuurt `X-Rondje-Platform: ios` mee, dus `SUPPORT_IN_APP_IOS=0` op de server zet hem uit voor de iPhone (leeg: volgt `SUPPORT_IN_APP`). Nooit om hem tijdens App Review te verbergen: hij blijft zichtbaar en staat in de review-notitie (`docs/app-store/indienen.md`); uit gaat hij alleen voorgoed, als Apple hem afwijst. Voor screenshots zonder zo'n server: launch-argument `-RondjeStubSupport YES` (alleen Debug).
- **Bijgewerkte voorwaarden** (artikel 19): staat je akkoord op een oudere versie, dan zie je onder Jij een rustige melding. Die opent een blad met wat er verandert (de tekst komt van de server, in de taal van de app), een link naar de volledige voorwaarden in Safari en één knop "Akkoord" (`POST /api/v1/terms/accept`). "Akkoord" staat er alleen als de lijst met wijzigingen op het scherm staat; lukt het laden niet, dan zegt het blad dat rustig en is er geen knop. Vóór de ingangsdatum vraagt de app nergens om je akkoord. Daarna antwoordt de server bij een aanvraag, accepteren, een rondje starten of meedoen met een groepswandeling `needs-terms`; dan komt hetzelfde blad, en na "Akkoord" gaat de handeling alsnog door. Weigeren, annuleren en een rondje afronden wachten nooit. Oudere servers sturen hier niets over; dan vraagt de app ook niets (`Core/Terms.swift`).
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
- Live locatie kan op de server voor iedereen uit (`LIVE_LOCATION`, bijvoorbeeld tot de DPIA klaar is). De app leest dat uit `/api/v1/config` (`features.liveLocation`; ontbreekt het, dan staat het aan) vlak voordat een rondje start. Staat het uit, dan vraagt de app geen locatietoestemming voor het rondje, start er geen GPS en geen achtergrondlocatie, gaat er geen enkel punt naar de server, en staan er geen kaart en geen afstand op het scherm van wandelaar en eigenaar; een rustige zin zegt waarom. Een kennismaking (de eigenaar is erbij) start gewoon; een rondje alleen met de hond niet, en de Start-knop zegt waarom. Gaat de schakelaar tijdens een rondje uit, dan stopt de GPS meteen (`Core/LiveLocation.swift`, `WalkTracker`).
- Ook met de schakelaar aan deelt alleen een rondje alleen met de hond je locatie (zoals `walkHasLiveLocation` op de website). Bij een kennismaking start er nooit GPS en staat er geen kaart, bij wandelaar en eigenaar: "Jullie lopen samen, dus er is geen kaart nodig." De server zegt het per rondje (`liveLocation` bij `POST /api/v1/walks`, `kind` en `liveLocation` in `/live`); oudere servers zeggen het niet, en dan beslist de app zelf met dezelfde regel. Antwoordt de server op punten met `403 live-location-off`, dan stopt de GPS en worden de wachtende punten weggegooid; een batch die de server als `invalid` weigert, blijft ook niet hangen.
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

Open daarna `ios/Rondje.xcodeproj` in Xcode en kies een iPhone-simulator. Debug-builds praten met `http://localhost:3100`, release-builds met `https://rondjemee.nl`. De productie-API werkt pas als deze branch daar is uitgerold.

Voor een echte iPhone of de App Store: zet je team bij `DEVELOPMENT_TEAM` in `project.yml` en zet de App Group `group.app.rondje.mobile` aan in het Apple Developer-portaal.

## Apple Gezondheid aanzetten

De code is klaar, maar staat uit (`RONDJE_FEATURE_HEALTH: NO` in `project.yml`, voor Debug en Release). Zolang het App ID geen HealthKit heeft, zou ondertekenen anders mislukken. Met de vlag uit is er onder Jij geen Gezondheid-onderdeel en roept de app HealthKit nergens aan.

1. Zet in het Apple Developer-account bij Certificates, Identifiers & Profiles → Identifiers → `app.rondje.mobile` de capability **HealthKit** aan en bewaar.
2. Zet in `project.yml`: `RONDJE_APP_ENTITLEMENTS: Rondje/Resources/Rondje.capabilities.entitlements` (dat is `Rondje.entitlements` plus de extra capabilities, waaronder HealthKit) en `RONDJE_FEATURE_HEALTH: YES`. Draai daarna `xcodegen generate`.
3. Bouw en kijk onder Jij: "Apple Gezondheid" staat er, standaard uit voor de gebruiker.
4. App Store Connect: de gezondheidsgegevens blijven op het toestel en gaan niet naar onze server, dus in het privacylabel tellen ze niet als "verzameld". Het privacybeleid moet wel noemen wat de app in Gezondheid bewaart (Apple vraagt dat voor HealthKit-apps), en vermeld bij de review waar de koppeling zit (Jij → Apple Gezondheid).

Alleen in de simulator proberen kan zonder account: `xcodebuild … RONDJE_FEATURE_HEALTH=YES RONDJE_APP_ENTITLEMENTS=Rondje/Resources/Rondje.capabilities.entitlements CODE_SIGN_IDENTITY=-`. Met een gratis Apple ID (`device.sh`) blijft het uit.
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

Welke taal de app toont, kiest iOS: de taal van de telefoon, of de keuze per app onder Instellingen › Apps › Rondje Mee › Taal. Jij › Instellingen › Taal / Language opent die pagina (`LanguageRow`), en `UIPrefersShowingLanguageSettings` in `Info.plist` zorgt dat iOS de keuze ook toont als de telefoon maar één taal heeft. De app stuurt dezelfde taal als `Accept-Language` mee (`AppLanguage.code`), zodat teksten van de server erbij passen. Geef een tekst die in een `String`-parameter belandt altijd door `L(...)`: `TextField("…")` met een `String` wordt niet vertaald.

## De naam veranderen

De naam staat op één plek: `APP_DISPLAY_NAME` in `project.yml`. `Brand.swift` leest hem uit, dus alle schermen volgen vanzelf. De goede doelen staan ook in `Brand.swift`.

## Beelden

Het app-icoon (licht, donker en getint) en het woordmerk op het welkomstscherm komen uit `design/icon.mjs`: het logo "rondje mee" met de tennisbal als punt op de j, gestapeld op het icoon. De bronnen zijn de SVG's in `design/` en `design/brand/`. De hondenportretten in de app zijn dezelfde getekende portretten als op de website (`DogFace`), geen foto's van echte honden.

## Nog te doen

- Pushmeldingen werken pas als APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY en APNS_BUNDLE_ID in Vercel staan (zie docs/LAUNCH.md). Daarvoor is een Apple Developer-account nodig.
- Inloggen met Apple en Google aanzetten (zie hierboven; wacht op het Apple Developer-account en de sleutels). Passkeys in de app.
- De app in App Store Connect zetten (wacht op jouw akkoord: dat is een account en een publicatie).
