import SwiftUI

/// Your appointments as a walker, and the requests for your own dogs.
struct AppointmentsView: View {
    @Environment(AppModel.self) private var model
    @State private var side: Side = .walking

    enum Side: String, CaseIterable, Identifiable {
        case walking, dogs
        var id: String { rawValue }
        var title: String { self == .walking ? L("Ik wandel") : L("Mijn honden") }
    }

    private var items: [Appointment] {
        let list = side == .walking ? model.appointments.outgoing : model.appointments.incoming
        // Open ones first (soonest first), then the rest (most recent first).
        let open = list.filter(\.isOpen).sorted { $0.startsAt < $1.startsAt }
        let done = list.filter { !$0.isOpen }.sorted { $0.startsAt > $1.startsAt }
        return open + done
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if model.offline {
                        Label("Geen verbinding. Je ziet de afspraken van je laatste bezoek.", systemImage: "wifi.slash")
                            .font(.footnote).foregroundStyle(Palette.warn)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                            .background(Palette.warnSoft, in: .rect(cornerRadius: 14, style: .continuous))
                    }
                    if model.role == .both || (model.role == .walker && !model.appointments.incoming.isEmpty) {
                        Picker("Weergave", selection: $side) {
                            ForEach(Side.allCases) { Text($0.title).tag($0) }
                        }
                        .pickerStyle(.segmented)
                    }
                    if items.isEmpty {
                        EmptyState(
                            symbol: side == .walking ? "figure.walk" : "pawprint",
                            title: side == .walking ? L("Nog geen afspraken") : L("Nog geen aanvragen"),
                            text: side == .walking ? L("Kies een hond bij Ontdek en plan een kennismaking.") : L("Zodra iemand met je hond wil wandelen, zie je het hier.")
                        )
                        if side == .walking && model.role != .owner {
                            Button("Naar Ontdek") { model.selectedTab = .discover }.buttonStyle(.primary).padding(.horizontal, 40)
                        }
                    }
                    ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                        AppointmentCard(item: item, asOwner: side == .dogs).appear(index)
                    }
                }
                .padding(20)
            }
            .screenBackground()
            .navigationTitle("Afspraken")
            .refreshable { await model.refreshAppointments() }
            .task { await model.refreshAppointments() }
            .onAppear {
                // Owners who do not walk themselves, or who have someone waiting, start on their dogs.
                if model.role == .owner || (model.pendingIncoming > 0 && !model.appointments.outgoing.contains(where: \.isOpen)) {
                    side = .dogs
                }
            }
        }
    }
}

struct AppointmentCard: View {
    let item: Appointment
    let asOwner: Bool

    @Environment(AppModel.self) private var model
    @Environment(WalkTracker.self) private var walk
    @Environment(\.openURL) private var openURL
    @State private var busy = false
    @State private var confirmCancel = false
    @State private var trustSheet = false
    @State private var following: String?
    @State private var feedbackFor: String?
    @State private var chatting = false
    @State private var breathing = false
    /// Offer the breathing minute before a walk; switched off with "Niet meer tonen".
    @AppStorage("offerBreathing") private var offerBreathing = true

