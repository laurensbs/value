import SwiftUI

/// The Hondenschool path: five short lessons in a zig-zag, with the safety quiz as the last stop.
/// Every stop is open from the start; there are no locks, and finishing lessons unlocks nothing by itself.
struct LessonsView: View {
    /// Pushed from the quiz: the quiz stop goes back to it instead of pushing another one.
    var fromQuiz = false

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var playing: Lesson?
    @State private var quizAfterLesson = false
    @State private var showQuiz = false

    private static let offsets: [CGFloat] = [-70, 0, 70, 0, -70, 0]
    private static let stopSize: CGFloat = 78

    private enum Stop { case done, next, open }

    var body: some View {
        let lessons = Lessons.all
        let done = Lessons.done()
        let next = lessons.first { !done.contains($0.id) }
        let passed = model.me?.profile?.quizPassed == true
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                header(done: done.count, total: lessons.count)
                VStack(spacing: 28) {
                    ForEach(Array(lessons.enumerated()), id: \.element.id) { i, lesson in
                        let state: Stop = done.contains(lesson.id) ? .done : (lesson.id == next?.id ? .next : .open)
                        stop(i, symbol: state == .done ? "checkmark" : lesson.symbol, title: lesson.title, caption: nil, state: state,
                             label: label(lesson.title, number: i + 1, state: state)) {
                            playing = lesson
                        }
                    }
                    quizStop(index: lessons.count, ready: next == nil, passed: passed)
                }
                .frame(maxWidth: .infinity)
                .backgroundPreferenceValue(StopCenters.self) { anchors in
                    GeometryReader { geo in
                        trail(through: anchors.sorted { $0.key < $1.key }.map { geo[$0.value] })
                    }
                    .accessibilityHidden(true)
                }
                .padding(.bottom, 24)
            }
            .padding(20)
        }
        .screenBackground()
        .navigationTitle("Hondenschool")
        .fullScreenCover(item: $playing, onDismiss: {
            guard quizAfterLesson else { return }
            quizAfterLesson = false
            openQuiz()
        }) { lesson in
            LessonPlayer(lesson: lesson) { quizAfterLesson = true }
        }
        .navigationDestination(isPresented: $showQuiz) { QuizGameView(fromLessons: true) }
    }

    private func header(done: Int, total: Int) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Vijf korte lessen over veilig wandelen. Elk ongeveer 2 minuten.")
                .font(.body)
                .foregroundStyle(Palette.muted)
            HStack(spacing: 12) {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Palette.sunken)
                        Capsule().fill(Palette.grass)
                            .frame(width: max(done > 0 ? 10 : 0, geo.size.width * CGFloat(done) / CGFloat(max(1, total))))
                    }
                }
                .frame(height: 10)
                .animation(.spring(duration: 0.6), value: done)
                Text("\(done) van 5 lessen")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.grass)
                    .fixedSize()
            }
            .accessibilityElement(children: .combine)
        }
    }

    private func label(_ title: String, number: Int, state: Stop) -> String {
        switch state {
        case .done: L("\(title), les \(number) van 5, klaar")
        case .next: L("\(title), les \(number) van 5, volgende")
        case .open: L("\(title), les \(number) van 5")
        }
    }

    // MARK: Stops

    private func stop(_ index: Int, symbol: String, title: String, caption: String?, state: Stop,
                      label: String, action: @escaping () -> Void) -> some View {
        let background = state == .done ? Palette.grass : state == .next ? Palette.ball : Palette.surface
        let foreground = state == .done ? Palette.onGrass : state == .next ? Palette.onBall : Palette.muted
        // At the largest text sizes the stops stand in one straight line, so the titles keep room to wrap.
        let offset = typeSize.isAccessibilitySize ? 0 : Self.offsets[min(index, Self.offsets.count - 1)]
        return Button {
            Haptics.tap()
            action()
        } label: {
            VStack(spacing: 8) {
                ZStack {
                    if state == .next { PulseRing() }
                    Circle()
                        .fill(background)
                        .shadow(color: .black.opacity(state == .open ? 0.04 : 0.1), radius: 6, y: 3)
                    Circle()
                        .strokeBorder(state == .open ? Palette.line : .clear, lineWidth: 1.5)
                    Image(systemName: symbol)
                        .font(.system(size: 30, weight: .bold))
                        .foregroundStyle(foreground)
                }
                .frame(width: Self.stopSize, height: Self.stopSize)
                .anchorPreference(key: StopCenters.self, value: .center) { [index: $0] }
                .overlay(alignment: offset > 0 ? .trailing : .leading) {
                    if state == .next { companion(onLeft: offset > 0) }
                }
                VStack(spacing: 2) {
                    Text(title)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(state == .open ? Palette.muted : Palette.ink)
                    if let caption {
                        Text(caption)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Palette.grass)
                    }
                }
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: 200)
            }
            .contentShape(.rect)
        }
        .buttonStyle(StopButtonStyle())
        .offset(x: offset)
        .accessibilityLabel(label)
    }

    private func quizStop(index: Int, ready: Bool, passed: Bool) -> some View {
        let state: Stop = passed ? .done : ready ? .next : .open
        let label = switch state {
        case .done: L("Veiligheidsquiz, gehaald")
        case .next: L("Veiligheidsquiz, volgende")
        case .open: L("Veiligheidsquiz")
        }
        return stop(index, symbol: "checkmark.seal.fill", title: L("Veiligheidsquiz"), caption: passed ? L("Gehaald") : nil,
                    state: state, label: label) {
            openQuiz()
        }
    }

    /// Guus beside the next stop, on the side with room. With Guus switched off, only the words stay.
    private func companion(onLeft: Bool) -> some View {
        VStack(spacing: 4) {
            Text("Hier verder")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Palette.grass)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Palette.grassSoft, in: .capsule)
            if Keepsakes.shared.coachOn { Guus(mood: .curious, size: 52) }
        }
        .fixedSize()
        .offset(x: (onLeft ? -1 : 1) * (Self.stopSize + 12))
        .accessibilityHidden(true)
    }

    /// A dashed trail from stop to stop, in soft curves.
    private func trail(through points: [CGPoint]) -> some View {
        Path { path in
            guard let first = points.first else { return }
            path.move(to: first)
            for (from, to) in zip(points, points.dropFirst()) {
                let midY = (from.y + to.y) / 2
                path.addCurve(to: to, control1: CGPoint(x: from.x, y: midY), control2: CGPoint(x: to.x, y: midY))
            }
        }
        .stroke(Palette.line, style: StrokeStyle(lineWidth: 5, lineCap: .round, dash: [8, 12]))
    }

    private func openQuiz() {
        if fromQuiz { dismiss() } else { showQuiz = true }
    }
}

