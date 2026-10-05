import SwiftUI

/// Always exactly one next thing to do, on top of Ontdek and Thuis: Guus says it, one big button goes there.
/// "Later" puts a step away until tomorrow morning; when nothing is left, Guus says so calmly.
struct NextStepCard: View {
    var placement: NextStepPlacement
    var nearbyDogs: [DogCard] = []
    /// False while the dogs nearby are still loading.
    var nearbyLoaded = true
    /// True when loading the dogs nearby failed.
    var nearbyFailed = false
    /// The owner's number of dogs; nil while loading.
    var myDogsCount: Int? = nil
    /// Opens the screen's own "add a dog" sheet, so the screen can reload its dogs afterwards.
    var addDog: (() -> Void)? = nil
    /// One quiet line instead of the big card: on Ontdek the dogs come first.
    var compact = false

    @Environment(AppModel.self) private var model
    @Environment(WalkTracker.self) private var walk
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var now = Date.now
    @State private var busy = false
    @State private var breathing: Appointment?
    /// The server waits for the yes to the updated terms; after it, the walk starts.
    @State private var terms: TermsRequest?
    /// Offer the breathing minute before a walk; switched off with "Niet meer tonen".
    @AppStorage("offerBreathing") private var offerBreathing = true

    var body: some View {
        let step = current
        Group {
            if compact {
                if Self.showsLine(step) { line(step) }
            } else {
                card(step)
            }
        }
        .onAppear { now = .now }
        .onDisappear { Keepsakes.shared.unmark("welcomeBack") }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(60))
                now = .now
            }
        }
        .onChange(of: model.appointments.outgoing) { now = .now }
        .onChange(of: model.appointments.incoming) { now = .now }
        .fullScreenCover(item: $breathing) { item in
            BreathingView(stopOffering: { offerBreathing = false; breathing = nil; Task { await start(item) } }) {
                breathing = nil
                Task { await start(item) }
            }
        }
        .termsSheet($terms)
    }

    private func card(_ step: NextStep) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            if Keepsakes.shared.has("welcomeBack") {
                Label("Fijn je weer te zien! Alles staat er nog precies zo.", systemImage: "hand.wave.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.grass)
                    .transition(.opacity)
            }
            ZStack {
                bubble(step)
                    .id(step.id)
                    .transition(reduceMotion ? AnyTransition.opacity : AnyTransition.push(from: .trailing))
            }
            .clipped()
            .animation(Motion.or(Motion.scherm, reduce: reduceMotion), value: step.id)
        }
    }

    /// The compact line only says something worth a tap or worth knowing: "done" and "night" stay away,
    /// and so do Guus's picks, because the dogs are right under the line.
    static func showsLine(_ step: NextStep) -> Bool {
        step.id != "picks" && (step.action != nil || step.id == "waiting")
    }

    /// Guus, the step in one or two lines, and the whole row is the button. "Later" is the small cross.
    private func line(_ step: NextStep) -> some View {
        HStack(spacing: 12) {
            Button {
                if let action = step.action { go(action) }
            } label: {
                HStack(spacing: 12) {
                    if Keepsakes.shared.coachOn {
                        Guus(mood: step.mood, size: 40, hop: false)
                            .accessibilityHidden(true)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.text)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Palette.ink)
                            .lineLimit(3)
                        if let button = step.button {
                            Text(button)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(Palette.grass)
                        }
                    }
                    .multilineTextAlignment(.leading)
                    Spacer(minLength: 0)
                }
                .frame(minHeight: 44)
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .disabled(step.action == nil)
            if step.snoozable {
                Button { later(step) } label: {
                    Image(systemName: "xmark")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(Palette.muted)
                        .frame(width: 44, height: 44)
                        .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(L("Later"))
            }
        }
        .padding(.leading, 12)
        .padding(.vertical, 8)
        .padding(.trailing, step.snoozable ? 0 : 12)
        .background(Palette.surface, in: .rect(cornerRadius: 20, style: .continuous))
        .id(step.id)
        .transition(.opacity)
        .animation(Motion.or(Motion.klein, reduce: reduceMotion), value: step.id)
    }

    // MARK: Step

    /// Guus has not introduced himself yet: then he is the only one talking on the screen.
    @MainActor static var introPending: Bool { Keepsakes.shared.coachOn && !Keepsakes.shared.has("met.guus") }

    private var current: NextStep {
        // The compact line has no room for an introduction; Guus says hello on the big card (Thuis).
        if Self.introPending && !compact {
            let name = model.firstName
            return NextStep(
                id: "intro", mood: .happy,
                text: name.isEmpty
                    ? L("Hoi! Ik ben Guus. Ik laat je steeds zien wat de volgende stap is.")
                    : L("Hoi \(name)! Ik ben Guus. Ik laat je steeds zien wat de volgende stap is."),
                button: L("Laat maar zien"), snoozable: false
            )
        }
        return NextStep.compute(context)
    }

    private var context: NextStepContext {
        let keepsakes = Keepsakes.shared
        let week = ProgressStore.shared.progress?.week
        let role: NextStepRole = switch model.role {
        case .walker: .walker
        case .owner: .owner
        case .both: .both
        }
        let profile = model.me?.profile
        return NextStepContext(
            now: now,
            calendar: .current,
            placement: placement,
            role: role,
            firstName: model.firstName,
            country: profile?.country ?? "NL",
            quizPassed: profile?.quizPassed == true || model.me?.trust?.quizPassed == true,
            walksDone: model.me?.trust?.walks ?? 0,
            outgoing: model.appointments.outgoing,
            incoming: model.appointments.incoming,
            myDogsCount: myDogsCount,
            weekGoal: week?.goal,
            weekWalks: week?.walks ?? 0,
            nearbyDogs: nearbyDogs,
            nearbyLoaded: nearbyLoaded,
            nearbyFailed: nearbyFailed,
            noRebook: keepsakes.noRebookDogs,
            snoozed: keepsakes.activeSnoozes(now: now),
            prepDone: Set(keepsakes.keys(withPrefix: "prepDone.").map { String($0.dropFirst("prepDone.".count)) }),
            liveLocation: ServerFeatures.shared.liveLocation
        )
    }

    // MARK: Views

    private func bubble(_ step: NextStep) -> some View {
        CoachBubble(
            mood: step.mood,
            text: step.text,
            detail: step.detail,
            primary: primary(step),
            secondary: step.snoozable ? CoachButton(L("Later")) { later(step) } : nil
        ) {
            if !step.picks.isEmpty { picks(step.picks) }
        }
    }

    private func primary(_ step: NextStep) -> CoachButton? {
        if step.id == "intro" {
            return CoachButton(step.button ?? L("Laat maar zien")) {
                Haptics.tap()
                Keepsakes.shared.mark("met.guus")
            }
        }
        guard let title = step.button, let action = step.action else { return nil }
        return CoachButton(title) { go(action) }
    }

    private func picks(_ dogs: [DogCard]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 12) {
                ForEach(dogs) { dog in
                    Button {
                        Haptics.tap()
                        model.perform(.dog(dog.id))
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            DogPortrait(look: dog.look, photoURL: dog.photos.first.flatMap(URL.init(string:)), cornerRadius: 18)
                                .frame(width: 72, height: 72)
                            Text(dog.name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Palette.ink)
                                .lineLimit(1)
                            Text(Labels.energy(dog.energy) + " · " + L("\(dog.walkMinutes) min"))
                                .font(.caption)
                                .foregroundStyle(Palette.muted)
                                .lineLimit(1)
                        }
                        .frame(width: 92, alignment: .leading)
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(L("\(dog.name), \(Labels.energy(dog.energy)), \(dog.walkMinutes) minuten"))
                }
            }
        }
    }

    // MARK: Actions

    private func later(_ step: NextStep) {
        Haptics.tap()
        let snooze = NextStep.snooze(for: step, now: .now)
        Keepsakes.shared.snooze(snooze.key, until: snooze.until)
        now = .now
    }

    private func go(_ action: CoachAction) {
        switch action {
        case .startWalk(let id):
            guard !busy, !walk.isActive, let item = model.appointments.outgoing.first(where: { $0.id == id }) else { return }
            if item.walkStatus != "active" && offerBreathing {
                breathing = item
            } else {
                Task { await start(item) }
            }
        case .addDog where addDog != nil:
            addDog?()
        default:
            model.perform(action)
        }
    }

    private func start(_ item: Appointment) async {
        busy = true
        defer { busy = false }
        do {
            try await WalkStarter.start(item, model: model, walk: walk)
            Haptics.success()
        } catch let error as APIError where error.needsTerms {
            terms = TermsRequest(model: model) { await start(item) }
        } catch let error as APIError where error.liveLocationOff {
            // Live location went off in the meantime: this walk alone waits. Calmly, not as an error.
            await model.liveLocationPaused()
        } catch {
            Haptics.error()
            model.show(error.plainText, symbol: "exclamationmark.circle.fill", tint: Palette.danger)
        }
    }
}
