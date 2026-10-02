import SwiftUI

/// For owners, right after a walk: the dog is home. A short report, and thanking the walker takes one
/// tap with a sentence that is already written. No counters, no read receipts, and nothing that asks
/// the walker to answer.
struct HomecomingCard: View {
    let item: Appointment

    @Environment(AppModel.self) private var model
    @State private var live: LiveWalk?
    @State private var sending = false
    @State private var chatting = false
    @State private var feedback = false

    private var walkId: String { item.walkId ?? "" }
    private var walker: String { item.walker?.firstName ?? L("de wandelaar") }
    private var thanked: Bool { Keepsakes.shared.has("thanked." + walkId) }

    /// A walk that ended in the last 36 hours, for a card the owner did not put away yet.
    @MainActor static func shouldShow(_ item: Appointment, now: Date = .now) -> Bool {
        guard item.walkStatus == "ended", let walkId = item.walkId else { return false }
        // A walk may start up to 30 minutes early, so allow a start time slightly ahead too.
        guard item.startsAt >= now.addingTimeInterval(-36 * 3600), item.startsAt <= now.addingTimeInterval(3600) else { return false }
        return !Keepsakes.shared.has("home." + walkId)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            header
            if let care = live?.care { CareSummary(care: care) }
            if let photos = live?.photos, !photos.isEmpty { PhotoStrip(photos: photos) }
            thanks
            if item.feedbackGiven != true {
                Button("Hoe was \(item.dog.name) na het rondje?") { feedback = true }
                    .buttonStyle(.secondary)
            }
        }
        .padding(18)
        // The card is always ball-yellow, so it always uses the dark text of light mode.
        .environment(\.colorScheme, .light)
        .background(Palette.ball, in: .rect(cornerRadius: 24, style: .continuous))
        .transition(.opacity.combined(with: .scale(scale: 0.96)))
        .task(id: walkId) { await load() }
        .onChange(of: item.feedbackGiven) { finishIfDone() }
        .sheet(isPresented: $chatting) {
            ChatView(requestId: item.id, title: walker, suggestions: RequestSuggestions.chatReplies(for: item, asOwner: true))
                .presentationDetents([.large])
        }
        .sheet(isPresented: $feedback, onDismiss: { Task { await model.refreshAppointments() } }) {
            FeedbackSheet(walkId: walkId, role: .owner, dogName: item.dog.name)
                .presentationDetents([.large])
        }
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 14) {
            DogPortrait(look: item.dog.look, photoURL: item.dog.photos.first.flatMap(URL.init(string:)), mood: .happy, cornerRadius: 18)
                .frame(width: 64, height: 64)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text("\(item.dog.name) is weer thuis!")
                    .font(.display(22))
                    .foregroundStyle(Palette.onBall)
                    .accessibilityAddTraits(.isHeader)
                Text("Met \(walker)")
                    .font(.subheadline)
                    .foregroundStyle(Palette.onBall.opacity(0.75))
            }
            Spacer(minLength: 0)
            Button { close() } label: {
                Image(systemName: "xmark")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Palette.onBall.opacity(0.7))
                    .frame(width: 44, height: 44)
                    .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .padding(.top, -10)
            .padding(.trailing, -10)
            .accessibilityLabel("Sluit")
        }
    }

    @ViewBuilder
    private var thanks: some View {
        if thanked {
            Label("Verstuurd naar \(walker)", systemImage: "checkmark.circle.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Palette.onBall)
                .frame(minHeight: 44)
                .transition(.opacity)
        } else {
            VStack(alignment: .leading, spacing: 8) {
                Text("Bedank \(walker)")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Palette.onBall.opacity(0.75))
                FlowLayout(spacing: 8) {
                    ForEach(RequestSuggestions.thanks(dogName: item.dog.name), id: \.self) { line in
                        Button { Task { await thank(line) } } label: {
                            Text(line)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Palette.onBall)
                                .padding(.horizontal, 14)
                                .frame(minHeight: 44)
                                .background(Color.white.opacity(0.6), in: .capsule)
                                .contentShape(.capsule)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .disabled(sending)
                .opacity(sending ? 0.6 : 1)
                Button { chatting = true } label: {
                    Label("Zelf iets schrijven", systemImage: "square.and.pencil")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Palette.onBall)
                        .frame(minHeight: 44)
                        .contentShape(.rect)
                }
                .buttonStyle(.plain)
            }
            .transition(.opacity)
        }
    }

    // MARK: Actions

    private func load() async {
        guard let id = item.walkId else { return }
        live = try? await APIClient.shared.get("/api/walks/\(id)/live?after=999999999", as: LiveWalk.self)
    }

    private func thank(_ line: String) async {
        guard !sending, let id = item.walkId else { return }
        sending = true
        defer { sending = false }
        do {
            let _: OK = try await APIClient.shared.post("/api/v1/requests/\(item.id)/messages", ["body": line])
            Haptics.tap()
            withAnimation(.snappy) { Keepsakes.shared.mark("thanked." + id) }
            model.celebrate(.tap)
            finishIfDone()
        } catch {
            model.show(error.localizedDescription, symbol: "exclamationmark.circle.fill", tint: Palette.danger)
        }
    }

    private func close() {
        guard let id = item.walkId else { return }
        Haptics.tap()
        withAnimation(.smooth) { Keepsakes.shared.mark("home." + id) }
    }

    /// Once the walker is thanked and the feedback is given, the card puts itself away
    /// (after a moment, so the confirmation can be read).
    private func finishIfDone() {
        guard let id = item.walkId, Keepsakes.shared.has("thanked." + id) else { return }
        let given = model.appointments.incoming.first { $0.id == item.id }?.feedbackGiven ?? item.feedbackGiven
        guard given == true else { return }
        Task {
            try? await Task.sleep(for: .seconds(2.4))
            withAnimation(.smooth) { Keepsakes.shared.mark("home." + id) }
        }
    }
}
