import SwiftUI

/// Plays one lesson, one card at a time, full screen. No score, no hearts, no timer:
/// a wrong pick gets a kind explanation and another go. Closing just ends this run; nothing saved is lost.
struct LessonPlayer: View {
    let lesson: Lesson
    /// Called when someone picks "Naar de quiz" at the end; the path opens the quiz after the player closes.
    var onQuiz: () -> Void = {}

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var index = 0
    /// The option picked on the current choice card.
    @State private var picked: Int?
    /// How often each option was picked wrongly; a change shakes that tile.
    @State private var shakes: [Int: Int] = [:]
    /// The hold card: when the press started, how far the ring is, and whether it is done.
    @State private var pressStart: Date?
    @State private var ring: CGFloat = 0
    @State private var held = false
    @State private var finished = false

    private var card: LessonCard { lesson.cards[min(index, lesson.cards.count - 1)] }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            if finished {
                done
                    .transition(.opacity.combined(with: .scale(scale: reduceMotion ? 1 : 0.96)))
            } else {
                cardView(card)
                    .id(index)
                    .transition(reduceMotion ? .opacity : .asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)))
            }
        }
        .screenBackground()
    }

    // MARK: Top bar

    private var cardDone: Bool {
        switch card {
        case .info: false
        case .choice(_, let options, _): picked.map { options[$0].correct } ?? false
        case .hold: held
        }
    }

    private var progress: CGFloat {
        guard !finished else { return 1 }
        return CGFloat(index + (cardDone ? 1 : 0)) / CGFloat(max(1, lesson.cards.count))
    }

    private var topBar: some View {
        HStack(spacing: 14) {
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Palette.muted)
                    .frame(width: 44, height: 44)
                    .contentShape(.rect)
            }
            .accessibilityLabel(Text("Sluit"))
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Palette.sunken)
                    Capsule().fill(Palette.grass)
                        .frame(width: max(progress > 0 ? 14 : 0, geo.size.width * progress))
                }
            }
            .frame(height: 14)
            .animation(.spring(duration: 0.5), value: progress)
            .accessibilityElement()
            .accessibilityLabel(Text(lesson.title))
            .accessibilityValue(Text("\(Int((progress * 100).rounded())) procent"))
        }
        .padding(.leading, 8)
        .padding(.trailing, 24)
        .padding(.top, 8)
    }

    // MARK: Cards

    private func cardView(_ card: LessonCard) -> some View {
        VStack(spacing: 0) {
            GeometryReader { geo in
                ScrollView {
                    VStack(spacing: 24) {
                        switch card {
                        case let .info(text, art):
                            artView(art)
                            sentence(text)
                        case let .choice(question, options, _):
                            if Keepsakes.shared.coachOn { Guus(mood: .curious, size: 72) }
                            sentence(question)
                            choices(options)
                        case let .hold(text, seconds, _):
                            sentence(text)
                            holdButton(seconds: seconds)
                        }
                    }
                    .padding(24)
                    .frame(maxWidth: .infinity, minHeight: geo.size.height)
                }
                .scrollBounceBehavior(.basedOnSize)
            }
            bottom(card)
        }
    }

    private func sentence(_ text: String) -> some View {
        Text(text)
            .font(.display(24))
            .foregroundStyle(Palette.ink)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
    }

    @ViewBuilder
    private func artView(_ art: LessonArt) -> some View {
        switch art {
        case .symbol(let name):
            symbolTile(name)
        case let .dog(look, mood):
            DogPortrait(look: look, mood: mood, cornerRadius: 40)
                .frame(width: 140, height: 140)
                .accessibilityHidden(true)
        case .guus(let mood):
            if Keepsakes.shared.coachOn {
                Guus(mood: mood, size: 140)
            } else {
                symbolTile("pawprint.fill")
            }
        }
    }

    private func symbolTile(_ name: String) -> some View {
        Image(systemName: name)
            .font(.system(size: 64, weight: .semibold))
            .foregroundStyle(Palette.onBall)
            .frame(width: 136, height: 136)
            .background(Palette.ball, in: .rect(cornerRadius: 40, style: .continuous))
            .accessibilityHidden(true)
    }

    // MARK: Choice

    @ViewBuilder
    private func choices(_ options: [LessonOption]) -> some View {
        if options.allSatisfy({ $0.art != nil }) {
            HStack(alignment: .top, spacing: 10) {
                ForEach(Array(options.enumerated()), id: \.offset) { i, option in tile(i, option) }
            }
        } else {
            VStack(spacing: 12) {
                ForEach(Array(options.enumerated()), id: \.offset) { i, option in tile(i, option) }
            }
        }
    }

    private func tile(_ i: Int, _ option: LessonOption) -> some View {
        let chosen = picked == i
        let tint = chosen ? (option.correct ? Palette.grassSoft : Palette.warnSoft) : Palette.surface
        let edge = chosen ? (option.correct ? Palette.grass : Palette.warn) : Palette.line.opacity(0.7)
        return Button { pick(i, option) } label: {
            Group {
                if let art = option.art {
                    VStack(spacing: 8) {
                        if case let .dog(look, mood) = art {
                            DogPortrait(look: look, mood: mood, cornerRadius: 20)
                                .aspectRatio(1, contentMode: .fit)
                        } else if case .symbol(let name) = art {
                            Image(systemName: name).font(.system(size: 36, weight: .semibold)).foregroundStyle(Palette.grass)
                                .frame(maxWidth: .infinity, minHeight: 64)
                        } else if case .guus(let mood) = art {
                            Guus(mood: mood, size: 64, hop: false)
                        }
                        HStack(spacing: 4) {
                            if chosen { mark(option.correct) }
                            Text(option.text).font(.subheadline.weight(.semibold))
                        }
                    }
                    .padding(8)
                } else {
                    HStack(spacing: 12) {
                        Text(option.text)
                            .font(.body.weight(.semibold))
                            .multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        if chosen { mark(option.correct) }
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 14)
                }
            }
            .foregroundStyle(Palette.ink)
            .frame(maxWidth: .infinity, minHeight: 64)
            .background(tint, in: .rect(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(edge, lineWidth: chosen ? 2 : 1))
            .contentShape(.rect(cornerRadius: 20, style: .continuous))
        }
        .buttonStyle(.plain)
        .modifier(Shake(trigger: shakes[i, default: 0]))
        .allowsHitTesting(picked == nil)
        .accessibilityAddTraits(chosen ? .isSelected : [])
    }

    private func mark(_ correct: Bool) -> some View {
        Image(systemName: correct ? "checkmark.circle.fill" : "arrow.uturn.backward.circle.fill")
            .font(.title3)
            .foregroundStyle(correct ? Palette.grass : Palette.warn)
            .transition(.scale.combined(with: .opacity))
            .accessibilityHidden(true)
    }

    private func pick(_ i: Int, _ option: LessonOption) {
        guard picked == nil else { return }
        Haptics.soft()
        withAnimation(.spring(duration: 0.3)) { picked = i }
        if !option.correct { shakes[i, default: 0] += 1 }
    }

    // MARK: Hold

    private func holdButton(seconds: Int) -> some View {
        ZStack {
            Circle().fill(Palette.surface)
            Circle().stroke(Palette.sunken, lineWidth: 12)
            Circle()
                .trim(from: 0, to: ring)
                .stroke(Palette.grass, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 6) {
                if held {
                    Image(systemName: "checkmark")
                        .font(.system(size: 44, weight: .bold))
                        .foregroundStyle(Palette.grass)
                        .transition(.scale.combined(with: .opacity))
                } else if let start = pressStart {
                    TimelineView(.periodic(from: start, by: 0.25)) { context in
                        let count = min(seconds, Int(context.date.timeIntervalSince(start)) + 1)
                        Text(verbatim: "\(count)")
                            .font(.display(48, weight: .heavy))
                            .monospacedDigit()
                            .foregroundStyle(Palette.grass)
                            .contentTransition(.numericText())
                            .animation(.snappy, value: count)
                    }
                } else {
                    Image(systemName: "hand.raised.fill")
                        .font(.system(size: 36, weight: .semibold))
                        .foregroundStyle(Palette.grass)
                }
                Text(held ? L("Klaar") : L("Houd vast"))
                    .font(.headline)
                    .foregroundStyle(Palette.ink)
            }
        }
        .frame(width: 190, height: 190)
        .contentShape(.circle)
        .onLongPressGesture(minimumDuration: Double(seconds), maximumDistance: 60) {
            completeHold()
        } onPressingChanged: { pressing in
            guard !held else { return }
            if pressing {
                Haptics.soft()
                pressStart = .now
                withAnimation(.linear(duration: Double(seconds))) { ring = 1 }
            } else if let start = pressStart, Date.now.timeIntervalSince(start) >= Double(seconds) - 0.15 {
                completeHold()
            } else {
                pressStart = nil
                withAnimation(.spring(duration: 0.35)) { ring = 0 }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(held ? Text("Klaar") : Text("Houd vast"))
        .accessibilityAddTraits(.isButton)
        .accessibilityHint(Text("Doe het echt, buiten. Tik als je klaar bent."))
        // VoiceOver double-tap, Voice Control and Switch Control cannot hold for seconds: a tap completes it.
        .accessibilityAction { completeHold() }
        .accessibilityAction(named: Text("Klaar")) { completeHold() }
    }

    private func completeHold() {
        guard !held else { return }
        Haptics.pop()
        pressStart = nil
        withAnimation(.spring(duration: 0.4)) {
            ring = 1
            held = true
        }
    }

    // MARK: Bottom

    @ViewBuilder
    private func bottom(_ card: LessonCard) -> some View {
        switch card {
        case .info:
            Button("Verder") { advance() }
                .buttonStyle(.primary)
                .padding(.horizontal, 24)
                .padding(.bottom, 12)
        case let .choice(_, options, explain):
            if let picked {
                let option = options[picked]
                if option.correct {
                    strip(tint: Palette.grassSoft, mood: .happy, text: explain.isEmpty ? L("Precies!") : explain, button: "Verder") { advance() }
                } else {
                    strip(tint: Palette.warnSoft, mood: .calm, text: option.why ?? "", button: "Nog een keer") {
                        withAnimation(.spring(duration: 0.3)) { self.picked = nil }
                    }
                }
            }
        case let .hold(_, _, after):
            if held {
                strip(tint: Palette.grassSoft, mood: .happy, text: after, button: "Verder") { advance() }
            }
        }
    }

    /// Guus's answer at the bottom of the screen, with one button.
    private func strip(tint: Color, mood: DogMood, text: String, button: LocalizedStringKey, action: @escaping () -> Void) -> some View {
        let coachOn = Keepsakes.shared.coachOn
        return VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                if coachOn { Guus(mood: mood, size: 40) }
                Text(text)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(Palette.ink)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(coachOn ? L("Guus: \(text)") : text)
            Button(button, action: action)
                .buttonStyle(.primary)
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.ignoresSafeArea(edges: .bottom))
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .onAppear {
            #if DEBUG
            assert(!GuusLine.isBanned(text), "Guus may not say: \(text)")
            #endif
            AccessibilityNotification.Announcement(text).post()
        }
    }

    private func advance() {
        guard index + 1 < lesson.cards.count else { return finish() }
        withAnimation(.snappy) {
            index += 1
            picked = nil
            held = false
            ring = 0
            pressStart = nil
        }
    }

    private func finish() {
        Keepsakes.shared.lessonsDone.insert(lesson.id)
        model.celebrate(.party(nil))
        withAnimation(.spring(duration: 0.45)) { finished = true }
    }

    // MARK: Done

    private var done: some View {
        let count = Lessons.done().count
        let offerQuiz = Lessons.allDone() && model.me?.profile?.quizPassed != true
        return ZStack(alignment: .top) {
            VStack(spacing: 16) {
                Spacer()
                if Keepsakes.shared.coachOn {
                    Guus(mood: .proud, size: 120)
                } else {
                    symbolTile("checkmark")
                }
                Text("Les klaar!")
                    .font(.display(32))
                    .foregroundStyle(Palette.ink)
                if offerQuiz {
                    Text("Klaar voor de quiz? Je weet het al.")
                        .font(.title3)
                        .foregroundStyle(Palette.muted)
                        .multilineTextAlignment(.center)
                } else {
                    Text("\(count) van 5 lessen klaar")
                        .font(.title3)
                        .foregroundStyle(Palette.muted)
                }
                Spacer()
                if offerQuiz {
                    Button("Naar de quiz") {
                        onQuiz()
                        dismiss()
                    }
                    .buttonStyle(.primary)
                    Button { dismiss() } label: {
                        Text("Later")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Palette.muted)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                } else {
                    Button("Verder") { dismiss() }
                        .buttonStyle(.primary)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
            .frame(maxWidth: .infinity)
            // The celebration overlay sits under this full-screen player, so the confetti is drawn here too.
            if !reduceMotion && !WalkTracker.shared.isActive {
                Confetti(count: 48, duration: 1.8)
                    .ignoresSafeArea()
            }
        }
    }
}

/// A small sideways shake each time `trigger` goes up. None with Reduce Motion.
private struct Shake: ViewModifier {
    var trigger: Int
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        if reduceMotion {
            content
        } else {
            content.phaseAnimator([0.0, -9, 8, -6, 4, 0], trigger: trigger) { view, x in
                view.offset(x: x)
            } animation: { _ in
                .linear(duration: 0.06)
            }
        }
    }
}

#Preview {
    LessonPlayer(lesson: Lessons.all[1])
        .environment(AppModel())
}
