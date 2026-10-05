import PhotosUI
import SwiftUI

/// Your own dogs (or the neighbour's). Shelters manage their dogs on the website.
struct MyDogsView: View {
    @State private var dogs: [MyDog] = []
    @State private var adding = false
    @State private var loaded = false

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                if loaded && dogs.isEmpty {
                    EmptyState(symbol: "pawprint", title: L("Nog geen honden"), text: L("Zet je hond erop, of die van een buurvrouw, opa of oma die zelf niet ver meer kan lopen."))
                }
                ForEach(dogs) { dog in
                    NavigationLink(value: dog.id) {
                        HStack(spacing: 14) {
                            DogPortrait(look: dog.look, photoURL: dog.photos.first.flatMap(URL.init(string:)), cornerRadius: 18)
                                .frame(width: 64, height: 64)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(dog.name).font(.headline)
                                Text([dog.breed, dog.city].filter { !$0.isEmpty }.joined(separator: " · "))
                                    .font(.subheadline).foregroundStyle(Palette.muted)
                            }
                            Spacer()
                            if dog.status != "active" { Chip(text: L("Gepauzeerd"), tint: Palette.muted, soft: Palette.sunken) }
                            Image(systemName: "chevron.right").foregroundStyle(Palette.muted)
                        }
                        .padding(14)
                        .background(Palette.surface, in: .rect(cornerRadius: 22, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
                Button { adding = true } label: { Label("Hond toevoegen", systemImage: "plus") }
                    .buttonStyle(.primary)
            }
            .padding(20)
        }
        .screenBackground()
        .navigationTitle("Mijn honden")
        .navigationDestination(for: String.self) { DogDetailView(dogId: $0, preview: nil) }
        .task { await load() }
        .sheet(isPresented: $adding) {
            AddDogView { await load() }.presentationDetents([.large])
        }
    }

    private func load() async {
        if let r: MyDogsResponse = try? await APIClient.shared.get("/api/v1/my-dogs") { withAnimation { dogs = r.dogs } }
        loaded = true
    }
}

/// A dog added for someone else (a neighbour, a grandparent) only goes online when its owner knows and
/// agrees (DPIA maatregel M5). The same two switches and words as the website's dog form, and the same check
/// as `forSomeoneSchema` in web/src/server/dog-core.ts. Nothing about it is stored.
struct DogForSomeone: Equatable {
    /// "Ik meld deze hond aan voor iemand anders".
    var on = false
    /// "De eigenaar weet ervan en vindt het goed": only asked, and only counts, when `on`.
    var ownerConsent = false

    /// The server's answer when a dog for someone else comes without the owner's consent.
    static let errorCode = "owner-consent"

    static var label: String { L("Ik meld deze hond aan voor iemand anders") }
    static var consentLabel: String { L("De eigenaar weet ervan en vindt het goed") }
    /// Under the consent switch, like myDogs.forSomeoneHint on the website.
    static var hint: String {
        L("Zet hun naam en telefoonnummer hieronder, bij de plek waar jullie afspreken. Dat ziet een wandelaar pas na een geaccepteerde afspraak.")
    }
    static var missingConsent: String { L("Bevestig eerst dat de eigenaar ervan weet en het goed vindt.") }

    /// Your own dog needs nothing more; a dog for someone else waits for the owner's consent.
    var isSettled: Bool { !on || ownerConsent }

    /// Under the consent switch while it is off, so a greyed-out Bewaar has a visible reason.
    var reminder: String? { isSettled ? nil : Self.missingConsent }

    /// Switching "for someone else" off also clears the consent, as on the website (its box goes away).
    mutating func set(_ value: Bool) {
        on = value
        if !value { ownerConsent = false }
    }

    /// What goes to POST /api/v1/my-dogs, with the website's field names. The API turns `true` into the
    /// form's "on"; older servers ignore both fields.
    var forSomeoneField: Bool { on }
    var ownerConsentField: Bool { on && ownerConsent }
}

/// The two switches under Privé in "Hond toevoegen": the website's explainer under the consent switch and,
/// while that switch is off, the line that says why Bewaar waits.
struct ForSomeoneRows: View {
    @Binding var value: DogForSomeone

