import Foundation
import SwiftUI
import Testing
@testable import Rondje

/// DPIA maatregel M5: a dog added for someone else (a neighbour, a grandparent) only goes online when its
/// owner knows and agrees, like the website's dog form. Plus the same hints as the website under the
/// public fields (story, needs) and under "what happened" after a bite.
@Suite("A dog for someone else, and the dog form's hints")
@MainActor
struct ForSomeoneTests {
    // MARK: The switches

    @Test func yourOwnDogNeedsNothingExtra() {
        let own = DogForSomeone()
        #expect(!own.on)
        #expect(own.isSettled)
        #expect(!own.forSomeoneField)
        #expect(!own.ownerConsentField)
    }

    @Test func someoneElsesDogWaitsForTheOwnersConsent() {
        var dog = DogForSomeone()
        dog.set(true)
        #expect(!dog.isSettled)
        dog.ownerConsent = true
        #expect(dog.isSettled)
        #expect(dog.forSomeoneField)
        #expect(dog.ownerConsentField)
    }

    @Test func switchingItOffClearsTheConsent() {
        var dog = DogForSomeone()
        dog.set(true)
        dog.ownerConsent = true
        dog.set(false)
        #expect(dog == DogForSomeone())
        // Back on: the consent is asked again, as on the website (the box comes back empty).
        dog.set(true)
        #expect(!dog.ownerConsent)
        #expect(!dog.isSettled)
    }

    @Test func aConsentWithoutTheFirstSwitchIsNeverSent() {
        // Only "for someone else" makes the consent count, like forSomeoneSchema on the server.
        let dog = DogForSomeone(on: false, ownerConsent: true)
        #expect(dog.isSettled)
        #expect(!dog.ownerConsentField)
    }

    // MARK: Bewaar

    private func canSave(name: String = "Saar", insurance: Bool = true, health: Bool = true, biteHistory: Bool = false,
                         biteNote: String = "", forSomeone: DogForSomeone = DogForSomeone()) -> Bool {
        AddDogView.canSave(name: name, insurance: insurance, health: health, biteHistory: biteHistory, biteNote: biteNote, forSomeone: forSomeone)
    }

    @Test func bewaarWaitsForTheConsent() {
        #expect(canSave())
        #expect(!canSave(forSomeone: DogForSomeone(on: true, ownerConsent: false)))
        #expect(canSave(forSomeone: DogForSomeone(on: true, ownerConsent: true)))
    }

    @Test func theOtherChecksStillHold() {
        let agreed = DogForSomeone(on: true, ownerConsent: true)
        #expect(!canSave(name: "", forSomeone: agreed))
        #expect(!canSave(insurance: false, forSomeone: agreed))
        #expect(!canSave(health: false, forSomeone: agreed))
        #expect(!canSave(biteHistory: true, biteNote: "kort", forSomeone: agreed))
        #expect(canSave(biteHistory: true, biteNote: "Eén keer bij de dierenarts.", forSomeone: agreed))
    }

    // MARK: What goes to the server

    private func payload(_ dog: DogForSomeone) -> AddDogView.Payload {
        AddDogView.Payload(
            name: "Saar", breed: "", sex: "female", size: "medium", energy: "calm", level: "starter", story: "", needs: "",
            treats: "own", country: "NL", city: "Utrecht", meetingInfo: "", vetInfo: "", biteNote: "", ageYears: 4, walkMinutes: 30,
            traits: [], provides: ["leash"], offLeash: false, insuranceConfirmed: true, healthConfirmed: true, biteHistory: false,
            forSomeone: dog.forSomeoneField, ownerConsent: dog.ownerConsentField, photos: []
        )
    }

