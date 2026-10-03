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

    @Environment(AppModel.self) private var model
    @Environment(WalkTracker.self) private var walk
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var now = Date.now
    @State private var busy = false
    @State private var breathing: Appointment?
    /// Offer the breathing minute before a walk; switched off with "Niet meer tonen".
    @AppStorage("offerBreathing") private var offerBreathing = true

    var body: some View {
        let step = current
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
            .animation(reduceMotion ? .easeInOut : .snappy, value: step.id)
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
    }

    // MARK: Step

    private var current: NextStep {
        let keepsakes = Keepsakes.shared
        if keepsakes.coachOn && !keepsakes.has("met.guus") {
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
            lessonsDone: keepsakes.lessonsDone.count,
            nearbyDogs: nearbyDogs,
            nearbyLoaded: nearbyLoaded,
            nearbyFailed: nearbyFailed,
            noRebook: keepsakes.noRebookDogs,
            snoozed: keepsakes.activeSnoozes(now: now),
            prepDone: Set(keepsakes.keys(withPrefix: "prepDone.").map { String($0.dropFirst("prepDone.".count)) })
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
        Keepsakes.shared.snooze("next." + step.id, until: Keepsakes.nextMorning(after: .now))
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
        } catch {
            Haptics.error()
            model.show(error.localizedDescription, symbol: "exclamationmark.circle.fill", tint: Palette.danger)
        }
    }
}
