import SwiftUI

/// One step of a first-steps checklist.
struct ChecklistStep: Identifiable {
    let id: Int
    let title: String
    let hint: String
    let done: Bool
    let symbol: String
}

/// A first-steps checklist that stays small: one row with the progress and the next step.
/// A tap opens the steps; the next step can have its own button ("Start", "Toevoegen").
struct ChecklistCard: View {
    let title: String
    let symbol: String
    let steps: [ChecklistStep]
    /// The button next to one step (by id) while it is the next one.
    var action: (step: Int, title: String, run: () -> Void)? = nil

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var open = false

    var body: some View {
        let done = steps.filter(\.done).count
        let next = steps.first { !$0.done }
        VStack(alignment: .leading, spacing: 14) {
            Button {
                Haptics.tap()
                withAnimation(Motion.or(Motion.scherm, reduce: reduceMotion)) { open.toggle() }
            } label: {
                HStack(spacing: 14) {
                    ZStack {
                        Circle().stroke(Palette.line, lineWidth: 5)
                        Circle().trim(from: 0, to: CGFloat(done) / CGFloat(max(1, steps.count)))
                            .stroke(Palette.grass, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        Image(systemName: symbol).font(.subheadline).foregroundStyle(Palette.grass)
                    }
                    .frame(width: 44, height: 44)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title).font(.headline).foregroundStyle(Palette.ink)
                        Text(next.map { L("\(done) van \(steps.count) · Volgende: \($0.title)") } ?? L("\(done) van \(steps.count) gedaan"))
                            .font(.subheadline).foregroundStyle(Palette.muted)
                    }
                    .multilineTextAlignment(.leading)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.down")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Palette.muted)
                        .rotationEffect(.degrees(open ? 180 : 0))
                }
                .frame(minHeight: 44)
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .accessibilityValue(open ? L("Open") : L("Dicht"))

            if open {
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(steps) { step in
                        row(step, isNext: step.id == next?.id)
                    }
                }
                .transition(.opacity)
            }
        }
        .padding(16)
        .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(Palette.grass.opacity(0.25), lineWidth: 1))
    }

    private func row(_ step: ChecklistStep, isNext: Bool) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: step.done ? "checkmark" : step.symbol)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(step.done ? Palette.onGrass : (isNext ? Palette.onBall : Palette.muted))
                .frame(width: 34, height: 34)
                .background(step.done ? Palette.grass : (isNext ? Palette.ball : Palette.sunken), in: .circle)
            VStack(alignment: .leading, spacing: 2) {
                Text(step.title).font(.subheadline.weight(.semibold))
                    .strikethrough(step.done, color: Palette.muted)
                    .foregroundStyle(step.done ? Palette.muted : Palette.ink)
                if isNext { Text(step.hint).font(.footnote).foregroundStyle(Palette.muted) }
            }
            Spacer(minLength: 0)
            if isNext, let action, action.step == step.id {
                Button(action.title) { action.run() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(Palette.grass)
                    .font(.footnote.weight(.bold))
            }
        }
    }
}

/// The first steps for walkers: profile, quiz, a first meeting, a first walk. Gone when everything is done.
struct FirstSteps: View {
    @Environment(AppModel.self) private var model
    var openQuiz: () -> Void

    private var steps: [ChecklistStep] {
        let me = model.me
        let requested = !model.appointments.outgoing.isEmpty
        let walked = (me?.trust?.walks ?? 0) > 0
        return [
            ChecklistStep(id: 0, title: L("Profiel gemaakt"), hint: L("Eigenaren zien wie je bent."), done: me?.profile != nil, symbol: "person.fill"),
            ChecklistStep(id: 1, title: L("Hondenschool en quiz"), hint: Keepsakes.shared.lessonsDone.count < 5 ? L("Vijf mini-lessen van 2 minuten, dan de quiz.") : L("Acht korte vragen. Nodig voor zelfstandige rondjes."), done: me?.profile?.quizPassed == true, symbol: "checkmark.seal.fill"),
            ChecklistStep(id: 2, title: L("Plan een kennismaking"), hint: L("Kies hieronder een hond die je leuk lijkt."), done: requested, symbol: "person.2.fill"),
            ChecklistStep(id: 3, title: L("Loop je eerste rondje"), hint: L("Start het rondje bij Afspraken, op de dag zelf."), done: walked, symbol: "figure.walk"),
        ]
    }

    var body: some View {
        let all = steps
        if model.me?.profile?.wantsToWalk != false, all.contains(where: { !$0.done }) {
            ChecklistCard(title: L("Jouw eerste rondje"), symbol: "pawprint.fill", steps: all,
                          action: (step: 1, title: L("Start"), run: openQuiz))
        }
    }
}

/// One calm tip a day, like a small card from a friend who knows dogs.
struct DailyTip: View {
    private static var tips: [(String, String)] { [
        ("drop.fill", L("Neem op warme dagen water mee, en voel met je hand of de stoep niet te heet is voor zijn pootjes.")),
        ("hand.raised.fill", L("Laat een hond eerst aan je hand snuffelen voordat je hem aait. Zo stel je je voor.")),
        ("leaf.fill", L("Snuffelen is voor een hond net zo vermoeiend als rennen. Een rustig snuffelrondje is een cadeau.")),
        ("ear.fill", L("Oren naar achteren en een lage staart? Geef de hond wat ruimte en praat rustig.")),
        ("moon.stars.fill", L("In het donker? Een lampje aan de riem maakt jullie allebei beter zichtbaar.")),
        ("figure.walk", L("Loop in je eigen tempo. Een hond die aan de riem trekt, leert meer van stilstaan dan van trekken.")),
        ("heart.fill", L("Even samen op een bankje zitten telt ook. Rondjes hoeven niet snel of ver te zijn.")),
        ("pawprint.fill", L("Een andere hond komt eraan? Vraag de eigenaar eerst of ze kennis mogen maken.")),
        ("sun.max.fill", L("Wandelen in de ochtend? Dan is het rustiger en koeler, fijn voor oudere honden.")),
        ("bubble.left.fill", L("Vertel de eigenaar na afloop iets leuks over het rondje. Dat maakt hun dag.")),
    ] }

    var body: some View {
        let day = Calendar.current.ordinality(of: .day, in: .year, for: .now) ?? 0
        let tip = Self.tips[day % Self.tips.count]
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: tip.0)
                .font(.title3)
                .foregroundStyle(Palette.onBall)
                .frame(width: 44, height: 44)
                .background(Palette.ball, in: .rect(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 4) {
                Text("Tip van vandaag").font(.caption.weight(.bold)).foregroundStyle(Palette.onGrass.opacity(0.8))
                Text(tip.1).font(.subheadline).foregroundStyle(Palette.onGrass)
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .background(
            LinearGradient(colors: [Palette.walkBackground, Palette.grass], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: .rect(cornerRadius: 24, style: .continuous)
        )
    }
}
