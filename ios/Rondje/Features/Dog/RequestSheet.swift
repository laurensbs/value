import SwiftUI

struct RequestSheet: View {
    enum Kind: String, Identifiable { case meet, solo; var id: String { rawValue } }

    let dog: DogFull
    let slots: [Slot]
    @State var kind: Kind
    var sent: () async -> Void

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var when = Calendar.current.date(byAdding: .day, value: 1, to: .now).map { Calendar.current.date(bySettingHour: 18, minute: 0, second: 0, of: $0) ?? $0 } ?? .now
    @State private var weekly = false
    @State private var message = ""
    @State private var agreed = false
    @State private var busy = false
    @State private var error: String?

    private var range: ClosedRange<Date> { Date.now.addingTimeInterval(20 * 60)...Date.now.addingTimeInterval(60 * 86_400) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack(spacing: 14) {
                        DogPortrait(look: dog.look, photoURL: dog.photos.first.flatMap(URL.init(string:)), cornerRadius: 18)
                            .frame(width: 64, height: 64)
                        VStack(alignment: .leading) {
                            Text(kind == .meet ? L("Kennismaken met \(dog.name)") : L("Rondje met \(dog.name)")).font(.display(22))
                            Text(kind == .meet ? L("De eigenaar loopt mee en bekijkt je ID.") : L("Zelfstandig, want de eigenaar vertrouwt je."))
                                .font(.subheadline).foregroundStyle(Palette.muted)
                        }
                    }

                    Card {
                        DatePicker("Wanneer", selection: $when, in: range)
                            .environment(\.locale, Format.locale)
                        if !slots.isEmpty {
                            Text("Vaste momenten: \(slots.map { "\(Labels.weekday($0.weekday)) \($0.time)" }.joined(separator: ", "))")
                                .font(.footnote).foregroundStyle(Palette.muted)
                        }
                        if kind == .solo {
                            Toggle("Elke week op dit moment", isOn: $weekly).tint(Palette.grass)
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Bericht").font(.headline)
                        TextField("Stel je kort voor", text: $message, axis: .vertical)
                            .lineLimit(3...6)
                            .padding(14)
                            .background(Palette.surface, in: .rect(cornerRadius: 16, style: .continuous))
                        Text("Spreek geen geld af: \(Brand.name) is gratis. De eigenaar zorgt voor zakjes en koekjes.")
                            .font(.footnote).foregroundStyle(Palette.muted)
                    }

                    Toggle(isOn: $agreed) {
                        Text("Ik houd me aan de gedragscode: aan de lijn, geen koekjes zonder toestemming, en ik meld het meteen als er iets gebeurt.")
                            .font(.subheadline)
                    }
                    .tint(Palette.grass)

                    ErrorText(message: error)

                    Button {
                        Task { await send() }
                    } label: {
                        if busy { ProgressView().tint(Palette.onGrass) } else { Text("Verstuur aanvraag") }
                    }
                    .buttonStyle(.primary)
                    .disabled(!agreed || busy)
                }
                .padding(22)
                .animation(.snappy, value: error)
            }
            .screenBackground()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Sluit", systemImage: "xmark") { dismiss() } }
            }
        }
    }

    private struct Payload: Encodable {
        var dogId, kind, date, time, message: String
        var weekly: Bool
    }

    private func send() async {
        busy = true
        defer { busy = false }
        // The server works in Dutch time (Europe/Amsterdam), like the website.
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Europe/Amsterdam") ?? .current
        let c = cal.dateComponents([.year, .month, .day, .hour, .minute], from: when)
        let date = String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
        let time = String(format: "%02d:%02d", c.hour ?? 0, c.minute ?? 0)
        struct Sent: Decodable { var ok: Bool; var flagged: Bool }
        do {
            let result: Sent = try await APIClient.shared.post("/api/v1/requests", Payload(dogId: dog.id, kind: kind.rawValue, date: date, time: time, message: message, weekly: weekly))
            Haptics.success()
            model.show(result.flagged ? L("Verstuurd. Berichten over geld worden gecontroleerd.") : L("Aanvraag verstuurd! Je hoort het zodra er antwoord is."))
            await model.refreshAppointments()
            await sent()
            dismiss()
            await Reminders.askIfNeeded()
        } catch {
            Haptics.error()
            self.error = error.localizedDescription
        }
    }
}

/// Report a dog, person or walk to moderation. Reports are read by a person, never automated away.
struct ReportSheet: View {
    var dogId: String? = nil
    var subjectUserId: String? = nil
    var walkId: String? = nil

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

    private struct Payload: Encodable { var category, description: String; var dogId, subjectUserId, walkId: String? }

    private func send() async {
        busy = true
        defer { busy = false }
        do {
            let _: OK = try await APIClient.shared.post("/api/v1/reports", Payload(category: category, description: text, dogId: dogId, subjectUserId: subjectUserId, walkId: walkId))
            if block, let subjectUserId {
                let _: OK = try await APIClient.shared.post("/api/v1/blocks", ["userId": subjectUserId])
            }
            Haptics.success()
            model.show(L("Bedankt. We kijken ernaar."), symbol: "shield.lefthalf.filled")
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
