# Instagram: startpakket voor Rondje

Concept van 2 oktober 2026. Rondje heeft nog geen Instagram-account: je maakt het zelf aan, en er is nog niets gepost. Het grote plan staat in [`MARKETING.md`](MARKETING.md), de video-ideeën en scripts in [`GROWTH.md`](GROWTH.md), en de toestemming in [`legal/media-consent.md`](legal/media-consent.md).

**Waar het account voor is (aanname):** wandelaars in de lanceerstad naar Rondje halen, opvangen laten zien dat Rondje zorgvuldig werkt, en verhalen vertellen die mensen zelf willen delen. Niet: zoveel mogelijk volgers.

**Markeringen:** (aanname) = een doel of schatting. (te controleren) = een feit over Instagram of een regel dat je zelf even moet nakijken. Instagram verandert vaak.

## 1. Account aanmaken: checklist

- [ ] Kies een naam (§2) en kijk of hij vrij is op Instagram én TikTok. Neem op beide dezelfde.
- [ ] Maak het account aan met een apart e-mailadres voor Rondje, niet met je privé-adres.
- [ ] Zet tweestapsverificatie aan met een authenticator-app en bewaar de back-upcodes. Deel het wachtwoord met niemand, ook niet met een opvang: een takeover kan zonder (§8).
- [ ] Zet het account om naar een professioneel account (maker of bedrijf, gratis), zodat je statistieken ziet. Kies een eerlijke categorie, zoals "Community" (te controleren welke er zijn). Niet "Non-profit" of "Goed doel" zolang er geen stichting is.
- [ ] Vul naam, bio en link in (§2 en §3).
- [ ] Profielfoto (§4) en highlights (§5).
- [ ] Zet in Vercel `INSTAGRAM_HANDLE` (zonder @) en redeploy. Dan vragen `/about` en `/support` mensen om je te taggen, en staat er op `/about` een knop naar het account.
- [ ] Zet de filters voor reacties aan, zoals verborgen woorden (te controleren waar dat nu in de app staat).
- [ ] Maak de toestemmingslog en een veilige map voor de formulieren (§12).
- [ ] Zet de eerste 3 posts klaar voordat je het account deelt (§6).

## 2. Naam

**Let op:** de naam is nog niet definitief (de naamronde staat op de lanceerlijst in Beheer). Leg een handle pas vast als de naam vrij is als merk, in de App Store, als domein én als handle. Komt er een andere naam, dan gelden de opties hieronder met die naam.

| Naam | Voor | Tegen |
|---|---|---|
| `rondjeapp` | Gelijk aan de eigen hashtag #rondjeapp | "app" in de naam, terwijl de verhalen over honden gaan |
| `rondje.nl` | Vertrouwd in Nederland | Klinkt alleen Nederlands; verwarrend zonder dat domein |
| `rondjewandelen` | Zegt wat het is, en is goed vindbaar | Lang |
| `rondje_app` | Waarschijnlijk vaker vrij | Een underscore is lastig uit te spreken |

`rondje.app` valt af: dat domein is van een ander bedrijf, dus je zou mensen naar andermans site sturen.

**Advies:** neem dezelfde naam als je domein. Heb je (nog) geen domein, neem dan `rondjeapp`: gelijk aan de hashtag. Kijk zelf of de naam vrij is, en check ook het merk: "Rondje" kan een beschrijvend woord zijn ([`legal/REVIEW.md`](legal/REVIEW.md) §3.5).

**Weergavenaam** (het vindbare veld boven de bio): `Rondje · wandelen met honden` (28 tekens).

## 3. Bio in vier talen

- Maximaal 150 tekens. De tellingen hieronder zijn gecontroleerd; tel opnieuw als je de stad wijzigt.
- De link staat in het linkveld, niet in de tekst: `rondjemee.nl/r/INSTA`.
- De eerste regel is in elke taal de slogan van de app zelf.
- Begin met één account, in het Nederlands. De andere talen zijn voor later: een eigen account per land, of als je het account in een andere taal voortzet (§10).
- Noem alleen steden waar je echt live bent, niet "NL · BE · ES".

**Nederlands** (143 tekens)
```
Een vast rondje met een hond die op je wacht.
Gratis. Veilig. Eerst samen kennismaken.
Vanaf 18 · nu in Utrecht
Opvang? Ook voor jullie gratis.
```

**Voorzichtige variant**, tot de jurist het woord "veilig" heeft getoetst ([`MARKETING.md`](MARKETING.md) §2), 139 tekens:
```
Een vast rondje met een hond die op je wacht.
Gratis. Veilig opgezet. Eerst samen kennismaken.
Vanaf 18 · nu in Utrecht
Opvang? Ook gratis.
```

**English** (133 tekens)
```
A regular walk with a dog who's waiting for you.
Free. Safe. You always meet first.
18+ · now in Utrecht
Shelters welcome, also free.
```

**Español** (146 tekens). Bewust "Con confianza" en niet "Seguro": *seguro* betekent ook "verzekering", en die heeft Rondje niet.
```
Un paseo fijo con un perro que te espera.
Gratis. Con confianza. Primero os conocéis.
Desde 18 años · ahora en Madrid
Protectoras: también gratis.
```

