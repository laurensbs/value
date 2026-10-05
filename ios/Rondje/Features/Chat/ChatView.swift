import SwiftUI

/// The chat about one appointment, between the walker and the owner or shelter.
/// Polls every few seconds while open, like the website. Messages about money get a warning.
/// The "…" menu reports the other person (or shelter) or blocks them (App Store guideline 1.2).
struct ChatView: View {
    let requestId: String
    let title: String
    /// The other person in the chat: the walker for an owner, or the dog's owner for a walker.
    var otherUserId: String? = nil
    var dogId: String? = nil
    /// A shelter's dog: reports go to the shelter; there is no single person to block.
    var orgId: String? = nil
    /// Ready-made replies, shown while the field is empty. Tapping one only fills the field.
    var suggestions: [String] = []

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var messages: [ChatMessage] = []
    @State private var canSend = true
    @State private var draft = ""
    @State private var sending = false
    @State private var error: String?
    @State private var loaded = false
    @State private var reporting = false
    @State private var confirmBlock = false
    @FocusState private var focused: Bool

    private var me: String { model.me?.user.id ?? "" }

    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        Label("Spreek geen geld af en houd persoonlijke gegevens voor jezelf tot je elkaar kent.", systemImage: "lock.shield")
                            .font(.caption).foregroundStyle(Palette.muted)
                            .multilineTextAlignment(.center)
                            .padding(.vertical, 8)
                        if loaded && messages.isEmpty {
                            EmptyState(symbol: "bubble.left.and.bubble.right", title: L("Nog geen berichten"), text: L("Stel je voor of spreek iets af over de wandeling."))
                        }
                        ForEach(messages) { message in
                            bubble(message).id(message.id)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 8)
                }
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: messages.count) {
                    if let last = messages.last { withAnimation(.snappy) { proxy.scrollTo(last.id, anchor: .bottom) } }
                }
            }
            .screenBackground()
            .safeAreaInset(edge: .bottom) { composer }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Sluit", systemImage: "xmark") { dismiss() } }
                ToolbarItem(placement: .topBarTrailing) { safetyMenu }
            }
            .sheet(isPresented: $reporting) {
                ReportSheet(dogId: dogId, subjectUserId: otherUserId, orgId: orgId)
                    .presentationDetents([.medium, .large])
            }
            .confirmationDialog("Deze persoon blokkeren?", isPresented: $confirmBlock, titleVisibility: .visible) {
                Button("Blokkeer", role: .destructive) { Task { await block() } }
            } message: {
                Text("Open afspraken tussen jullie worden geannuleerd, en jullie kunnen elkaar geen berichten of aanvragen meer sturen. De ander krijgt hier geen melding van.")
            }
            .task { await poll() }
        }
    }

    /// Report or block, from the chat itself: one tap away while talking.
    private var safetyMenu: some View {
        Menu {
            Button("Melden", systemImage: "exclamationmark.bubble") { reporting = true }
            if otherUserId != nil {
                Button("Blokkeren", systemImage: "hand.raised.fill", role: .destructive) { confirmBlock = true }
            }
        } label: {
            Image(systemName: "ellipsis.circle")
        }
        .accessibilityLabel("Meer")
    }

    private func block() async {
        guard let otherUserId else { return }
        do {
            let _: OK = try await APIClient.shared.post("/api/v1/blocks", ["userId": otherUserId])
            Haptics.success(nil)
            model.show(L("Geblokkeerd. Jullie kunnen elkaar geen berichten meer sturen."), symbol: "hand.raised.fill")
            await load()
            await model.refreshAppointments()
        } catch {
            Haptics.error()
            model.show(error.plainText, symbol: "exclamationmark.circle.fill", tint: Palette.danger)
        }
    }

    private func bubble(_ m: ChatMessage) -> some View {
        let mine = m.senderId == me
        let money = !mine && Self.mentionsMoney(m.body)
        return VStack(alignment: mine ? .trailing : .leading, spacing: 3) {
            if !mine { Text(m.name).font(.caption.weight(.semibold)).foregroundStyle(Palette.muted) }
            Text(m.body)
                .padding(.horizontal, 14).padding(.vertical, 10)
                .foregroundStyle(mine ? Palette.onGrass : Palette.ink)
                .background(mine ? Palette.grass : Palette.surface, in: .rect(cornerRadius: 20, style: .continuous))
            if money {
                Label("Dit bericht gaat over geld. \(Brand.name) is gratis: betaal nooit iets.", systemImage: "exclamationmark.shield.fill")
                    .font(.caption2).foregroundStyle(Palette.danger)
            }
            Text(m.date, format: .dateTime.hour().minute().locale(Format.locale))
                .font(.caption2).foregroundStyle(Palette.muted)
        }
        .frame(maxWidth: .infinity, alignment: mine ? .trailing : .leading)
        .padding(mine ? .leading : .trailing, 48)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    @ViewBuilder
    private var composer: some View {
        if canSend {
            VStack(spacing: 6) {
                if let error { Text(error).font(.caption).foregroundStyle(Palette.danger) }
                if draft.isEmpty && !suggestions.isEmpty {
                    replies
                }
                HStack(alignment: .bottom, spacing: 10) {
                    // A single-line field: the multi-line variant did not always pass fast typing on to
                    // the draft in testing, which could send half a message.
                    TextField("Bericht", text: $draft)
                        .focused($focused)
                        .submitLabel(.send)
                        .onSubmit { Task { await send() } }
                        .padding(.horizontal, 14).padding(.vertical, 10)
                        .background(Palette.surface, in: .rect(cornerRadius: 22, style: .continuous))
                    Button {
                        Task { await send() }
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.headline)
                            .foregroundStyle(Palette.onGrass)
                            .frame(width: 44, height: 44)
                            .background(Palette.grass, in: .circle)
                    }
                    .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || sending)
                    .accessibilityLabel("Verstuur")
                }
            }
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(.bar)
        } else if loaded {
            Text("Dit gesprek is gesloten. Je kunt het nog teruglezen.")
                .font(.footnote).foregroundStyle(Palette.muted)
                .frame(maxWidth: .infinity).padding(14).background(.bar)
        }
    }

    /// A row of ready-made replies. A chip never sends by itself: it fills the field, so nothing goes out by accident.
    private var replies: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(suggestions, id: \.self) { line in
                    Button {
                        Haptics.tap()
                        draft = line
                        focused = true
                    } label: {
                        Text(line)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Palette.grass)
                            .padding(.horizontal, 14)
                            .frame(minHeight: 36)
                            .background(Palette.grassSoft, in: .capsule)
                            // Looks 36pt tall, taps as 44pt.
                            .frame(minHeight: 44)
                            .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .transition(.opacity)
    }

    /// Same idea as the website's text scan: a warning, never a block.
    nonisolated static func mentionsMoney(_ text: String) -> Bool {
        let t = text.lowercased()
        let words = ["betaal", "geld", "tikkie", "voorschot", "iban", "paypal", "€", "euro", "pay ", "payment", "bizum", "pagar", "payer", "argent"]
        return words.contains { t.contains($0) }
    }

    private func poll() async {
        while !Task.isCancelled {
            await load()
            try? await Task.sleep(for: .seconds(4))
        }
    }

    private func load() async {
        let after = Int(messages.last?.t ?? 0)
        guard let r: ChatResponse = try? await APIClient.shared.get("/api/v1/requests/\(requestId)/messages?after=\(after)") else { return }
        let new = r.messages.filter { m in !messages.contains { $0.id == m.id } }
        if !new.isEmpty {
            if loaded, new.contains(where: { $0.senderId != me }) { Haptics.soft() }
            withAnimation(.snappy) { messages.append(contentsOf: new) }
        }
        canSend = r.canSend
        loaded = true
    }

    private struct Sent: Decodable { var ok: Bool; var chat: ChatMessage }

    private func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        sending = true
        defer { sending = false }
        do {
            let r: Sent = try await APIClient.shared.post("/api/v1/requests/\(requestId)/messages", ["body": String(text.prefix(1000))])
            draft = ""
            focused = true
            error = nil
            Haptics.tap(.send)
            if !messages.contains(where: { $0.id == r.chat.id }) { withAnimation(.snappy) { messages.append(r.chat) } }
        } catch {
            Haptics.error()
            self.error = error.plainText
        }
    }
}
