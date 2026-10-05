import SwiftUI

/// One Hondenschool lesson: a handful of small cards that teach one safety habit.
/// The lessons teach the same rules as the SOS sheet and the quiz, and cover every quiz question. They unlock nothing by themselves:
/// the server-checked quiz stays the gate for solo walks, and meeting first stays mandatory.
struct Lesson: Identifiable {
    let id: String
    let title: String
    let symbol: String
    let cards: [LessonCard]
}

enum LessonCard {
    /// One sentence with a picture, then "Verder".
    case info(String, LessonArt)
    /// A question with exactly one right option. `explain` is what Guus says after the right pick.
    case choice(question: String, options: [LessonOption], explain: String)
    /// Something to do for real, like a hand on the pavement, held for `seconds`. Then the `after` text.
    case hold(String, seconds: Int, after: String)
}

struct LessonOption {
    let text: String
    let art: LessonArt?
    let correct: Bool
    /// Guus's one-sentence explanation after a wrong pick.
    let why: String?

    static func right(_ text: String, art: LessonArt? = nil) -> LessonOption {
        LessonOption(text: text, art: art, correct: true, why: nil)
    }

    static func wrong(_ text: String, art: LessonArt? = nil, why: String) -> LessonOption {
        LessonOption(text: text, art: art, correct: false, why: why)
    }
}

enum LessonArt {
    case symbol(String)
    case dog(DogLook, DogMood)
    case guus(DogMood)
}

/// The five lessons of the Hondenschool, in path order. Progress is kept on this phone only
/// (Keepsakes.lessonsDone); there are no points, hearts, lives or timers.
@MainActor
enum Lessons {
    static var all: [Lesson] {
        [hello, bodyLanguage, meet, weather, help]
    }

    /// The finished lessons that still exist.
    static func done(_ keepsakes: Keepsakes = .shared) -> Set<String> {
        keepsakes.lessonsDone.intersection(all.map(\.id))
    }

    static func allDone(_ keepsakes: Keepsakes = .shared) -> Bool {
        done(keepsakes).count == all.count
    }

    private static var hello: Lesson {
        Lesson(id: "hello", title: L("Hoi zeggen"), symbol: "hand.wave.fill", cards: [
            .info(L("Aan een hond stel je je voor met je hand. Laat hem eerst rustig snuffelen."), .guus(.happy)),
            .choice(question: L("Je ziet Bobbie voor het eerst. Wat doe je?"), options: [
                .right(L("Hand laag houden en laten snuffelen")),
                .wrong(L("Meteen over zijn kop aaien"),
                       why: L("Een hand van boven voelt voor een hond als iets groots dat op hem afkomt.")),
                .wrong(L("Hem optillen voor een knuffel"),
                       why: L("Optillen is spannend voor een hond die je nog niet kent.")),
            ], explain: L("Precies! Zo weet hij wie je bent.")),
            .info(L("Een hond op straat? Vraag altijd eerst de eigenaar of je mag aaien."), .symbol("person.fill.questionmark")),
            .choice(question: L("Bobbie draait zijn kop weg als je hem aait. Wat betekent dat?"), options: [
                .right(L("Even genoeg, geef hem ruimte")),
                .wrong(L("Hij wil meer aaitjes"), why: L("Wegdraaien is een beleefde manier om nee te zeggen.")),
            ], explain: L("Goed gezien. Luisteren naar een hond is de helft van het werk.")),
        ])
    }

    private static var bodyLanguage: Lesson {
        Lesson(id: "body", title: L("Lichaamstaal"), symbol: "ear.fill", cards: [
            .info(L("Gapen, lippen likken en wegkijken betekenen vaak: ik voel me niet op mijn gemak."), .dog(IntroView.border, .uneasy)),
            .choice(question: L("Welke hond wil wat ruimte?"), options: [
                .wrong(L("Blij"), art: .dog(IntroView.golden, .happy),
                       why: L("Deze hond is blij. Kijk naar de ogen en de mond.")),
                .right(L("Ongemakkelijk"), art: .dog(IntroView.border, .uneasy)),
                .wrong(L("Slaperig"), art: .dog(IntroView.brown, .sleepy), why: L("Deze hond is gewoon moe.")),
            ], explain: L("Ja. Zijn ogen kijken weg en zijn wenkbrauwen staan bezorgd.")),
            .choice(question: L("Wat doe je dan?"), options: [
                .right(L("Een rustigere plek zoeken")),
                .wrong(L("Lekker doorlopen naar de drukte"), why: L("Drukte maakt het voor hem nog spannender.")),
                .wrong(L("Hem stevig knuffelen"), why: L("Knuffelen voelt voor veel honden als vastgehouden worden.")),
            ], explain: L("Precies. Rust helpt meer dan aandacht.")),
            .info(L("Kwispelen is niet altijd blij. Kijk naar de hele hond: ogen, oren, mond en staart."), .symbol("eye.fill")),
        ])
    }

