---
title: Juridische review – checklist voor de jurist
version: "0.1"
updated: "2026-10-02"
status: "Concept – nog niet juridisch getoetst"
---

# Juridische review: checklist voor de jurist

Deze checklist hoort bij de conceptdocumenten van Rondje. Hij somt per land alle aannames en open punten op, zodat een jurist gericht kan toetsen.

**Documenten** (Nederlands is leidend; en/es/fr zijn vertalingen):

| Document | Pad |
|---|---|
| Algemene voorwaarden | `web/content/legal/{taal}/terms.md` |
| Privacyverklaring | `web/content/legal/{taal}/privacy.md` |
| Gedragscode | `web/content/legal/{taal}/conduct.md` |
| Veiligheids- en incidentprotocol | `web/content/legal/{taal}/safety.md` |
| Partnervoorwaarden voor opvangen | `web/content/legal/{taal}/shelters.md` |
| Cookieverklaring | `web/content/legal/{taal}/cookies.md` |
| Toestemmingsformulier foto en video | `docs/legal/media-consent.md` |

**Markeringen in de teksten:** `[te controleren]` / `[to verify]` / `[pendiente de verificar]` / `[à vérifier]` = onzeker of niet nagekeken. `[voorstel]` = een keuze die nog bevestigd moet worden. Placeholders tussen blokhaken (zoals `[KvK-nummer]`, `[bedrag]`) moeten worden ingevuld.

**Sinds 5 oktober 2026** staan deze markeringen en placeholders niet meer zichtbaar in de teksten op de site: ze zijn opgelost met neutrale formuleringen of weggehaald, en de aanbieder is Laurens Bos (bereikbaar via het contactadres, zonder adres of KvK-nummer). De test `web/src/lib/legal-placeholders.test.ts` bewaakt dat er geen nieuwe bijkomen. De inhoudelijke punten hieronder blijven open tot de jurist ze heeft getoetst.

**Tweede ronde, 5 oktober 2026:** de teksten zeggen niets meer als feit dat (nog) niet klopt. De DPIA staat er als "nog niet klaar", Vercel Web Analytics (zonder cookies) staat in de privacy- en cookieverklaring, de regio's en doorgiftegronden van Vercel, Neon en Resend zijn nagekeken, het profiel noemt de geboortedatum en precies wat eigenaren en opvangen van een wandelaar zien, meldingen worden echt 2 jaar na afsluiten verwijderd (`web/src/app/api/cron/cleanup/route.ts`), en de steun loopt via Whydonate. De voorwaarden zijn nu versie 0.3. Alle wijzigingen, bronnen en open vragen: `~/Projecten/Rondje/_werk/jurist/wijzigingen-2026-10-05.md` (buiten de repo).

**Derde ronde, 5 oktober 2026:** de DPIA is af vóór de eerste echte wandeling met live locatie (privacy art. 14, was "voordat Rondje Mee breed live gaat"), en voorwaarden art. 8 zegt nu ook dat 10% van alle giften naar goede doelen voor honden en mensen in de buurt gaat, zoals op /support (`web/content/crowdfunding.json`, `shareToCausesPercent`; de test bewaakt dat de voorwaarden hetzelfde getal noemen). Versies blijven 0.3 (voorwaarden) en 0.4 (privacy): die zijn nog niet live geweest.

**Belangrijk:** alle teksten zijn geschreven zonder toegang tot actuele bronnen (geen webonderzoek). Wetsartikelen, nummers en drempels moeten allemaal worden nagekeken.

Prioriteit: **H** = hoog (vóór lancering oplossen), **M** = middel, **L** = laag.

## 1. Samenvatting: de grootste risico's

1. **Aansprakelijkheid kan bij de wandelaar komen te liggen, die vaak niet verzekerd is (H).** In België ("bewaarder", nieuw Boek 6 BW) en Spanje (art. 1905 CC: "el que se sirve de él") kan de wandelaar zelf risicoaansprakelijk zijn. Particuliere aansprakelijkheidspolissen sluiten schade aan zaken of dieren "onder opzicht" vaak uit. Zo ontstaan onverzekerde vrijwilligers en ontevreden eigenaren.
2. **Herkwalificatie van Rondje als organisator van vrijwilligerswerk (H).** Hoe meer Rondje stuurt (quiz, beperkingen, solo-vertrouwen, moderatie), hoe meer het lijkt op een organisatie die vrijwilligers inzet. Gevolgen: de Belgische vrijwilligerswet (aansprakelijkheid en verplichte verzekering), art. 6:170 BW (ondergeschikten) en de Spaanse Ley 45/2015.
3. **Eigen zorgplicht van Rondje en beperkte exoneratie (H).** Veiligheidsfuncties wekken verwachtingen. Een beperking van aansprakelijkheid tegenover consumenten staat onder druk: art. 6:237 sub f BW (grijze lijst), art. VI.83 WER (zwarte lijst), art. 86 TRLGDCU.
4. **Privacy: live locatie, kwetsbare gebruikers, meldingen met beschuldigingen van strafbare feiten (H).** Een DPIA is nodig vóór lancering. Ook nodig: een toets aan art. 10 AVG en art. 33 UAVG voor uitsluitingslijsten, en een beleid voor inzageverzoeken versus privé-feedback.
5. **Spanje: PPP-honden en Ley 7/2023 (H).** De PPP-vergunning is zelf verklaard. De regels verschillen per regio. De verzekeringsplicht uit Ley 7/2023 hangt af van uitvoeringsregels. Rondje faciliteert dus mogelijk overtredingen.

