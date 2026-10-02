import SwiftUI

// MARK: Guus

/// Guus, the golden retriever who shows the next step and cheers for real-world things.
/// He is decoration for VoiceOver: what he says lives in the bubble next to him.
struct Guus: View {
    var mood: DogMood = .happy
    var size: CGFloat = 64
    var hop = true

    /// A small seasonal touch, purely decorative.
    enum Accessory: Sendable, Equatable { case leaf, scarf, flower }

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var landed = false
    @State private var bob = false
    @State private var cheering = false
    @State private var cheers = 0

    private var shown: DogMood { cheering ? .happy : mood }

    var body: some View {
        let now = Date.now
        DogPortrait(look: Guus.look(on: now), mood: shown, cornerRadius: size * 0.3, inset: 0.06)
            .frame(width: size, height: size)
            .overlay { accessory(Guus.accessory(on: now)) }
            .overlay(alignment: .topTrailing) { if shown == .sleepy { snore } }
            .rotationEffect(.degrees(shown == .curious ? -8 : 0))
            .animation(.spring(duration: 0.4), value: shown)
            .animation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
                $0.offset(y: reduceMotion ? 0 : (bob ? 2 : -2))
            }
            .animation(.spring(duration: 0.5, bounce: 0.5)) {
                $0.offset(y: hop && !reduceMotion && !landed ? -10 : 0)
            }
            .contentShape(.rect)
            .onTapGesture {
                Haptics.wag()
                cheering = true
                cheers += 1
            }
            .task(id: cheers) {
                guard cheers > 0 else { return }
                try? await Task.sleep(for: .seconds(1.2))
                if !Task.isCancelled { cheering = false }
            }
            .onAppear {
                landed = true
                bob = true
            }
            .accessibilityHidden(true)
    }

    /// A small 'z' that floats up and fades, every two seconds. Still with Reduce Motion.
    private var snore: some View {
        TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion)) { timeline in
            let phase = reduceMotion ? 0.35 : timeline.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 2) / 2
            Text(verbatim: "z")
                .font(.display(size * 0.22))
                .foregroundStyle(Color(hex: 0x1D2421).opacity(0.7))
                .offset(y: -12 * phase)
                .opacity(reduceMotion ? 1 : 1 - phase)
        }
        .padding(.top, size * 0.06)
        .padding(.trailing, size * 0.12)
    }

    /// Places a decoration on the 120 × 120 face grid, the same way the portrait draws the face.
    private func spot(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
        CGPoint(x: size * (0.06 + 0.88 * x / 120), y: size * (0.06 + 0.88 * y / 120))
    }

    @ViewBuilder
    private func accessory(_ accessory: Accessory?) -> some View {
        let symbolSize = size * 0.17
        switch accessory {
        case .leaf:
            Image(systemName: "leaf.fill")
                .font(.system(size: symbolSize))
                .foregroundStyle(Color(hex: 0xD9822B))
                .rotationEffect(.degrees(-20))
                .position(spot(27, 40))
        case .flower:
            Image(systemName: "camera.macro")
                .font(.system(size: symbolSize, weight: .semibold))
                .foregroundStyle(Color(hex: 0xE8798A))
                .position(spot(93, 40))
        case .scarf:
            RoundedRectangle(cornerRadius: size * 0.025, style: .continuous)
                .fill(Color(hex: 0xC0392B))
                .frame(width: size * 0.08, height: size * 0.15)
                .rotationEffect(.degrees(-14))
                .position(spot(77, 100))
        case nil:
            EmptyView()
        }
    }

    /// Guus's portrait on a given day: a red scarf in winter, an orange collar on King's Day in the Netherlands.
    static func look(on date: Date, region: String? = Locale.current.region?.identifier) -> DogLook {
        var look = IntroView.golden
        if accessory(on: date) == .scarf { look.collar = "#c0392b" }
        if region == "NL", isKingsDay(date) { look.collar = "#F28C28" }
        return look
    }

    /// Autumn leaf (23 Sep to 20 Dec), winter scarf (21 Dec to 19 Mar), spring flower (20 Mar to 20 Jun).
    nonisolated static func accessory(on date: Date) -> Accessory? {
        let day = Calendar(identifier: .gregorian).dateComponents([.month, .day], from: date)
        let md = (day.month ?? 1) * 100 + (day.day ?? 1)
        switch md {
        case 923...1220: return .leaf
        case 1221...1231, 101...319: return .scarf
        case 320...620: return .flower
        default: return nil
        }
    }

    /// 27 April, or the 26th when the 27th is a Sunday.
    nonisolated static func isKingsDay(_ date: Date) -> Bool {
        let calendar = Calendar(identifier: .gregorian)
        let c = calendar.dateComponents([.year, .month, .day, .weekday], from: date)
        guard c.month == 4, let day = c.day, let year = c.year else { return false }
        let the27th = calendar.date(from: DateComponents(year: year, month: 4, day: 27)).map { calendar.component(.weekday, from: $0) }
        return day == (the27th == 1 ? 26 : 27)
    }
}

