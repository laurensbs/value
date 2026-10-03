import MapKit
import SwiftUI

/// Full screen during a walk: the route, time and distance, SOS, and a deliberate way to end.
struct ActiveWalkView: View {
    @Environment(WalkTracker.self) private var walk
    @Environment(AppModel.self) private var model
    @State private var camera: MapCameraPosition = .userLocation(followsHeading: false, fallback: .automatic)
    @State private var sos = false
    @State private var ending = false
    @State private var finished: (info: WalkTracker.Info, distance: Int)?
    @State private var holdProgress: CGFloat = 0
    @State private var care = Care()
    @State private var photos: [WalkPhoto] = []
    @State private var moodBefore: Int?
    @State private var error: String?

    var body: some View {
        ZStack(alignment: .bottom) {
            Map(position: $camera) {
                UserAnnotation()
                if walk.route.count > 1 {
                    MapPolyline(coordinates: walk.route)
                        .stroke(Palette.route, style: StrokeStyle(lineWidth: 6, lineCap: .round, lineJoin: .round))
                }
            }
            .mapStyle(.standard(pointsOfInterest: .including([.park])))
            .mapControls { MapUserLocationButton() }
            .ignoresSafeArea()

            if let finished {
                WalkDoneFlow(info: finished.info, distance: finished.distance, care: care, photoCount: photos.count)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            } else if let info = walk.info {
                panel(info)
            }
        }
        .overlay(alignment: .top) {
            if finished == nil, let info = walk.info {
                VStack(spacing: 8) {
                    HStack {
                        DogPortrait(look: info.look, cornerRadius: 14).frame(width: 44, height: 44)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Rondje met \(info.dogName)").font(.headline)
                            if !LocationService.shared.allowed && LocationService.shared.authorization != .notDetermined {
                                Button("Locatie staat uit. Zet hem aan") { openSettings() }
                                    .font(.caption.weight(.semibold)).foregroundStyle(Palette.danger)
                            } else {
                                Text(walk.signalWeak ? L("Zwak GPS-signaal") : L("De eigenaar kan live meekijken"))
                                    .font(.caption).foregroundStyle(walk.signalWeak ? Palette.warn : Palette.muted)
                            }
                        }
                        Spacer()
                        Button {
                            sos = true
                        } label: {
                            Text("SOS").font(.headline.weight(.heavy)).foregroundStyle(.white)
                                .frame(width: 56, height: 44)
                                .background(Palette.danger, in: .capsule)
                        }
                        .accessibilityLabel("Hulp nodig")
                    }
                    .padding(12)
                    .glassy(cornerRadius: 24)
                    .padding(.horizontal)
                    if walk.overdueMin == 0 {
                        GuusHint(id: "walk.sos", text: L("Hulp nodig? SOS staat altijd hier rechtsboven.")).padding(.horizontal)
                    }
                }
            }
        }
        .sheet(isPresented: $sos) {
            if let info = walk.info { SOSSheet(info: info).presentationDetents([.large]) }
        }
        .animation(.spring(duration: 0.5), value: finished?.info.walkId)
        .interactiveDismissDisabled()
    }

    private func panel(_ info: WalkTracker.Info) -> some View {
        VStack(spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Tijd").font(.caption).foregroundStyle(Palette.muted)
                    Text(info.startedAt, style: .timer)
                        .font(.display(40).monospacedDigit())
                        .contentTransition(.numericText())
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Afstand").font(.caption).foregroundStyle(Palette.muted)
                    Text(Format.distance(walk.distanceM))
                        .font(.display(32).monospacedDigit())
                        .contentTransition(.numericText(value: walk.distanceM))
                        .animation(.snappy, value: walk.distanceM)
                }
            }
            if walk.overdueMin > 0 {
                Label("Je bent \(walk.overdueMin) minuten over tijd. De eigenaar heeft een melding gekregen.", systemImage: "clock.badge.exclamationmark")
                    .font(.footnote).foregroundStyle(Palette.warn)
            } else {
                Label("Terug rond \(info.plannedEnd.formatted(.dateTime.hour().minute().locale(Format.locale)))", systemImage: "clock")
                    .font(.footnote).foregroundStyle(Palette.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            if moodBefore == nil {
                MoodPicker(title: L("Even voor jezelf: hoe voel je je nu?"), selected: nil) { value in
                    withAnimation(.snappy) { moodBefore = value }
                    MoodStore.set(walkId: info.walkId, before: value)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
            if walk.overdueMin == 0 {
                GuusHint(id: "walk.care", text: L("Tik bij elke plas of poep. De eigenaar ziet het live."), after: "walk.sos")
            }
            CareCounters(walkId: info.walkId, care: $care)
            if !photos.isEmpty { PhotoStrip(photos: photos) }
            SendPhotoButton(walkId: info.walkId) { photo in photos.append(photo) }
            ErrorText(message: error)
            holdToEnd
        }
        .padding(20)
        .task(id: info.walkId) {
            moodBefore = MoodStore.entry(info.walkId)?.before
            // After a restart mid-walk: pick up the report and photos so far.
            if let live: LiveWalk = try? await APIClient.shared.get("/api/walks/\(info.walkId)/live?after=999999999") {
                care = live.care ?? Care()
                photos = live.photos ?? []
            }
        }
        .glassy(cornerRadius: 32)
        .padding(.horizontal, 12)
        .padding(.bottom, 8)
    }

    /// Hold to end: a single tap in a pocket should never end a walk by accident.
    private var holdToEnd: some View {
        ZStack(alignment: .leading) {
            Capsule().fill(Palette.grass)
            Capsule().fill(Palette.ball).frame(width: max(0, holdProgress) * 340).opacity(0.9)
            Text(ending ? L("Bezig met afronden…") : L("Houd vast om af te ronden"))
                .font(.headline)
                .foregroundStyle(holdProgress > 0.5 ? Palette.onBall : Palette.onGrass)
                .frame(maxWidth: .infinity)
        }
        .frame(height: 58)
        .clipShape(.capsule)
        .onLongPressGesture(minimumDuration: 1.2, maximumDistance: 40) {
            Task { await end() }
        } onPressingChanged: { pressing in
            if pressing { Haptics.soft() }
            withAnimation(pressing ? .linear(duration: 1.2) : .spring(duration: 0.3)) { holdProgress = pressing ? 1 : 0 }
        }
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel("Rondje afronden")
        .accessibilityAction { Task { await end() } }
        .disabled(ending)
    }

    /// Without location the owner cannot watch along; the Settings app is where it is switched on.
    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
    }

    private func end() async {
        guard let info = walk.info, !ending else { return }
        ending = true
        defer { ending = false }
        do {
            let distance = try await walk.finish()
            WalkLog.record(WalkLogEntry(walkId: info.walkId, dogId: model.appointments.outgoing.first { $0.walkId == info.walkId }?.dog.id, dogName: info.dogName, look: info.look, side: "walker", person: nil, distanceM: distance, minutes: max(1, Int(Date.now.timeIntervalSince(info.startedAt) / 60)), photos: photos.count, date: info.startedAt))
            Haptics.success()
            finished = (info, distance)
            await model.refreshAppointments()
        } catch {
            Haptics.error()
            self.error = error.localizedDescription
            holdProgress = 0
        }
    }
}