    var body: some View {
        Toggle(DogForSomeone.label, isOn: Binding(
            get: { value.on },
            set: { on in withAnimation { value.set(on) } }
        ))
        if value.on {
            VStack(alignment: .leading, spacing: 6) {
                Toggle(DogForSomeone.consentLabel, isOn: $value.ownerConsent.animation())
                    .fieldNote(DogForSomeone.hint)
                if let reminder = value.reminder {
                    Label(reminder, systemImage: "info.circle")
                        .font(.footnote)
                        .foregroundStyle(Palette.calm)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            // The line under this row starts where the switch's text starts, not at the icon's text.
            .alignmentGuide(.listRowSeparatorLeading) { $0[.leading] }
        }
    }
}

struct AddDogView: View {
    var saved: () async -> Void
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var breed = ""
    @State private var sex = "female"
    @State private var age = 4
    @State private var size = "medium"
    @State private var energy = "medium"
    @State private var level = "starter"
    @State private var walkMinutes = 30
    @State private var story = ""
    @State private var needs = ""
    @State private var traits = ""
    @State private var treats = "own"
    @State private var provides: Set<String> = ["bags", "leash"]
    @State private var offLeash = false
    @State private var meetingInfo = ""
    @State private var vetInfo = ""
    @State private var insurance = false
    @State private var health = false
    @State private var biteHistory = false
    @State private var biteNote = ""
    @State private var forSomeone = DogForSomeone()
    @State private var busy = false
    @State private var error: String?
    @State private var pick: [PhotosPickerItem] = []
    @State private var photos: [UIImage] = []

    private let provideOptions = ["bags", "leash", "harness", "treats", "water", "towel"]

    /// Under the dog's story (DPIA maatregel M18): the story is on the public dog page, so it is about
    /// the dog and gives away nothing about the owner. The same words as the website's dog form.
    static var storyHint: String {
        L("Dit verhaal is voor iedereen te zien. Schrijf over de hond, niet over jezelf: geen naam, adres of tijden waarop je thuis bent.")
    }

    /// In the empty story box: about the dog, never about who it is for (myDogs.storyHint on the website).
    static var storyPlaceholder: String { L("Wie is je hond, en waarom is een extra rondje fijn?") }

    /// Under "what should a walker keep in mind": on the dog's page next to the story, so also for
    /// anyone (myDogs.needsPublic on the website).
    static var needsHint: String { L("Ook dit is voor iedereen te zien. Houd het bij de hond.") }

    /// Under "what happened" once the dog ever bit (myDogs.biteNoteHint on the website).
    static var biteNoteHint: String {
        L("Eerlijkheid beschermt je hond en de wandelaar. Honden met een bijtgeschiedenis gaan alleen mee met ervaren wandelaars.")
    }

    /// Bewaar: the same checks as the server (name, insurance, health, what happened after a bite) and,
    /// for someone else's dog, the owner's consent.
    static func canSave(name: String, insurance: Bool, health: Bool, biteHistory: Bool, biteNote: String, forSomeone: DogForSomeone) -> Bool {
        !name.isEmpty && insurance && health && !(biteHistory && biteNote.count < 5) && forSomeone.isSettled
    }

    /// A calm sentence for a failed save. For a missing consent the server does answer with a message
    /// (`{"error":"owner-consent","message":…}`), but that is the website's line about ticking a box
    /// (myDogs.errors.owner-consent), or its generic error on a server without that line. The app has a
    /// switch, so it says its own line.
    static func saveMessage(for error: Error) -> String {
        if (error as? APIError)?.code == DogForSomeone.errorCode { return DogForSomeone.missingConsent }
        return error.plainText
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(Array(photos.enumerated()), id: \.offset) { _, image in
                                Image(uiImage: image).resizable().scaledToFill()
                                    .frame(width: 88, height: 88)
                                    .clipShape(.rect(cornerRadius: 18, style: .continuous))
                            }
                            PhotosPicker(selection: $pick, maxSelectionCount: 4, matching: .images) {
                                Label(photos.isEmpty ? L("Foto's") : L("Wijzig"), systemImage: "camera.fill")
                                    .font(.subheadline.weight(.semibold))
                                    .frame(width: 88, height: 88)
                                    .background(Palette.grassSoft, in: .rect(cornerRadius: 18, style: .continuous))
                            }
                        }
                    }
                } footer: {
                    Text("Geen foto? Dan tekenen we een portret van je hond.")
                }
                Section("De hond") {
                    TextField("Naam", text: $name)
                    TextField("Ras (of 'kruising')", text: $breed)
                    Picker("Geslacht", selection: $sex) { Text("Teef").tag("female"); Text("Reu").tag("male") }
                    Stepper("Leeftijd: \(age) jaar", value: $age, in: 0...25)
                    Picker("Formaat", selection: $size) { Text("Klein").tag("small"); Text("Middel").tag("medium"); Text("Groot").tag("large") }
                    Picker("Energie", selection: $energy) { Text("Rustig").tag("calm"); Text("Gemiddeld").tag("medium"); Text("Energiek").tag("high") }
                    Picker("Voor wie", selection: $level) { Text("Voor iedereen").tag("starter"); Text("Met ervaring").tag("experienced") }
                    Stepper("Rondje van \(walkMinutes) minuten", value: $walkMinutes, in: 10...180, step: 5)
                }
                Section("Over de hond") {
                    TextField(Self.storyPlaceholder, text: $story, axis: .vertical).lineLimit(3...6)
                        .fieldNote(Self.storyHint)
                    TextField("Waar moet een wandelaar op letten?", text: $needs, axis: .vertical).lineLimit(2...4)
                        .fieldNote(Self.needsHint)
                    TextField("Kenmerken, met komma's (lief, snuffelaar)", text: $traits)
                }
                Section("Afspraken") {
                    Picker("Koekjes", selection: $treats) { Text("Mogen").tag("yes"); Text("Alleen van mij").tag("own"); Text("Liever niet").tag("no") }
                    Toggle("Mag los waar het mag", isOn: $offLeash)
                    ForEach(provideOptions, id: \.self) { p in
                        Toggle("Ik geef \(Labels.provides(p).lowercased()) mee", isOn: Binding(
                            get: { provides.contains(p) },
                            set: { if $0 { provides.insert(p) } else { provides.remove(p) } }
                        ))
                    }
                }
                Section {
                    ForSomeoneRows(value: $forSomeone)
                    TextField("Afspreekplek (bijv. bij de groene voordeur)", text: $meetingInfo, axis: .vertical)
                    TextField("Dierenarts (naam en telefoon)", text: $vetInfo)
                } header: {
                    Text("Privé")
                } footer: {
                    Text("Dit zien alleen wandelaars met een geaccepteerde afspraak.")
                }
                Section {
                    Toggle("De hond is WA-verzekerd", isOn: $insurance)
                    Toggle("De hond is gezond en ingeënt", isOn: $health)
                    Toggle("De hond heeft ooit gebeten", isOn: $biteHistory)
                    if biteHistory {
                        TextField("Wat gebeurde er?", text: $biteNote, axis: .vertical)
                            .fieldNote(Self.biteNoteHint)
                    }
                } header: {
                    Text("Eerlijk is veilig")
                } footer: {
                    // Once "what happened" is open, its own note says this (and why), so not twice.
                    if !biteHistory { Text("Een hond die ooit beet, is alleen voor wandelaars met ervaring.") }
                }
                // A missing consent is said under the consent switch (ForSomeoneRows), not twice.
                if let error, error != DogForSomeone.missingConsent { Text(error).foregroundStyle(Palette.danger) }
            }
            .tint(Palette.grass)
            .onChange(of: pick) { _, items in Task { await loadPhotos(items) } }
            .rondjeForm()
            .navigationTitle("Hond toevoegen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleer") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Bewaar") { Task { await save() } }
                        .disabled(busy || !Self.canSave(name: name, insurance: insurance, health: health, biteHistory: biteHistory, biteNote: biteNote, forSomeone: forSomeone))
                }
            }
        }
    }

    /// The body of POST /api/v1/my-dogs.
    struct Payload: Encodable {
        var name, breed, sex, size, energy, level, story, needs, treats, country, city, meetingInfo, vetInfo, biteNote: String
        var ageYears, walkMinutes: Int
        var traits, provides: [String]
        var offLeash, insuranceConfirmed, healthConfirmed, biteHistory: Bool
        /// DPIA maatregel M5, like the website's form: `forSomeone` and `ownerConsent` (see DogForSomeone).
        var forSomeone, ownerConsent: Bool
        var photos: [String]
    }

    private func loadPhotos(_ items: [PhotosPickerItem]) async {
        var images: [UIImage] = []
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) { images.append(image) }
        }
        withAnimation { photos = images }
    }


    private func save() async {
        busy = true
        defer { busy = false }
        let p = model.me?.profile
        var urls: [String] = []
        for image in photos {
            do {
                urls.append(try await ImageTools.upload(image))
            } catch {
                self.error = error.plainText
                return
            }
        }
        let body = Payload(
            name: name, breed: breed, sex: sex, size: size, energy: energy, level: level, story: story, needs: needs,
            treats: treats, country: p?.country ?? "NL", city: p?.city ?? "", meetingInfo: meetingInfo, vetInfo: vetInfo,
            biteNote: biteNote, ageYears: age, walkMinutes: walkMinutes,
            traits: traits.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty },
            provides: Array(provides), offLeash: offLeash, insuranceConfirmed: insurance, healthConfirmed: health, biteHistory: biteHistory,
            forSomeone: forSomeone.forSomeoneField, ownerConsent: forSomeone.ownerConsentField,
            photos: urls
        )
        do {
            let _: OK = try await APIClient.shared.post("/api/v1/my-dogs", body)
            model.celebrate(.party(L("\(name) staat erop!")))
            await saved()
            dismiss()
        } catch {
            // A missing consent: show the switch it is about, off, so the calm line under it says what to do.
            if (error as? APIError)?.code == DogForSomeone.errorCode { withAnimation { forSomeone = DogForSomeone(on: true) } }
            self.error = Self.saveMessage(for: error)
        }
    }
}
