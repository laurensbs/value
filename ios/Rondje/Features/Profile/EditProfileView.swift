import SwiftUI

/// Editing your own profile in the app. Your birth date cannot change here (it decides 18+).
struct EditProfileView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var firstName = ""
    @State private var city = ""
    @State private var country = "NL"
    @State private var bio = ""
    @State private var phone = ""
    @State private var experience = "some"
    @State private var wantsToWalk = true
    @State private var hasDogs = false
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        Form {
            Section("Over jou") {
                TextField("Voornaam", text: $firstName).textContentType(.givenName)
                TextField("Vertel kort wie je bent", text: $bio, axis: .vertical).lineLimit(3...6)
                Picker("Ervaring met honden", selection: $experience) {
                    Text("Geen").tag("none"); Text("Wat").tag("some"); Text("Veel").tag("lots")
                }
            }
            Section("Waar") {
                Picker("Land", selection: $country) {
                    Text("Nederland").tag("NL"); Text("België").tag("BE"); Text("Spanje").tag("ES")
                }
                TextField("Plaats", text: $city).textContentType(.addressCity)
            }
            Section {
                TextField("Telefoon (optioneel)", text: $phone).keyboardType(.phonePad).textContentType(.telephoneNumber)
            } footer: {
                Text("Alleen zichtbaar voor iemand met wie je een geaccepteerde afspraak hebt.")
            }
            Section {
                Toggle("Ik wil wandelen", isOn: $wantsToWalk)
                Toggle("Ik heb een hond (of regel het voor iemand)", isOn: $hasDogs)
            }
            if let error { Text(error).foregroundStyle(Palette.danger) }
        }
        .tint(Palette.grass)
        .rondjeForm()
            .navigationTitle("Profiel bewerken")
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Bewaar") { Task { await save() } }
                    .disabled(busy || firstName.trimmingCharacters(in: .whitespaces).isEmpty || city.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .onAppear(perform: fill)
    }

    private func fill() {
        guard let p = model.me?.profile else { return }
        firstName = p.firstName; city = p.city; country = p.country; bio = p.bio
        phone = p.phone ?? ""; experience = p.experience; wantsToWalk = p.wantsToWalk; hasDogs = p.hasDogs
    }

    private struct Payload: Encodable {
        var firstName, city, country, bio, phone, experience: String
        var wantsToWalk, hasDogs: Bool
    }

    private func save() async {
        busy = true
        defer { busy = false }
        do {
            let _: OK = try await APIClient.shared.patch("/api/v1/profile", Payload(
                firstName: firstName.trimmingCharacters(in: .whitespaces), city: city.trimmingCharacters(in: .whitespaces),
                country: country, bio: bio, phone: phone, experience: experience, wantsToWalk: wantsToWalk, hasDogs: hasDogs
            ))
            Haptics.success()
            await model.refreshMe()
            model.show(L("Profiel opgeslagen"))
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