Daarnaast: de rechtspersoon bestaat nog niet ("i.o."). Wie namens een niet-bestaande rechtspersoon handelt, loopt persoonlijk risico. **Niet lanceren vóór de oprichting.**

## 2. Algemeen (alle landen)

### 2.1 Positie van Rondje als tussenpersoon

- [ ] **H** Toets of de positionering "zuiver tussenpersoon, geen partij bij de afspraak" standhoudt, gezien de veiligheidsfuncties: kennismakingsplicht, quiz, beperkingen voor nieuwe accounts, PPP-filter, live locatie en moderatie.
- [ ] **H** Toets het risico op een eigen onrechtmatige daad door onvoldoende veiligheidsmaatregelen (zorgplicht, Kelderluik-criteria) en hoe dat zich verhoudt tot het streven om binnen 24 uur te reageren op meldingen.
- [ ] **M** Toets of de hosting-vrijstelling (art. 6 DSA) iets toevoegt. Die geldt voor aansprakelijkheid voor inhoud, niet voor fysieke incidenten.
- [ ] **M** Communicatie en marketing: gebruik geen claims als "geverifieerde wandelaars" of "veilig". Rondje bewaart geen ID en de check doet de eigenaar. Anders dreigt misleiding (oneerlijke handelspraktijken, Richtlijn 2005/29/EG).

### 2.2 Consumentenrecht bij een gratis dienst

- [ ] **H** Toets of de oneerlijkebedingenrichtlijn (93/13/EEG) en de nationale regels van toepassing zijn op een gratis dienst van een stichting. Aanname in de teksten: ja, voor de zekerheid.
- [ ] **M** Toets of de richtlijn digitale inhoud (2019/770) van toepassing is, omdat gebruikers persoonsgegevens verstrekken. In Nederland is die omgezet in titel 7.1A BW [te controleren]. Gevolgen: conformiteit, updates, beëindiging.
- [ ] **M** Toets of de informatieplichten en het herroepingsrecht bij overeenkomsten op afstand gelden voor diensten waarvoor met gegevens wordt "betaald" (Omnibusrichtlijn 2019/2161). Moet er informatie over herroeping in de app staan?
- [ ] **M** Toets de acceptatieflow: actief aanvinken, opslaan van de geaccepteerde versie, en de voorwaarden vooraf ter hand stellen (art. 6:233 sub b en 6:234 BW, Spaanse Ley 7/1998 sobre condiciones generales).
- [ ] **M** Wijzigingsbeding (art. 19 van de voorwaarden): toets het aan art. 6:237 BW en art. VI.83 WER. Dat laatste vereist mogelijk geldige redenen die in de overeenkomst staan [te controleren]. Toets ook art. 85 TRLGDCU.
- [ ] **M** Taalclausule ("de Nederlandse tekst geldt, tenzij ongunstiger voor de consument"): is die werkbaar en toelaatbaar in BE en ES?
- [ ] **L** Termijn voor klachten (14 dagen) en voor opzegging door Rondje (30 dagen): akkoord?

### 2.3 Rechtskeuze en bevoegde rechter

- [ ] **M** Rechtskeuze voor Nederlands recht met de verwijzing naar art. 6 lid 2 Rome I. Die verwijzing staat er bewust, zie HvJ EU C-191/15 (Amazon). Controleer de formulering.
- [ ] **M** Bevoegdheid: art. 17–19 Brussel I-bis. Er staat geen forumkeuze ten nadele van consumenten in. Controleer of dat zo moet blijven.
- [ ] **L** De vermelding dat het ODR-platform per juli 2025 is opgeheven (Verordening (EU) 2024/3228): datum controleren.

### 2.4 Digital Services Act (Verordening (EU) 2022/2065)

- [ ] **H** Kwalificatie: Rondje is een hostingdienst en waarschijnlijk een "onlineplatform", omdat profielen aan het publiek worden verspreid (iedereen kan een account maken) [te controleren].
- [ ] **H** Verplichtingen voor alle aanbieders, ook micro- en kleine ondernemingen:
  - contactpunten voor autoriteiten en gebruikers (art. 11 en 12);
  - voorwaarden met informatie over moderatie (art. 14);
  - meld- en actiemechanisme (art. 16);
  - motivering bij beperkingen (art. 17);
  - melding van vermoedens van strafbare feiten die leven of veiligheid bedreigen (art. 18).
  
  Controleer of de teksten (voorwaarden art. 14) volledig zijn.
