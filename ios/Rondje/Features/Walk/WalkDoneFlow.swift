import SwiftUI
import UserNotifications

// MARK: Math

/// The sums behind the lesson-complete screens. Pure, so they are easy to test.
/// Every walk counts the same: nothing here compares speed, pace or other people.
enum WalkDoneMath {
    /// Points events from shortly before the walk started; the server stamps the walk, care and photo
    /// events with the walk start, so a small margin keeps them all.
    static let margin: TimeInterval = 120

    /// The point events of this walk, with the server's own labels.
    static func pointRows(_ recent: [Progress.Recent], since: Date) -> [Progress.Recent] {
        let from = since.addingTimeInterval(-margin)
        return recent.filter { $0.at >= from }
    }

    /// How far into the level, from 0 (the floor) to 1 (the next level, or the top level).
    static func levelFraction(points: Int, level: Progress.Level) -> Double {
        guard let next = level.next else { return 1 }
        let span = next - level.floor
        guard span > 0 else { return 1 }
        return min(1, max(0, Double(points - level.floor) / Double(span)))
    }

    /// Walks together at which the friendship gets a new name.
    static let bondTiers = [2, 5, 10]

    /// The friendship now, and how many walks until the next name.
    static func bondStep(walks: Int) -> (name: String, symbol: String, nextName: String?, toGo: Int) {
        let (name, symbol) = DogFriendsView.bond(walks)
        guard let next = bondTiers.first(where: { $0 > walks }) else { return (name, symbol, nil, 0) }
        return (name, symbol, DogFriendsView.bond(next).0, next - walks)
    }

    /// Whether this walk gave the friendship a new name.
    static func tierUp(walks: Int) -> Bool {
        walks > 1 && DogFriendsView.bond(walks).0 != DogFriendsView.bond(walks - 1).0
    }
}

// MARK: Flow

/// After 'Houd vast om af te ronden': a short lesson-complete sequence in four steps.
/// The walk itself, the points, private feedback, and the friendship with the dog plus what comes next.
/// Every step can be skipped and 'Klaar' is always there.
struct WalkDoneFlow: View {
    let info: WalkTracker.Info
    let distance: Int
    let care: Care
    let photoCount: Int

    private enum Step: Hashable { case done, points, feedback, friendship }

    /// A request opened from the last step.
    private struct Offer: Identifiable {
        let id = UUID()
        var kind: RequestFlow.Kind
        var prefill: RequestPrefill?
    }

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var index = 0
    @State private var started = false
    @State private var appointment: Appointment?
    @State private var skipFeedback = false

    // Data, each part hidden when its call fails.
    @State private var before: Progress?
    @State private var after: Progress?
    @State private var progressLoaded = false
    @State private var friends: [DogFriend]?
    @State private var detail: DogDetail?

    // Step 1
    @State private var moodAfter: Int?

    // Step 2
    @State private var pointsPlayed = false
    @State private var revealed = 0
    @State private var showTotal = false
    @State private var ring: Double = 0
    @State private var ringLevel: Int?
    @State private var ringPop = false
    @State private var newLevel: String?

    // Step 3
    @State private var behaviour = ""
    @State private var handoverOk = true
    @State private var feltSafe = true
    @State private var note = ""
    @State private var noteOpen = false
    @State private var sending = false
    @State private var sent: FeedbackOutcome?
    @State private var feedbackError: String?

    // Step 4
    @State private var flipped = false
    @State private var offer: Offer?
    @State private var requested = false
    @State private var offerHidden = false
    /// Whether the 30-minute reminder of a weekly walk can really come (notifications allowed).
    @State private var remindersAllowed = false

    private enum FeedbackOutcome { case thanks, calm }

