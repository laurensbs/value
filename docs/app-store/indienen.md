# Indienen bij Apple: checklist

> Stand: 5 oktober 2026. Alles wat Claude kon voorbereiden staat klaar. Wat overblijft, kost geld, vraagt een account of is het echte indienen: dat doet Laurens.
> De tekst voor de winkel staat in [`vermelding.md`](vermelding.md). De naam is gekozen: **Rondje Mee**, ondertitel "Wandel met een buurhond". Website en support: https://rondjemee.nl.

## 1. Wat Laurens doet (in deze volgorde)

1. **Naam vastleggen: Rondje Mee.** Vul hem in App Store Connect → Apps → + → Nieuwe app in (geen foutmelding = vrij, en dan is hij meteen van jou), en zoek in [TMview](https://www.tmdn.org/tmview) op "Rondje Mee" en "Rondje" in klasse 9, 42 en 45.
2. **Apple Developer Program** (€99 per jaar) op je eigen naam of je bedrijf. Na goedkeuring: zet je team-ID bij `DEVELOPMENT_TEAM` in `ios/project.yml`.
3. **App ID** `app.rondje.mobile` met de capabilities Push Notifications en App Groups (`group.app.rondje.mobile`). Sign in with Apple en HealthKit pas als je die functies aanzet (zie `ios/README.md`).
4. **App aanmaken** in App Store Connect met bundle-ID `app.rondje.mobile`, primaire taal Nederlands, SKU bijvoorbeeld `rondje-ios-1`.
5. **Build uploaden:** in Xcode Product → Archive met het Release-schema (praat met productie), dan Distribute App → App Store Connect. Eerst via **TestFlight** testen met een paar mensen.
6. **Gegevens invullen** met de antwoorden hieronder en de teksten uit `vermelding.md`.
7. **Indienen.**

## 2. Screenshots

In `screenshots/6.9/` (1320×2868, voor 6,9-inch iPhones) en `screenshots/6.5/` (1242×2688). App Store Connect schaalt deze zelf naar kleinere toestellen.

| # | Scherm | Wat het laat zien |
|---|---|---|
| 1 | Welkom | Gratis, geen reclame, 18+. **Opnieuw maken:** toont nog de oude titel "Rondje" in plaats van het woordmerk Rondje Mee (`01-1-welkom.jpg`, beide maten) |
| 2 | Ontdek | Honden in de buurt met afstand |
| 3 | Niveau en uitdaging | Vandaag-scherm met level, uitdaging en tip |
| 4 | Thuis voor eigenaren | Een aanvraag voor een kennismaking, met Guus die de volgende stap laat zien (`04-9-thuis-eigenaar.jpg`) |

De schermen tonen verzonnen voorbeelddata (Sam, Bobbie, Ria, Lotte, "Voorbeeld"). Dat mag. Maak nieuwe screenshots als het ontwerp verandert.

Geen screenshot met een kaart, een locatiepijltje in de statusbalk of een afstand, tijdens of na het rondje: live locatie staat in productie standaard uit (`LIVE_LOCATION`) en geldt alleen voor een rondje alleen met de hond. Elk screenshot moet kloppen in beide standen van die schakelaar (richtlijn 2.3). Het oude screenshot 4 ("Live rondje met kaart") is daarom vervangen door Thuis voor eigenaren, gemaakt op 5 oktober 2026 op de "iPhone 17"-simulator tegen een lokale server met verzonnen accounts.

**Welkom opnieuw maken of weglaten.** Screenshot 1 is van vóór de naam Rondje Mee: groot in beeld staat "Rondje". Maak hem opnieuw op de "iPhone 17"-simulator met de huidige build (het welkomstscherm toont het woordmerk), of laat hem weg. Het invulblad raadt weglaten sowieso aan: alleen een inlogscherm, en "Gratis" in beeld (richtlijn 2.3.3 en 2.3.7). Dan blijven er drie over.

**Uit de set tot ze opnieuw gemaakt zijn** (5 oktober 2026). Vier screenshots is genoeg om in te dienen; Apple vraagt er minstens één.
- **Na het rondje** (was `05-13-na-het-rondje.jpg`): toonde een kaart achter het scherm, het locatiepijltje, "liepen 0 m" en de titel "Goed rondje!", die niet meer in de app staat. Opnieuw maken met een rondje zonder live locatie (bijvoorbeeld een kennismaking): geen kaart, de titel "Rondje klaar!", de tegel Tijd en de vraag "En hoe voel je je nu?".
- **Vriendenboek** (was `06-11-vriendenboek.jpg`): toonde "245 m samen gelopen" bij een hond met "Net kennisgemaakt". Een kennismaking legt nooit een route vast, en met live locatie uit is elke afstand 0. Het vriendenboek toont nu altijd de tegel "samen gelopen", ook als dat "0 m" is. Maak dit screenshot pas opnieuw als die tegel zonder afstand wegblijft, of laat het weg.

## 3. Privacylabel (App Privacy in App Store Connect)

"Do you or your third-party partners collect data from this app?" → **Ja**. Niets wordt gebruikt voor tracking of advertenties.

| Gegevenstype | Verzameld | Gekoppeld aan de gebruiker | Doel |
|---|---|---|---|
| Contactgegevens: naam | ja | ja | App-functionaliteit |
| Contactgegevens: e-mailadres | ja | ja | App-functionaliteit (inloggen, meldingen) |
| Contactgegevens: telefoonnummer | ja (optioneel) | ja | App-functionaliteit (contact na acceptatie) |
| Locatie: precieze locatie | ja, alleen tijdens een rondje alleen met de hond, als live locatie aan staat | ja | App-functionaliteit (de eigenaar kijkt live mee; routes na 30 dagen gewist). Vul dit ook in zolang live locatie op de server uit staat: de schakelaar kan aan zonder nieuwe app-versie |
| Locatie: grove locatie | ja: je buurt (ook via "Gebruik mijn buurt") en de plek van een hond, bewaard afgerond op ~500 m (`fuzzLatLng` in `web/src/lib/geo.ts`). De iPhone rondt zijn positie vóór het versturen al af op ~1 km (`LocationService.roughPosition`); de positie waarmee Ontdek honden sorteert, wordt niet bewaard | ja | App-functionaliteit (honden in de buurt) |
| Gebruikersinhoud: foto's | ja | ja | App-functionaliteit (profiel, honden, wandelfoto's) |
| Gebruikersinhoud: berichten | ja | ja | App-functionaliteit (chat per afspraak) |
| Gebruikersinhoud: overige (feedback, meldingen) | ja | ja | App-functionaliteit, veiligheid |
| Identificatoren: gebruikers-ID | ja | ja | App-functionaliteit |
| Diagnostiek | nee | | |
| Gezondheid en fitness | **nee** | | Apple Gezondheid blijft op het toestel en gaat niet naar onze server. Stemming na een rondje ook. |
| Gebruiksgegevens / analytics | nee | | Web Analytics telt niet in de app |
| Financiële gegevens, aankopen | nee | | Geen geld in de app |

