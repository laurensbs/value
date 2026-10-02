import SwiftUI

/// Under Jij: the sounds and Apple Health. Both are settings of this iPhone, never of the account on the server.
struct DeviceSettingsView: View {
    @Environment(AppModel.self) private var model
    @State private var sounds = SoundFX.enabled
    @State private var health = HealthService.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(spacing: 0) {
                toggle("speaker.wave.2.fill", L("Geluidjes"), L("Zachte geluidjes bij belangrijke momenten. Staat je iPhone op stil, dan hoor je niets."),
                       isOn: Binding(get: { sounds }, set: { sounds = $0; SoundFX.enabled = $0 }))
            }
            .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))

            if health.availability != .noHealth {
                Text("Apple Gezondheid").font(.headline).padding(.top, 8).padding(.horizontal, 4)
                VStack(spacing: 0) {
                    if health.availability == .available {
                        toggle("figure.walk", L("Rondjes bewaren in Apple Gezondheid"),
                               L("Als buitenwandeling met tijd, afstand en route, en de ademminuut als mindfulness. Begin en eind van de route laten we weg, zodat niemands huis erin staat."),
                               isOn: Binding(get: { health.savesWalks }, set: { on in Task { report(await health.setSavesWalks(on)) } }))
                        Divider().padding(.leading, 56)
                        toggle("face.smiling", L("Stemming na een rondje bewaren in Apple Gezondheid"),
                               L("Hoe je je na een rondje voelt, als gemoedstoestand."),
                               isOn: Binding(get: { health.savesMood }, set: { on in Task { report(await health.setSavesMood(on)) } }))
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
                .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
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

    /// Styled like the rows of the list under it: an icon, a title, a short explanation.
    private func toggle(_ symbol: String, _ title: String, _ detail: String, isOn: Binding<Bool>) -> some View {
        Toggle(isOn: isOn) {
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
