import SwiftUI

/// The safety quiz as a calm game: Guus asks, eight paws fill up, and a not-yet is just another look.
/// Same server calls as before (GET and POST /api/v1/quiz); the answers are still checked on the server,
/// and passing stays the gate for solo walks. No timer, no lives, unlimited tries.
struct QuizGameView: View {
    /// Pushed from the Hondenschool path: "Eerst de Hondenschool?" goes back instead of pushing another path.
    var fromLessons = false

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    private enum Stage { case intro, questions, checking, passed }

    @State private var quiz: Quiz?
    @State private var loadError: String?
    @State private var stage: Stage = .intro
    @State private var index = 0
    @State private var answers: [String: Int] = [:]
    /// The answers of the last check, so a wrong one stays marked until it is changed.
    @State private var submitted: [String: Int] = [:]
    @State private var wrong: Set<String> = []
    /// Guus says "Bijna!" on the first question to look at again, until someone moves on.
    @State private var almost = false
    @State private var error: String?
    @State private var showLessons = false

    /// What passing earns on the server (POINTS.quiz).
    static let points = 15

    var body: some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .screenBackground()
            .navigationTitle(quiz?.title ?? L("Veiligheidsquiz"))
            .navigationBarTitleDisplayMode(.inline)
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
            case .checking: checking
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
                    if Keepsakes.shared.coachOn { Guus(mood: .happy, size: 100) }
                    Text(quiz.title)
                        .font(.display(28))
                        .multilineTextAlignment(.center)
                    Text("Acht vragen, ongeveer 3 minuten. Geen tijdsdruk.")
                        .font(.title3)
                        .foregroundStyle(Palette.muted)
                        .multilineTextAlignment(.center)
                    if lessonsDone {
                        Label("Je deed alle vijf de lessen. Je weet het al.", systemImage: "graduationcap.fill")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Palette.grass)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(Palette.grassSoft, in: .rect(cornerRadius: 16, style: .continuous))
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
                    withAnimation(.snappy) { stage = .questions }
                }
                .buttonStyle(.primary)
                if !lessonsDone {
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

    /// A wrong answer from the last check that was not changed yet.
    private func needsLook(_ id: String) -> Bool {
        wrong.contains(id) && answers[id] == submitted[id]
    }

    private func questions(_ quiz: Quiz) -> some View {
        let count = quiz.questions.count
        let q = quiz.questions[min(index, count - 1)]
        return VStack(spacing: 0) {
            paws(quiz)
                .padding(.horizontal, 24)
                .padding(.top, 12)
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    guus
                    Text(q.question)
                        .font(.display(24))
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                    if needsLook(q.id) {
                        Label("Kijk deze nog eens na.", systemImage: "arrow.uturn.backward")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Palette.warn)
                    }
                    VStack(spacing: 12) {
                        ForEach(Array(q.options.enumerated()), id: \.offset) { i, option in
                            optionTile(option, chosen: answers[q.id] == i) {
                                Haptics.tap()
                                withAnimation(.spring(duration: 0.35, bounce: 0.5)) { answers[q.id] = i }
                            }
                        }
                    }
                    .padding(.top, 4)
                    ErrorText(message: error)
                }
                .padding(24)
                .id(q.id)
                .transition(.push(from: .trailing))
            }
            HStack(spacing: 12) {
                if index > 0 {
                    Button("Vorige") { go(to: index - 1) }
                        .buttonStyle(.secondary)
                }
                if index < count - 1 {
                    Button("Volgende") { go(to: index + 1) }
                        .buttonStyle(.primary)
                        .disabled(answers[q.id] == nil)
                } else {
                    Button("Nakijken") { Task { await submit(quiz) } }
                        .buttonStyle(.primary)
                        .disabled(answers.count < count)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
        }
    }

    /// Guus above the question: curious, or calm with "Bijna!" right after a check that was not yet a pass.
    @ViewBuilder
    private var guus: some View {
        let coachOn = Keepsakes.shared.coachOn
        let line = L("Bijna! Kijk deze nog even na.")
        HStack(alignment: .top, spacing: 10) {
            if coachOn { Guus(mood: almost ? .calm : .curious, size: 56) }
            if almost {
                Text(line)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.ink)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .padding(.leading, coachOn ? BubbleShape.tailWidth : 0)
                    .background(Palette.warnSoft, in: BubbleShape(tail: coachOn))
                    .transition(.scale(scale: 0.92, anchor: .leading).combined(with: .opacity))
                    .accessibilityLabel(coachOn ? L("Guus: \(line)") : line)
            }
        }
    }

    /// One paw per question: green when answered, soft orange for one to look at again. Never red.
    private func paws(_ quiz: Quiz) -> some View {
        let count = quiz.questions.count
        let answered = quiz.questions.filter { answers[$0.id] != nil }.count
        return HStack(spacing: 6) {
            ForEach(Array(quiz.questions.enumerated()), id: \.element.id) { i, q in
                Image(systemName: "pawprint.fill")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(needsLook(q.id) ? Palette.warn : answers[q.id] != nil ? Palette.grass : Palette.line)
                    .scaleEffect(i == index ? 1.25 : 1)
                    .frame(maxWidth: .infinity)
            }
        }
        .animation(.spring(duration: 0.35), value: answers)
        .animation(.spring(duration: 0.35), value: index)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L("Vraag \(index + 1) van \(count)"))
        .accessibilityValue(L("\(answered) beantwoord"))
    }

    private func optionTile(_ text: String, chosen: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Text(text)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(Palette.ink)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: chosen ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(chosen ? Palette.grass : Palette.line)
                    .contentTransition(.symbolEffect(.replace))
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, minHeight: 64)
            .background(chosen ? Palette.grassSoft : Palette.surface, in: .rect(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(chosen ? Palette.grass : Palette.line.opacity(0.7), lineWidth: chosen ? 2 : 1))
            .contentShape(.rect(cornerRadius: 20, style: .continuous))
            .scaleEffect(chosen ? 1.03 : 1)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(chosen ? .isSelected : [])
    }

    private func go(to newIndex: Int) {
        almost = false
        withAnimation(.snappy) { index = newIndex }
    }

    // MARK: Checking

    private var checking: some View {
        VStack(spacing: 18) {
            if Keepsakes.shared.coachOn {
                Guus(mood: .curious, size: 100)
            } else {
                ProgressView().controlSize(.large)
            }
            Text("Even kijken…")
                .font(.display(24))
                .foregroundStyle(Palette.ink)
        }
        .accessibilityElement(children: .combine)
    }

    private func submit(_ quiz: Quiz) async {
        guard stage == .questions else { return }
        error = nil
        withAnimation(.smooth) { stage = .checking }
        Haptics.drumroll()
        try? await Task.sleep(for: .seconds(1))
        do {
            let result: QuizResult = try await APIClient.shared.post("/api/v1/quiz", ["answers": answers])
            if result.passed {
                withAnimation(.spring(duration: 0.5)) { stage = .passed }
                model.celebrate(.big(title: L("Gehaald!"), text: L("Je mag nu zelfstandige rondjes aanvragen bij eigenaren die dat toestaan.")),
                                once: "quiz")
                await model.refreshMe()
                await ProgressStore.shared.load()
            } else {
                Haptics.soft()
                submitted = answers
                wrong = Set(result.wrong)
                let first = quiz.questions.firstIndex { wrong.contains($0.id) } ?? 0
                withAnimation(.snappy) {
                    index = first
                    almost = true
                    stage = .questions
                }
            }
        } catch {
            self.error = error.localizedDescription
            withAnimation(.smooth) { stage = .questions }
        }
    }

    // MARK: Passed

    private func passedView(fresh: Bool) -> some View {
        VStack(spacing: 16) {
            Spacer()
            if Keepsakes.shared.coachOn {
                Guus(mood: .proud, size: 120)
            } else {
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(Palette.grass)
                    .accessibilityHidden(true)
            }
            Text("Gehaald!")
                .font(.display(32))
            Text("Je kunt nu zelfstandige rondjes aanvragen bij eigenaren die dat toestaan.")
                .font(.title3)
                .foregroundStyle(Palette.muted)
                .multilineTextAlignment(.center)
            if fresh {
                Chip(text: L("+\(Self.points) punten"), symbol: "star.fill")
            }
            Spacer()
            if fresh {
                Button("Klaar") { dismiss() }
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
            quiz = try await APIClient.shared.get("/api/v1/quiz")
        } catch {
            loadError = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack { QuizGameView() }
        .environment(AppModel())
}