/// The centres of the stops on the path, so the trail can connect them whatever the text size.
private struct StopCenters: PreferenceKey {
    static var defaultValue: [Int: Anchor<CGPoint>] { [:] }

    static func reduce(value: inout [Int: Anchor<CGPoint>], nextValue: () -> [Int: Anchor<CGPoint>]) {
        value.merge(nextValue()) { $1 }
    }
}

/// A stop sinks in a little while pressed.
private struct StopButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.94 : 1)
            .animation(.spring(duration: 0.25, bounce: 0.4), value: configuration.isPressed)
    }
}

/// A soft ring that keeps pulsing outward around the next stop. Still with Reduce Motion.
private struct PulseRing: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulsing = false

    var body: some View {
        Group {
            if reduceMotion {
                Circle()
                    .stroke(Palette.ball.opacity(0.6), lineWidth: 5)
                    .scaleEffect(1.16)
            } else {
                Circle()
                    .stroke(Palette.ball, lineWidth: 5)
                    .animation(.easeOut(duration: 1.6).repeatForever(autoreverses: false)) {
                        $0.scaleEffect(pulsing ? 1.38 : 1).opacity(pulsing ? 0 : 0.85)
                    }
                    .onAppear { pulsing = true }
            }
        }
        .allowsHitTesting(false)
    }
}

#Preview {
    NavigationStack { LessonsView() }
        .environment(AppModel())
}
