import SwiftUI

/// The safety quiz as a calm game, one question at a time: pick an answer, check it, and Guus explains
/// why. A question that was not right yet comes back at the end. No timer, no lives, no points on screen.
/// Every check goes to the server (POST /api/v1/quiz with the answers so far): the right answers never
/// live in the app, and the server marks the quiz as passed once all of them are right.
struct QuizGameView: View {
    /// Where the quiz is played: from Jij or the Hondenschool, right after making an account, or in front
    /// of a request (the "Eerst de quiz" gate).
    enum Mode { case normal, onboarding, gate }

    var mode: Mode = .normal
    /// Pushed from the Hondenschool path: "Eerst de Hondenschool?" goes back instead of pushing another path.
    var fromLessons = false
    /// Called after the quiz was passed and the person tapped the button on the done screen.
    var onDone: (() -> Void)? = nil

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize

    private enum Stage { case intro, questions, passed }

    /// What the last check said about the current question.
    private struct Feedback: Equatable { var right: Bool }

    @State private var quiz: Quiz?
    @State private var loadError: String?
    @State private var stage: Stage = .intro
    /// The questions still to go, in order; a question that was not right yet is added to the end again.
    @State private var queue: [String] = []
    @State private var position = 0
    /// The answers the server confirmed as right.
    @State private var right: [String: Int] = [:]
    @State private var chosen: Int?
    @State private var feedback: Feedback?
    @State private var checking = false
    @State private var passedOnServer = false
    @State private var error: String?
    @State private var showLessons = false