    private static var meet: Lesson {
        Lesson(id: "meet", title: L("De kennismaking"), symbol: "person.2.fill", cards: [
            .info(L("De eerste keer loop je altijd samen met de eigenaar."), .guus(.happy)),
            .info(L("Neem je ID mee. De eigenaar bekijkt het, \(Brand.name) bewaart nooit een kopie."), .symbol("person.text.rectangle.fill")),
            .choice(question: L("Wat neem je mee naar de kennismaking?"), options: [
                .right(L("Je ID")),
                .wrong(L("Geld voor de eigenaar"), why: L("\(Brand.name) is gratis. Geld hoort er nooit bij.")),
                .wrong(L("Een zak koekjes"), why: L("Koekjes alleen als de eigenaar zegt dat het mag.")),
            ], explain: L("Ja. Zo weet de eigenaar wie er met de hond loopt.")),
            .choice(question: L("Na de kennismaking. Wanneer mag je zelfstandig met de hond?"), options: [
                .right(L("Als de eigenaar je vertrouwen geeft, je ID in het echt heeft gezien, je de quiz hebt gehaald en live locatie aan staat")),
                .wrong(L("Meteen, je kent hem nu"), why: L("De eigenaar beslist. Dat gaat per hond.")),
            ], explain: L("Klopt. Stap voor stap, voor iedereen veilig.")),
            .choice(question: L("Mag de hond los?"), options: [
                .right(L("Alleen als de eigenaar het uitdrukkelijk zegt, en alleen waar het mag")),
                .wrong(L("Ja, als hij goed luistert"), why: L("Ook een hond die goed luistert blijft aan de lijn, tenzij de eigenaar iets anders zegt.")),
            ], explain: L("Precies. Bij twijfel blijft hij aan de lijn.")),
        ])
    }

    private static var weather: Lesson {
        Lesson(id: "weather", title: L("Warm, koud en water"), symbol: "thermometer.sun.fill", cards: [
            .hold(L("Leg je hand plat op de stoep. Houd hem er 7 seconden op."), seconds: 7,
                  after: L("Te heet voor je hand? Dan ook voor zijn pootjes. Loop dan in het gras of in de schaduw.")),
            .choice(question: L("Het is 28 graden. Wat past?"), options: [
                .right(L("Kort rondje in de schaduw, met water")),
                .wrong(L("Lekker rennen, dan is het snel klaar"), why: L("Rennen in de hitte is zwaar voor een hond.")),
                .wrong(L("Een lang rondje in de zon"), why: L("Zon en warm asfalt zijn te veel voor zijn pootjes.")),
            ], explain: L("Precies. Kort, koel en met water.")),
            .info(L("In de winter prikt strooizout in pootjes. Even afvegen na het rondje."), .symbol("snowflake")),
            .info(L("In het donker? Een lampje aan de riem maakt jullie allebei beter zichtbaar."), .symbol("flashlight.on.fill")),
        ])
    }

    private static var help: Lesson {
        Lesson(id: "help", title: L("Als er iets gebeurt"), symbol: "cross.case.fill", cards: [
            .info(L("Tijdens het rondje staat SOS altijd rechtsboven. Daar vind je 112, de eigenaar en de dierenarts."), .symbol("sos")),
            .choice(question: L("De hond is losgeschoten. Wat doe je eerst?"), options: [
                .right(L("Rustig blijven, niet achter de hond aan rennen en meteen de eigenaar bellen")),
                .wrong(L("Er hard achteraan rennen"), why: L("Rennen maakt er een spelletje van. Dan rent hij harder weg.")),
                .wrong(L("Eerst zelf zoeken, dan pas de eigenaar bellen"), why: L("Bel de eigenaar meteen. Samen vind je hem sneller.")),
            ], explain: L("Ja. Door je knieën en vrolijk zijn naam roepen helpt ook.")),
            .choice(question: L("De hond bijt een andere hond. Wat doe je?"), options: [
                .right(L("Iedereen in veiligheid, gegevens uitwisselen, de eigenaar bellen en het melden")),
                .wrong(L("Snel doorlopen"), why: L("Weglopen helpt niemand. De andere eigenaar heeft je gegevens nodig.")),
            ], explain: L("Goed. Melden kan via SOS, met 'Meld wat er gebeurde'.")),
            .choice(question: L("Een andere hond komt op jullie af. Wat doe je?"), options: [
                .right(L("Afstand houden en eerst de andere eigenaar vragen")),
                .wrong(L("Laat ze maar snuffelen"), why: L("Niet elke hond vindt een onbekende hond fijn.")),
            ], explain: L("Goed zo. Bij twijfel loop je rustig door.")),
            .choice(question: L("Je loopt later terug dan afgesproken. Wat doe je?"), options: [
                .right(L("De eigenaar meteen laten weten")),
                .wrong(L("Niets, de app laat het toch zien"), why: L("Een kort berichtje voorkomt zorgen.")),
            ], explain: L("Precies. Even laten weten is altijd goed.")),
        ])
    }
}
