# Indienen bij Apple: checklist

> Stand: 3 oktober 2026. Alles wat Claude kon voorbereiden staat klaar. Wat overblijft, kost geld, vraagt een account of is het echte indienen: dat doet Laurens.
> De tekst voor de winkel staat in [`vermelding.md`](vermelding.md). De naam staat daar als `{{NAAM}}` tot de keuze (Woofmigo of Rondje) is gemaakt.

## 1. Wat Laurens doet (in deze volgorde)

1. **Naam kiezen.** Check in App Store Connect → Apps → + → Nieuwe app of de naam vrij is (geen foutmelding = vrij, en dan is hij meteen van jou), en zoek in [TMview](https://www.tmdn.org/tmview) op de naam en op "WOOF" en "MIGO" in klasse 9, 42 en 45.
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
| 1 | Welkom | Gratis, geen reclame, 18+ |
| 2 | Ontdek | Honden in de buurt met afstand |
| 3 | Niveau en uitdaging | Vandaag-scherm met level, uitdaging en tip |
| 4 | Wandelen | Live rondje met kaart |
| 5 | Na het rondje | "Goed rondje!" met stemming (alleen op het toestel) |
| 6 | Vriendenboek | Elke hond waarmee je liep |

De schermen tonen verzonnen voorbeelddata (Sam, Bobbie, "Voorbeeld"). Dat mag. Maak nieuwe screenshots als het ontwerp verandert.

## 3. Privacylabel (App Privacy in App Store Connect)

"Do you or your third-party partners collect data from this app?" → **Ja**. Niets wordt gebruikt voor tracking of advertenties.

| Gegevenstype | Verzameld | Gekoppeld aan de gebruiker | Doel |
|---|---|---|---|
| Contactgegevens: naam | ja | ja | App-functionaliteit |
| Contactgegevens: e-mailadres | ja | ja | App-functionaliteit (inloggen, meldingen) |
| Contactgegevens: telefoonnummer | ja (optioneel) | ja | App-functionaliteit (contact na acceptatie) |
| Locatie: precieze locatie | ja, alleen tijdens een rondje | ja | App-functionaliteit (live meekijken; routes na 30 dagen gewist) |
| Locatie: grove locatie | ja (afgerond tot ~500 m) | ja | App-functionaliteit (honden in de buurt) |
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
- Verwachte uitkomst: de hoogste leeftijdsgrens (18+). Dat past bij Rondje.

## 5. Review-notities (App Review Information)

- **Testaccount:** maak vlak voor het indienen een account op productie met een adres als `review@<jouw-domein>`, rond de onboarding af (18+, plaats Utrecht), en zet e-mail en wachtwoord **alleen in App Store Connect**, nooit in de repo of een chat.
- **Notitie (Engels):**
  > Rondje connects young adults with dogs of older neighbours and shelter dogs for walks. Free, no ads, no in-app purchases. To try it: sign in with the test account, open Ontdek (Discover), pick a dog marked "Voorbeeld" (example), and request a meeting. Walking alone is only possible after an in-person meeting and the owner's permission (enforced server-side). Users can report and block from every profile and chat. Account deletion: Jij → Account verwijderen. The app does not offer Sign in with Apple yet because it offers no third-party login.
- **Contact:** jouw naam, telefoon en e-mail (alleen in App Store Connect).

## 6. Waar Apple op kan afwijzen (en wat al geregeld is)

| Risico | Richtlijn | Stand |
|---|---|---|
| Account verwijderen in de app | 5.1.1(v) | ✅ Jij → Account verwijderen (`DELETE /api/v1/me`, `ProfileView.swift`) |
| Melden en blokkeren bij chat | 1.2 | ⚠️ In de app: melden kan bij een hond of profiel, maar **nog niet vanuit de chat** (op de website wel). Voeg vóór het indienen een meld-/blokkeerknop toe in `Features/Chat/ChatView.swift` (API `/api/v1/reports` en `/api/v1/blocks` bestaan al). |
| Inloggen met Google zonder Sign in with Apple | 4.8 | ✅ Beide staan uit (`RONDJE_FEATURE_SOCIAL_LOGIN: NO`). Zet je Google aan in de app, zet dan ook Sign in with Apple aan. |
| **Geld inzamelen vanuit de app** | 3.1.1, 3.2.2 | ⚠️ "Word lid" is weg. Onder Jij staat laag één rij "Help ons via Whydonate" die de crowdfunding in Safari opent (geen betaling, geen webview of tussenscherm in de app). Rondje is (nog) geen erkende stichting. **Advies: zet `SUPPORT_IN_APP=0` in Vercel (Production) tijdens de review**; dan verdwijnt elke ingang in de app (`HelpUs.swift`, `support` in `/api/v1/config`). Daarna weer op `1`. |
| Apple Gezondheid zonder duidelijk doel | 5.1.3, 2.5.1 | ✅ Staat uit (`RONDJE_FEATURE_HEALTH: NO`). Zet je het aan: privacybeleid aanvullen en in de review-notitie uitleggen waar de koppeling zit. |
| Gezondheidsclaims | 1.4.1 | ✅ Geen claims in app en vermelding ("kan je dag goed doen"); hulplijnen zichtbaar |
| Locatie op de achtergrond | 5.1.1, 2.5.4 | De app vraagt `UIBackgroundModes: location` (alleen tijdens een rondje). Zet in de review-notitie: "background location is only used during an active walk so the owner can follow along; it stops when the walk ends". |
| Export-compliance | | Alleen standaard HTTPS → "Uses encryption: Yes, only exempt (standard) encryption" |

## 7. Na goedkeuring

- Zet de naam en de link in de lanceerhub (taak "Indienen bij Apple").
- Website: vervang "Binnenkort in de App Store" door de echte App Store-knop.