    /// Something was reported through SOS during this walk: no confetti, no points or level-up and
    /// no offer to walk this dog again, just a calm close.
    private var reported: Bool { Keepsakes.shared.reported(walkId: info.walkId) }
    private var steps: [Step] {
        var list: [Step] = reported ? [.done] : [.done, .points]
        if !skipFeedback { list.append(.feedback) }
        list.append(.friendship)
        return list
    }
    private var step: Step { steps[min(index, steps.count - 1)] }
    private var isLast: Bool { index >= steps.count - 1 }
    private var dogName: String { appointment?.dog.name ?? info.dogName }
    private var minutes: Int { max(1, Int(Date.now.timeIntervalSince(info.startedAt) / 60)) }
    private var quizPassed: Bool { model.me?.profile?.quizPassed == true || model.me?.trust?.quizPassed == true }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            ScrollView {
                content
                    .padding(.horizontal, 20)
                    .padding(.vertical, 16)
                    .frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            // Only the final answer goes to Apple Health, and only when the person turned that on.
            .onDisappear { if let moodAfter { HealthService.shared.saveMood(moodAfter) } }
            .scrollDismissesKeyboard(.interactively)
            .id(index)
            .transition(reduceMotion ? .opacity : .push(from: .trailing))
            bottomBar
        }
        .foregroundStyle(Palette.onWalk)
        .background(Palette.walkBackground.ignoresSafeArea())
        .sensoryFeedback(.selection, trigger: behaviour)
        .task { await start() }
        .sheet(item: $offer) { offer in
            if let detail {
                RequestFlow(dog: detail.dog, slots: detail.slots, kind: offer.kind, host: detail.host, prefill: offer.prefill) {
                    requested = true
                }
            }
        }
    }

    // MARK: Frame

    private var topBar: some View {
        HStack(spacing: 12) {
            HStack(spacing: 6) {
                ForEach(steps.indices, id: \.self) { i in
                    Capsule()
                        .fill(i <= index ? Palette.ball : Palette.onWalk.opacity(0.25))
                        .frame(height: 5)
                }
            }
            .animation(Motion.klein, value: index)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(L("Stap \(index + 1) van \(steps.count)"))
            Button { dismiss() } label: {
                Text("Klaar")
                    .font(.headline)
                    .foregroundStyle(Palette.onWalk)
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(.rect)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
    }

    @ViewBuilder
    private var bottomBar: some View {
        VStack(spacing: 4) {
            if step == .feedback && sent == nil {
                Button {
                    Task { await sendFeedback() }
                } label: {
                    if sending { ProgressView().tint(Palette.onBall) } else { Text("Verstuur") }
                }
                .buttonStyle(.ball)
                .disabled(behaviour.isEmpty || sending)
                .opacity(behaviour.isEmpty ? 0.6 : 1)
                Button { next() } label: {
                    Text("Sla over")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Palette.onWalk.opacity(0.85))
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .contentShape(.rect)
                }
                .buttonStyle(.plain)
            } else {
                Button(isLast ? L("Klaar") : L("Verder")) { isLast ? dismiss() : next() }
                    .buttonStyle(.ball)
            }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 12)
        .padding(.top, 8)
    }

    @ViewBuilder
    private var content: some View {
        switch step {
        case .done: doneStep
        case .points: pointsStep
        case .feedback: feedbackStep
        case .friendship: friendshipStep
        }
    }

    private func next() {
        guard !isLast else { return }
        Haptics.tap()
        withAnimation(Motion.or(Motion.scherm, reduce: reduceMotion)) { index += 1 }
    }

    // MARK: Step 1: the walk

    private var doneStep: some View {
        VStack(spacing: 18) {
            ZStack {
                Guus(mood: reported ? .calm : .proud, size: 120)
                if !reduceMotion && !reported {
                    Confetti(count: 40, duration: 1.8)
                        .frame(width: 320, height: 260)
                }
            }
            .frame(height: 140)
            Text(reported ? L("Het rondje is klaar") : L("Rondje klaar!"))
                .font(.display(34))
                .multilineTextAlignment(.center)
                .accessibilityAddTraits(.isHeader)
            // Under 50 m (GPS that barely moved) the walk is still a walk: no "0 m".
            Text(distance < 50
                 ? L("\(dogName) en jij zijn samen op pad geweest. Dank je wel.")
                 : L("\(dogName) en jij liepen \(Format.distance(Double(distance))) in \(minutes) minuten."))
                .multilineTextAlignment(.center)
                .foregroundStyle(Palette.onWalk.opacity(0.9))
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 96), spacing: 10)], spacing: 10) {
                tile(L("Tijd"), value: minutes) { L("\($0) min") }
                if distance >= 50 { tile(L("Afstand"), value: distance) { Format.distance(Double($0)) } }
                if care.pee > 0 { tile(L("Plasjes"), value: care.pee) }
                if care.poo > 0 { tile(L("Poepjes"), value: care.poo) }
                if photoCount > 0 { tile(L("Foto's"), value: photoCount) }
            }
            MoodPicker(title: L("En hoe voel je je nu?"), selected: moodAfter) { value in
                moodAfter = value
                MoodStore.set(walkId: info.walkId, after: value)
            }
            .padding(.top, 4)
            if let line = moodLine {
                Text(line)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.ball)
                    .multilineTextAlignment(.center)
                    .transition(.opacity)
            }
        }
        .animation(Motion.klein, value: moodAfter)
    }

    private func tile(_ title: String, value: Int, format: @escaping (Int) -> String = { "\($0)" }) -> some View {
        VStack(spacing: 2) {
            CountUp(value: value, format: format)
                .font(.display(26).monospacedDigit())
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Palette.onWalk.opacity(0.8))
        }
        .frame(maxWidth: .infinity, minHeight: 76)
        .padding(.horizontal, 8)
        .background(Palette.surface.opacity(0.12), in: .rect(cornerRadius: 18, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    /// A kind sentence comparing before and after, only when the walker answered both.
    private var moodLine: String? {
        guard let after = moodAfter, let before = MoodStore.entry(info.walkId)?.before else { return nil }
        if after > before { return L("Je voelt je beter dan voor het rondje. Fijn!") }
        if after == before { return L("Even buiten geweest. Dat telt ook.") }
        return L("Zware dag? Fijn dat je toch bent gegaan.")
    }

    // MARK: Step 2: points

    private var rows: [Progress.Recent] {
        guard let after else { return [] }
        return WalkDoneMath.pointRows(after.recent ?? [], since: info.startedAt)
    }

    private var pointsStep: some View {
        VStack(spacing: 18) {
            Text("Jouw punten")
                .font(.display(30))
                .accessibilityAddTraits(.isHeader)
            if !progressLoaded {
                ProgressView().tint(Palette.onWalk).padding(30)
            } else if model.offline || rows.isEmpty {
                VStack(spacing: 12) {
                    Guus(mood: .calm, size: 72, hop: false)
                    Text("Je punten tellen we zodra je weer verbinding hebt.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Palette.onWalk.opacity(0.9))
                }
                .padding(.vertical, 12)
            } else {
                VStack(spacing: 8) {
                    ForEach(Array(rows.enumerated()), id: \.offset) { i, row in
                        if i < revealed {
                            pointRow(row.label, points: row.points)
                                .transition(reduceMotion ? .opacity : .move(edge: .trailing).combined(with: .opacity))
                        }
                    }
                    if showTotal {
                        CountUp(value: rows.reduce(0) { $0 + $1.points }) { L("+\($0) punten") }
                            .font(.display(28).monospacedDigit())
                            .foregroundStyle(Palette.ball)
                            .padding(.top, 6)
                            .transition(.opacity)
                    }
                }
            }
            if let after, progressLoaded {
                levelRing(after)
            }
            if !skipFeedback {
                HStack {
                    Text("Vertel hoe het ging")
                    Spacer()
                    Text(verbatim: "+5").foregroundStyle(Palette.ball)
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Palette.onWalk.opacity(0.85))
                .padding(14)
                // A preview of the next step: shown as secondary with a dashed outline, not by fading
                // the text, so it keeps a contrast of at least 4.5:1.
                .background(Palette.surface.opacity(0.08), in: .rect(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(Palette.onWalk.opacity(0.35), style: StrokeStyle(lineWidth: 1.5, dash: [5, 4]))
                )
                .accessibilityElement(children: .combine)
            }
        }
        .task(id: progressLoaded) { await playPoints() }
    }

    private func pointRow(_ label: String, points: Int) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Palette.ball)
                .symbolEffect(.bounce, options: .nonRepeating, value: reduceMotion ? 0 : revealed)
            Text(label)
                .font(.body.weight(.semibold))
                .multilineTextAlignment(.leading)
            Spacer(minLength: 8)
            Text(verbatim: "+\(points)")
                .font(.body.weight(.bold).monospacedDigit())
                .foregroundStyle(Palette.ball)
        }
        .padding(14)
        .background(Palette.surface.opacity(0.12), in: .rect(cornerRadius: 16, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private func levelRing(_ after: Progress) -> some View {
        VStack(spacing: 10) {
            ZStack {
                Circle().stroke(Palette.onWalk.opacity(0.2), lineWidth: 10)
                Circle().trim(from: 0, to: max(0.02, ring))
                    .stroke(Palette.ball, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text(verbatim: "\(ringLevel ?? after.level.number)")
                    .font(.display(32, weight: .heavy))
                    .contentTransition(.numericText())
            }
            .frame(width: 90, height: 90)
            .scaleEffect(ringPop ? 1.12 : 1)
            .accessibilityHidden(true)
            if let newLevel {
                Text(L("Nieuw level: \(newLevel)!"))
                    .font(.headline)
                    .foregroundStyle(Palette.ball)
                    .transition(.scale.combined(with: .opacity))
            } else {
                Text(after.level.name).font(.headline)
            }
            Group {
                if let next = after.level.next, let nextName = after.level.nextName {
                    Text("Nog \(max(0, next - after.points)) punten tot \(nextName)")
                } else {
                    Text("Hoogste level. Wat een rondjes!")
                }
            }
            .font(.subheadline)
            .foregroundStyle(Palette.onWalk.opacity(0.85))
        }
        .padding(.top, 8)
        .accessibilityElement(children: .combine)
    }

    /// Rows one by one, then the total, then the ring from where you were to where you are.
    private func playPoints() async {
        guard progressLoaded, !pointsPlayed else { return }
        pointsPlayed = true
        guard let after else { return }
        let fromLevel = before?.level ?? after.level
        let fromPoints = before?.points ?? after.level.floor
        let leveledUp = before.map { $0.level.number != after.level.number } ?? false
        ringLevel = fromLevel.number
        ring = WalkDoneMath.levelFraction(points: fromPoints, level: fromLevel)
        let target = WalkDoneMath.levelFraction(points: after.points, level: after.level)
        let list = model.offline ? [] : rows

        if reduceMotion {
            // Nothing moves, but the moment is still felt, once.
            revealed = list.count
            showTotal = !list.isEmpty
            ringLevel = after.level.number
            ring = target
            if leveledUp {
                newLevel = after.level.name
                Haptics.pop()
            } else if !list.isEmpty {
                Haptics.tap()
            }
            return
        }
        for i in list.indices {
            try? await Task.sleep(for: .seconds(0.15))
            guard !Task.isCancelled else { return }
            withAnimation(Motion.pop) { revealed = i + 1 }
            Haptics.tap()
        }
        if !list.isEmpty {
            try? await Task.sleep(for: .seconds(0.15))
            withAnimation(Motion.klein) { showTotal = true }
        }
        try? await Task.sleep(for: .seconds(0.5))
        guard !Task.isCancelled else { return }
        if leveledUp {
            withAnimation(.easeInOut(duration: 0.8)) { ring = 1 }
            try? await Task.sleep(for: .seconds(0.85))
            Haptics.pop()
            withAnimation(Motion.pop) {
                ringPop = true
                ringLevel = after.level.number
                newLevel = after.level.name
            }
            try? await Task.sleep(for: .seconds(0.3))
            withAnimation(Motion.klein) { ringPop = false }
            ring = 0
            withAnimation(.easeInOut(duration: 0.8)) { ring = target }
        } else {
            withAnimation(.easeInOut(duration: 0.8)) { ring = target }
        }
    }

    // MARK: Step 3: feedback

    private var feedbackOptions: [(String, String, String)] {
        [("easy", L("Makkelijk"), "face.smiling"), ("pulled", L("Trok wat"), "arrow.right"),
         ("reactive", L("Reageerde op andere honden"), "exclamationmark"), ("aggressive", L("Agressief"), "exclamationmark.triangle")]
    }

    @ViewBuilder
    private var feedbackStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Hoe ging het met \(dogName)?")
                    .font(.display(28))
                    .accessibilityAddTraits(.isHeader)
                Text("Alleen \(Brand.name) ziet dit, nooit de eigenaar.")
                    .font(.subheadline)
                    .foregroundStyle(Palette.onWalk.opacity(0.85))
            }
            if let sent {
                feedbackDone(sent)
            } else {
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                    ForEach(feedbackOptions, id: \.0) { option in
                        let chosen = behaviour == option.0
                        Button {
                            behaviour = option.0
                        } label: {
                            VStack(spacing: 8) {
                                Image(systemName: option.2).font(.title2.weight(.semibold))
                                Text(option.1)
                                    .font(.subheadline.weight(.semibold))
                                    .multilineTextAlignment(.center)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .foregroundStyle(chosen ? Palette.onBall : Palette.onWalk)
                            .frame(maxWidth: .infinity, minHeight: 104)
                            .padding(.horizontal, 8)
                            .background(chosen ? Palette.ball : Palette.surface.opacity(0.12), in: .rect(cornerRadius: 18, style: .continuous))
                            .scaleEffect(chosen && !reduceMotion ? 1.03 : 1)
                            .contentShape(.rect(cornerRadius: 18))
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(chosen ? .isSelected : [])
                    }
                }
                .animation(Motion.or(Motion.klein, reduce: reduceMotion), value: behaviour)
                yesNo(L("De overdracht ging goed"), $handoverOk)
                yesNo(L("Ik voelde me veilig"), $feltSafe)
                if noteOpen {
                    TextField(L("Nog iets? (optioneel)"), text: $note, axis: .vertical)
                        .lineLimit(2...5)
                        .padding(12)
                        .foregroundStyle(Palette.ink)
                        .background(Palette.surface, in: .rect(cornerRadius: 14, style: .continuous))
                        .transition(.opacity)
                } else {
                    Button { withAnimation(Motion.klein) { noteOpen = true } } label: {
                        Label("Nog iets?", systemImage: "plus.bubble")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Palette.onWalk)
                            .frame(minHeight: 44)
                    }
                    .buttonStyle(.plain)
                }
                if let feedbackError {
                    Text(feedbackError).font(.footnote).foregroundStyle(Palette.ball)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func yesNo(_ title: String, _ value: Binding<Bool>) -> some View {
        HStack(spacing: 10) {
            Text(title).font(.body.weight(.semibold))
            Spacer(minLength: 8)
            HStack(spacing: 4) {
                pill(L("Ja"), on: value.wrappedValue) { value.wrappedValue = true }
                pill(L("Nee"), on: !value.wrappedValue) { value.wrappedValue = false }
            }
            .padding(3)
            .background(Palette.surface.opacity(0.12), in: .capsule)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(title)
    }

    private func pill(_ title: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            withAnimation(Motion.klein) { action() }
        } label: {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(on ? Palette.onBall : Palette.onWalk)
                .frame(minWidth: 52, minHeight: 40)
                .background(on ? Palette.ball : .clear, in: .capsule)
                .contentShape(.capsule)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }

    @ViewBuilder
    private func feedbackDone(_ outcome: FeedbackOutcome) -> some View {
        switch outcome {
        case .calm:
            Text("Dank je dat je het vertelt. Iemand van \(Brand.name) kijkt ernaar.")
                .font(.body.weight(.semibold))
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.surface.opacity(0.12), in: .rect(cornerRadius: 18, style: .continuous))
        case .thanks:
            VStack(spacing: 6) {
                Text(verbatim: "+5")
                    .font(.display(44, weight: .heavy))
                    .foregroundStyle(Palette.ball)
                    .transition(reduceMotion ? .opacity : .scale(scale: 0.3).combined(with: .opacity))
                Text("Dank je.").font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
        }
    }

    /// Exactly the walker body of FeedbackSheet.
    private func sendFeedback() async {
        guard !behaviour.isEmpty, !sending else { return }
        sending = true
        defer { sending = false }
        let body: [String: AnyEncodable] = [
            "dogBehaviour": AnyEncodable(behaviour), "handoverOk": AnyEncodable(handoverOk),
            "feltSafe": AnyEncodable(feltSafe), "note": AnyEncodable(note),
        ]
        do {
            let _: OK = try await APIClient.shared.post("/api/v1/walks/\(info.walkId)/feedback", body)
            let worrying = Keepsakes.worrying(behaviour: behaviour, feltSafe: feltSafe)
            if let dogId = appointment?.dog.id {
                Keepsakes.shared.recordWalkFeedback(dogId: dogId, behaviour: behaviour, feltSafe: feltSafe)
                // Calm feedback never lifts what was reported through SOS on this same walk.
                if reported { Keepsakes.shared.setNoRebook(dogId, true) }
            }
            if worrying {
                Haptics.tap()
            } else {
                Haptics.success()
            }
            withAnimation(Motion.or(Motion.pop, reduce: reduceMotion)) { sent = worrying ? .calm : .thanks }
            feedbackError = nil
            // So the 'Vertel het' step for this walk goes away.
            Task { await model.refreshAppointments() }
        } catch {
            Haptics.error()
            withAnimation(Motion.or(Motion.klein, reduce: reduceMotion)) { feedbackError = error.plainText }
        }
    }

    // MARK: Step 4: friendship and what comes next

    private var friend: DogFriend? {
        guard let id = appointment?.dog.id else { return nil }
        return friends?.first { $0.id == id }
    }

    /// The walker reported an aggressive dog or did not feel safe, now, earlier or through SOS during
    /// this walk: no celebration of
    /// the friendship and no offer to walk this dog again, just a calm close.
    private var worrying: Bool {
        if sent == .calm || reported { return true }
        guard let id = appointment?.dog.id else { return false }
        return Keepsakes.shared.noRebook(id)
    }

    @ViewBuilder
    private var friendshipStep: some View {
        if worrying {
            VStack(spacing: 18) {
                Text("Tot slot")
                    .font(.display(30))
                    .accessibilityAddTraits(.isHeader)
                nextCard {
                    Text("Je melding is binnen. Iemand van \(Brand.name) neemt contact op als dat nodig is.")
                        .font(.body.weight(.semibold))
                }
                CoachBubble(mood: .calm, text: L("Rust lekker uit. Je hebt het goed gedaan."), guusSize: 56)
                    .foregroundStyle(Palette.ink)
            }
        } else {
            VStack(spacing: 18) {
                Text("Jullie vriendschap")
                    .font(.display(30))
                    .accessibilityAddTraits(.isHeader)
                if let friend { friendCard(friend) }
                nextStep
                CoachBubble(mood: .happy, text: L("Dank je wel namens \(dogName)."), guusSize: 56)
                    .foregroundStyle(Palette.ink)
            }
        }
    }

    private func friendCard(_ friend: DogFriend) -> some View {
        let bond = WalkDoneMath.bondStep(walks: friend.walks)
        let tierUp = WalkDoneMath.tierUp(walks: friend.walks)
        return ZStack {
            friendFront(friend, bond: bond)
                .opacity(flipped ? 0 : 1)
            friendBack(friend, bond: bond)
                .rotation3DEffect(.degrees(reduceMotion ? 0 : 180), axis: (x: 0, y: 1, z: 0))
                .opacity(flipped ? 1 : 0)
        }
        .padding(18)
        .frame(maxWidth: .infinity)
        .background(Palette.surface.opacity(0.12), in: .rect(cornerRadius: 24, style: .continuous))
        .rotation3DEffect(.degrees(flipped && !reduceMotion ? 180 : 0), axis: (x: 0, y: 1, z: 0))
        .task {
            guard tierUp, !flipped else { return }
            try? await Task.sleep(for: .seconds(0.7))
            guard !Task.isCancelled else { return }
            Haptics.pop()
            withAnimation(reduceMotion ? .easeInOut(duration: 0.3) : .easeInOut(duration: 0.6)) { flipped = true }
        }
        .accessibilityElement(children: .combine)
    }

    private func friendFront(_ friend: DogFriend, bond: (name: String, symbol: String, nextName: String?, toGo: Int)) -> some View {
        VStack(spacing: 10) {
            DogPortrait(look: friend.look, photoURL: friend.photos.first.flatMap(URL.init(string:)), mood: .happy, cornerRadius: 32)
                .frame(width: 120, height: 120)
            if friend.walks == 1 {
                Text(L("Nieuw in je vriendenboek: \(friend.name)"))
                    .font(.headline)
                    .multilineTextAlignment(.center)
            }
            Text(L("\(friend.walks)× samen")).font(.display(22))
            Label(bond.name, systemImage: bond.symbol)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Palette.ball)
            if let nextName = bond.nextName {
                Text(bond.toGo == 1 ? L("Nog 1 rondje tot \(nextName)") : L("Nog \(bond.toGo) rondjes tot \(nextName)"))
                    .font(.subheadline)
                    .foregroundStyle(Palette.onWalk.opacity(0.85))
            }
        }
    }

    private func friendBack(_ friend: DogFriend, bond: (name: String, symbol: String, nextName: String?, toGo: Int)) -> some View {
        VStack(spacing: 12) {
            Image(systemName: bond.symbol)
                .font(.system(size: 44, weight: .semibold))
                .foregroundStyle(Palette.onBall)
                .frame(width: 92, height: 92)
                .background(Palette.ball, in: .circle)
            Text(L("Jullie zijn nu \(bond.name)!"))
                .font(.display(24))
                .multilineTextAlignment(.center)
            Text(L("\(friend.walks)× samen"))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Palette.onWalk.opacity(0.85))
        }
    }

    /// What comes next with this dog. Only what the server allows; never a solo offer it has not allowed.
    @ViewBuilder
    private var nextStep: some View {
        if let appointment {
            if appointment.isMeeting {
                nextCard {
                    Text("Mooi kennisgemaakt.").font(.headline)
                    Text("Voelde het goed? Dan kan de eigenaar je vertrouwen geven voor zelfstandige rondjes. Je hoort het vanzelf.")
                        .font(.subheadline)
                        .foregroundStyle(Palette.muted)
                    if !quizPassed {
                        Button("Doe alvast de Hondenschool") {
                            model.perform(.lessons)
                            dismiss()
                        }
                        .buttonStyle(.secondary)
                    }
                }
            } else if appointment.weekly {
                let day = weekday(appointment.startsAt.addingTimeInterval(7 * 86_400))
                nextCard {
                    // Only promise the reminder when it can really come: notifications allowed and the walk accepted.
                    Label(remindersAllowed && appointment.status == "accepted"
                          ? L("Tot \(day)! Je krijgt een seintje een half uur van tevoren.")
                          : L("Tot \(day)!"),
                          systemImage: "calendar")
                        .font(.body.weight(.semibold))
                }
            } else if requested {
                nextCard {
                    Label("Aangevraagd. De eigenaar beslist.", systemImage: "paperplane.fill")
                        .font(.body.weight(.semibold))
                }
            } else if let detail, !offerHidden, !Keepsakes.shared.isSnoozed("rebook." + detail.dog.id),
                      !Keepsakes.shared.noRebook(detail.dog.id) {
                rebookOffer(appointment, detail: detail)
            }
        }
    }

    @ViewBuilder
    private func rebookOffer(_ appointment: Appointment, detail: DogDetail) -> some View {
        let date = RequestSuggestions.rebookDate(from: appointment.startsAt, now: .now, calendar: .current)
        if detail.canRequest.solo == nil {
            nextCard {
                Text("Zin om dit vaker te doen? Vaste momenten werken het best.").font(.headline)
                Button(L("Ja, elke \(weekday(date)) om \(Self.clock.string(from: date))")) {
                    offer = Offer(kind: .solo, prefill: RequestPrefill(
                        date: date, weekly: true, message: RequestSuggestions.rebookMessage(date: date, calendar: .current)))
                }
                .buttonStyle(.primary)
                Button("Ander moment") { offer = Offer(kind: .solo, prefill: nil) }
                    .buttonStyle(.secondary)
                notNow(detail.dog.id)
            }
        } else if detail.canRequest.meet == nil {
            nextCard {
                Text("Weer samen met de eigenaar?").font(.headline)
                Button(L("Plan een kennismaking")) {
                    offer = Offer(kind: .meet, prefill: RequestPrefill(date: date, weekly: false, message: nil))
                }
                .buttonStyle(.primary)
                notNow(detail.dog.id)
            }
        }
    }

    private func notNow(_ dogId: String) -> some View {
        Button {
            Keepsakes.shared.snooze("rebook." + dogId, until: .now.addingTimeInterval(14 * 86_400))
            withAnimation(Motion.weg) { offerHidden = true }
        } label: {
            Text("Nu niet")
                .font(.body.weight(.semibold))
                .foregroundStyle(Palette.ink)
                .frame(maxWidth: .infinity, minHeight: 44)
                .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }

    private func nextCard<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) { content() }
            .foregroundStyle(Palette.ink)
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
            .transition(.opacity)
    }

    private func weekday(_ date: Date) -> String {
        date.formatted(.dateTime.weekday(.wide).locale(Format.locale)).lowercased()
    }

    private static let clock: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "HH:mm"
        return f
    }()

    // MARK: Loading

    private func start() async {
        guard !started else { return }
        started = true
        before = ProgressStore.shared.progress
        // No haptic here: ActiveWalkView already gave the one for the end of the walk (with "finish").
        appointment = lookup()
        markReportedDog()
        if appointment?.feedbackGiven == true { skipFeedback = true }
        Task { await loadReminderPermission() }
        Task { await loadProgress() }
        Task { await loadFriends() }
        Task { await loadDetail() }
    }

    /// A report sent through SOS during this walk also stops Guus from suggesting this dog again.
    private func markReportedDog() {
        guard reported, let dogId = appointment?.dog.id else { return }
        Keepsakes.shared.setNoRebook(dogId, true)
    }

    private func loadReminderPermission() async {
        let status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        remindersAllowed = status == .authorized || status == .provisional
    }

    private func lookup() -> Appointment? {
        model.appointments.outgoing.first { $0.walkId == info.walkId }
    }

    private func loadProgress() async {
        await ProgressStore.shared.load()
        after = ProgressStore.shared.progress
        progressLoaded = true
    }

    private func loadFriends() async {
        if let response: DogFriendsResponse = try? await APIClient.shared.get("/api/v1/me/dogs") {
            withAnimation(Motion.scherm) { friends = response.dogs }
        }
    }

    private func loadDetail() async {
        if appointment == nil {
            await model.refreshAppointments()
            appointment = lookup()
            markReportedDog()
            // Only change the steps while the walker has not reached the feedback step yet.
            if appointment?.feedbackGiven == true, let at = steps.firstIndex(of: .feedback), index < at { skipFeedback = true }
        }
        guard let appointment, !appointment.isMeeting, !appointment.weekly else { return }
        if let loaded: DogDetail = try? await APIClient.shared.get("/api/v1/dogs/\(appointment.dog.id)") {
            withAnimation(Motion.scherm) { detail = loaded }
        }
    }
}

/// A number that counts up from 0 over 0.8 s. With Reduce Motion it shows the final value at once.
private struct CountUp: View {
    let value: Int
    var format: (Int) -> String = { "\($0)" }
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = 0

    var body: some View {
        Text(verbatim: format(shown))
            .contentTransition(.numericText(value: Double(shown)))
            .accessibilityLabel(format(value))
            .task(id: value) {
                guard !reduceMotion, value > 0 else {
                    shown = value
                    return
                }
                let steps = 16
                for i in 1...steps {
                    try? await Task.sleep(for: .milliseconds(50))
                    guard !Task.isCancelled else { return }
                    withAnimation(Motion.klein) { shown = value * i / steps }
                }
            }
    }
}