    var body: some View {
        Card {
            HStack(alignment: .top, spacing: 14) {
                DogPortrait(look: item.dog.look, photoURL: item.dog.photos.first.flatMap(URL.init(string:)), cornerRadius: 18)
                    .frame(width: 64, height: 64)
                VStack(alignment: .leading, spacing: 4) {
                    let status = Labels.status(item.status)
                    Chip(text: status.0, tint: status.1, soft: status.2)
                    Text(item.isMeeting ? L("Kennismaking met \(item.dog.name)") : L("Rondje met \(item.dog.name)"))
                        .font(.headline)
                    Label(Format.when(item.startsAt) + L(" · \(item.durationMin) min"), systemImage: item.weekly ? "repeat" : "calendar")
                        .font(.subheadline).foregroundStyle(Palette.muted)
                }
            }

            if asOwner, let walker = item.walker {
                HStack(alignment: .top, spacing: 12) {
                Avatar(url: walker.photoUrl, name: walker.firstName, size: 44)
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(walker.firstName), \(walker.ageBand) jaar, \(walker.city)").font(.subheadline.weight(.semibold))
                    Text(Labels.experience(walker.experience)).font(.footnote).foregroundStyle(Palette.muted)
                    if !walker.bio.isEmpty { Text(walker.bio).font(.footnote).lineLimit(3) }
                }
                }
            }
            if !item.message.isEmpty {
                Text("“\(item.message)”").font(.subheadline).italic().foregroundStyle(Palette.ink)
                if item.flags.contains("money") || item.flags.contains("iban") {
                    Label("Dit bericht gaat over geld. \(Brand.name) is gratis: betaal nooit iets.", systemImage: "exclamationmark.shield.fill")
                        .font(.footnote).foregroundStyle(Palette.danger)
                }
            }
            if item.status == "accepted", !item.dog.meetingInfo.isEmpty {
                Label(item.dog.meetingInfo, systemImage: "mappin.and.ellipse").font(.subheadline)
            }
            contact
            actions
        }
        .sheet(isPresented: $trustSheet) {
            if let walker = item.walker {
                TrustSheet(item: item, walker: walker)
                    .presentationDetents([.medium])
            }
        }
        .fullScreenCover(item: Binding(get: { following.map(FollowID.init) }, set: { following = $0?.id })) { f in
            FollowWalkView(walkId: f.id, dogName: item.dog.name)
        }
        .sheet(item: Binding(get: { feedbackFor.map(FollowID.init) }, set: { feedbackFor = $0?.id })) { f in
            FeedbackSheet(walkId: f.id, role: asOwner ? .owner : .walker, dogName: item.dog.name)
                .presentationDetents([.large])
                .onDisappear { Task { await model.refreshAppointments() } }
        }
        .fullScreenCover(isPresented: $breathing) {
            BreathingView {
                breathing = false
                Task { await start() }
            }
            .overlay(alignment: .bottom) {
                Button("Niet meer tonen") { offerBreathing = false; breathing = false; Task { await start() } }
                    .font(.footnote).foregroundStyle(Palette.onGrass.opacity(0.7))
                    .padding(.bottom, 4)
            }
        }
        .sheet(isPresented: $chatting) {
            ChatView(requestId: item.id, title: asOwner ? (item.walker?.firstName ?? item.dog.name) : item.dog.name)
                .presentationDetents([.large])
        }
        .confirmationDialog("Afspraak annuleren?", isPresented: $confirmCancel, titleVisibility: .visible) {
            Button("Annuleer afspraak", role: .destructive) { Task { await act("cancel") } }
        } message: {
            Text("De ander krijgt hier bericht van.")
        }
    }

    private struct FollowID: Identifiable { let id: String }

    @ViewBuilder
    private var contact: some View {
        let phone = asOwner ? item.walker?.phone : item.host?.phone
        let email = asOwner ? item.walker?.email : item.host?.email
        let canChat = ["pending", "accepted", "completed"].contains(item.status)
        if canChat || (item.status == "accepted" && (phone != nil || email != nil)) {
            HStack(spacing: 10) {
                if canChat {
                    Button("Chat", systemImage: "bubble.left.and.bubble.right.fill") { chatting = true }.buttonStyle(.bordered)
                }
                if item.status == "accepted", let phone, let url = URL(string: "tel:\(phone.filter { $0.isNumber || $0 == "+" })") {
                    Button("Bel", systemImage: "phone.fill") { openURL(url) }.buttonStyle(.bordered)
                }
                if item.status == "accepted", let email, let url = URL(string: "mailto:\(email)") {
                    Button("Mail", systemImage: "envelope.fill") { openURL(url) }.buttonStyle(.bordered)
                }
            }
            .tint(Palette.grass)
            .font(.subheadline.weight(.semibold))
        }
    }

    @ViewBuilder
    private var actions: some View {
        HStack(spacing: 10) {
            if asOwner {
                if item.status == "pending" {
                    Button("Weiger") { Task { await act("decline") } }.buttonStyle(.secondary)
                    Button("Accepteer") { Task { await act("accept") } }.buttonStyle(.primary)
                } else if item.status == "completed" || (item.status == "accepted" && item.startsAt < .now) {
                    // Only after meeting in person: ID seen, and maybe solo walks from now on.
                    Button("Vertrouwen", systemImage: "hand.thumbsup.fill") { trustSheet = true }.buttonStyle(.secondary)
                }
                if item.walkStatus == "active", let id = item.walkId {
                    Button("Kijk live mee", systemImage: "dot.radiowaves.left.and.right") { following = id }.buttonStyle(.ball)
                } else if item.walkStatus == "ended", item.feedbackGiven != true, let id = item.walkId {
                    Button("Hoe ging het?") { feedbackFor = id }.buttonStyle(.secondary)
                }
            } else {
                if item.canStart() && item.walkStatus != "ended" {
                    Button {
                        if item.walkStatus != "active" && offerBreathing { breathing = true } else { Task { await start() } }
                    } label: {
                        Label(item.walkStatus == "active" ? L("Ga verder met je rondje") : L("Start het rondje"), systemImage: "figure.walk")
                    }
                    .buttonStyle(.ball)
                    .disabled(busy || walk.isActive)
                } else if item.walkStatus == "ended", item.feedbackGiven != true, let id = item.walkId {
                    Button("Hoe ging het?") { feedbackFor = id }.buttonStyle(.secondary)
                }
            }
            if item.isOpen && item.walkStatus != "active" {
                Button {
                    confirmCancel = true
                } label: {
                    Image(systemName: "xmark")
                }
                .buttonStyle(.bordered)
                .tint(Palette.muted)
                .accessibilityLabel("Annuleer")
            }
        }
        .disabled(busy)
    }

    private func act(_ action: String) async {
        busy = true
        defer { busy = false }
        do {
            let _: OK = try await APIClient.shared.post("/api/v1/requests/\(item.id)", ["action": action])
            switch action {
            case "accept":
                Haptics.success()
                model.show(L("Geaccepteerd. Jullie zien elkaars contactgegevens nu."))
                await Reminders.askIfNeeded()
            case "decline": model.show(L("Afgewezen"), symbol: "hand.raised.fill", tint: Palette.muted)
            default: model.show(L("Geannuleerd"), symbol: "xmark.circle.fill", tint: Palette.muted)
            }
            await model.refreshAppointments()
        } catch {
            Haptics.error()
            model.show(error.localizedDescription, symbol: "exclamationmark.circle.fill", tint: Palette.danger)
        }
    }

    private func start() async {
        busy = true
        defer { busy = false }
        do {
            LocationService.shared.requestPermission()
            let started: WalkStarted = try await APIClient.shared.post("/api/v1/walks", ["requestId": item.id])
            // The vet's details come from the dog's page, which the walker may see after acceptance.
            let detail: DogDetail? = try? await APIClient.shared.get("/api/v1/dogs/\(item.dog.id)")
            // When continuing a walk, the timer and planned end come from the server, not from now.
            let live: LiveWalk? = item.walkStatus == "active"
                ? try? await APIClient.shared.get("/api/walks/\(started.walkId)/live?after=999999999")
                : nil
            Haptics.success(.start)
            walk.start(.init(
                walkId: started.walkId, dogName: item.dog.name, look: item.dog.look, startedAt: live?.startedAt ?? .now,
                plannedEnd: live?.plannedEndAt ?? .now.addingTimeInterval(Double(item.durationMin) * 60),
                ownerName: item.host?.name, ownerPhone: item.host?.phone, vetInfo: detail?.dog.vetInfo
            ))
            await model.refreshAppointments()
        } catch {
            Haptics.error()
            model.show(error.localizedDescription, symbol: "exclamationmark.circle.fill", tint: Palette.danger)
        }
    }
}