## 4. Leeftijdsclassificatie

- De app is voor 18+ (gecontroleerd bij de onboarding). Contact tussen gebruikers via chat en ontmoetingen in het echt.
- Vragenlijst: geen geweld, geen grof taalgebruik, geen gokken, geen medische behandeling.
- **Gebruikerscontact / user-generated content: ja**. Er zijn melden, blokkeren en moderatie (verplicht voor apps met chat: richtlijn 1.2).
- Verwachte uitkomst: de hoogste leeftijdsgrens (18+). Dat past bij Rondje Mee.

## 5. Review-notities (App Review Information)

- **Testaccount:** maak vlak voor het indienen een account op productie met een eigen adres op rondjemee.nl, rond de onboarding af (18+, plaats Utrecht), en zet e-mail en wachtwoord **alleen in App Store Connect**, nooit in de repo of een chat.
- **Notitie (Engels):**
  > Rondje Mee connects people (18+) with dogs of neighbours who can no longer walk far, and with shelter dogs on supervised group walks. The app is free: no ads, no in-app purchases, and nothing is paid inside the app. To try it: sign in with the test account. In Ontdek (Discover), dogs labelled "Voorbeeld" (example) are sample content: by design they cannot be requested. Walking alone is only possible after an in-person meeting, an ID check by the owner and the owner's permission for that dog (enforced on our server). In a chat, the "..." menu lets you report or block the other person; every dog page has a "..." menu to report the dog or its owner. Account deletion: Jij > Account verwijderen. Sign in with Apple or Google is not switched on in this build.
