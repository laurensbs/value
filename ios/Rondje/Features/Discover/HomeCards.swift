import SwiftUI

/// The first steps, laid out like a path: profile, quiz, a first meeting, a first walk.
/// Each step says what to do next and takes you there. Disappears when everything is done.
struct FirstSteps: View {
    @Environment(AppModel.self) private var model
    var openQuiz: () -> Void

    private struct Step: Identifiable {
        let id: Int
        let title: String
        let hint: String
        let done: Bool
        let symbol: String
    }

    private var steps: [Step] {
        let me = model.me
        let requested = !model.appointments.outgoing.isEmpty
        let walked = (me?.trust?.walks ?? 0) > 0
        return [
            Step(id: 0, title: L("Profiel gemaakt"), hint: L("Eigenaren zien wie je bent."), done: me?.profile != nil, symbol: "person.fill"),
            Step(id: 1, title: L("Haal de veiligheidsquiz"), hint: L("Acht korte vragen. Nodig voor zelfstandige rondjes."), done: me?.profile?.quizPassed == true, symbol: "checkmark.seal.fill"),
            Step(id: 2, title: L("Plan een kennismaking"), hint: L("Kies hieronder een hond die je leuk lijkt."), done: requested, symbol: "person.2.fill"),
            Step(id: 3, title: L("Loop je eerste rondje"), hint: L("Start het rondje bij Afspraken, op de dag zelf."), done: walked, symbol: "figure.walk"),
        ]
    }

    var body: some View {
        let all = steps
        let done = all.filter(\.done).count
        if model.me?.profile?.wantsToWalk != false, done < all.count {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Jouw eerste rondje").font(.headline)
                        Text("\(done) van \(all.count) gedaan").font(.subheadline).foregroundStyle(Palette.muted)
                    }
                    Spacer()
                    ZStack {
                        Circle().stroke(Palette.line, lineWidth: 6)
                        Circle().trim(from: 0, to: CGFloat(done) / CGFloat(all.count))
                            .stroke(Palette.grass, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        Image(systemName: "pawprint.fill").foregroundStyle(Palette.grass)
                    }
                    .frame(width: 46, height: 46)
                    .animation(.spring, value: done)
                }
                ForEach(all) { step in
                    let next = !step.done && all.first(where: { !$0.done })?.id == step.id
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: step.done ? "checkmark" : step.symbol)
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(step.done ? Palette.onGrass : (next ? Palette.onBall : Palette.muted))
                            .frame(width: 34, height: 34)
                            .background(step.done ? Palette.grass : (next ? Palette.ball : Palette.sunken), in: .circle)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(step.title).font(.subheadline.weight(.semibold))
                                .strikethrough(step.done, color: Palette.muted)
                                .foregroundStyle(step.done ? Palette.muted : Palette.ink)
                            if next { Text(step.hint).font(.footnote).foregroundStyle(Palette.muted) }
                        }
                        Spacer()
                        if next && step.id == 1 {
                            Button("Start") { openQuiz() }.buttonStyle(.borderedProminent).tint(Palette.grass).font(.footnote.weight(.bold))
                        }
                    }
                }
            }
            .padding(18)
            .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(Palette.grass.opacity(0.25), lineWidth: 1))
        }
    }
}

/// One calm tip a day, like a small card from a friend who knows dogs.
struct DailyTip: View {
    private static let tips: [(String, String)] = [
        ("drop.fill", "Neem op warme dagen water mee, en voel met je hand of de stoep niet te heet is voor zijn pootjes."),
        ("hand.raised.fill", "Laat een hond eerst aan je hand snuffelen voordat je hem aait. Zo stel je je voor."),
        ("leaf.fill", "Snuffelen is voor een hond net zo vermoeiend als rennen. Een rustig snuffelrondje is een cadeau."),
        ("ear.fill", "Oren naar achteren en een lage staart? Geef de hond wat ruimte en praat rustig."),
        ("moon.stars.fill", "In het donker? Een lampje aan de riem maakt jullie allebei beter zichtbaar."),
        ("figure.walk", "Loop in je eigen tempo. Een hond die aan de riem trekt, leert meer van stilstaan dan van trekken."),
        ("heart.fill", "Even samen op een bankje zitten telt ook. Rondjes hoeven niet snel of ver te zijn."),
        ("pawprint.fill", "Een andere hond komt eraan? Vraag de eigenaar eerst of ze kennis mogen maken."),
        ("sun.max.fill", "Wandelen in de ochtend? Dan is het rustiger en koeler, fijn voor oudere honden."),
        ("bubble.left.fill", "Vertel de eigenaar na afloop iets leuks over het rondje. Dat maakt hun dag."),
    ]

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
                Text(LocalizedStringKey(tip.1)).font(.subheadline).foregroundStyle(Palette.onGrass)
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
