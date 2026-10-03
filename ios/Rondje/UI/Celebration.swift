import SwiftUI

/// How big a moment is. Only real-world things get one: a dog added, a request sent, the quiz passed,
/// a walk done, a lesson done, a group walk joined. Saying yes or no, trust, cancelling and reporting
/// get a calm confirmation instead, just like on the server, where saying yes earns no points.
enum Delight: Equatable, Sendable {
    /// Just a haptic pop.
    case tap
    /// Guus wags in a small banner.
    case wag(String)
    /// Confetti, with a banner when there is text.
    case party(String?)
    /// A full-screen moment with a proud Guus.
    case big(title: String, text: String?)
}

struct CelebrationEvent: Identifiable, Equatable, Sendable {
    let id = UUID()
    var delight: Delight
}

extension AppModel {
    /// Celebrates a real-world moment. With `once`, only the first time ever (remembered on this phone).
    /// During a walk everything is a quiet pop: the phone is in a pocket and the dog comes first.
    func celebrate(_ d: Delight, once key: String? = nil) {
        if let key {
            guard !Keepsakes.shared.has("party." + key) else { return }
            Keepsakes.shared.mark("party." + key)
        }
        let delight = WalkTracker.shared.isActive ? .tap : d
        if delight == .tap {
            Haptics.pop()
            return
        }
        withAnimation(.spring(duration: 0.4)) { celebration = CelebrationEvent(delight: delight) }
    }
}

/// Shows `model.celebration` over everything and clears it when done.
struct CelebrationOverlay: View {
    let event: CelebrationEvent
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var glowing = false

    var body: some View {
        content
            .transition(.opacity)
            .task(id: event.id) { await run() }
    }

