import MapKit
import SwiftUI

/// Full screen during a walk: the route, time and distance, SOS, and a deliberate way to end.
struct ActiveWalkView: View {
    @Environment(WalkTracker.self) private var walk
    @Environment(AppModel.self) private var model
    @State private var camera: MapCameraPosition = .userLocation(followsHeading: false, fallback: .automatic)
    @State private var sos = false
    @State private var ending = false
    @State private var finished: (walkId: String, distance: Int, dog: String)?
    @State private var holdProgress: CGFloat = 0
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
                WalkDoneView(walkId: finished.walkId, distance: finished.distance, dogName: finished.dog)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            } else if let info = walk.info {
                panel(info)
            }
        }
        .overlay(alignment: .top) {
            if finished == nil, let info = walk.info {
                HStack {
                    DogPortrait(look: info.look, cornerRadius: 14).frame(width: 44, height: 44)
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Rondje met \(info.dogName)").font(.headline)
                        Text(walk.signalWeak ? "Zwak GPS-signaal" : "De eigenaar kan live meekijken")
                            .font(.caption).foregroundStyle(walk.signalWeak ? Palette.warn : Palette.muted)
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
            }
        }
        .sheet(isPresented: $sos) {
            if let info = walk.info { SOSSheet(info: info).presentationDetents([.large]) }
        }
        .animation(.spring(duration: 0.5), value: finished?.walkId)
        .interactiveDismissDisabled()
    }

    private func panel(_ info: WalkTracker.Info) -> some View {
        VStack(spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Tijd").font(.caption).foregroundStyle(Palette.muted)
                    Text(info.startedAt, style: .timer)
                        .font(.system(size: 40, weight: .bold, design: .rounded).monospacedDigit())
                        .contentTransition(.numericText())
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Afstand").font(.caption).foregroundStyle(Palette.muted)
                    Text(Format.distance(walk.distanceM))
                        .font(.system(size: 32, weight: .bold, design: .rounded).monospacedDigit())
                        .contentTransition(.numericText(value: walk.distanceM))
                        .animation(.snappy, value: walk.distanceM)
                }
            }
            if walk.overdueMin > 0 {
                Label("Je bent \(walk.overdueMin) minuten over tijd. De eigenaar heeft een melding gekregen.", systemImage: "clock.badge.exclamationmark")
                    .font(.footnote).foregroundStyle(Palette.warn)
            } else {
                Label("Terug rond \(info.plannedEnd.formatted(.dateTime.hour().minute().locale(Format.dutch)))", systemImage: "clock")
                    .font(.footnote).foregroundStyle(Palette.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            ErrorText(message: error)
            holdToEnd
        }
        .padding(20)
        .glassy(cornerRadius: 32)
        .padding(.horizontal, 12)
        .padding(.bottom, 8)
    }

    /// Hold to end: a single tap in a pocket should never end a walk by accident.
    private var holdToEnd: some View {
        ZStack(alignment: .leading) {
            Capsule().fill(Palette.grass)
            Capsule().fill(Palette.ball).frame(width: max(0, holdProgress) * 340).opacity(0.9)
            Text(ending ? "Bezig met afronden…" : "Houd vast om af te ronden")
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

    private func end() async {
        guard let info = walk.info, !ending else { return }
        ending = true
        defer { ending = false }
        do {
            let distance = try await walk.finish()
            Haptics.success()
            finished = (info.walkId, distance, info.dogName)
            await model.refreshAppointments()
        } catch {
            Haptics.error()
            self.error = error.localizedDescription
            holdProgress = 0
        }
    }
}

/// Shown after ending: a small celebration and the private feedback.
struct WalkDoneView: View {
    let walkId: String
    let distance: Int
    let dogName: String
    @State private var feedback = false
    @State private var pop = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "pawprint.fill")
                .font(.system(size: 44))
                .foregroundStyle(Palette.onBall)
                .frame(width: 92, height: 92)
                .background(Palette.ball, in: .circle)
                .scaleEffect(pop ? 1 : 0.4)
                .symbolEffect(.bounce, value: pop)
            Text("Goed rondje!").font(.display(30))
            Text("\(dogName) en jij liepen \(Format.distance(Double(distance))). Dank je wel.")
                .multilineTextAlignment(.center).foregroundStyle(Palette.muted)
            Button("Hoe ging het?") { feedback = true }.buttonStyle(.primary)
            Button("Klaar") { dismiss() }.buttonStyle(.secondary)
        }
        .padding(24)
        .glassy(cornerRadius: 32)
        .padding(12)
        .onAppear { withAnimation(.spring(duration: 0.6, bounce: 0.5)) { pop = true } }
        .sheet(isPresented: $feedback, onDismiss: { dismiss() }) {
            FeedbackSheet(walkId: walkId, role: .walker, dogName: dogName)
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
            ? [("easy", "Makkelijk", "face.smiling"), ("pulled", "Trok wat", "arrow.right"), ("reactive", "Reageerde op andere honden", "exclamationmark"), ("aggressive", "Agressief", "exclamationmark.triangle")]
            : [("happy", "Blij", "face.smiling"), ("normal", "Gewoon", "circle"), ("stressed", "Gestrest", "exclamationmark"), ("injured", "Gewond", "bandage")]
    }

    var body: some View {
        NavigationStack {
            Form {
                Section(role == .walker ? "Hoe was \(dogName)?" : "Hoe was \(dogName) na het rondje?") {
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
                    Toggle(role == .walker ? "De overdracht ging goed" : "Op tijd terug", isOn: $yes1)
                    Toggle(role == .walker ? "Ik voelde me veilig" : "Ik zou het weer doen", isOn: $yes2)
                }
                Section {
                    TextField("Nog iets? (optioneel)", text: $note, axis: .vertical).lineLimit(2...5)
                } footer: {
                    Text("Alleen \(Brand.name) ziet dit, nooit de ander.")
                }
                if let error { Text(error).foregroundStyle(Palette.danger) }
            }
            .tint(Palette.grass)
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
            Haptics.success()
            model.show("Bedankt voor je antwoord")
            close()
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