- [ ] **M** Motivering (art. 17): de voorwaarden noemen als uitzonderingen alleen een verbod van de wet of van een bevoegde instantie. De naam van de melder wordt alleen genoemd als dat strikt nodig is (art. 17 lid 3 sub b). Klopt dit, en kan dit ook bij meldingen over stalking of geweld?
- [ ] **M** Vrijstelling voor micro- en kleine ondernemingen (art. 19, Aanbeveling 2003/361/EG). Die geldt voor afdeling 3, behalve art. 24 lid 3. Rondje biedt intern klachtafhandeling (art. 20) en buitengerechtelijke geschilbeslechting (art. 21) toch vrijwillig aan. Keuze bevestigen: houden we dit aan? Dan moeten we het ook echt kunnen waarmaken.
- [ ] **M** Transparantieverslag (art. 15): vrijstelling voor micro- en kleine ondernemingen (art. 15 lid 2) [te controleren].
- [ ] **L** Bevoegde Digitaledienstencoördinator: in Nederland de ACM [te controleren]. In België het BIPT en in Spanje de CNMC [te controleren], maar het land van vestiging is leidend.
- [ ] **L** De matching (honden in de buurt) is een aanbevelingssysteem. Art. 27 geldt niet voor kleine platforms, maar uitleg over de hoofdparameters (afstand, beschikbaarheid, ervaringsniveau) is goed voor de transparantie.
- [ ] **L** P2B-verordening (2019/1150): is die van toepassing op opvangen als zakelijke gebruikers? Waarschijnlijk niet, want opvangen bieden via Rondje geen goederen of diensten aan consumenten aan [te controleren].

### 2.5 Overige EU-regels

- [ ] **M** Nieuwe productaansprakelijkheidsrichtlijn (EU) 2024/2853: software is een product, voor producten die na 9 december 2026 in de handel worden gebracht. Valt een gratis app van een stichting daaronder ("in het kader van een handelsactiviteit")? Relevant als bijvoorbeeld het SOS-scherm of de live locatie faalt.
- [ ] **L** AI-verordening: de berichtcontrole is gebaseerd op regels, niet op AI [te controleren in de code]. Gaat dit veranderen? Dan opnieuw toetsen.
- [ ] **L** European Accessibility Act: waarschijnlijk niet van toepassing (geen e-commerce, vrijstelling voor micro-ondernemingen) [te controleren]. Toegankelijkheid blijft wel goed ontwerp.

### 2.6 Inhoud van de Hondenschool en de veiligheidsquiz

De Hondenschool (`/school` op de website en in de iPhone-app) heeft vijf korte lessen; de veiligheidsquiz is verplicht vóór een aanvraag. De teksten staan in `web/messages/{taal}.json` onder `school.lessons` en `quiz`, en in de app in `ios/Rondje/Features/Lessons/LessonContent.swift`.

- [ ] **H** **Laten nalezen door een opvang of dierenarts** vóór lancering, vooral de les **"Warm, koud en water"** (hitte: de hand 7 seconden op de stoep, "kort rondje in de schaduw, met water" bij 28 graden, strooizout) en de vragen over **loslaten** (les "De kennismaking": "alleen als de eigenaar het uitdrukkelijk zegt, en alleen waar het mag") en een **ontsnapte of bijtende hond** (les "Als er iets gebeurt"). Kloppen de adviezen, zijn ze volledig genoeg, en wekken ze geen verwachting die Rondje niet kan waarmaken?
- [ ] **M** **Geen schijnzekerheid:** de quiz heeft 8 vaste vragen en geeft aan welke fout waren, dus iedereen haalt hem. De teksten zeggen daarom: "De quiz leert je de regels; de eigenaar beslist of je alleen mag." Toets of dat (en de lessen zelf) niet als garantie of screening wordt opgevat (zie risico 2 en 3 in §1).
- [ ] **L** De lessen geven geen punten en ontsluiten niets; ze zijn een vrijwillige uitleg.

## 3. Nederland

### 3.1 Aansprakelijkheid

- [ ] **H** Art. 6:179 BW: de bezitter (eigenaar of opvang) is risicoaansprakelijk, ook als iemand anders de hond uitlaat. De wandelaar is aansprakelijk bij eigen fout (art. 6:162 BW). Toets of de teksten dit juist en volledig weergeven.
- [ ] **H** Kan een gebeten wandelaar de eigenaar aanspreken op grond van art. 6:179 BW, en speelt eigen schuld (art. 6:101 BW) een rol als je de hond onder je hoede hebt? [jurisprudentie te controleren]
- [ ] **M** Art. 6:181 BW (dier gebruikt in de uitoefening van een bedrijf): geldt dit voor opvangen? Dan is de opvang aansprakelijk [te controleren].
- [ ] **H** Art. 6:170 BW: kunnen wandelaars worden gezien als "ondergeschikten" van Rondje (of van een opvang) als er een gezagsverhouding is? Hoe voorkomen we dat zonder de veiligheidsmaatregelen af te zwakken?
- [ ] **H** Exoneratie (voorwaarden art. 15): de beperking tot directe schade en een maximum van € [bedrag] valt onder art. 6:237 sub f BW (grijze lijst) en art. 6:248 lid 2 BW. Advies gevraagd: maximum schrappen voor consumenten, of verantwoorden omdat de dienst gratis is? Dood, letsel, opzet en grove schuld zijn al uitgezonderd.
- [ ] **M** De teksten zeggen dat eigenaren een aansprakelijkheidsverzekering moeten hebben "waar verplicht of gebruikelijk". In Nederland is die niet wettelijk verplicht. Is "verplicht via de voorwaarden" redelijk en handhaafbaar? Rondje kan het niet controleren.