**Français** (144 tekens)
```
Une balade régulière avec un chien qui vous attend.
Gratuit. En confiance. On se voit d'abord.
Dès 18 ans · à Bruxelles
Refuges : gratuit aussi.
```

## 4. Profielfoto en huisstijl

**Profielfoto:** het app-icoon `web/public/icon-512.png` (512 × 512, helemaal groen): een stippelrondje in tennisbalgeel, met een bal bovenop. Instagram snijdt de foto rond af; het logo is zelf rond, dus er valt niets weg.

**Kleuren** (uit de app):

| Kleur | Code | Gebruik |
|---|---|---|
| Bosgroen | `#1f5a3d` | Achtergrond van kaarten en covers, het merk |
| Tennisbalgeel | `#d9f05a` | Alleen als accent of markeerstift, achter een paar woorden |
| Papier | `#f4f6f0` | Lichte achtergrond |
| Inkt | `#16201a` | Tekst op licht |

**Contrast** (berekend): geel op groen 6,4:1 en wit op groen 8,1:1, allebei goed leesbaar. Inkt op geel 13,2:1. Groen op papier 7,5:1. **Geel op papier is 1,2:1: nooit doen.**

**Letters:** Bricolage Grotesque voor koppen, Figtree voor tekst, en Caveat (handschrift) heel spaarzaam, zoals "Wie gaat er mee?" op het linkvoorbeeld van de site. Alle drie zijn gratis Google Fonts (te controleren of ze in Canva staan).

**Vormen:** de stippellijn van de route, de ronde hondenpenning, en de gele markeerstift achter een paar woorden (zoals in `web/public/og.png`). De getekende honden uit de app zijn verzonnen: gebruik ze als illustratie, nooit als een echte hond die wacht.

**Foto's en video:**
- Op hondhoogte, buiten, bij daglicht. Een hond die in de camera kijkt, werkt.
- Van de wandelaar liever handen, rug of voeten dan een gezicht, tenzij er toestemming is.
- Geen voorgevels, huisnummers, straatnaambordjes of kentekens.

**Formaten** (te controleren, Instagram wijzigt dit vaak):
- Posts staand, 1080 × 1350 (4:5). Het raster op je profiel toont een uitsnede van 3:4: houd tekst in het midden.
- Reels en stories 1080 × 1920. Houd tekst weg van de onderste 20% en van de rechterrand, waar de knoppen zitten.

**Sjablonen:** maak in Canva (gratis) drie sjablonen: een groene tekstkaart, een papieren kaart met foto, en een story-kaart.

**Toegankelijk:**
- Elke post krijgt een alt-tekst, kort gehouden (ongeveer 100 tekens of minder).
- Elke Reel krijgt ingebrande ondertiteling: veel mensen kijken zonder geluid.

## 5. Highlights

Namen mogen maximaal 15 tekens zijn (te controleren); deze passen.

**Covers:** 1080 × 1920, een bosgroene achtergrond met in het midden een icoon in tennisbalgeel (ongeveer 400 px breed). Geen tekst op de cover: de naam staat eronder. Gebruik het stippelrondje uit het logo, de hondenpenning, en dezelfde iconen als in de app (gebouw, schild, hart).

| Highlight | Icoon | Wat erin staat | Link |
|---|---|---|---|
| **Hoe werkt het** | Stippelrondje | De 4 stappen, groepswandelingen, "geen ervaring nodig" | `/r/STORY` |
| **Opvangen** | Gebouw | Wat een opvang krijgt, foto's in bulk, groepswandelingen, "Dit is mijn opvang" | `/shelter` |
| **Veiligheid** | Schild | Vertrouwen stap voor stap; ID in het echt en geen kopie; live meekijken; "Rondje vraagt nooit om geld"; melden | `/safety` |
| **Steun** | Hart | Gratis en dat blijft zo; wat het kost; helpen zonder geld; eerlijk over Patreon | `/steun` |
| **Over ons** | Hondenpenning | Wie erachter zit, waarom, de rode lijnen, contact | `/over-ons` |

**Steun, de tekst** (pas als Patreon live is en `SUPPORT_URL` en `OPERATOR_NAME` gezet zijn; tot die tijd alleen het deel over helpen zonder geld):

> Rondje is gratis en dat blijft zo. Online blijven kost wel geld: ongeveer €10–140 per maand. Wil je helpen? Dat kan via Patreon. Je bijdrage gaat naar Webstability, het bedrijf van Laurens dat Rondje bouwt, en 10% daarvan geven we door aan goede doelen voor honden en mensen in de buurt. Rondje zelf is geen goed doel: je bijdrage is niet aftrekbaar, en je krijgt er niets extra's voor. Helpen zonder geld kan ook: tip een opvang, of nodig iemand uit.

**Over ons:** vertel je eigen verhaal alleen als je dat wilt, en zonder gezicht als je dat liever hebt (stem of handen). Gaat het over je eigen ervaring met somberheid? Volg dan de schrijftips in `web/content/about/nl/story.md`.

## 6. De eerste 9 posts

