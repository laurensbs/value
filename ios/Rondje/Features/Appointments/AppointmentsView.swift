import SwiftUI

/// Your appointments as a walker, and the requests for your own dogs.
struct AppointmentsView: View {
    @Environment(AppModel.self) private var model
    @State private var side: Side = .walking
    /// The appointment Guus (or a notification) pointed at, outlined for a moment.
    @State private var highlight: String?

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
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 16) {
                        if model.offline {
                            Label("Geen verbinding. Je ziet de afspraken van je laatste bezoek.", systemImage: "wifi.slash")
                                .font(.footnote).foregroundStyle(Palette.warn)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(12)
                                .background(Palette.warnSoft, in: .rect(cornerRadius: 14, style: .continuous))
                        }
                        if !items.isEmpty {
                            GuusHint(id: "appointments", text: L("Op de dag zelf start je hier je rondje. Een half uur van tevoren mag het al."))
                        }
                        if model.role == .both || (model.role == .walker && !model.appointments.incoming.isEmpty) {
                            Picker("Weergave", selection: $side) {
                                ForEach(Side.allCases) { Text($0.title).tag($0) }
                            }
                            .pickerStyle(.segmented)
                        }
                        if items.isEmpty {
                            if side == .walking && model.role != .owner {
                                EmptyState(
                                    symbol: "figure.walk", title: L("Nog geen afspraken"),
                                    text: L("Kies een hond bij Ontdek en plan een kennismaking."),
                                    actionTitle: L("Kies samen met Guus een hond"),
                                    action: { model.perform(.discover(calm: true)) }
                                )
                            } else {
                                EmptyState(
                                    symbol: side == .walking ? "figure.walk" : "pawprint",
                                    title: side == .walking ? L("Nog geen afspraken") : L("Nog geen aanvragen"),
                                    text: side == .walking ? L("Kies een hond bij Ontdek en plan een kennismaking.") : L("Zodra iemand met je hond wil wandelen, zie je het hier.")
                                )
                            }
                        }
                        ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                            AppointmentCard(item: item, asOwner: side == .dogs, highlighted: highlight == item.id)
                                .id(item.id)
                                .appear(index)
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
                    // Not when Guus just pointed at one appointment: then that side is already chosen.
                    guard highlight == nil else { return }
                    if model.role == .owner || (model.pendingIncoming > 0 && !model.appointments.outgoing.contains(where: \.isOpen)) {
                        side = .dogs
                    }
                }
                .onChange(of: model.pendingAction, initial: true) {
                    guard let picked = model.take({ action -> String?? in
                        if case .appointments(let id) = action { return .some(id) }
                        return nil
                    }), let id = picked else { return }
                    if model.appointments.incoming.contains(where: { $0.id == id }) {
                        side = .dogs
                    } else if model.appointments.outgoing.contains(where: { $0.id == id }) {
                        side = .walking
                    }
                    highlight = id
                    Task {
                        // Let the chosen side lay out first, then scroll to the card and outline it for a moment.
                        try? await Task.sleep(for: .milliseconds(80))
                        withAnimation { proxy.scrollTo(id, anchor: .center) }
                        try? await Task.sleep(for: .seconds(1.6))
                        if highlight == id { highlight = nil }
                    }
                }
            }
        }
    }
}

struct AppointmentCard: View {
    let item: Appointment
    let asOwner: Bool
    var highlighted = false

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
    /// After a first call: the dog's details, to plan meeting in person in the request sheet.
    @State private var planInPerson: DogDetail?
    /// Offer the breathing minute before a walk; switched off with "Niet meer tonen".
    @AppStorage("offerBreathing") private var offerBreathing = true