/// What to do in an emergency. Big buttons, no small print.
struct SOSSheet: View {
    let info: WalkTracker.Info
    @Environment(\.openURL) private var openURL
    @Environment(\.dismiss) private var dismiss
    @State private var reporting = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Button { openURL(URL(string: "tel:112")!) } label: {
                        Label("Bel 112", systemImage: "phone.fill").font(.title3.weight(.bold))
                    }
                    .buttonStyle(.danger)
                    if let phone = info.ownerPhone, let url = URL(string: "tel:\(phone.filter { $0.isNumber || $0 == "+" })") {
                        Button { openURL(url) } label: { Label("Bel \(info.ownerName ?? "de eigenaar")", systemImage: "person.fill") }
                            .buttonStyle(.primary)
                    }
                    if let vet = info.vetInfo, !vet.isEmpty {
                        Card {
                            Label("Dierenarts", systemImage: "cross.case.fill").font(.headline)
                            Text(vet)
                        }
                    }
                    Card {
                        Text("Hond losgeschoten").font(.headline)
                        Text("Blijf rustig en ren er niet achteraan. Roep de naam vrolijk, ga door je knieën en bel meteen de eigenaar.")
                    }
                    Card {
                        Text("Een beet of gevecht").font(.headline)
                        Text("Houd afstand, trek de honden niet met je handen uit elkaar. Breng jezelf en de hond in veiligheid en bel de eigenaar. Bij een verwonding: dierenarts of 112.")
                    }
                    Card {
                        Text("Hitte of uitputting").font(.headline)
                        Text("Zoek schaduw, geef water en laat de hond rusten. Hijgt de hond heftig of wankelt hij: bel de dierenarts.")
                    }
                    Button("Meld wat er gebeurde", systemImage: "exclamationmark.bubble") { reporting = true }
                        .buttonStyle(.secondary)
                }
                .padding(20)
            }
            .screenBackground()
            .navigationTitle("Hulp nodig?")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Sluit", systemImage: "xmark") { dismiss() } } }
            .sheet(isPresented: $reporting) { ReportSheet(walkId: info.walkId).presentationDetents([.medium, .large]) }
        }
    }
}