### 3.2 Verzekering

- [ ] **H** AVP (aansprakelijkheidsverzekering particulieren) van de eigenaar: dekt die schade door de hond als iemand anders de hond uitlaat? En neemt de verzekeraar daarna regres op de wandelaar?
- [ ] **H** AVP van de wandelaar: de uitsluiting "onder opzicht" voor schade aan de hond zelf of aan spullen (lijn, tuig). Wie betaalt de dierenarts als de wandelaar iets fout doet?
- [ ] **H** VNG-vrijwilligersverzekering (via gemeenten): vallen wandelaars via een platform daaronder? Meestal alleen bij georganiseerd vrijwilligerswerk; soms ook informele vrijwilligers [te controleren per gemeente]. Afweging: dekking tegenover het risico dat Rondje als organisator wordt gezien (zie 3.1).
- [ ] **M** Opties voor een collectieve polis: een collectieve aansprakelijkheids- en ongevallenpolis voor wandelaars, betaald door een partner (zie `docs/PARTNERS.md`). Ook voor Rondje zelf: een bedrijfsaansprakelijkheidsverzekering (AVB) met dekking voor platformactiviteiten, een bestuurdersaansprakelijkheidsverzekering en eventueel een cyberverzekering.
- [ ] **M** Ongevallenverzekering voor letsel van de wandelaar zelf (bijvoorbeeld een val door een trekkende hond). Aansprakelijkheid dekt dit vaak niet.

### 3.3 Dieren- en gemeenteregels

- [ ] **L** Chip en registratie (Wet dieren, Besluit houders van dieren): de verwijzing "zoals de wet voorschrijft" volstaat [te controleren].
- [ ] **M** Gemeentelijke APV: aanlijngebod, opruimplicht, en een individueel muilkorf- of aanlijngebod voor een hond na een bijtincident. Moeten eigenaren zo'n gebod verplicht melden in het profiel? Advies: ja, toevoegen aan art. 10 van de voorwaarden.
- [ ] **L** Boetes voor de wandelaar (bijvoorbeeld voor niet opruimen): de teksten verwijzen naar de lokale regels. Is dat voldoende?

### 3.4 ID-check, screening en BSN

- [ ] **H** Procedure voor de ID-check: wat kijkt de eigenaar na (naam, foto, leeftijd), en wat niet? Geen kopie, geen foto en geen nummers noteren. Het BSN mag niet worden verwerkt (art. 46 UAVG). Advies: een korte schriftelijke instructie in de app, en een vastgelegde procedure voor opvangen (die vallen wel onder de AVG).
- [ ] **M** Wie is aansprakelijk als de ID-check niet of slecht gebeurt? De teksten leggen de check bij de eigenaar. Toets of Rondje hier verwachtingen wekt.
- [ ] **L** VOG: een verplichte VOG voor wandelaars bij kwetsbare eigenaren? De Regeling gratis VOG geldt voor organisaties met preventiebeleid. Is dat proportioneel en haalbaar?

### 3.5 Organisatie en registraties

- [ ] **H** Rechtsvorm: stichting of bv.
  - **Stichting:** past bij fondsen en subsidies (zoals het OOPOEH-model), ANBI-status mogelijk, geen aandeelhouders.
  - **Bv:** makkelijker voor investeringen en commerciële partnerschappen.
  
  Bij beide: bestuursaansprakelijkheid en governance.
- [ ] **H** "Stichting Rondje i.o." bestaat nog niet. Wie handelt namens een niet-bestaande rechtspersoon, kan persoonlijk aansprakelijk zijn [te controleren]. Lanceer pas na oprichting, en vul dan KvK-nummer en adres in.
- [ ] **M** Inschrijving in het Handelsregister en het UBO-register. ANBI-aanvraag (optioneel). Voor het platform zelf is geen vergunning nodig [te controleren].
- [ ] **M** Merk "Rondje": onderzoek bij het BOIP (Benelux) en het EUIPO, klassen 9 (app), 42 (platform/SaaS) en 45 (online sociale diensten), eventueel ook 35 en 44. "Rondje" is een gewoon Nederlands woord ("een rondje met de hond"). Het kan daarom beschrijvend zijn voor uitlaatdiensten in de Benelux. Controleer ook de domeinnaam en handelsnaamrecht.
- [ ] **L** App stores: leeftijdsclassificatie (18+), de privacylabels, en de eis van Apple dat je je account in de app kunt verwijderen. Dat laatste zit al in de teksten.

## 4. België

### 4.1 Aansprakelijkheid