    var body: some View {
        Card {
            HStack(alignment: .top, spacing: 14) {
                DogPortrait(look: item.dog.look, photoURL: item.dog.photos.first.flatMap(URL.init(string:)), cornerRadius: 18)
                    .frame(width: 64, height: 64)
                VStack(alignment: .leading, spacing: 4) {
                    let status = item.isCall && item.status == "completed" ? (L("Gesprek gehad"), Palette.calm, Palette.calmSoft) : Labels.status(item.status)
                    Chip(text: status.0, tint: status.1, soft: status.2)
                    Text(item.isMeeting ? L("Kennismaking met \(item.dog.name)") : L("Rondje met \(item.dog.name)"))
                        .font(.headline)
                    if item.isMeeting {
                        // How they meet: a call is never mistaken for meeting in person.
                        Label(item.via.title, systemImage: item.via.symbol)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(item.isCall ? Palette.calm : Palette.grass)
                    }
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
            if item.status == "accepted", !item.dog.meetingInfo.isEmpty, !item.isCall {
                Label(item.dog.meetingInfo, systemImage: "mappin.and.ellipse").font(.subheadline)
            }
            meetNote
            contact
            PrepLink(item: item, asOwner: asOwner)
            actions
        }
        .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(Palette.ball, lineWidth: highlighted ? 3 : 0).animation(.easeInOut, value: highlighted))
        .sheet(item: $planInPerson) { detail in
            RequestFlow(dog: detail.dog, slots: detail.slots, kind: .meet, isShelter: detail.host.isShelter, via: .walk) {}
                .presentationDetents([.large])
                .presentationCornerRadius(32)
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
            BreathingView(stopOffering: { offerBreathing = false; breathing = false; Task { await start() } }) {
                breathing = false
                Task { await start() }
            }
        }
        .sheet(isPresented: $chatting) {
            ChatView(
                requestId: item.id, title: asOwner ? (item.walker?.firstName ?? item.dog.name) : item.dog.name,
                // Whom a report or block is about: the walker for an owner, else the owner or the shelter.
                otherUserId: asOwner ? item.walker?.id : item.dog.ownerId,
                dogId: item.dog.id, orgId: asOwner ? nil : item.dog.orgId,
                suggestions: RequestSuggestions.chatReplies(for: item, asOwner: asOwner)
            )
                .presentationDetents([.large])
        }
        .confirmationDialog("Afspraak annuleren?", isPresented: $confirmCancel, titleVisibility: .visible) {
            Button("Annuleer afspraak", role: .destructive) { Task { await act("cancel") } }
        } message: {
            Text("De ander krijgt hier bericht van.")
        }
    }

    private struct FollowID: Identifiable { let id: String }

    /// What to know about this way of meeting: safety for a visit at home; for a call, how to reach
    /// each other and that it does not count as meeting in person.
    @ViewBuilder
    private var meetNote: some View {
        if item.isMeeting && item.isOpen {
            switch item.via {
            case .home:
                Label("Veilig op bezoek: spreek overdag af, laat iemand weten waar je bent, en familie of een buur mag er gerust bij zijn.", systemImage: "shield.lefthalf.filled")
                    .font(.footnote).foregroundStyle(Palette.muted)
            case .phone, .video:
                VStack(alignment: .leading, spacing: 4) {
                    if item.status == "accepted" {
                        Text(item.via == .video
                             ? L("\(Brand.name) heeft zelf geen videobellen. Spreek in de chat af welke app jullie gebruiken en deel daar de link.")
                             : L("Spreek in de chat af wie wie belt."))
                    }
                    Text(asOwner
                         ? L("Een gesprek telt nog niet als kennismaking in het echt. Het ID bekijken en zelfstandig wandelen toestaan kan pas als jullie elkaar met \(item.dog.name) ontmoet hebben.")
                         : L("Na het gesprek is de volgende stap een kennismaking in het echt, met \(item.dog.name) erbij."))
                }
                .font(.footnote).foregroundStyle(Palette.muted)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.calmSoft, in: .rect(cornerRadius: 14, style: .continuous))
            case .walk:
                EmptyView()
            }
        }
    }

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
                } else if !item.isCall, item.status == "completed" || (item.status == "accepted" && item.startsAt < .now) {
                    // Only after meeting in person: ID seen, and maybe solo walks from now on. Never after a call.
                    Button("Vertrouwen", systemImage: "hand.thumbsup.fill") { trustSheet = true }.buttonStyle(.secondary)
                }
                if item.walkStatus == "active", let id = item.walkId {
                    Button("Kijk live mee", systemImage: "dot.radiowaves.left.and.right") { following = id }.buttonStyle(.ball)
                } else if item.walkStatus == "ended", item.feedbackGiven != true, let id = item.walkId {
                    Button("Hoe ging het?") { feedbackFor = id }.buttonStyle(.secondary)
                }
            } else {
                if item.isCall && item.status == "accepted" {
                    // After a first call, meeting in person comes next: walking together is already chosen.
                    Button {
                        Task { await openPlanInPerson() }
                    } label: {
                        Label("Plan de kennismaking in het echt", systemImage: "figure.walk")
                    }
                    .buttonStyle(.primary)
                } else if item.canStart() && item.walkStatus != "ended" {
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

    private func openPlanInPerson() async {
        busy = true
        defer { busy = false }
        do {
            planInPerson = try await APIClient.shared.get("/api/v1/dogs/\(item.dog.id)")
        } catch {
            Haptics.error()
            model.show(error.localizedDescription, symbol: "exclamationmark.circle.fill", tint: Palette.danger)
        }
    }

    private func start() async {
        busy = true
        defer { busy = false }
        do {
            try await WalkStarter.start(item, model: model, walk: walk)
            Haptics.success(.start)
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

/// The dog's details open the request sheet after a first call.
extension DogDetail: Identifiable {
    var id: String { dog.id }
}
