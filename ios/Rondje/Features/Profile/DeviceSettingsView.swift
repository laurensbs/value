import SwiftUI

/// Under Jij, Instellingen: the sounds of this iPhone. Never a setting of the account on the server.
struct SoundsToggle: View {
    @State private var sounds = SoundFX.enabled

    var body: some View {
        SettingToggle(symbol: "speaker.wave.2.fill", title: L("Geluidjes"),
                      detail: L("Zachte geluidjes bij belangrijke momenten. Staat je iPhone op stil, dan hoor je niets."),
                      isOn: Binding(get: { sounds }, set: { sounds = $0; SoundFX.enabled = $0 }))
    }
}

/// Under Jij, Instellingen: the app's language. iOS keeps a language per app (Settings › Rondje Mee ›
/// Language), as Apple recommends, so this row says which one is on and opens that page. The title is
/// also in English, for someone who landed in a language they don't read.
struct LanguageRow: View {
    @Environment(\.openURL) private var openURL

    var body: some View {
        Button {
            if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
        } label: {
            ProfileRow(symbol: "globe", title: L("Taal / Language"),
                       detail: L("Nu: \(AppLanguage.name). Tik om in de instellingen van je iPhone een andere taal te kiezen."),
                       external: true)
        }
        .accessibilityHint(L("Opent de instellingen van je iPhone"))
    }
}

/// Under Jij: Apple Health, only on this iPhone. Shown only where Health exists.
struct HealthSettings: View {
    @Environment(AppModel.self) private var model
    @State private var health = HealthService.shared
    /// While iOS asks for permission, the switch already shows what was chosen.
    @State private var askingWalks: Bool?
    @State private var askingMood: Bool?

    var body: some View {
        if health.availability == .available || health.availability == .notInThisBuild {
            VStack(alignment: .leading, spacing: 8) {
                RowGroup(title: L("Apple Gezondheid")) {
                    if health.availability == .available {
                        SettingToggle(symbol: "figure.walk", title: L("Rondjes bewaren in Apple Gezondheid"),
                                      detail: L("Als buitenwandeling met tijd, afstand en route, en de ademminuut als mindfulness. Begin en eind van de route laten we weg, zodat niemands huis erin staat."),
                                      isOn: Binding(get: { askingWalks ?? health.savesWalks }, set: { on in
                                          askingWalks = on
                                          Task { report(await health.setSavesWalks(on)); askingWalks = nil }
                                      }))
                        SettingToggle(symbol: "face.smiling", title: L("Stemming na een rondje bewaren in Apple Gezondheid"),
                                      detail: L("Hoe je je na een rondje voelt, als gemoedstoestand."),
                                      isOn: Binding(get: { askingMood ?? health.savesMood }, set: { on in
                                          askingMood = on
                                          Task { report(await health.setSavesMood(on)); askingMood = nil }
                                      }))
                    } else {
                        HStack(spacing: 14) {
                            Image(systemName: "heart.slash").frame(width: 28).foregroundStyle(Palette.muted)
                            Text("Niet beschikbaar op dit toestel").foregroundStyle(Palette.muted)
                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                    }
                }
                Text("Alleen op deze iPhone. \(Brand.name) leest niets uit Gezondheid en stuurt er niets van naar de server.")
                    .font(.footnote)
                    .foregroundStyle(Palette.muted)
                    .padding(.horizontal, 4)
            }
        }
    }

    private func report(_ note: String?) {
        guard let note else { return }
        model.show(note, symbol: "heart.text.square", tint: Palette.muted)
    }
}

/// A switch styled like the rows around it: an icon, a title, a short explanation.
struct SettingToggle: View {
    var symbol: String
    var title: String
    var detail: String
    @Binding var isOn: Bool

    var body: some View {
        Toggle(isOn: $isOn) {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: symbol)
                    .frame(width: 28)
                    .foregroundStyle(Palette.grass)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).foregroundStyle(Palette.ink)
                    Text(detail).font(.caption).foregroundStyle(Palette.muted).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .tint(Palette.grass)
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}
