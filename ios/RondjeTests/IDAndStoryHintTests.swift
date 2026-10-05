import SwiftUI
import Testing
import UIKit
@testable import Rondje

/// DPIA maatregelen M6 (how to look at an ID) and M18 (the dog's public story): the same words as the
/// website, translated, calm, on screen under the field, and read by VoiceOver as a hint, never as a label.
@Suite("ID how-to and story hint")
@MainActor
struct IDAndStoryHintTests {
    private static let idHow = "Kijk naar foto, naam en geboortedatum. Maak geen foto en schrijf niets over, ook geen BSN."
    private static let storyHint = "Dit verhaal is voor iedereen te zien. Schrijf over de hond, niet over jezelf: geen naam, adres of tijden waarop je thuis bent."

    /// requests.idHow in web/messages, with "tu" in French like the rest of the app (the website says "vous").
    private static let idHowTranslated = [
        "en": "Look at the photo, name and date of birth. Don't take a photo or write anything down, not even the ID number.",
        "fr": "Regarde la photo, le nom et la date de naissance. Ne prends pas de photo et ne note rien, pas même le numéro de la pièce d'identité.",
        "es": "Mira la foto, el nombre y la fecha de nacimiento. No hagas ninguna foto ni apuntes nada, tampoco el número del DNI o NIE.",
    ]
    private static let storyHintTranslated = [
        "en": "Anyone can read this story. Write about the dog, not yourself: no name, address or times when you are home.",
        "fr": "Tout le monde peut lire cette histoire. Parle du chien, pas de toi : ni nom, ni adresse, ni heures où tu es chez toi.",
        "es": "Cualquiera puede leer esta historia. Escribe sobre el perro, no sobre ti: sin nombre, dirección ni horas en las que estás en casa.",
    ]

    private func bundle(_ lang: String) throws -> Bundle {
        let path = try #require(Bundle.main.path(forResource: lang, ofType: "lproj"), "\(lang).lproj")
        return try #require(Bundle(path: path))
    }

    // MARK: The words

    @Test func theDutchIsTheWebsitesText() throws {
        let nl = try bundle("nl")
        #expect(nl.localizedString(forKey: Self.idHow, value: "", table: nil) == Self.idHow)
        #expect(nl.localizedString(forKey: Self.storyHint, value: "", table: nil) == Self.storyHint)
    }

    @Test func everyLanguageHasItsOwnTranslation() throws {
        for (lang, expected) in Self.idHowTranslated {
            #expect(try bundle(lang).localizedString(forKey: Self.idHow, value: "", table: nil) == expected, "\(lang)")
        }
        for (lang, expected) in Self.storyHintTranslated {
            #expect(try bundle(lang).localizedString(forKey: Self.storyHint, value: "", table: nil) == expected, "\(lang)")
        }
    }

    @Test func theFrenchSaysTu() throws {
        let vous = #"\b(vous|votre|vos|regardez|prenez|notez|parlez|écrivez)\b"#
        let fr = try bundle("fr")
        for key in [Self.idHow, Self.storyHint] {
            let value = fr.localizedString(forKey: key, value: "", table: nil)
            #expect(value.range(of: vous, options: [.regularExpression, .caseInsensitive]) == nil, "\(value)")
        }
    }

    @Test func theWordsAreCalmInEveryLanguage() throws {
        var lines = [Self.idHow, Self.storyHint, IDCheck.how, AddDogView.storyHint]
        lines += Array(Self.idHowTranslated.values) + Array(Self.storyHintTranslated.values)
        for line in lines {
            #expect(!GuusLine.isBanned(line), "\(line)")
            #expect(!line.contains("!"), "\(line)")
        }
    }

    @Test func theAppAsksForTheseKeys() {
        // Whatever language the simulator runs in, the app's strings are these catalog entries.
        #expect(IDCheck.how == Bundle.main.localizedString(forKey: Self.idHow, value: "", table: nil))
        #expect(AddDogView.storyHint == Bundle.main.localizedString(forKey: Self.storyHint, value: "", table: nil))
    }

    // MARK: The checklist

    private func appointment(meet: Bool) -> Appointment {
        Appointment(
            id: "a1", kind: meet ? "meet" : "solo", status: "accepted", startsAt: .now.addingTimeInterval(86_400), durationMin: 45,
            weekly: false, message: "", flags: [], walkId: nil, walkStatus: nil, feedbackGiven: nil,
            dog: .init(id: "d1", name: "Saar", photos: [], look: .sample, city: "Utrecht", isShelter: false, meetingInfo: ""),
            host: nil,
            walker: .init(id: "w1", firstName: "Sanne", photoUrl: nil, bio: "", experience: "some", ageBand: "18-25", city: "Utrecht", phone: nil, email: nil),
            trust: nil
        )
    }

    @Test func theOwnersIDItemSaysHowToLook() throws {
        let item = try #require(MeetingPrep.items(for: appointment(meet: true), asOwner: true).first { $0.id == "id" })
        #expect(item.hint == IDCheck.how)
        // A hint, not part of what the row is called.
        #expect(!item.title.contains(IDCheck.how))
        #expect(item.detail == nil)
    }

