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
    @State private var busy = false
    @State private var error: String?
    @State private var pick: [PhotosPickerItem] = []
    @State private var photos: [UIImage] = []

    private let provideOptions = ["bags", "leash", "harness", "treats", "water", "towel"]

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
                    TextField("Verhaal: wie is deze hond, en voor wie is het?", text: $story, axis: .vertical).lineLimit(3...6)
                    TextField("Waar moet een wandelaar op letten?", text: $needs, axis: .vertical).lineLimit(2...4)
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
                    }
                } header: {
                    Text("Eerlijk is veilig")
                } footer: {
                    Text("Een hond die ooit beet, is alleen voor wandelaars met ervaring.")
                }
                if let error { Text(error).foregroundStyle(Palette.danger) }
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
                        .disabled(name.isEmpty || !insurance || !health || busy || (biteHistory && biteNote.count < 5))
                }
            }
        }
    }

    private struct Payload: Encodable {
        var name, breed, sex, size, energy, level, story, needs, treats, country, city, meetingInfo, vetInfo, biteNote: String
        var ageYears, walkMinutes: Int
        var traits, provides: [String]
        var offLeash, insuranceConfirmed, healthConfirmed, biteHistory: Bool
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
                self.error = error.localizedDescription
                return
            }
        }
        let body = Payload(
            name: name, breed: breed, sex: sex, size: size, energy: energy, level: level, story: story, needs: needs,
            treats: treats, country: p?.country ?? "NL", city: p?.city ?? "", meetingInfo: meetingInfo, vetInfo: vetInfo,
            biteNote: biteNote, ageYears: age, walkMinutes: walkMinutes,
            traits: traits.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty },
            provides: Array(provides), offLeash: offLeash, insuranceConfirmed: insurance, healthConfirmed: health, biteHistory: biteHistory,
            photos: urls
        )
        do {
            let _: OK = try await APIClient.shared.post("/api/v1/my-dogs", body)
            model.celebrate(.party(L("\(name) staat erop!")))
            await saved()
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