/// After meeting: the owner records that they saw the walker's ID and may allow solo walks.
struct TrustSheet: View {
    let item: Appointment
    let walker: Appointment.Walker
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var idSeen = false
    @State private var solo = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("Ik heb het ID van \(walker.firstName) in het echt gezien", isOn: $idSeen)
                    if !item.dog.isShelter {
                        Toggle("\(walker.firstName) mag zelfstandig met \(item.dog.name) wandelen", isOn: $solo)
                    }
                } footer: {
                    Text("\(Brand.name) bewaart nooit een kopie van een ID. Zelfstandig wandelen kan pas als \(walker.firstName) ook de veiligheidsquiz heeft gehaald.")
                }
                if let error { Text(error).foregroundStyle(Palette.danger) }
            }
            .tint(Palette.grass)
            .rondjeForm()
            .navigationTitle("Vertrouwen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuleer") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Bewaar") { Task { await save() } } }
            }
            .onAppear {
                idSeen = item.trust?.idSeen ?? false
                solo = item.trust?.soloAllowed ?? false
            }
        }
    }

    private struct Payload: Encodable { var action = "trust"; var dogId, walkerId: String; var idSeen, soloAllowed: Bool }

    private func save() async {
        do {
            let _: OK = try await APIClient.shared.post("/api/v1/requests/\(item.id)", Payload(dogId: item.dog.id, walkerId: walker.id, idSeen: idSeen, soloAllowed: solo))
            Haptics.success()
            model.show(L("Opgeslagen"))
            await model.refreshAppointments()
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