    var body: some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .screenBackground()
            .navigationTitle(mode == .onboarding ? "" : (quiz?.title ?? L("Veiligheidsquiz")))
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden(mode == .onboarding)
            .toolbar {
                if mode == .gate && stage != .passed {
                    ToolbarItem(placement: .cancellationAction) { Button("Sluit", systemImage: "xmark") { dismiss() } }
                }
            }
            .navigationDestination(isPresented: $showLessons) { LessonsView(fromQuiz: true) }
            .task { await load() }
    }

    @ViewBuilder
    private var content: some View {
        if stage == .passed {
            passedView(fresh: true)
        } else if quiz?.passed == true || model.me?.profile?.quizPassed == true {
            passedView(fresh: false)
        } else if let quiz {
            switch stage {
            case .intro: intro(quiz)
            case .questions: questions(quiz)
            case .passed: EmptyView()
            }
        } else if let loadError {
            VStack(spacing: 16) {
                ErrorText(message: loadError)
                Button("Probeer opnieuw") { Task { await load() } }
                    .buttonStyle(.secondary)
            }
            .padding(20)
        } else {
            ProgressView()
        }
    }

    // MARK: Intro

    private func intro(_ quiz: Quiz) -> some View {
        let lessonsDone = Lessons.allDone()
        return VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 16) {
                    if Keepsakes.shared.coachOn { Guus(mood: .happy, size: typeSize.isAccessibilitySize ? 72 : 100) }
                    Text(mode == .onboarding ? L("Nog één ding: de veiligheidsquiz") : quiz.title)
                        .font(.display(28))
                        .multilineTextAlignment(.center)
                        .accessibilityAddTraits(.isHeader)
                    Text("Acht korte vragen over veilig wandelen, ongeveer 3 minuten. Na elke vraag leg ik uit waarom. Geen tijdsdruk.")
                        .font(.title3)
                        .foregroundStyle(Palette.muted)
                        .multilineTextAlignment(.center)
                    if mode != .normal {
                        Text("Daarna kun je een kennismaking aanvragen.")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Palette.grass)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(24)
                .padding(.top, 20)
                .frame(maxWidth: .infinity)
            }
            .scrollBounceBehavior(.basedOnSize)
            VStack(spacing: 10) {
                Button("Begin") {
                    Haptics.tap()
                    withAnimation(Motion.or(Motion.scherm, reduce: reduceMotion)) { stage = .questions }
                }
                .buttonStyle(.primary)
                // The lessons are an extra, never in the way: not offered while making an account.
                if mode == .normal && !lessonsDone {
                    Button("Eerst de Hondenschool?") {
                        if fromLessons { dismiss() } else { showLessons = true }
                    }
                    .buttonStyle(.secondary)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
        }
    }

    // MARK: Questions

    private func question(_ quiz: Quiz) -> Quiz.Question? {
        guard position < queue.count else { return nil }
        return quiz.questions.first { $0.id == queue[position] }
    }

    @ViewBuilder
    private func questions(_ quiz: Quiz) -> some View {
        if let q = question(quiz) {
            VStack(spacing: 0) {
                paws(quiz, current: q.id)
                    .padding(.horizontal, 24)
                    .padding(.top, 12)
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        if right[q.id] == nil && queue.prefix(position).contains(q.id) {
                            Label("Deze kwam net al langs. Nog een keer?", systemImage: "arrow.uturn.backward")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(Palette.warn)
                        }
                        Text(q.question)
                            .font(.display(24))
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityAddTraits(.isHeader)
                        VStack(spacing: 12) {
                            ForEach(Array(q.options.enumerated()), id: \.offset) { i, option in
                                optionTile(option, index: i)
                            }
                        }
                        .padding(.top, 4)
                        // Locked after checking, without greying out: the chosen answer stays easy to read.
                        .allowsHitTesting(feedback == nil && !checking)
                        ErrorText(message: error)
                    }
                    .padding(24)
                    .id("\(q.id).\(position)")
                    .transition(reduceMotion ? .opacity : .push(from: .trailing))
                }
                bottom(q)
            }
        }
    }

    /// Check, or (after checking) Guus's explanation and "Verder".
    @ViewBuilder
    private func bottom(_ q: Quiz.Question) -> some View {
        if let feedback {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    if Keepsakes.shared.coachOn {
                        Guus(mood: feedback.right ? .proud : .calm, size: 48, hop: false)
                            .accessibilityHidden(true)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text(feedback.right ? L("Goed zo!") : L("Net niet."))
                            .font(.headline)
                            .foregroundStyle(feedback.right ? Palette.grass : Palette.warn)
                        if let why = QuizExplanation.text(for: q.id) {
                            Text(why).font(.subheadline).foregroundStyle(Palette.ink)
                        }
                        if !feedback.right {
                            Text("Deze vraag komt zo nog een keer terug.")
                                .font(.footnote)
                                .foregroundStyle(Palette.muted)
                        }
                    }
                    .fixedSize(horizontal: false, vertical: true)
                }
                Button("Verder") { next() }
                    .buttonStyle(.primary)
            }
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(feedback.right ? Palette.grassSoft : Palette.warnSoft)
            .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
            .accessibilityElement(children: .contain)
        } else {
            Button {
                Task { await check(q) }
            } label: {
                if checking { ProgressView().tint(Palette.onGrass) } else { Text("Controleer") }
            }
            .buttonStyle(.primary)
            .disabled(chosen == nil || checking)
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
        }
    }

    /// One paw per question: green when it was right, the current one a little bigger. Never red.
    private func paws(_ quiz: Quiz, current: String) -> some View {
        let done = quiz.questions.filter { right[$0.id] != nil }.count
        return HStack(spacing: 6) {
            ForEach(quiz.questions) { q in
                Image(systemName: "pawprint.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(right[q.id] != nil ? Palette.grass : Palette.line)
                    .scaleEffect(q.id == current && !reduceMotion ? 1.25 : 1)
                    .frame(maxWidth: .infinity)
            }
        }
        .animation(Motion.or(Motion.klein, reduce: reduceMotion), value: right)
        .animation(Motion.or(Motion.klein, reduce: reduceMotion), value: current)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L("\(done) van \(quiz.questions.count) goed"))
    }

    private func optionTile(_ text: String, index: Int) -> some View {
        let isChosen = chosen == index
        let tint: Color = feedback.map { isChosen ? ($0.right ? Palette.grass : Palette.warn) : Palette.line } ?? (isChosen ? Palette.grass : Palette.line)
        return Button {
            Haptics.tap()
            withAnimation(Motion.or(Motion.klein, reduce: reduceMotion)) { chosen = index }
        } label: {
            HStack(spacing: 12) {
                Text(text)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(Palette.ink)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: isChosen ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(tint)
                    .contentTransition(.symbolEffect(.replace))
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, minHeight: 64)
            .background(isChosen ? (feedback?.right == false ? Palette.warnSoft : Palette.grassSoft) : Palette.surface,
                        in: .rect(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(isChosen ? tint : Palette.line.opacity(0.7), lineWidth: isChosen ? 2 : 1))
            .contentShape(.rect(cornerRadius: 20, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isChosen ? .isSelected : [])
    }

    // MARK: Actions

    /// Sends the answers that were right so far plus this one; the server says whether this one is right
    /// and whether the whole quiz is now passed.
    private func check(_ q: Quiz.Question) async {
        guard let pick = chosen, !checking else { return }
        checking = true
        defer { checking = false }
        error = nil
        var answers = right
        answers[q.id] = pick
        do {
            let result: QuizResult = try await APIClient.shared.post("/api/v1/quiz", ["answers": answers])
            let ok = !result.wrong.contains(q.id)
            if ok { right[q.id] = pick } else { queue.append(q.id) }
            passedOnServer = result.passed
            if ok { Haptics.tap(.select) } else { Haptics.soft() }
            withAnimation(Motion.or(Motion.scherm, reduce: reduceMotion)) { feedback = Feedback(right: ok) }
            AccessibilityNotification.Announcement(ok ? L("Goed zo!") : L("Net niet.")).post()
        } catch {
            Haptics.error()
            self.error = error.plainText
        }
    }

    private func next() {
        Haptics.tap()
        if passedOnServer {
            finish()
            return
        }
        withAnimation(Motion.or(Motion.scherm, reduce: reduceMotion)) {
            feedback = nil
            chosen = nil
            position += 1
        }
        // Should never happen (the last right answer passes the quiz), but never leave an empty screen.
        if position >= queue.count, let quiz { start(quiz) }
    }

    private func finish() {
        withAnimation(Motion.or(Motion.pop, reduce: reduceMotion)) { stage = .passed }
        model.celebrate(.big(title: L("Gehaald!"), text: Self.passedText), once: "quiz")
        Task {
            await model.refreshMe()
            await ProgressStore.shared.load()
        }
    }

    private static var passedText: String {
        L("Je kunt nu een kennismaking aanvragen. Zelfstandige rondjes komen later, als een eigenaar je vertrouwt.")
    }

    private func start(_ quiz: Quiz) {
        queue = quiz.questions.map(\.id).filter { right[$0] == nil }
        position = 0
    }

    // MARK: Passed

    private func passedView(fresh: Bool) -> some View {
        VStack(spacing: 16) {
            // Centered while it fits, scrolling at large text sizes; the button stays pinned below.
            ScrollView {
                VStack(spacing: 16) {
                    if Keepsakes.shared.coachOn {
                        Guus(mood: .proud, size: typeSize.isAccessibilitySize ? 72 : 120)
                    } else {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 64))
                            .foregroundStyle(Palette.grass)
                            .accessibilityHidden(true)
                    }
                    Text("Gehaald!")
                        .font(.display(32))
                        .accessibilityAddTraits(.isHeader)
                    Text(Self.passedText)
                        .font(.title3)
                        .foregroundStyle(Palette.muted)
                        .multilineTextAlignment(.center)
                }
                .padding(.vertical, 16)
                .frame(maxWidth: .infinity)
            }
            .scrollBounceBehavior(.basedOnSize)
            .defaultScrollAnchor(.center, for: .alignment)
            if fresh || mode != .normal {
                Button(mode == .onboarding ? L("Laat me de honden zien") : L("Klaar")) {
                    if let onDone { onDone() } else { dismiss() }
                }
                .buttonStyle(.primary)
            }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 12)
    }

    private func load() async {
        guard quiz == nil else { return }
        loadError = nil
        do {
            let loaded: Quiz = try await APIClient.shared.get("/api/v1/quiz")
            quiz = loaded
            start(loaded)
        } catch {
            loadError = error.plainText
        }
    }
}