- [ ] **H** Nieuw Boek 6 BW (buitencontractuele aansprakelijkheid, wet van 7 februari 2024), van toepassing op feiten vanaf 1 januari 2025. Aansprakelijkheid voor dieren in art. 6.17 [artikelnummer te controleren]. Het oude art. 1385 oud BW gold voor "de eigenaar of hij die zich ervan bedient".
- [ ] **H** Wie is de "bewaarder" van de hond tijdens een wandeling? Valt een vrijwillige wandelaar daaronder (macht van leiding en controle, al dan niet voor eigen rekening)? Dit bepaalt of de risicoaansprakelijkheid naar de wandelaar verschuift.
- [ ] **H** Familiale verzekering (BA privéleven): volgens de minimumvoorwaarden (KB van 12 januari 1984) zijn ook personen verzekerd die gratis de dieren van de verzekerde bewaken [te controleren]. Zo ja: dan dekt de familiale van de eigenaar de wandelaar. Controleer ook de uitsluiting van schade aan zaken of dieren onder bewaring in de polis van de wandelaar.
- [ ] **H** Exoneratie tegenover consumenten: art. VI.82–VI.84 WER, met de zwarte lijst in art. VI.83 (onder meer het uitsluiten van aansprakelijkheid bij overlijden of lichamelijk letsel, en bij opzet of grove fout) [te controleren].
- [ ] **M** Partnervoorwaarden voor opvangen (B2B): sinds de B2B-regels (art. VI.91/1 e.v. WER) gelden ook zwarte en grijze lijsten tussen ondernemingen. Een vzw kan een "onderneming" zijn in de zin van het WER [te controleren]. Toets art. 11 en 12 van de partnervoorwaarden.

### 4.2 Vrijwilligers

- [ ] **H** Vrijwilligerswet (wet van 3 juli 2005): een organisatie die vrijwilligers inzet, heeft een informatieplicht, is burgerrechtelijk aansprakelijk voor schade door de vrijwilliger, en moet een verzekering afsluiten. Zijn wandelaars "vrijwilligers van Rondje"? Aanname: nee, want ze wandelen voor een particulier en Rondje bemiddelt alleen. Bij opvangen: de opvang is de organisatie. Bevestigen.
- [ ] **M** Gratis vrijwilligersverzekering via de provincies of de Vlaamse overheid voor kleinere organisaties [te controleren]: een optie voor opvangen of voor Rondje?

### 4.3 Dierenwelzijn per gewest

- [ ] **M** Dierenwelzijn is in België een bevoegdheid van de gewesten:
  - **Vlaanderen:** Vlaams Dierenwelzijnswetboek [te controleren: datum en inwerkingtreding];
  - **Brussel:** Brussels Wetboek Dierenwelzijn [te controleren];
  - **Wallonië:** Code wallon du Bien-être animal (decreet van 4 oktober 2018), met onder meer een "permis de détention" om dieren te houden [te controleren].
  
  Controleer of er regels zijn voor het uitlaten door derden, en voor wie een houdverbod heeft.
- [ ] **M** Identificatie en registratie van honden (DogID) [te controleren]: naam, website en of de databank meldingen van vermiste honden ontvangt.
- [ ] **M** Gemeentelijke politiereglementen (GAS-boetes): aanlijnplicht, muilkorf voor bepaalde honden, opruimplicht. De teksten verwijzen alleen naar lokale regels.
- [ ] **L** Nummers en namen in het veiligheidsprotocol: 112, 101, Zelfmoordlijn 1813, Centre de Prévention du Suicide 0800 32 123, Tele-Onthaal 106, Télé-Accueil 107, en de dierenwelzijnsdiensten per gewest [te controleren].

### 4.4 Overig

- [ ] **L** Cookies: art. 10/2 van de wet van 13 juni 2005 betreffende de elektronische communicatie [artikelnummer te controleren].
- [ ] **L** De Gegevensbeschermingsautoriteit is bevoegd voor klachten. De leidende toezichthouder is waarschijnlijk de AP (vestiging in Nederland, one-stop-shop).
- [ ] **L** Hoeft Rondje zich in België te registreren als het daar geen vestiging heeft? Aanname: nee [te controleren].

## 5. Spanje

### 5.1 Aansprakelijkheid

- [ ] **H** Art. 1905 Código Civil: "el poseedor de un animal, o el que se sirve de él". Valt een vrijwillige wandelaar onder "el que se sirve de él"? [jurisprudentie te controleren] Zo ja, dan is de wandelaar risicoaansprakelijk.
- [ ] **H** Exoneratie: art. 86 TRLGDCU (Real Decreto Legislativo 1/2007), het uitsluiten van aansprakelijkheid bij overlijden of letsel is onredelijk bezwarend. Art. 1102 CC: aansprakelijkheid voor opzet (dolo) kan niet worden uitgesloten.
- [ ] **M** Algemene voorwaarden (Ley 7/1998): eisen voor transparantie en beschikbaarheid in het Spaans vóór het sluiten van de overeenkomst.

### 5.2 PPP-honden (Ley 50/1999 en Real Decreto 287/2002)

- [ ] **H** Moet iedere persoon die een PPP-hond op straat begeleidt zelf een licencia administrativa hebben en die bij zich dragen? Aanname in de teksten: ja [te controleren, onder meer art. 9 RD 287/2002].
- [ ] **H** Eisen voor de vergunning (18+, geen veroordelingen, verklaring van fysieke en psychologische geschiktheid, aansprakelijkheidsverzekering, minimumdekking [te controleren]). Geldigheid (looptijd, en of de vergunning in heel Spanje geldt) [te controleren].
- [ ] **H** Muilkorf, een niet-uitrolbare lijn van maximaal 2 meter, en maximaal één PPP-hond per persoon [te controleren].
- [ ] **H** Rondje vertrouwt op de verklaring van de wandelaar. Is dat genoeg, of moet Rondje de vergunning controleren? Dat betekent wel extra gegevensverwerking (vergunningnummer, geldigheid).
- [ ] **M** Regionale lijsten van PPP-rassen en extra regionale regels (bijvoorbeeld Catalonië en Baskenland) [te controleren].

