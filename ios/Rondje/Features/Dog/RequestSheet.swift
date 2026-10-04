import SwiftUI

/// Report a dog, person or walk to moderation. Reports are read by a person, never automated away.
struct ReportSheet: View {
    var dogId: String? = nil
    var subjectUserId: String? = nil
    var walkId: String? = nil
    var orgId: String? = nil

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var category = "safety"
    @State private var text = ""
    @State private var block = false
    @State private var busy = false
    @State private var error: String?

    private let categories = [("safety", L("Onveilig")), ("abuse", L("Mishandeling")), ("scam", L("Oplichting of geld")), ("harassment", L("Intimidatie")), ("fake", L("Nep-profiel")), ("other", L("Iets anders"))]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Wat is er aan de hand?", selection: $category) {
                        ForEach(categories, id: \.0) { Text($0.1).tag($0.0) }
                    }
                    TextField("Vertel wat er gebeurde (minstens 10 tekens)", text: $text, axis: .vertical).lineLimit(4...8)
                } footer: {
                    Text("Een mens van \(Brand.name) leest elke melding. Bij direct gevaar: bel 112.")
                }
                if subjectUserId != nil {
                    Toggle("Blokkeer deze persoon ook", isOn: $block).tint(Palette.danger)
                }
                if let error { Section { Text(error).foregroundStyle(Palette.danger) } }
            }
            .rondjeForm()
            .navigationTitle("Melden")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleer") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Verstuur") { Task { await send() } }.disabled(text.count < 10 || busy)
                }
            }
        }
    }

    private struct Payload: Encodable { var category, description: String; var dogId, subjectUserId, walkId, orgId: String? }

    /// After a report Guus never suggests this dog again, and a walk with a report ends calmly
    /// (no confetti, no rebook offer). Kept on this phone only.
    private func remember() {
        let keepsakes = Keepsakes.shared
        if let walkId {
            keepsakes.markReported(walkId: walkId)
            if let dog = (model.appointments.outgoing + model.appointments.incoming).first(where: { $0.walkId == walkId })?.dog.id {
                keepsakes.setNoRebook(dog, true)
            }
        }
        if let dogId { keepsakes.setNoRebook(dogId, true) }
    }

    private func send() async {
        busy = true
        defer { busy = false }
        do {
            let _: OK = try await APIClient.shared.post("/api/v1/reports", Payload(category: category, description: text, dogId: dogId, subjectUserId: subjectUserId, walkId: walkId, orgId: orgId))
            if block, let subjectUserId {
                let _: OK = try await APIClient.shared.post("/api/v1/blocks", ["userId": subjectUserId])
            }
            remember()
            Haptics.success(nil)
            model.show(L("Bedankt. We kijken ernaar."), symbol: "shield.lefthalf.filled")
            dismiss()
        } catch {
            self.error = error.plainText
        }
    }
}