// MARK: Bubble

/// A speech bubble with a small tail on the left, toward Guus.
struct BubbleShape: Shape {
    var tail = true
    var cornerRadius: CGFloat = 18
    static let tailWidth: CGFloat = 8

    func path(in rect: CGRect) -> Path {
        let inset = tail ? Self.tailWidth : 0
        let body = Path(roundedRect: CGRect(x: rect.minX + inset, y: rect.minY, width: rect.width - inset, height: rect.height),
                        cornerRadius: cornerRadius, style: .continuous)
        guard tail else { return body }
        let y = rect.minY + min(24, rect.height / 2)
        var tip = Path()
        tip.move(to: CGPoint(x: rect.minX + inset + 4, y: y - 7))
        tip.addQuadCurve(to: CGPoint(x: rect.minX, y: y + 1), control: CGPoint(x: rect.minX + inset * 0.6, y: y - 1))
        tip.addQuadCurve(to: CGPoint(x: rect.minX + inset + 4, y: y + 7), control: CGPoint(x: rect.minX + inset * 0.6, y: y + 5))
        tip.closeSubpath()
        return body.union(tip)
    }
}

struct CoachButton {
    var title: String
    var action: () -> Void
}

extension CoachButton {
    init(_ title: String, action: @escaping () -> Void) {
        self.title = title
        self.action = action
    }
}

/// The one way Guus talks: Guus, a speech bubble, and at most two buttons.
/// With Guus switched off in Profile, the same card stays without his face: the guidance remains.
struct CoachBubble<Extra: View>: View {
    var mood: DogMood
    var text: String
    var detail: String?
    var primary: CoachButton?
    var secondary: CoachButton?
    var guusSize: CGFloat
    var extra: Extra

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    init(mood: DogMood, text: String, detail: String? = nil, primary: CoachButton? = nil, secondary: CoachButton? = nil,
         guusSize: CGFloat = 56, @ViewBuilder extra: () -> Extra) {
        #if DEBUG
        assert(!GuusLine.isBanned(text), "Guus may not say: \(text)")
        assert(!GuusLine.isBanned(detail ?? ""), "Guus may not say: \(detail ?? "")")
        #endif
        self.mood = mood
        self.text = text
        self.detail = detail
        self.primary = primary
        self.secondary = secondary
        self.guusSize = guusSize
        self.extra = extra()
    }