    private func json(_ dog: DogForSomeone) throws -> [String: Any] {
        let data = try JSONEncoder().encode(payload(dog))
        return try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    /// The website's field names, as JSON booleans: the app API turns `true` into the form's "on"
    /// (FLAGS in web/src/app/api/v1/my-dogs/route.ts), which forSomeoneSchema reads.
    @Test func sendsTheWebsitesFieldsAsBooleans() throws {
        let agreed = try json(DogForSomeone(on: true, ownerConsent: true))
        #expect(agreed["forSomeone"] as? Bool == true)
        #expect(agreed["ownerConsent"] as? Bool == true)
        let raw = String(decoding: try JSONEncoder().encode(payload(DogForSomeone(on: true, ownerConsent: true))), as: UTF8.self)
        #expect(raw.contains(#""forSomeone":true"#))
        #expect(raw.contains(#""ownerConsent":true"#))
    }

    @Test func yourOwnDogSendsBothOff() throws {
        let own = try json(DogForSomeone())
        #expect(own["forSomeone"] as? Bool == false)
        #expect(own["ownerConsent"] as? Bool == false)
        // The rest of the body is as before.
        #expect(own["insuranceConfirmed"] as? Bool == true)
        #expect(own["name"] as? String == "Saar")
    }

    // MARK: The server's answer

    @Test func aMissingConsentGetsACalmLine() {
        // The server answers {"error":"owner-consent","message":…}: the website's line about ticking a box
        // (myDogs.errors.owner-consent in the web PR for the app API), or its generic error on a server
        // without that line. The app has a switch, so it uses its own line either way.
        for message in ["Vink aan dat de eigenaar ervan weet en het goed vindt.", "Er ging iets mis. Probeer het opnieuw."] {
            let error = APIError.server(code: "owner-consent", message: message)
            #expect(AddDogView.saveMessage(for: error) == DogForSomeone.missingConsent)
        }
        #expect(DogForSomeone.errorCode == "owner-consent")
    }

    // MARK: Why Bewaar waits

    @Test func theReminderShowsOnlyWhileTheConsentIsOff() {
        #expect(DogForSomeone().reminder == nil)
        #expect(DogForSomeone(on: true, ownerConsent: false).reminder == DogForSomeone.missingConsent)
        #expect(DogForSomeone(on: true, ownerConsent: true).reminder == nil)
        // Exactly when Bewaar waits for the consent.
        for dog in [DogForSomeone(), DogForSomeone(on: true), DogForSomeone(on: true, ownerConsent: true), DogForSomeone(on: false, ownerConsent: true)] {
            #expect((dog.reminder != nil) == !canSave(forSomeone: dog), "\(dog)")
        }
    }

    @Test func theReminderIsOnScreenUnderTheConsentSwitch() async throws {
        let waiting = try await AXProbe.nodes(Form { ForSomeoneRows(value: .constant(DogForSomeone(on: true))) })
        #expect(waiting.contains { $0.label.contains(DogForSomeone.missingConsent) }, "\(waiting)")
        // The switch still reads the website's explainer as its hint.
        #expect(waiting.contains { $0.label.contains(DogForSomeone.consentLabel) && $0.hint == DogForSomeone.hint }, "\(waiting)")

        let agreed = try await AXProbe.nodes(Form { ForSomeoneRows(value: .constant(DogForSomeone(on: true, ownerConsent: true))) })
        #expect(!agreed.contains { $0.label.contains(DogForSomeone.missingConsent) }, "\(agreed)")
        #expect(agreed.contains { $0.label.contains(DogForSomeone.consentLabel) }, "\(agreed)")

        let own = try await AXProbe.nodes(Form { ForSomeoneRows(value: .constant(DogForSomeone())) })
        #expect(!own.contains { $0.label.contains(DogForSomeone.missingConsent) }, "\(own)")
        #expect(!own.contains { $0.label.contains(DogForSomeone.consentLabel) }, "\(own)")
    }

    @Test func otherErrorsStayAsTheyWere() {
        let bite = APIError.server(code: "bite-note", message: "Vertel kort wat er gebeurde.")
        #expect(AddDogView.saveMessage(for: bite) == "Vertel kort wat er gebeurde.")
        #expect(AddDogView.saveMessage(for: APIError.offline) == APIError.offline.plainText)
        #expect(AddDogView.saveMessage(for: URLError(.notConnectedToInternet)) == APIError.offline.plainText)
    }

    // MARK: The words

    private static let translated: [String: [String: String]] = [
        "Ik meld deze hond aan voor iemand anders": [
            "en": "I'm signing up this dog for someone else",
            "fr": "J'inscris ce chien pour quelqu'un d'autre",
            "es": "Inscribo el perro de otra persona",
        ],
        "De eigenaar weet ervan en vindt het goed": [
            "en": "The owner knows about it and is happy with it",
            "fr": "Le propriétaire est au courant et d'accord",
            "es": "El dueño lo sabe y está de acuerdo",
        ],
        "Zet hun naam en telefoonnummer hieronder, bij de plek waar jullie afspreken. Dat ziet een wandelaar pas na een geaccepteerde afspraak.": [
            "en": "Add their name and phone number below, with where you meet. A walker only sees this once a walk has been accepted.",
            "fr": "Indique son nom et son numéro de téléphone ci-dessous, avec le lieu de rendez-vous. Visible uniquement après l'acceptation d'un rendez-vous.",
            "es": "Pon su nombre y su teléfono aquí abajo, junto al lugar donde quedáis. Solo se muestra cuando se ha aceptado un paseo.",
        ],
        "Bevestig eerst dat de eigenaar ervan weet en het goed vindt.": [
            "en": "First confirm that the owner knows about it and is happy with it.",
            "fr": "Confirme d'abord que le propriétaire est au courant et d'accord.",
            "es": "Confirma primero que el dueño lo sabe y está de acuerdo.",
        ],
        "Wie is je hond, en waarom is een extra rondje fijn?": [
            "en": "Who is your dog, and why would an extra walk be nice?",
            "fr": "Qui est ton chien, et pourquoi une balade de plus lui ferait du bien ?",
            "es": "¿Cómo es tu perro y por qué le vendría bien un paseo extra?",
        ],
        "Ook dit is voor iedereen te zien. Houd het bij de hond.": [
            "en": "Anyone can read this too. Keep it about the dog.",
            "fr": "Tout le monde peut aussi lire ceci. Parle seulement du chien.",
            "es": "Esto también lo puede leer cualquiera. Habla solo del perro.",
        ],
        "Eerlijkheid beschermt je hond en de wandelaar. Honden met een bijtgeschiedenis gaan alleen mee met ervaren wandelaars.": [
            "en": "Honesty protects your dog and the walker. Dogs with a history of biting only go out with experienced walkers.",
            "fr": "L'honnêteté protège ton chien et le promeneur. Les chiens qui ont déjà mordu ne sortent qu'avec des promeneurs expérimentés.",
            "es": "La sinceridad protege a tu perro y a quien lo pasea. Los perros con antecedentes de mordeduras solo salen con paseadores con experiencia.",
        ],
    ]

    private func bundle(_ lang: String) throws -> Bundle {
        let path = try #require(Bundle.main.path(forResource: lang, ofType: "lproj"), "\(lang).lproj")
        return try #require(Bundle(path: path))
    }

    @Test func everyLanguageHasTheWebsitesWords() throws {
        for (key, languages) in Self.translated {
            #expect(try bundle("nl").localizedString(forKey: key, value: "", table: nil) == key)
            for (lang, expected) in languages {
                #expect(try bundle(lang).localizedString(forKey: key, value: "", table: nil) == expected, "\(lang): \(key)")
            }
        }
    }

    @Test func theFrenchSaysTu() throws {
        // "rendez-vous" is a word of its own, not "vous".
        let vous = #"(?<!rendez-)\b(vous|votre|vos|indiquez|parlez|confirmez|cochez)\b"#
        let fr = try bundle("fr")
        for key in Self.translated.keys {
            let value = fr.localizedString(forKey: key, value: "", table: nil)
            #expect(value.range(of: vous, options: [.regularExpression, .caseInsensitive]) == nil, "\(value)")
        }
    }

    @Test func theWordsAreCalm() {
        let lines = Array(Self.translated.keys) + Self.translated.values.flatMap { Array($0.values) }
        for line in lines {
            #expect(!GuusLine.isBanned(line), "\(line)")
            #expect(!line.contains("!"), "\(line)")
        }
    }

    @Test func theAppAsksForTheseKeys() {
        let catalog = { (key: String) in Bundle.main.localizedString(forKey: key, value: "", table: nil) }
        #expect(DogForSomeone.label == catalog("Ik meld deze hond aan voor iemand anders"))
        #expect(DogForSomeone.consentLabel == catalog("De eigenaar weet ervan en vindt het goed"))
        #expect(DogForSomeone.hint == catalog("Zet hun naam en telefoonnummer hieronder, bij de plek waar jullie afspreken. Dat ziet een wandelaar pas na een geaccepteerde afspraak."))
        #expect(DogForSomeone.missingConsent == catalog("Bevestig eerst dat de eigenaar ervan weet en het goed vindt."))
        #expect(AddDogView.storyPlaceholder == catalog("Wie is je hond, en waarom is een extra rondje fijn?"))
        #expect(AddDogView.needsHint == catalog("Ook dit is voor iedereen te zien. Houd het bij de hond."))
        #expect(AddDogView.biteNoteHint == catalog("Eerlijkheid beschermt je hond en de wandelaar. Honden met een bijtgeschiedenis gaan alleen mee met ervaren wandelaars."))
    }

    /// The old placeholder asked "for whom is it?", which invites writing about the owner on a public page.
    @Test func theStoryPlaceholderAsksAboutTheDog() throws {
        let nl = try bundle("nl").localizedString(forKey: "Wie is je hond, en waarom is een extra rondje fijn?", value: "", table: nil)
        #expect(!nl.contains("voor wie"))
        #expect(!AddDogView.storyPlaceholder.isEmpty)
    }

    // MARK: VoiceOver

    @Test func theConsentSwitchReadsTheExplainerAsItsHint() async throws {
        let nodes = try await AXProbe.nodes(
            Form { Toggle(DogForSomeone.consentLabel, isOn: .constant(false)).fieldNote(DogForSomeone.hint) }
        )
        let toggle = try #require(nodes.first { $0.label.contains(DogForSomeone.consentLabel) }, "\(nodes)")
        #expect(toggle.hint == DogForSomeone.hint)
        #expect(!toggle.label.contains(DogForSomeone.hint))
        #expect(!nodes.contains { $0.label.contains(DogForSomeone.hint) }, "\(nodes)")
    }

    @Test func theNeedsFieldReadsThePublicHintAsItsHint() async throws {
        let nodes = try await AXProbe.nodes(
            Form { TextField(L("Waar moet een wandelaar op letten?"), text: .constant(""), axis: .vertical).fieldNote(AddDogView.needsHint) }
        )
        #expect(nodes.contains { $0.hint == AddDogView.needsHint }, "\(nodes)")
        #expect(!nodes.contains { $0.label.contains(AddDogView.needsHint) }, "\(nodes)")
    }
}