**Het raster na 9 posts.** De nieuwste staat linksboven. G = groene tekstkaart, F = foto of video. Groen en foto wisselen elkaar af als een dambord.

| Links | Midden | Rechts |
|---|---|---|
| **9 · G** · Bij welke opvang wil jij wandelen? | **8 · F** · Eerste groepswandeling (Reel, collab) | **7 · G** · Gratis, en dat blijft zo |
| **6 · F** · Voor opvangen | **5 · G** · Voor je oma | **4 · F** · Veiligheid |
| **3 · G** · Zo werkt het | **2 · F** · Snuffelrondje (Reel) | **1 · G** · Dit is Rondje |

- Plaats ze in de volgorde 1 tot 9, in de weken 2–6 van het 90-dagenplan in [`MARKETING.md`](MARKETING.md): eerst 2–3 per week, daarna het gewone ritme (§10). De groene kaarten maak je vooraf in één avond.
- Pin daarna posts 3, 4 en 6 bovenaan je profiel (Instagram laat tot 3 posts vastzetten, te controleren).
- Hashtags: maximaal 5 per post (§9). Vervang `[stad]` door je lanceerstad.

### Post 1 · Dit is Rondje (G, carrousel van 5)

Dia's:
1. "Een vast rondje met een hond **die op je wacht**." (het accent in geel)
2. "Veel jongeren willen naar buiten en houden van honden. Een eigen hond zit er vaak niet in."
3. "Sommige buren kunnen hun hond niet meer zo vaak uitlaten als ze zouden willen. En in de opvang wacht elke hond op een extra wandeling."
4. "Rondje brengt jullie bij elkaar. Gratis, vanaf 18 jaar, en de eerste keer altijd samen."
5. "We beginnen in [stad]. Volg mee."

> Dit is Rondje.
>
> Je loopt een vast rondje met een hond die dat goed kan gebruiken: van een buur die zelf niet ver meer kan lopen, of uit de opvang. Gratis, vanaf 18 jaar, en de eerste keer altijd samen met de eigenaar of de opvang.
>
> We beginnen in [stad]. Ken jij een hond die vaker naar buiten wil? Vertel het in de reacties (zonder namen of adressen).
>
> Meedoen: link in bio.
>
> #rondjeapp #hondenliefde #wandelen #[stad]

**Alt-tekst:** Groene kaart met de tekst: Een vast rondje met een hond die op je wacht.

### Post 2 · Snuffelrondje (F, Reel)

Script B uit [`GROWTH.md`](GROWTH.md), met een echte hond van iemand die je kent. Gebruik de echte tijd en afstand van die wandeling, niet die uit het script.

> [Naam hond] deed [x] minuten over [y] meter. Snuffelen is voor een hond echt werk: zo leest hij de buurt.
>
> Laat ze ruiken.
>
> Loop jij ook graag in dit tempo? Link in bio.
>
> #rondjeapp #hondenliefde #snuffelen #wandelen

**Alt-tekst:** Video op hondhoogte: een hond snuffelt aan een lantaarnpaal, in het gras en bij een bankje.

**Toestemming:** de eigenaar van de hond, op het formulier. Geen huis of straatnaam in beeld.

### Post 3 · Zo werkt het (G, carrousel van 6)

Dia's:
1. "Zo werkt Rondje"
2. "1 · Maak een profiel met foto. Vanaf 18 jaar."
3. "2 · Kies een hond en vraag een kennismaking aan. De eigenaar of de opvang is er altijd bij."
4. "3 · Klikt het? Dan mag je zelfstandig wandelen, als de eigenaar dat voor die hond toestaat. Eerst doe je een korte veiligheidsquiz."
5. "4 · Loop een vast rondje per week. Na afloop geef je privé door hoe het ging."
6. "Bij een opvang loop je mee in een begeleide groepswandeling. Geen ervaring nodig."

> Zo werkt Rondje, in vier stappen. Bewaar deze post voor als je wilt beginnen.
>
> Bij een opvang begin je nog makkelijker: je loopt mee in een kleine groep, met een begeleider van de opvang. Neem je ID mee.
>
> Link in bio.
>
> #rondjeapp #vrijwilligerswerk #hondenliefde #[stad]

**Alt-tekst:** Groene kaart met de titel Zo werkt Rondje en een stippellijn als route.

### Post 4 · Veiligheid (F, carrousel van 7)

Omslagfoto: handen klikken een riem vast aan een halsband, in een gang. Geen huisnummer in beeld.

Dia's:
1. "Mensen geven niet zomaar hun hond mee." (over de foto)
2. "De eerste keer altijd samen met de eigenaar of de opvang."
3. "Het ID wordt in het echt bekeken. Rondje bewaart geen kopie."
4. "Zelfstandig wandelen kan pas als de eigenaar dat per hond toestaat, en na de veiligheidsquiz."
5. "Tijdens het rondje kijkt de eigenaar live mee. Na 30 dagen is de route weg."
6. "Loopt een rondje 20 minuten uit? Dan krijgen jullie allebei een melding."
7. "Rondje vraagt nooit om geld. Vraagt iemand je om geld? Meld het in de app."