    var body: some View {
        let coachOn = Keepsakes.shared.coachOn
        VStack(spacing: 12) {
            HStack(alignment: .top, spacing: 10) {
                if coachOn { Guus(mood: mood, size: guusSize) }
                bubble(tail: coachOn)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(accessibilityText(coachOn: coachOn))
            extra
            if let primary {
                Button(primary.title, action: primary.action)
                    .buttonStyle(.primary)
            }
            if let secondary {
                Button(action: secondary.action) {
                    Text(secondary.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Palette.muted)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .contentShape(.rect)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(Palette.grass.opacity(0.25), lineWidth: 1))
    }

    private func bubble(tail: Bool) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(text)
                .font(.body.weight(.semibold))
                .foregroundStyle(Palette.ink)
            if let detail {
                Text(detail)
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .padding(.leading, tail ? BubbleShape.tailWidth : 0)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.grassSoft, in: BubbleShape(tail: tail))
        .scaleEffect(shown || reduceMotion ? 1 : 0.92, anchor: .topLeading)
        .opacity(shown ? 1 : 0)
        .onAppear { withAnimation(.spring(duration: 0.35)) { shown = true } }
    }

    private func accessibilityText(coachOn: Bool) -> String {
        let line = coachOn ? L("Guus: \(text)") : text
        guard let detail else { return line }
        return line + " " + detail
    }
}

extension CoachBubble where Extra == EmptyView {
    init(mood: DogMood, text: String, detail: String? = nil, primary: CoachButton? = nil, secondary: CoachButton? = nil,
         guusSize: CGFloat = 56) {
        self.init(mood: mood, text: text, detail: detail, primary: primary, secondary: secondary, guusSize: guusSize) { EmptyView() }
    }
}

// MARK: Hint

/// A one-time explanation for a screen, from Guus. "Snap ik" puts it away for good (until reset in Profile).
/// With `after`, it waits until that other hint was read, so hints come one at a time.
struct GuusHint: View {
    let id: String
    let text: String
    var after: String? = nil

    private var visible: Bool {
        let keepsakes = Keepsakes.shared
        guard keepsakes.coachOn, !keepsakes.has("hint." + id) else { return false }
        return after.map { keepsakes.has("hint." + $0) } ?? true
    }

    var body: some View {
        if visible {
            HStack(alignment: .top, spacing: 10) {
                Guus(mood: .curious, size: 40)
                VStack(alignment: .leading, spacing: 10) {
                    Text(text)
                        .font(.subheadline)
                        .foregroundStyle(Palette.ink)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityLabel(L("Guus: \(text)"))
                    Button {
                        Haptics.tap()
                        withAnimation(.smooth) { Keepsakes.shared.mark("hint." + id) }
                    } label: {
                        Text("Snap ik")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Palette.onBall)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 7)
                            .background(Palette.ball, in: .capsule)
                            .contentShape(.capsule)
                    }
                    .buttonStyle(.plain)
                }
                .padding(12)
                .padding(.leading, BubbleShape.tailWidth)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.grassSoft, in: BubbleShape())
            }
            .transition(.opacity)
            .onAppear {
                #if DEBUG
                assert(!GuusLine.isBanned(text), "Guus may not say: \(text)")
                #endif
            }
        }
    }
}

// MARK: Copy rules

/// Words Guus never uses. Every Guus line in every unit is checked against this in a test.
/// The rules: 'je' form, at most two short sentences, at most one exclamation mark, no em-dashes,
/// never how long someone was away, never urgency or countdowns, never guilt, and Guus is never sad.
enum GuusLine {
    static let banned = [
        "we missen je", "missen je", "je verliest", "verlies je", "streak", "laatste kans", "haast je",
        "wacht op je", "teleurgesteld", "verdrietig", "vergeet niet", "\u{2014}",
    ]

    static func isBanned(_ s: String) -> Bool {
        banned.contains { s.range(of: $0, options: .caseInsensitive) != nil }
    }
}

#Preview {
    VStack(spacing: 16) {
        HStack {
            ForEach(DogMood.allCases, id: \.self) { Guus(mood: $0, size: 44) }
        }
        CoachBubble(mood: .happy, text: "Zin in een rondje?", detail: "Er wandelt een rustige hond bij jou in de buurt.",
                    primary: CoachButton("Kijk even") {}, secondary: CoachButton("Niet nu") {})
        GuusHint(id: "preview", text: "Hier zie je al je afspraken.")
    }
    .padding()
    .screenBackground()
}