/// Private feedback after a walk. The other person never sees it; worrying answers go to moderation.
struct FeedbackSheet: View {
    enum Role { case walker, owner }
    let walkId: String
    let role: Role
    let dogName: String

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var choice = ""
    @State private var yes1 = true
    @State private var yes2 = true
    @State private var note = ""
    @State private var error: String?

    private var options: [(String, String, String)] {
        role == .walker
            ? [("easy", L("Makkelijk"), "face.smiling"), ("pulled", L("Trok wat"), "arrow.right"), ("reactive", L("Reageerde op andere honden"), "exclamationmark"), ("aggressive", L("Agressief"), "exclamationmark.triangle")]
            : [("happy", L("Blij"), "face.smiling"), ("normal", L("Gewoon"), "circle"), ("stressed", L("Gestrest"), "exclamationmark"), ("injured", L("Gewond"), "bandage")]
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(role == .walker ? L("Hoe was \(dogName)?") : L("Hoe was \(dogName) na het rondje?")) {
                    ForEach(options, id: \.0) { option in
                        Button {
                            choice = option.0
                        } label: {
                            HStack {
                                Label(option.1, systemImage: option.2)
                                Spacer()
                                if choice == option.0 { Image(systemName: "checkmark").foregroundStyle(Palette.grass) }
                            }
                        }
                        .foregroundStyle(Palette.ink)
                    }
                }
                Section {
                    Toggle(role == .walker ? L("De overdracht ging goed") : L("Op tijd terug"), isOn: $yes1)
                    Toggle(role == .walker ? L("Ik voelde me veilig") : L("Ik zou het weer doen"), isOn: $yes2)
                }
                Section {
                    TextField("Nog iets? (optioneel)", text: $note, axis: .vertical).lineLimit(2...5)
                } footer: {
                    Text("Alleen \(Brand.name) ziet dit, nooit de ander.")
                }
                if let error { Text(error).foregroundStyle(Palette.danger) }
            }
            .tint(Palette.grass)
            .rondjeForm()
            .navigationTitle("Hoe ging het?")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Later") { close() } }
                ToolbarItem(placement: .confirmationAction) { Button("Verstuur") { Task { await send() } }.disabled(choice.isEmpty) }
            }
        }
        .sensoryFeedback(.selection, trigger: choice)
    }

    private func close() { dismiss() }

    private func send() async {
        var body: [String: AnyEncodable] = ["note": AnyEncodable(note)]
        if role == .walker {
            body["dogBehaviour"] = AnyEncodable(choice); body["handoverOk"] = AnyEncodable(yes1); body["feltSafe"] = AnyEncodable(yes2)
        } else {
            body["dogCondition"] = AnyEncodable(choice); body["onTime"] = AnyEncodable(yes1); body["wouldAgain"] = AnyEncodable(yes2)
        }
        do {
            let _: OK = try await APIClient.shared.post("/api/v1/walks/\(walkId)/feedback", body)
            if role == .walker, let dogId = model.appointments.outgoing.first(where: { $0.walkId == walkId })?.dog.id {
                Keepsakes.shared.recordWalkFeedback(dogId: dogId, behaviour: choice, feltSafe: yes2)
            }
            Haptics.success()
            model.show(L("Bedankt voor je antwoord"))
            close()
            Task { await model.refreshAppointments() }
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct AnyEncodable: Encodable {
    private let encodeValue: (Encoder) throws -> Void
    init<T: Encodable>(_ value: T) { encodeValue = value.encode }
    func encode(to encoder: Encoder) throws { try encodeValue(encoder) }
}