> Vertrouwen bouw je op, stap voor stap.
>
> Daarom loop je de eerste keer altijd samen, kijkt de eigenaar live mee tijdens het rondje, en mag je pas alleen als de eigenaar dat voor die hond wil.
>
> Meer over veiligheid: zie de highlight Veiligheid.
>
> #rondjeapp #hondenliefde #hondenbaasje #[stad]

**Alt-tekst:** Handen klikken een riem vast aan de halsband van een hond, in een gang.

**Let op:** schrijf nooit "100% veilig" of "gescreend".

### Post 5 · Voor je oma (G, carrousel van 5)

Dia's:
1. "Loopt de hond van je oma minder vaak buiten dan vroeger?"
2. "Je kunt een hond aanmelden voor iemand anders. Vraag het eerst: zij beslissen."
3. "Jij regelt de aanvragen. Bij de kennismaking is zij er zelf bij."
4. "Gratis. Niemand betaalt, en Rondje vraagt nooit om geld."
5. "Stuur dit naar je broer, zus of buurvrouw."

> Veel oudere eigenaren melden zich niet zelf aan bij een app. Dat hoeft ook niet.
>
> Een dochter, kleinzoon of buurman kan de hond aanmelden, als de eigenaar dat goed vindt. Jij regelt de aanvragen, en bij de kennismaking zijn jullie er samen bij.
>
> Stuur dit naar iemand die hieraan moet denken. Link in bio.
>
> #rondjeapp #hondenliefde #mantelzorg #[stad]

**Alt-tekst:** Groene kaart: Loopt de hond van je oma minder vaak buiten dan vroeger?

### Post 6 · Voor opvangen (F, carrousel van 6 of een Reel)

Omslag: een telefoon met het scherm "Snel honden toevoegen", met echte foto's van de honden van je partneropvang (met hun toestemming). Nog geen partner? Gebruik de getekende voorbeeldhonden en zet er duidelijk "voorbeeld" bij.

Dia's:
1. "Werk je bij een opvang? Zet al je honden in één keer online."
2. "Kies een foto per hond. Heet de foto Bram.jpg? Dan heet de hond al Bram."
3. "Vul per hond geslacht, leeftijd en grootte in. Het verhaal en extra foto's kunnen later."
4. "Plan begeleide groepswandelingen met een maximum aantal plekken."
5. "Jij bekijkt het ID van nieuwe wandelaars, en noteert wie er was."
6. "Jullie eigen pagina met alle honden, om te delen. Gratis."

> Voor opvangen: al je honden online, met een stapel foto's.
>
> Eén foto per hond, een paar vakjes per hond, en ze staan erop. Daarna plan je begeleide groepswandelingen, en melden jonge vrijwilligers van 18+ zich aan. Jullie bepalen welke honden meedoen en wie er komt.
>
> Gratis, zonder abonnement. Stuur ons een DM, of kijk bij de highlight Opvangen.
>
> #rondjeapp #dierenasiel #asielhond #vrijwilligerswerk

**Alt-tekst:** Telefoon met een raster van hondenfoto's in het scherm Snel honden toevoegen.

**Let op:** zeg "in een kwartier" pas als je het zelf hebt getimed ([`MARKETING.md`](MARKETING.md) §3).

### Post 7 · Gratis, en dat blijft zo (G, carrousel van 5)

Dia's:
1. "Gratis, en dat blijft zo."
2. "Geen advertenties. Geen abonnement. Geen betaalmuur."
3. "We verkopen nooit gegevens."
4. "Een sponsor bepaalt nooit welke honden of mensen je ziet."
5. "Helpen kan ook zonder geld: tip een opvang of nodig iemand uit."

> Rondje is gratis voor wandelaars, eigenaren en opvangen, en dat blijft zo.
>
> Online blijven kost wel geld: ongeveer €10–140 per maand. Alle kosten staan op de site, onder Steun. Wie wil, kan via Patreon bijdragen. Dat gaat naar Webstability, het bedrijf van Laurens dat Rondje bouwt; 10% van alle bijdragen geven we door aan goede doelen voor honden en mensen in de buurt. Rondje is zelf geen goed doel, een bijdrage is niet aftrekbaar, en je krijgt er niets extra's voor. Dat is bewust.
>
> Helpen zonder geld is net zo welkom: tip een opvang, of nodig iemand uit.
>
> #rondjeapp #hondenliefde #vrijwilligerswerk

**Alt-tekst:** Groene kaart met de tekst: Gratis, en dat blijft zo.

**Let op:** laat de zinnen over Patreon weg zolang de Patreon-pagina niet live is.

### Post 8 · Eerste groepswandeling (F, Reel, collab met de opvang)

> Zaterdag liepen we voor het eerst mee met [@opvang]. Vier wandelaars, één begeleider, en [hond] die bij elk bankje even moest zitten.
>
> Wil je ook mee? Je hoeft geen ervaring te hebben: een begeleider van de opvang loopt mee. Neem je ID mee.
>
> Kies een moment via de link in bio, of op de pagina van [opvang].
>
> #rondjeapp #dierenasiel #asielhond #vrijwilligerswerk #[stad]

