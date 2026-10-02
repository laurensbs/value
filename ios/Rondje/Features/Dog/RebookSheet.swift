import SwiftUI

/// "Same time next week?": a new request for the dog of an earlier appointment, filled in up front.
/// The server keeps deciding: a solo walk only when the owner gave trust and the quiz is passed,
/// otherwise a new meeting, and nothing at all when neither is possible right now.
struct RebookSheet: View {
    let appointmentId: String

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var detail: DogDetail?
    @State private var date: Date?
    @State private var looked = false
    @State private var error: String?

    private var item: Appointment? { model.appointments.outgoing.first { $0.id == appointmentId } }

    var body: some View {
        Group {
            if let detail, let date {
                if detail.canRequest.solo == nil {
                    RequestFlow(dog: detail.dog, slots: detail.slots, kind: .solo, prefill: RequestPrefill(
                        date: date, weekly: true, message: L("Zin om weer samen te gaan! Zelfde tijd volgende week?")
                    )) {}
                } else if detail.canRequest.meet == nil {
                    RequestFlow(dog: detail.dog, slots: detail.slots, kind: .meet, prefill: RequestPrefill(date: date, weekly: false, message: nil)) {}
                } else {
                    unavailable(detail.dog.name)
                }
            } else if looked {
                unavailable(item?.dog.name)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .screenBackground()
        .task { await load() }
    }

    private func unavailable(_ dogName: String?) -> some View {
        VStack(spacing: 16) {
            Spacer()
            CoachBubble(
                mood: .calm,
                text: dogName.map { L("Je kunt nu geen nieuwe afspraak maken met \($0).") } ?? L("Je kunt nu geen nieuwe afspraak maken."),
                primary: CoachButton(L("Sluit")) { dismiss() }
            )
            ErrorText(message: error)
            Spacer()
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func load() async {
        guard detail == nil, !looked else { return }
        if item == nil { await model.refreshAppointments() }
        guard let item else {
            looked = true
            return
        }
        do {
            let loaded: DogDetail = try await APIClient.shared.get("/api/v1/dogs/\(item.dog.id)")
            date = RequestSuggestions.rebookDate(from: item.startsAt, now: .now, calendar: .current)
            withAnimation(.smooth) { detail = loaded }
        } catch {
            self.error = error.localizedDescription
            looked = true
        }
    }
}
