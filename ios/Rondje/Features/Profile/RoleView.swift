import SwiftUI

/// "Wat doe je op Rondje?": walk, have a dog, or both. The app reshapes itself around the answer.
struct RoleView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var busy = false
    @State private var error: String?

    private struct Option: Identifiable {
        let id: AppModel.Role
        let title: String
        let text: String
        let symbol: String
    }

    private var options: [Option] { [
        Option(id: .walker, title: L("Ik wil wandelen"), text: L("Je ziet honden in de buurt en plant rondjes."), symbol: "figure.walk"),
        Option(id: .owner, title: L("Ik heb een hond"), text: L("Je ziet wie met je hond wil wandelen, en kijkt live mee."), symbol: "house.fill"),
        Option(id: .both, title: L("Allebei"), text: L("Wandelen met andere honden, en hulp voor je eigen hond."), symbol: "arrow.left.arrow.right"),
    ] }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("De app past zich aan wat je kiest. Je kunt dit altijd weer veranderen.")
                    .foregroundStyle(Palette.muted)
                ForEach(options) { option in
                    let selected = model.role == option.id
                    Button { Task { await choose(option.id) } } label: {
                        HStack(spacing: 14) {
                            Image(systemName: option.symbol)
                                .font(.title2)
                                .frame(width: 52, height: 52)
                                .background(selected ? Palette.grass : Palette.sunken, in: .rect(cornerRadius: 16, style: .continuous))
                                .foregroundStyle(selected ? Palette.onGrass : Palette.ink)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(option.title).font(.headline)
                                Text(option.text).font(.subheadline).foregroundStyle(Palette.muted).multilineTextAlignment(.leading)
                            }
                            Spacer()
                            Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                                .font(.title2)
                                .foregroundStyle(selected ? Palette.grass : Palette.line)
                                .contentTransition(.symbolEffect(.replace))
                        }
                        .padding(16)
                        .background(Palette.surface, in: .rect(cornerRadius: 20, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(selected ? Palette.grass : .clear, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .disabled(busy)
                }
                ErrorText(message: error)
            }
            .padding(20)
            .animation(.snappy, value: model.role)
        }
        .screenBackground()
        .navigationTitle(L("Wat doe je op \(Brand.name)?"))
    }

    private struct Payload: Encodable { var wantsToWalk, hasDogs: Bool }

    private func choose(_ role: AppModel.Role) async {
        guard role != model.role else { return }
        busy = true
        defer { busy = false }
        do {
            let _: OK = try await APIClient.shared.patch("/api/v1/profile", Payload(wantsToWalk: role != .owner, hasDogs: role != .walker))
            Haptics.success()
            await model.refreshMe()
        } catch {
            self.error = error.plainText
        }
    }
}