**Alt-tekst:** Video: vier wandelaars met opvanghonden op een bospad, van achteren gefilmd.

**Toestemming:** de opvang (voor de honden en de begeleider) en elke herkenbare wandelaar, op het formulier. De fotoregels van de opvang gaan voor. Nodig de opvang uit als collaborator (§11).

**Nog geen opvang?** Plaats dan script A uit [`GROWTH.md`](GROWTH.md): "Week 1: ik bouw een gratis app zodat oma's hond weer naar buiten kan."

### Post 9 · Bij welke opvang wil jij wandelen? (G, carrousel van 4)

Dia's:
1. "Bij welke opvang wil jij wandelen?"
2. "Op Rondje staan bijna 40 opvangen in Nederland, België en Spanje. Tik 'Ik wil hier wandelen' bij jouw favoriet."
3. "Hoe meer stemmen, hoe eerder we die opvang uitnodigen. We nemen zelf contact op, nooit namens jou."
4. "Staat jouw opvang er niet bij? Tip hem."

> Bij welke opvang wil jij wandelen?
>
> Op Rondje staat een lijst met bijna 40 opvangen. Stem met "Ik wil hier wandelen". Komt de opvang op Rondje, dan krijg je een melding.
>
> Stemmen kan met een gratis account: link in bio. Staat jouw opvang er niet bij? Tip hem via de site.
>
> #rondjeapp #dierenasiel #asielhond #vrijwilligerswerk

**Alt-tekst:** Groene kaart met de vraag: Bij welke opvang wil jij wandelen?

## 7. Vijf Reels

De volledige scripts staan in [`GROWTH.md`](GROWTH.md). Hier staat wat er voor Instagram bij komt.

| # | Reel | Hook (eerste 2 seconden) | Script | Toestemming |
|---|---|---|---|---|
| 1 | **Eerste rondje** (de belangrijkste serie) | "Deze riem hing hier 3 maanden." | Script C | Eigenaar en wandelaar. Gezondheid van de eigenaar (zoals "een nieuwe heup") alleen noemen als de eigenaar dat zelf wil. |
| 2 | **Snuffelrondje** | "[Naam] deed [x] minuten over [y] meter." | Script B | Eigenaar van de hond |
| 3 | **Twintig honden, één stapel foto's** (nieuw) | De stapel foto's vliegt de app in, de namen verschijnen: "Vanmiddag zette [opvang] 20 honden online." Einde: "Wie loopt zaterdag mee?" | Geen script nodig: schermopname plus de foto's van de opvang. Als collab met de opvang. Pas na het timen. | De opvang |
| 4 | **Eerste groepswandeling** bij een opvang | De kenneldeur gaat open: "Vandaag gaan [hond] en [hond] voor het eerst mee." | Idee 2 ("Dagje uit") en idee 7 ("Vraag het de opvang") | De opvang en elke herkenbare wandelaar |
| 5 | **Bouwen in het openbaar**, eens per maand | "Week [x]: wat ik bouwde, en wat misging." | Script A | Niemand: scherm en stem |

**Voor elke Reel:**
- Tekst in het eerste beeld, en ondertiteling erin gebrand.
- Een omslagbeeld dat in het raster past (groen of foto, §6).
- 20–45 seconden.
- Eigen geluid, of muziek uit de bibliotheek van Instagram. Zakelijke accounts hebben daar minder keus (te controleren).
- Zet een TikTok-video zonder watermerk op Instagram: video's met het logo van een andere app krijgen minder bereik (te controleren).

## 8. Story-sjablonen

Plaats stories over een wandeling altijd **achteraf**, nooit live tijdens een vast rondje. Gebruik hooguit de stad of een groot park als locatie.

### Takeover door een opvang (zonder wachtwoord)

De opvang stuurt 6–10 korte clips en foto's via WhatsApp of AirDrop. Jij plaatst ze die dag, met hun naam erbij. Zo deel je nooit je wachtwoord.

1. "Vandaag neemt [@opvang] onze stories over." (logo van de opvang, groene achtergrond)
2. "Goedemorgen vanuit [opvang]": de begeleider, alleen met toestemming in beeld.
3. "Dit is [hond]": twee zinnen over karakter en wat hij leuk vindt. De opvang kiest de honden.
4. "Zo gaat een groepswandeling": 3 korte clips.
5. Peiling: "Zou jij meelopen?" Ja / Ik twijfel nog.
6. Linksticker naar `/dogs?org=ID`: "Bekijk hun honden."
7. "Dank je wel, [@opvang]!"

### Hond van de week

**Toestemming eerst.** Bij een hond van een eigenaar: de eigenaar tekent het formulier. Bij een opvanghond beslist de opvang.

1. Foto van de hond, buiten, zonder huis of straat: "Dit is [naam] ([leeftijd])."
2. "[Naam] houdt van [eendjes kijken / een stok die te groot is]."
3. Quiz-sticker: "Wat denk je dat [naam] het liefst doet?" Met drie grappige antwoorden.
4. "[Naam] zoekt een vast maatje op [dag] in [stad]." Een wijk alleen als de eigenaar dat goed vindt.
5. Linksticker naar de pagina van de hond (`/dogs/[id]`): "Maak kennis."