/// Why each answer is right, said by Guus after every check. Keyed by the server's question ids
/// (web/src/lib/quiz.ts); a question the app does not know yet simply has no explanation.
enum QuizExplanation {
    static func text(for id: String) -> String? {
        switch id {
        case "heat": L("Bij warmte loop je kort, in de schaduw en met water. Voel met je hand of de stoep niet te heet is voor zijn pootjes.")
        case "leash": L("De hond blijft aan de lijn, tenzij de eigenaar uitdrukkelijk zegt dat hij los mag, en alleen waar het mag.")
        case "treats": L("Geef alleen een koekje als het profiel van de hond zegt dat het mag. Sommige honden mogen niets extra's.")
        case "otherDogs": L("Houd afstand en vraag de andere eigenaar eerst. Twijfel je, loop dan rustig door.")
        case "escaped": L("Blijf rustig en ren niet achter de hond aan. Bel meteen de eigenaar: samen vind je hem sneller.")
        case "bite": L("Zorg eerst dat iedereen veilig is. Wissel gegevens uit, bel de eigenaar en meld het in de app.")
        case "stress": L("Veel gapen, lippen likken en wegtrekken betekent: ik voel me niet op mijn gemak. Zoek een rustigere plek.")
        case "overdue": L("Laat het de eigenaar meteen weten als je later terug bent. Een kort berichtje geeft rust.")
        default: nil
        }
    }
}

/// Right after making an account, a walker does the quiz before the app opens. Owners and shelter
/// staff never see this (see AppModel.needsOnboardingQuiz).
struct OnboardingQuizView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        NavigationStack {
            QuizGameView(mode: .onboarding) {
                Keepsakes.shared.unmark("onboarding.quiz")
            }
        }
    }
}

/// In front of a request or a group walk: one friendly button to the quiz instead of the form.
struct QuizGate: View {
    var open: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            Text("Voordat je een hond aanvraagt, doe je één keer de veiligheidsquiz.")
                .font(.footnote)
                .foregroundStyle(Palette.muted)
                .multilineTextAlignment(.center)
            Button(action: open) {
                Label("Eerst de quiz (± 3 min)", systemImage: "checkmark.seal.fill")
            }
            .buttonStyle(.primary)
        }
    }
}

#Preview {
    NavigationStack { QuizGameView() }
        .environment(AppModel())
}