### 5.3 Ley 7/2023 (bescherming van de rechten en het welzijn van dieren)

- [ ] **H** Verzekeringsplicht voor hondenhouders: staat in de wet, maar de toepassing hangt af van uitvoeringsregels (reglamento) [te controleren: is die er al per oktober 2026?].
- [ ] **M** Verplichte cursus voor hondenhouders: idem [te controleren].
- [ ] **M** Verhouding tussen Ley 7/2023 en de PPP-regeling van Ley 50/1999 (overgangsrecht) [te controleren].
- [ ] **M** Regionale dierenbeschermingswetten (bijvoorbeeld Madrid, Catalonië, Andalusië) kunnen eigen eisen stellen, zoals verzekering, registratie of een census [te controleren].
- [ ] **M** Verplichte observatie van een hond door een dierenarts na een beet (observación antirrábica) volgens regionale regels [te controleren]. Dit staat in het veiligheidsprotocol.
- [ ] **L** Strafrecht: de herziening van de regels over dierenmishandeling (LO 3/2023) [te controleren]. Relevant voor de nultolerantie en voor samenwerking met de autoriteiten.

### 5.4 Protectoras en vrijwilligers

- [ ] **M** Ley 45/2015 del Voluntariado en regionale vrijwilligerswetten: een protectora met vrijwilligers moet hen verzekeren [te controleren]. Vallen wandelaars via Rondje daaronder?
- [ ] **M** Register van dierenbeschermingsorganisaties (Ley 7/2023) [te controleren]: kunnen we dat gebruiken bij de verificatie?
- [ ] **L** Verificatie met het NIF (vroeger CIF): klopt de terminologie?

### 5.5 Overig

- [ ] **L** LSSI (Ley 34/2002): informatieplichten en het land-van-oorsprongbeginsel voor een aanbieder die in Nederland is gevestigd [te controleren]. Cookies: art. 22.2 LSSI.
- [ ] **L** Nummers: 112, 062 (Guardia Civil, SEPRONA), 092 (Policía Local, verschilt per gemeente), 024, Teléfono de la Esperanza 717 003 717, REIAC [te controleren].

## 6. Privacy (AVG)