Nooit: het adres, de achternaam of de gezondheid van de eigenaar. Vragen over adoptie stuur je door naar de opvang.

### Vragenronde

- **Beeld 1:** vragensticker: "Vraag het ons: hoe werkt een kennismaking?"
- **Beeld 2–5:** antwoorden op groene kaarten, elk één vraag.
- **Beeld 6:** linksticker naar `/r/STORY`: "Doe mee."

**Regels:**
- Deel geen vraag met persoonlijke gegevens, en deel nooit wie de vraag stelde.
- Geen medisch of juridisch advies.
- Gaat een vraag over mentale gezondheid? Verwijs naar de hulppagina en naar 113 (0800-0113), en stel niets voor wat op hulpverlening lijkt.

## 9. Hashtags per land

- Instagram staat sinds december 2025 maximaal **5 hashtags** per post toe.
- Gebruik er altijd één eigen, `#rondjeapp`, plus 1–2 over het onderwerp en 1 lokale.
- Kijk vóór gebruik naar de bovenste posts onder een hashtag: past het, en is het geen spam?
- Geen algemene tags als #reels of #explore: Instagram vraagt dat zelf.

| Land | Onderwerp (kies er 1–2) | Lokaal (kies er 1) |
|---|---|---|
| **Nederland** | #hondenliefde #hondenuitlaten #asielhond #dierenasiel #vrijwilligerswerk #wandelen #snuffelen #studentenleven | #utrecht (of je stad) |
| **België, Vlaanderen** | #hondenliefde #asielhond #dierenasiel #vrijwilligerswerk #wandelen | #gent #antwerpen #leuven |
| **België, Brussel en Wallonië** | #chien #refuge #benevolat #promenade #adopteznachetezpas (te controleren) | #bruxelles #liege |
| **Spanje** | #perros #protectora #adoptanocompres #voluntariado #paseo | #madrid #valencia #malaga |

## 10. Ritme

Ongeveer 2 uur per week: dat is het weekbudget voor Instagram en video in [`MARKETING.md`](MARKETING.md) §9.

| Dag | Wat | Tijd |
|---|---|---|
| Dinsdag | De Reel plaatsen die je zondag monteerde | 10 min |
| Donderdag | Een carrousel of foto, uit je Canva-sjabloon | 30 min |
| Zaterdag | Filmen bij de groepswandeling; 2–4 stories, achteraf geplaatst | 15 min extra |
| Zondag | De Reel voor dinsdag monteren; cijfers bijwerken (§14) | 40 min |
| Maandag tot en met vrijdag | Reacties en DM's beantwoorden | 5 min per dag |

- **Begin met 1 Reel en 1 carrousel per week.** Meer tijd, of een ambassadeur die helpt? Ga dan naar 2 video's per week op vaste dagen, zoals in [`GROWTH.md`](GROWTH.md). Elke serie heeft een vaste openingszin.
- **Stories:** op de dag van een groepswandeling, en verder als er iets te vertellen is. Bijvoorbeeld een peiling, de volgende groepswandeling met linksticker, of iets van achter de schermen.
- **Tentamens, feestdagen of een volle week:** één post per week is genoeg. Liever minder dan opbranden.
- **Taal:** Nederlands. Voor internationale studenten kun je onderaan één Engelse regel toevoegen: "EN: Free walks with dogs who need one. 18+. Link in bio."
- **Later een tweede account?** Een apart Spaans account pas als er elke week Spaanse content is, bijvoorbeeld bij minstens 3 live opvangen in Spanje. Tot die tijd bereik je Spanje, Brussel en Wallonië via collabs met opvangen, in hun taal.

## 11. Samenwerken met opvangen (collab-posts)

**Wat het is:** één post die op beide profielen verschijnt, met de likes en reacties samen. Je nodigt de opvang uit als collaborator wanneer je de post maakt (bij "Personen taggen"); de opvang accepteert. Hoeveel collaborators er op één post kunnen, verschilt per bron (te controleren).

**Wanneer:**
- na de eerste groepswandeling bij een opvang;
- als een opvang live gaat;
- eens per maand: de "hond van de maand" bij die opvang.

**Hoe:**
1. Vraag de opvang welke honden in beeld mogen, en wat hun fotoregels zijn.
2. Stuur 2 dagen van tevoren een collab-kit ter goedkeuring: 3–6 foto's of een Reel, een tekst in hun taal, de alt-tekst, de hashtags en hun link `/dogs?org=ID`.
3. Plaats de post als collab. Vraag of ze hun Rondje-pagina in hun bio of in een story zetten.
4. Stuur ze een week later de cijfers: bereik, en hoeveel aanmeldingen er kwamen voor hun groepswandelingen.

**Nooit:** adopties beloven, honden posten die de opvang niet in beeld wil, of om hun wachtwoord vragen.

## 12. Toestemming en herposten

Alles volgt [`legal/media-consent.md`](legal/media-consent.md) en de regels voor delen op `/about` (onder "Deel je rondje").