    @Test func onlyTheOwnersIDItemHasTheHint() {
        for (asOwner, meet) in [(false, true), (false, false), (true, true), (true, false)] {
            for item in MeetingPrep.items(for: appointment(meet: meet), asOwner: asOwner) where !(asOwner && meet && item.id == "id") {
                #expect(item.hint == nil, "\(asOwner ? "owner" : "walker") \(meet ? "meet" : "solo"): \(item.id)")
            }
        }
    }

    // MARK: VoiceOver

    @Test func theTrustSwitchReadsTheHowToAsItsHint() async throws {
        let label = L("Ik heb het ID van \("Sanne") in het echt gezien")
        let nodes = try await AXProbe.nodes(
            Form { Toggle(label, isOn: .constant(false)).fieldNote(IDCheck.how) }
        )
        let toggle = try #require(nodes.first { $0.label.contains("Sanne") }, "\(nodes)")
        #expect(toggle.hint == IDCheck.how)
        #expect(!toggle.label.contains(IDCheck.how))
        // On screen once, and not a second VoiceOver stop.
        #expect(!nodes.contains { $0.label.contains(IDCheck.how) }, "\(nodes)")
    }

    @Test func theStoryFieldReadsTheHintAsItsHint() async throws {
        let nodes = try await AXProbe.nodes(
            Form { TextField(AddDogView.storyPlaceholder, text: .constant(""), axis: .vertical).fieldNote(AddDogView.storyHint) }
        )
        #expect(nodes.contains { $0.hint == AddDogView.storyHint }, "\(nodes)")
        #expect(!nodes.contains { $0.label.contains(AddDogView.storyHint) }, "\(nodes)")
    }

    /// The probe itself: a plain line under a switch is a second VoiceOver stop and no hint, which the tests above rule out.
    @Test func theProbeSeesAPlainLineAsItsOwnStop() async throws {
        let nodes = try await AXProbe.nodes(
            Form { VStack { Toggle("Sanne", isOn: .constant(false)); Text(verbatim: IDCheck.how) } }
        )
        #expect(nodes.contains { $0.label == IDCheck.how }, "\(nodes)")
        #expect(nodes.first { $0.label.contains("Sanne") }?.hint.isEmpty == true, "\(nodes)")
    }

    @Test func theChecklistRowReadsTheHowToAsItsHint() async throws {
        let item = try #require(MeetingPrep.items(for: appointment(meet: true), asOwner: true).first { $0.id == "id" })
        let nodes = try await AXProbe.nodes(PrepRow(prep: item, done: false) {})
        let row = try #require(nodes.first { $0.label.contains(item.title) }, "\(nodes)")
        #expect(row.hint == IDCheck.how)
        #expect(!row.label.contains(IDCheck.how))
        #expect(!nodes.contains { $0.label.contains(IDCheck.how) }, "\(nodes)")
    }
}

/// Hosts a SwiftUI view in a window and reads the elements VoiceOver would visit.
@MainActor
enum AXProbe {
    struct Node: CustomStringConvertible {
        var label: String
        var hint: String
        var description: String { "[\(label) | \(hint)]" }
    }

    static func nodes<V: View>(_ view: V) async throws -> [Node] {
        // SwiftUI only builds its accessibility elements while an assistive technology is on. Like
        // AccessibilitySnapshot, turn on the simulator's automation mode for the test, and back after.
        let automation = try Automation()
        automation.set(true)
        defer { automation.restore() }
        let scene = try #require(UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first)
        let window = UIWindow(windowScene: scene)
        window.frame = CGRect(x: 0, y: 0, width: 393, height: 852)
        let host = UIHostingController(rootView: view)
        window.rootViewController = host
        window.isHidden = false
        defer { window.isHidden = true }
        host.view.layoutIfNeeded()
        try await Task.sleep(for: .milliseconds(300))
        host.view.layoutIfNeeded()
        var out: [Node] = []
        collect(host.view, into: &out, depth: 0)
        return out
    }

    /// The accessibility automation switch from libAccessibility (simulator only, test code only).
    private struct Automation {
        private typealias Get = @convention(c) () -> Int32
        private typealias Set = @convention(c) (Int32) -> Void
        private let get: Get
        private let setter: Set
        private let initial: Int32

        init() throws {
            let root = ProcessInfo.processInfo.environment["IPHONE_SIMULATOR_ROOT"] ?? ""
            let handle = try #require(dlopen(root + "/usr/lib/libAccessibility.dylib", RTLD_NOW), "libAccessibility")
            get = unsafeBitCast(try #require(dlsym(handle, "_AXSAutomationEnabled")), to: Get.self)
            setter = unsafeBitCast(try #require(dlsym(handle, "_AXSSetAutomationEnabled")), to: Set.self)
            initial = get()
        }

        func set(_ on: Bool) { setter(on ? 1 : 0) }
        func restore() { setter(initial) }
    }

    private static func collect(_ node: Any, into out: inout [Node], depth: Int) {
        guard depth < 60, let object = node as? NSObject else { return }
        if object.isAccessibilityElement {
            out.append(Node(label: object.accessibilityLabel ?? "", hint: object.accessibilityHint ?? ""))
        }
        if let elements = object.accessibilityElements, !elements.isEmpty {
            for element in elements { collect(element, into: &out, depth: depth + 1) }
        } else if let view = object as? UIView {
            for sub in view.subviews { collect(sub, into: &out, depth: depth + 1) }
        }
    }
}