- [ ] **H** **DPIA** vóór de eerste echte wandeling met live locatie (zo belooft privacy art. 14 het nu). Criteria: locatiegegevens, systematische monitoring (live volgen), kwetsbare betrokkenen (ouderen, zieken), nieuwe technologie. Controleer de DPIA-lijst van de AP [te controleren].
- [ ] **H** **Grondslag voor live locatie:** overeenkomst plus gerechtvaardigd belang. Is dit houdbaar, of is toestemming nodig? Toets ook art. 11.7a Telecommunicatiewet en art. 5 lid 3 ePrivacy-richtlijn (toegang tot apparaatlocatie: strikt noodzakelijk voor een dienst waar de gebruiker om vraagt).
- [ ] **H** **Strafrechtelijke gegevens** (art. 10 AVG, art. 33 UAVG): meldingen over mishandeling, oplichting of geweld bevatten beschuldigingen van strafbare feiten. Is het bijhouden van uitsluitingen een "zwarte lijst"? Zo ja: gelden de uitzonderingen in de UAVG, of is een vergunning van de AP nodig? Ook voor de bewaring van uitsluitingsgegevens (voorstel: 2 jaar).
- [ ] **H** **Inzagerecht versus privé-feedback en meldingen:** feedback over iemand is diens persoonsgegeven. Bij een inzageverzoek kan die zichtbaar worden. Beleid nodig: beperkingen op grond van rechten van anderen (art. 15 lid 4 AVG, art. 41 UAVG) en bescherming van de identiteit van melders.
- [ ] **H** **Doorgifte naar de VS:** zijn Vercel Inc. en Neon Inc. gecertificeerd onder het EU-VS Data Privacy Framework? Controleer de verwerkersovereenkomsten (SCC's), de regio's (Vercel Functions, Vercel Blob, logs) en de status van het DPF na eventuele rechtszaken [te controleren].
- [ ] **M** **OpenStreetMap Foundation:** is die verwerker of zelfstandig verantwoordelijke? Wat zegt het tile-gebruiksbeleid, en klopt het adequaatheidsbesluit voor het VK [te controleren]? Alternatief: zelf tiles hosten of een EU-tileprovider gebruiken. Dan gaat het IP-adres niet naar een derde.
- [ ] **M** **Bewaartermijnen** (voorstellen): account tot verwijdering + 30 dagen; routes 30 dagen; meldingen tot 2 jaar na afsluiten; feedback 1 jaar. Nog vast te stellen: berichten, beveiligingslogs, uitsluitingsgegevens. Toets de noodzaak en de verjaringstermijnen (bijvoorbeeld 5 jaar voor vorderingen uit onrechtmatige daad, art. 3:310 BW) tegen dataminimalisatie.
- [ ] **M** **Berichtcontrole:** geen uitsluitend geautomatiseerd besluit (art. 22 AVG), want een mens beoordeelt. Is de berichtfunctie een "nummeronafhankelijke interpersoonlijke communicatiedienst" (Telecomcode)? Dan geldt het communicatiegeheim. Of is het een ondergeschikte nevenfunctie [te controleren]?
- [ ] **M** **Gezondheidsgegevens** (art. 9 AVG): hondenverhalen van zieke of oudere eigenaren kunnen gezondheidsgegevens bevatten. De teksten vragen gebruikers dat niet te doen. Is moderatie of een waarschuwing in het invoerveld nodig?
- [ ] **M** **Afgeronde locatie (500 m):** in dunbevolkte gebieden kan iemand toch herleidbaar zijn. Ook herhaald opvragen kan de echte locatie verraden. Overweeg een grotere afronding buiten de stad, en vaste rasterpunten in plaats van willekeurige verschuiving.
- [ ] **M** **Functionaris gegevensbescherming:** waarschijnlijk niet verplicht bij de start (geen grootschalige monitoring). Opnieuw beoordelen bij groei.
- [ ] **M** **Rolverdeling met opvangen:** zelfstandig verantwoordelijke of verwerker voor de aanwezigheidsregistratie? Is een verwerkersovereenkomst nodig?
- [ ] **L** Verwerkingsregister (art. 30), datalekprocedure, privacy by design. Pushmeldingen: welke dienst (APNs, FCM) en welke gegevens [te controleren].
- [ ] **L** Lettertypes en andere externe bronnen: laad niets van derden (zoals Google Fonts) zonder noodzaak. Het prototype bundelt de lettertypes al.
- [ ] **M** **Contactpersoon van een opvang** (naam, e-mail, telefoon): alleen zichtbaar voor beheerders. Grondslag: gerechtvaardigd belang (de opvang controleren en bereiken). Staat in de privacyverklaring (versie 0.2); controleer of de medewerker zelf geïnformeerd moet worden (art. 14 AVG) als een collega hem opgeeft.
- [ ] **L** **Hondenschool-voortgang** (tabel `lesson_progress`, sinds 4 okt 2026): alleen welke les iemand afrondde en wanneer, geen score. Zonder account blijft het in de browser (localStorage) tot iemand een account heeft. Gaat mee in de gegevensexport en weg met het account. Noemen in de privacyverklaring?
- [ ] **M** **Tips en stemmen voor opvangen:** alleen gegevens over de organisatie, plus wie de tip gaf. Grondslag: gerechtvaardigd belang. Bewaartermijn: een jaar na afhandeling, niet afgehandeld na twee jaar (automatisch). Over particulieren slaan we bewust niets op (art. 14 AVG): toets of het vrije toelichtingsveld met de automatische weigering van telefoonnummers en e-mailadressen genoeg is.

### 6.1 Steun via Patreon (bijdragen aan de exploitant)

- [ ] **H** **Wie is de exploitant?** Bijdragen gaan naar `OPERATOR_NAME` (nu bedoeld: Webstability). Is dat dezelfde rechtspersoon als de verantwoordelijke in de privacyverklaring en de partij in de voorwaarden? Zo niet: hoe verhouden ze zich?
- [ ] **H** **Belasting en btw:** een bijdrage zonder tegenprestatie is voor een bv of eenmanszaak in beginsel omzet of winst. Patreon-beloningen (tiers met "perks") kunnen een tegenprestatie zijn, en dan is er mogelijk btw verschuldigd. Laat een boekhouder meekijken en geef op Patreon geen voordelen die een prestatie zijn [te controleren].
- [ ] **M** **Wervingsregels:** Rondje noemt het "steun" of "bijdrage", niet "donatie" of "goed doel", en zegt dat het niet aftrekbaar is (geen ANBI). Controleer of dat volstaat tegen misleiding (oneerlijke handelspraktijken).
- [ ] **M** **App Stores:** in de iOS- en Android-app staat geen geld, geen steunknop en geen link naar de steunpagina (Apple 3.1.1/3.2.2, Google Play-betalingsbeleid). Controleer dit bij elke inzending.
- [ ] **L** **Stichting en ANBI** voor fondsen later: aparte geldstroom en administratie, zodat steun aan de bv en fondsgeld voor de stichting niet door elkaar lopen.

## 7. Leeftijd (18+)

- [ ] **M** Leeftijdscontrole: het geboortejaar is zelf ingevuld, en de echte controle is de ID-check bij de kennismaking. Tot dat moment kan een minderjarige wel een account maken en verzoeken sturen. Is dat acceptabel? Opties: de leeftijdssignalen van Apple en Google gebruiken [te controleren], of contact pas na de ID-check toestaan.
- [ ] **L** Wat doen we als blijkt dat iemand jonger is: account sluiten en gegevens verwijderen? Dit staat al in de privacyverklaring.

## 8. Openstaande placeholders

- [ ] Naam rechtspersoon, KvK-nummer, adres, e-mailadres (ook als DSA-contactpunt). Stem dit af op `OPERATOR_NAME` en `CONTACT_EMAIL` in Vercel (zie `LAUNCH.md` stap 3).
- [ ] Maximum aansprakelijkheid `[bedrag]`, of schrappen (zie 3.1).
- [ ] E-mailprovider (naam, land, verwerkersovereenkomst).
- [ ] Regio's van Vercel, Vercel Blob en Neon.
- [ ] Cookienamen en bewaarduur; of er een beveiligingscookie (CSRF) is.
- [ ] Bewaartermijnen voor berichten, logs en uitsluitingen.
- [ ] Welke profielvelden openbaar zijn: leeftijd of geboortejaar?
- [ ] Wanneer de beperking voor nieuwe accounts vervalt.
- [ ] Of Rondje zelf een verzekering voor wandelingen afsluit.

## 9. Wat de app al technisch afdwingt

**Status (2 oktober 2026):** de webapp in `web/` dwingt de regels hieronder af op de server, niet alleen in het scherm. De regels staan in `web/src/lib/rules.ts` met unit-tests, en twee end-to-endtests doorlopen de hele flow (`web/e2e/`). Nuances die de teksten moeten volgen:

- **Leeftijd:** de volledige geboortedatum is verplicht, niet alleen het jaar. Onder de 18 kan het profiel niet worden afgerond, en een account zonder profiel kan niets aanvragen. Anderen zien alleen een leeftijdsgroep (18–24, 25–34 …).
- **Opvangen:** een opvang kan alvast honden invoeren, maar die worden pas openbaar na verificatie door een beheerder. Het registratienummer wordt met de hand gecontroleerd, niet automatisch.
- **Kennismaking:** een zelfstandig rondje kan technisch pas na een geaccepteerde kennismaking én expliciete toestemming van de eigenaar voor die hond. Of de eigenaar er bij de kennismaking echt bij is, berust op de afspraak.
- **Opvanghonden:** alleen in begeleide groepswandelingen. Zelfstandig wandelen met een opvanghond is technisch uitgesloten.
- **Ervaring:** honden met het niveau "met ervaring", waaronder alle honden met een bijtgeschiedenis, zijn niet te boeken voor wandelaars zonder ervaring.
- **Te laat terug:** na 20 minuten boven de geplande tijd krijgen wandelaar en eigenaar een melding in de app. Er zijn nog geen sms- of pushmeldingen.
- **Chipnummer:** wordt nooit aan wandelaars getoond, ook niet na acceptatie.
- **Cookies:** de echte cookienamen staan nu in `cookies.md`. Beoordeel of `rondje_ref` (uitnodigingslink) functioneel is.
- **Gegevens:** "Download mijn gegevens" (JSON) en "Account verwijderen" werken. Verwijderen wist ook honden, afspraken en routes. Meldingen blijven bewaard zonder koppeling aan het verwijderde account.

**Toegang en accounts**

- Geboortejaar verplicht. Wie jonger is dan 18, kan geen account maken.
- Opvangen kunnen pas honden plaatsen na verificatie met KvK-, KBO- of NIF-nummer.
- Nieuwe accounts kunnen eerst alleen kennismakingen en begeleide wandelingen doen.
- Limieten op het aantal verzoeken.
- Blokkeren en uitsluiten (bans).

**Verzoeken en wandelingen**

- De eerste ontmoeting is altijd een kennismaking, met eigenaar of opvang erbij.
- De eigenaar of opvang vinkt de ID-check aan. Er is geen functie om een ID te uploaden. Rondje slaat geen kopie op.
- Een solowandeling kan alleen na expliciet solo-vertrouwen van de eigenaar of opvang, per hond.
- Vóór de eerste solowandeling: de veiligheidsquiz.
- Loslopen staat standaard uit.
- Spanje: PPP-honden zijn alleen te boeken voor wandelaars die een geldige PPP-vergunning bevestigen.
- Groepswandelingen hebben een maximumaantal plaatsen en een aanwezigheidsregistratie.

**Privacy**

- Telefoonnummer, afspraakplek of adres en dierenarts zijn pas zichtbaar na acceptatie. Sommige velden (zoals het chipnummer) worden nooit getoond [te controleren welke].
- De woonplaats wordt afgerond op zo'n 500 meter.
- Live locatie alleen tijdens een actieve wandeling.
- Routes worden na 30 dagen automatisch verwijderd, behalve bij een open melding.
- Stemming-check-ins blijven alleen op het apparaat.
- Privé-feedback is nooit zichtbaar voor de ander.
- Geen tracking- of analysecookies.

**Veiligheid tijdens de wandeling**

- Live kaart voor de eigenaar of opvang.
- Melding als een wandeling veel langer duurt dan gepland.
- SOS-scherm met noodnummers, het nummer van de eigenaar en van de dierenarts, en een protocol voor als de hond ontsnapt.
- Berichten worden gecontroleerd op betaalverzoeken, IBAN's en links, met een waarschuwing en beoordeling door een mens.

**Wat de app niet kan afdwingen** (berust op verklaringen en vertrouwen):

- of de hond verzekerd, gechipt en gevaccineerd is;
- of de informatie over gedrag en bijtgeschiedenis klopt;
- of de wandelaar echt een PPP-vergunning heeft;
- of de ID-check zorgvuldig is gedaan;
- of de hond echt aan de lijn blijft en alleen toegestane snoepjes krijgt;
- of de wandelaar fit en nuchter is.

Daarom moeten de teksten hierover eerlijk blijven, en mag de marketing niet meer beloven dan dit.