- De volledige notitie met demo-stappen, moderatie, locatie en HELP ONS staat in het invulblad van Laurens, buiten de repo: `~/Projecten/Rondje/_werk/apple/app-store-connect-invullen.md`, **stap 8** ("App Review-informatie" → "Notitie voor Apple (Engels, plakklaar)"). Gebruik die versie; deze korte notitie is de basis. Het blok LOCATION IN THE BACKGROUND daarin is woord voor woord de locatiezin uit §6 hieronder, en punt 4 belooft geen schermopname. Hoe je het demo-account maakt (rol "allebei") en wanneer een schermopname van een rondje wel mag, staat in **stap 9**. Pas je de locatiezin aan, doe het dan op beide plekken.
- **Notitie over "Help ons" (Engels, plak hem onder de notitie hierboven).** In de apps staan precies twee rustige ingangen, nooit bovenaan: het blok "Help ons!" onderaan de voorpagina (de pagina vóór het inloggen) en één rij "Help ons via Whydonate" laag onder Jij. Er is geen link in de footer. Beide openen jouw actie op Whydonate in Safari, leveren niets op in de app en volgen dezelfde schakelaar (`SUPPORT_IN_APP`, voor iOS `SUPPORT_IN_APP_IOS`). Check vóór het plakken dat de actie op Whydonate live staat, op jouw naam, en dat de ingangen in de build zichtbaar zijn (`/api/v1/config` met `X-Rondje-Platform: ios` geeft `"support":{"inApp":true,…}`). Plak de notitie die past bij de build die je indient:
  - **De schil om de website** (`web/ios`, Capacitor) heeft beide ingangen:
    > About "Help ons" (Dutch for "Help us"): the app has two quiet entries for a fundraiser, never at the top of a screen. 1) The row "Help ons via Whydonate" ("Support us via Whydonate") at the bottom of the Jij (Profile) tab, just above Sign out. 2) The block "Help ons!" ("Help us!") with the button "Geef een rondje" ("Support us") at the very bottom of the start page that shows before you sign in, below everything else. Both are plain links to a crowdfunding page on Whydonate that I, the developer, run to cover the costs of building and running Rondje Mee. I pass 10% of all gifts on to good causes for dogs and people in the neighbourhood, as stated on rondjemee.nl/support. Tapping either one opens that page in Safari; the link never opens inside the app's web view. Nothing is paid, donated or bought inside the app: no checkout and no in-app purchase. Giving is optional and unlocks nothing in the app (no features, content, status or priority), and no digital content is involved. Rondje Mee is not a registered charity and does not say it is, and a gift is not tax-deductible. Both entries are shown by our server and share one switch. If you prefer the iOS app without them, please tell us and we will switch them off for iOS permanently.
  - **De native iPhone-app** (`ios/`, bundle-ID uit `ios/project.yml`) heeft geen voorpagina met dat blok, alleen de rij onder Jij:
    > About "Help ons" (Dutch for "Help us"): the app has one quiet entry for a fundraiser, the row "Help ons via Whydonate" ("Support us via Whydonate") at the bottom of the Jij (Profile) tab, just above Sign out. It is a plain link to a crowdfunding page on Whydonate that I, the developer, run to cover the costs of building and running Rondje Mee. I pass 10% of all gifts on to good causes for dogs and people in the neighbourhood, as stated on rondjemee.nl/support. Tapping it opens that page in Safari. Nothing is paid, donated or bought inside the app: there is no in-app web view, no checkout and no in-app purchase. Giving is optional and unlocks nothing in the app (no features, content, status or priority), and no digital content is involved. Rondje Mee is not a registered charity and does not say it is, and a gift is not tax-deductible. The row's link and goal come from our server (/api/v1/config). If you prefer the iOS app without this row, please tell us and we will switch it off for iOS permanently.
- **Wijst Apple "Help ons" af:** zet `SUPPORT_IN_APP_IOS=0` in Vercel (Production), redeploy, controleer dat `/api/v1/config` met `X-Rondje-Platform: ios` nu `"inApp":false` geeft, en plak bij de nieuwe indiening:
  > We removed "Help ons" (the link to our fundraiser on Whydonate) from the iOS app for good. It is switched off for iOS on our server, so no version of the iOS app shows it anywhere, and the app has no other way to give or pay.

  Zet hem daarna niet zelf weer aan: de schakelaar werkt meteen voor elke versie die al in de App Store staat. Alleen als Apple er later uitdrukkelijk mee instemt.
- **Contact:** jouw naam, telefoon en e-mail (alleen in App Store Connect).

## 6. Waar Apple op kan afwijzen (en wat al geregeld is)