**Vóór elke post: zes checks**
1. **Wie staat erop?**
   - De hond: de eigenaar gaf toestemming op het formulier, of de opvang tekende voor haar honden.
   - Mensen: elke herkenbare persoon heeft een eigen formulier. Voorbijgangers maak je onherkenbaar.
   - **Minderjarigen nooit**, ook niet met toestemming van de ouders. Dat is strenger dan het formulier, en zo afgesproken in [`GROWTH.md`](GROWTH.md).
2. **Waar is het?** Geen adres, huisnummer, straatnaambord, kenteken of herkenbare voordeur. Nooit de kaart of de route uit de app: een route begint vaak bij iemands huis. Als locatie hooguit de stad of een groot park, en pas achteraf.
3. **Wat staat er in de tekst?** Geen achternaam. Geen gezondheid, zoals "een nieuwe heup", tenzij de persoon dat zelf wil. De leeftijd van een oudere alleen met toestemming.
4. **Voor welk gebruik?** Alleen wat op het formulier is aangekruist. Betaalde advertenties hebben een eigen vinkje.
5. **Vooraf laten zien.** Bij een persoonlijk verhaal stuur je de video of tekst eerst. **Ouderen extra zorgvuldig:** geef ze de tijd, en lees het eventueel samen met een familielid door. Nee is altijd goed.
6. **Vastleggen** in de toestemmingslog (hieronder).