    @ViewBuilder
    private var content: some View {
        switch event.delight {
        case .tap:
            EmptyView()
        case .wag(let text):
            banner(text)
                .allowsHitTesting(false)
        case .party(let text):
            ZStack(alignment: .top) {
                if reduceMotion { glow } else { Confetti(count: 40, duration: 1.6).ignoresSafeArea() }
                if let text { banner(text) }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .allowsHitTesting(false)
        case let .big(title, text):
            ZStack {
                Palette.walkBackground.opacity(0.94).ignoresSafeArea()
                if reduceMotion { glow } else { Confetti(count: 56, duration: 2.2).ignoresSafeArea() }
                VStack(spacing: 14) {
                    Guus(mood: .proud, size: 140)
                    Text(title)
                        .font(.display(32))
                        .foregroundStyle(Palette.onWalk)
                        .multilineTextAlignment(.center)
                    if let text {
                        Text(text)
                            .font(.body)
                            .foregroundStyle(Palette.onWalk.opacity(0.85))
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(32)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .contentShape(.rect)
            .onTapGesture { close() }
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(.isButton)
            .accessibilityAction { close() }
        }
    }

    private func banner(_ text: String) -> some View {
        HStack(spacing: 10) {
            Guus(mood: .happy, size: 34)
            Text(text)
        }
        .font(.subheadline.weight(.semibold))
        .foregroundStyle(Palette.grass)
        .padding(.leading, 8)
        .padding(.trailing, 18)
        .padding(.vertical, 8)
        .glassy(cornerRadius: 30)
        .shadow(color: .black.opacity(0.08), radius: 12, y: 6)
        .padding(.horizontal)
        .transition(.move(edge: .top).combined(with: .opacity))
    }

    /// With Reduce Motion: a soft glow instead of flying confetti.
    private var glow: some View {
        RadialGradient(colors: [Palette.ball.opacity(0.5), Palette.ball.opacity(0)], center: .center, startRadius: 0, endRadius: 360)
            .ignoresSafeArea()
            .opacity(glowing ? 1 : 0)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }

    private func run() async {
        let seconds: Double
        switch event.delight {
        case .tap:
            close()
            return
        case .wag(let text):
            Haptics.wag()
            announce(text)
            seconds = 2.4
        case .party(let text):
            Haptics.success()
            if let text { announce(text) }
            seconds = 1.8
        case let .big(title, text):
            Haptics.success()
            announce([title, text].compactMap { $0 }.joined(separator: " "))
            seconds = 2.8
        }
        if reduceMotion {
            withAnimation(.easeInOut(duration: 0.4)) { glowing = true }
            try? await Task.sleep(for: .seconds(0.4))
            withAnimation(.easeInOut(duration: 0.4)) { glowing = false }
            try? await Task.sleep(for: .seconds(max(0, seconds - 0.4)))
        } else {
            try? await Task.sleep(for: .seconds(seconds))
        }
        if !Task.isCancelled { close() }
    }

    private func announce(_ text: String) {
        AccessibilityNotification.Announcement(text).post()
    }

    private func close() {
        guard model.celebration?.id == event.id else { return }
        withAnimation(.easeOut(duration: 0.3)) { model.celebration = nil }
    }
}

/// Paws, balls, leaves and hearts that fall from the top of their frame and fade out.
/// Drawn in one Canvas; nothing is drawn after `duration` and it never catches touches.
struct Confetti: View {
    var count = 40
    var duration = 1.6

    private struct Particle {
        var x: Double
        var y: Double
        var angle: Double
        var speed: Double
        var spin: Double
        var sway: Double
        var swaySpeed: Double
        var scale: Double
        var symbol: Int
    }

    private static let symbols = ["pawprint.fill", "tennisball.fill", "leaf.fill", "heart.fill"]
    private static let colors = [Palette.ball, Palette.grass, Palette.warn, Palette.calm]
    private static let gravity = 420.0

    @State private var particles: [Particle]
    @State private var start = Date.now
    @State private var done = false

    init(count: Int = 40, duration: Double = 1.6) {
        self.count = count
        self.duration = duration
        _particles = State(initialValue: (0..<max(0, count)).map { _ in
            Particle(
                x: .random(in: 0...1),
                y: -Double.random(in: 12...60),
                angle: .random(in: (0.15 * .pi)...(0.85 * .pi)),
                speed: .random(in: 60...260),
                spin: .random(in: -360...360),
                sway: .random(in: 6...18),
                swaySpeed: .random(in: 3...6),
                scale: .random(in: 0.7...1.25),
                symbol: .random(in: 0..<(Confetti.symbols.count * Confetti.colors.count))
            )
        })
    }

    var body: some View {
        TimelineView(.animation(minimumInterval: nil, paused: done)) { timeline in
            let t = timeline.date.timeIntervalSince(start)
            Canvas { ctx, size in
                guard t >= 0, t < duration else { return }
                let fadeFrom = duration * 0.7
                let alpha = t < fadeFrom ? 1 : max(0, (duration - t) / (duration - fadeFrom))
                for p in particles {
                    guard let symbol = ctx.resolveSymbol(id: p.symbol) else { continue }
                    let x = p.x * size.width + cos(p.angle) * p.speed * t + sin(t * p.swaySpeed + p.x * 10) * p.sway
                    let y = p.y + sin(p.angle) * p.speed * t + 0.5 * Self.gravity * t * t
                    guard y < size.height + 40 else { continue }
                    var c = ctx
                    c.opacity = alpha
                    c.translateBy(x: x, y: y)
                    c.rotate(by: .degrees(p.spin * t))
                    c.scaleBy(x: p.scale, y: p.scale)
                    c.draw(symbol, at: .zero)
                }
            } symbols: {
                ForEach(0..<(Self.symbols.count * Self.colors.count), id: \.self) { i in
                    Image(systemName: Self.symbols[i / Self.colors.count])
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Self.colors[i % Self.colors.count])
                        .tag(i)
                }
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .task {
            try? await Task.sleep(for: .seconds(duration))
            done = true
        }
    }
}

#Preview {
    ZStack {
        Palette.paper.ignoresSafeArea()
        Confetti(count: 60, duration: 3)
    }
}