| Risico | Richtlijn | Stand |
|---|---|---|
| Account verwijderen in de app | 5.1.1(v) | ✅ Jij → Account verwijderen (`DELETE /api/v1/me`, `ProfileView.swift`) |
| Melden en blokkeren bij chat | 1.2 | ✅ In de chat zit een "..."-menu om te melden of te blokkeren (`Features/Chat/ChatView.swift`); op een hondenpagina kun je melden. |
| Inloggen met Google zonder Sign in with Apple | 4.8 | ✅ Beide staan uit (`RONDJE_FEATURE_SOCIAL_LOGIN: NO`). Zet je Google aan in de app, zet dan ook Sign in with Apple aan. |
| **Geld inzamelen vanuit de app** | 3.1.1, 3.2.2, 2.3.1 | ⚠️ In de apps staan precies twee rustige ingangen, nooit bovenaan: de rij "Help ons via Whydonate" laag onder Jij en het blok "Help ons!" onderaan de voorpagina (alleen in de schil om de website; de native app heeft alleen de rij). Geen footerlink. Ze openen de crowdfunding in Safari: geen betaling, geen webview of tussenscherm in de app, en geven levert niets op in de app. Volgens 3.2.2 mag een gratis app geld voor een inzameling alleen buiten de app ophalen, bijvoorbeeld via Safari; dat doen deze ingangen, maar Apple beslist per geval. Rondje Mee is (nog) geen erkende stichting en zegt dat nergens; een gift is niet aftrekbaar. **De ingangen blijven zichtbaar tijdens de review** en staan uitgelegd in de review-notitie (§5). Zet ze nooit uit om ze voor de reviewers te verbergen en daarna weer aan: een functie die Apple niet te zien krijgt en die daarna wel verschijnt, is een verborgen functie (2.3.1), en dat kan het hele ontwikkelaarsaccount kosten. Wijst Apple ze af: `SUPPORT_IN_APP_IOS=0`, voorgoed (§5). |
| Apple Gezondheid zonder duidelijk doel | 5.1.3, 2.5.1 | ✅ Staat uit (`RONDJE_FEATURE_HEALTH: NO`). Zet je het aan: privacybeleid aanvullen en in de review-notitie uitleggen waar de koppeling zit. |
| Gezondheidsclaims | 1.4.1 | ✅ Geen claims in app en vermelding ("kan je dag goed doen"); hulplijnen zichtbaar |
| Locatie op de achtergrond | 5.1.1, 2.5.4 | De app vraagt `UIBackgroundModes: location`, alleen voor een rondje alleen met de hond en alleen als live locatie op de server aan staat. De reviewer ziet wel één locatievraag (tijdens gebruik): Ontdek vraagt die bij het openen (`DiscoverView.swift`), en de knop "Gebruik mijn buurt" in de onboarding ook. Daarvoor wordt de plek op de telefoon afgerond op ongeveer 1 km (`LocationService.roughPosition`). Wat de server bewaart (je buurt, de plek van een hond) is afgerond op ongeveer 500 m (`fuzzLatLng`). De winkeltekst en het privacylabel (§3) noemen allebei; de locatievraag van iOS en de review-notitie gaan over de positie van de telefoon en noemen dus de 1 km. De uitlegteksten bij die vraag (`NSLocationWhenInUseUsageDescription` en `NSLocationAlwaysAndWhenInUseUsageDescription` in `Info.plist` en `InfoPlist.xcstrings`) noemen live meekijken alleen "bij een rondje alleen met de hond, als live locatie aan staat". Zet in de review-notitie (in het invulblad is dit het blok LOCATION IN THE BACKGROUND): "Background location is used only on a walk alone with the dog while live location is switched on on our server, so the owner can follow along; it stops when the walk ends. A first meeting or a shelter group walk never uses location. Live location is off for everyone until our privacy assessment is done: no walk uses location, and a walk alone cannot be requested. You will see one location prompt (while using the app) when Discover opens, or earlier at 'Gebruik mijn buurt' (Use my area) in sign-up. It shows dogs near you; the phone rounds the position to about 1 km before sending it." Staat live locatie aan bij het indienen, vervang dan de zin "Live location is off for everyone ... cannot be requested." door: "Live location is switched on; a walk alone can only start after an in-person meeting, an ID check and the owner's permission." |
| Export-compliance | | Alleen standaard HTTPS → "Uses encryption: Yes, only exempt (standard) encryption" |

## 7. Na goedkeuring

- Zet de naam en de link in de lanceerhub (taak "Indienen bij Apple").
- Website: vervang "Binnenkort in de App Store" door de echte App Store-knop.