**Herposten van anderen** (ook als iemand #rondjeapp gebruikt of Rondje tagt):
- Altijd eerst vragen, met het DM-sjabloon uit §13. Pas na een duidelijk "ja" van de maker, én van de eigenaar als het niet hun eigen hond is.
- Noem de maker. Snijd hun naam niet weg.
- Herpost geen story met een locatiesticker in de buurt van iemands huis.
- Bewaar het "ja" als schermafbeelding in de log.

**Toestemmingslog:** een spreadsheet met datum · post · wie of welke hond · welk gebruik is aangekruist · waar het formulier ligt · intrekking. Bewaar de formulieren veilig, niet in een gedeelde map, en volg de bewaartermijnen uit het formulier.

**Intrekken:** vraagt iemand om iets weg te halen, dan doe je dat op de eigen kanalen binnen 7 dagen (voorstel uit het formulier), zonder discussie.

## 13. DM-sjablonen

DM's stuur je alleen aan organisaties, en aan mensen die zelf contact opnamen. Nooit ongevraagd aan privépersonen. De volledige mails en belscripts staan in [`OUTREACH.md`](OUTREACH.md) §5. Echte organisaties benaderen gebeurt na jouw akkoord, vanuit je eigen naam.

### Aan een opvang: eerste bericht

Noem stemmen alleen als ze er echt zijn.

**Nederlands**
> Hoi [opvang]! Ik ben Laurens van Rondje: een gratis app waarmee jongvolwassenen (18+) in kleine, begeleide groepen met opvanghonden wandelen, op momenten die jullie kiezen. Jullie bepalen welke honden meedoen en wie er komt. [Op Rondje gaven al [aantal] mensen aan dat ze bij jullie willen wandelen.] Mag ik een korte mail sturen met hoe het werkt? Naar welk adres kan dat het best?

**Français**
> Bonjour [refuge] ! Je suis Laurens, de Rondje : une application gratuite qui permet à des jeunes de 18 ans et plus de promener vos chiens en petits groupes encadrés, aux moments que vous choisissez. Vous décidez quels chiens participent et qui vient. [Sur Rondje, [nombre] personnes ont déjà indiqué vouloir promener chez vous.] Puis-je vous envoyer un court e-mail pour vous expliquer ? À quelle adresse ?

**Español**
> ¡Hola, [protectora]! Soy Laurens, de Rondje: una app gratuita para que jóvenes mayores de 18 años paseen a vuestros perros en grupos pequeños y supervisados, en los horarios que elijáis. Vosotros decidís qué perros participan y quién viene. [En Rondje, [número] personas ya han dicho que quieren pasear con vosotros.] ¿Os puedo mandar un correo corto para contaros cómo funciona? ¿A qué dirección?

### Na een ja

**Nederlands**
> Dank jullie wel! Hier is jullie aanmeldlink: [link /shelter?claim=ID]. Aanmelden duurt een paar minuten; daarna controleren we jullie gegevens, meestal binnen twee werkdagen. Zal ik helpen met de honden online zetten? Met een stapel foto's gaat dat snel.

**Français**
> Merci beaucoup ! Voici votre lien d'inscription : [lien /shelter?claim=ID]. Cela prend quelques minutes ; ensuite, nous vérifions vos informations, en général sous deux jours ouvrables. Voulez-vous que je vous aide à mettre vos chiens en ligne ? Avec une série de photos, ça va vite.

**Español**
> ¡Muchas gracias! Este es vuestro enlace de registro: [enlace /shelter?claim=ID]. Son unos minutos; después comprobamos vuestros datos, normalmente en dos días laborables. ¿Os ayudo a subir los perros? Con un montón de fotos va rápido.

### Een collab voorstellen

> Wat een mooie wandeling zaterdag! Zullen we de beelden samen posten, als collab op jullie en ons account? Ik stuur jullie eerst de foto's en de tekst, en we plaatsen niets wat jullie niet goed vinden. Welke honden mogen er wel en niet in?

### Vragen of je mag herposten

> Wat een leuke foto! Mogen we hem delen op ons account, met jouw naam erbij? En weet de eigenaar van [hond] ervan, en vindt die het goed? We zetten er geen adres of route bij. Geen probleem als je liever niet wilt.

### Snelle antwoorden

| Vraag | Antwoord |
|---|---|
| "Hoe doe ik mee?" | "Leuk! Via de link in onze bio maak je een account. Begin met een groepswandeling bij een opvang: geen ervaring nodig, een begeleider loopt mee." |
| "Mijn oma heeft een hond die te weinig buiten komt." | "Wat lief dat je aan haar denkt. Vraag het haar eerst zelf. Vindt ze het goed, dan kun jij de hond voor haar aanmelden: jij regelt de aanvragen, en bij de kennismaking zijn jullie erbij." |
| "Ik ben 16, mag ik meedoen?" | "Rondje is vanaf 18 jaar. Sommige opvangen hebben plekken voor jongere vrijwilligers: vraag het bij een opvang bij jou in de buurt." |
| "Wat kost het?" | "Niets. Rondje is gratis en vraagt nooit om geld. Vraagt iemand je toch om geld? Meld het in de app." |
| Iemand vertelt dat het niet goed met hem of haar gaat | "Fijn dat je het vertelt. Rondje is geen hulpverlening, maar je hoeft het niet alleen te doen. Bel of chat met 113 (0800-0113), of praat met je huisarts. Bij direct gevaar: bel 112." |

## 14. Meten

**De weg van kijker naar wandelaar:**

| Stap | Waar je het ziet | Per week in maand 2–3 (aanname) |
|---|---|---|
| Bereik | Instagram-statistieken | 3.000 |
| Profielbezoeken | Statistieken | 150 |
| Tikken op de link in de bio | Statistieken (tikken op externe links) | 25 |
| Tikken op linkstickers | Statistieken per story | 10 |
| Aanmeldingen met `INSTA` en `STORY` | Beheer → **Aanmeldingen per uitnodigingscode** | 5 |
| Opslaan en delen per 1.000 bereik | Statistieken per post | Belangrijker dan likes ([`GROWTH.md`](GROWTH.md)) |
| DM's van opvangen | Inbox | 1 |

**Waarom Beheer te weinig telt:**
- De code telt pas als iemand zijn profiel afmaakt, binnen 30 dagen, in dezelfde browser.
- Wie in Instagram op de link tikt, opent Rondje in de browser van Instagram. Maakt iemand later in Safari of Chrome een account, dan telt de code niet mee.
- Zie de aantallen dus als een minimum.

**Elke zondag 10 minuten,** samen met de KPI-sheet uit [`MARKETING.md`](MARKETING.md) §8:
- Veel profielbezoeken, maar weinig tikken op de link? Dan is de bio niet duidelijk genoeg.
- Veel tikken, maar weinig aanmeldingen? Kijk dan naar de pagina waar mensen landen.
- Veel opslaan en delen, maar weinig tikken? Prima: dat bouwt vertrouwen. Zet een duidelijke oproep in de tekst.
- Na 6 Reels: stop met de 2 zwakste formats en doe meer van de beste ([`GROWTH.md`](GROWTH.md)).

## 15. Nooit doen

- Geen volgers, likes of views kopen. Geen volg-ontvolgtrucs en geen groepjes die elkaars posts liken.
- Geen winacties waarbij mensen anderen moeten taggen, of moeten volgen en delen om kans te maken.
- Geen advertenties met foto's of video's van honden of mensen zonder het aparte vinkje "Betaalde advertenties" op het formulier.
- Geen medische of mentale-gezondheidsclaims: niet "helpt tegen depressie of eenzaamheid", niet "therapie". Volg de mediatips van 113.
- Geen "100% veilig", "gescreend" of "verzekerd".
- Geen adressen, huisnummers, straatnaamborden, kentekens, routes of schermen van de kaart. Geen locatietag bij iemands huis, en geen live stories van een vast rondje.
- Geen minderjarigen in beeld, ook niet op de achtergrond.
- Geen ouderen in beeld die de beelden niet eerst zagen en ja zeiden.
- Geen DM's aan privépersonen die zelf geen contact zochten. Rondje benadert nooit zelf een oudere of een eigenaar.
- Niets herposten zonder toestemming, ook niet als iemand #rondjeapp gebruikt.
- Geen hond in stress brengen voor een mooi shot ([`GROWTH.md`](GROWTH.md), spelregel 5).
- Geen adopties beloven, en geen "adopteer deze hond" zonder dat de opvang dat wil.
- Nooit om geld vragen in een DM. De Patreon-link staat alleen in de highlight Steun, zonder aandringen.
- Het wachtwoord met niemand delen, ook niet voor een takeover.
- Geen discussie in de reacties over een incident: neem het offline en volg het veiligheidsprotocol ([`MARKETING.md`](MARKETING.md) §10).
