import SwiftUI

// MARK: Buttons

struct PrimaryButtonStyle: ButtonStyle {
    var tint: Color = Palette.grass
    var foreground: Color = Palette.onGrass
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .frame(maxWidth: .infinity, minHeight: 54)
            .foregroundStyle(foreground)
            .background(tint.opacity(isEnabled ? 1 : 0.4), in: .capsule)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(duration: 0.25, bounce: 0.4), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .frame(maxWidth: .infinity, minHeight: 50)
            .foregroundStyle(Palette.ink)
            .background(Palette.sunken, in: .capsule)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(duration: 0.25, bounce: 0.4), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle() }
    static var ball: PrimaryButtonStyle { PrimaryButtonStyle(tint: Palette.ball, foreground: Palette.onBall) }
    static var danger: PrimaryButtonStyle { PrimaryButtonStyle(tint: Palette.danger, foreground: .white) }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    static var secondary: SecondaryButtonStyle { SecondaryButtonStyle() }
}

// MARK: Surfaces

struct Card<Content: View>: View {
    var padding: CGFloat = 18
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(Palette.line.opacity(0.6), lineWidth: 0.5))
    }
}

extension View {
    /// Liquid Glass on iOS 26, a soft material before that.
    @ViewBuilder
    func glassy(cornerRadius: CGFloat = 22) -> some View {
        if #available(iOS 26, *) {
            self.glassEffect(.regular, in: .rect(cornerRadius: cornerRadius, style: .continuous))
        } else {
            self.background(.ultraThinMaterial, in: .rect(cornerRadius: cornerRadius, style: .continuous))
        }
    }

    /// Forms on Rondje's own paper colour instead of the system grey.
    func rondjeForm() -> some View {
        scrollContentBackground(.hidden).background(Palette.paper.ignoresSafeArea())
    }

    func screenBackground() -> some View {
        background(Palette.paper.ignoresSafeArea())
    }
}

struct Chip: View {
    var text: String
    var symbol: String? = nil
    var tint: Color = Palette.grass
    var soft: Color = Palette.grassSoft

    var body: some View {
        HStack(spacing: 5) {
            if let symbol { Image(systemName: symbol).imageScale(.small) }
            Text(text)
        }
        .font(.footnote.weight(.semibold))
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .foregroundStyle(tint)
        .background(soft, in: .capsule)
    }
}

struct SectionTitle: View {
    var title: String
    var subtitle: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.display(22))
            if let subtitle { Text(subtitle).font(.subheadline).foregroundStyle(Palette.muted) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct EmptyState: View {
    var symbol: String
    var title: String
    var text: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: symbol)
                .font(.system(size: 38, weight: .semibold))
                .foregroundStyle(Palette.grass)
                .symbolEffect(.bounce, options: .nonRepeating)
            Text(title).font(.headline)
            Text(text).font(.subheadline).foregroundStyle(Palette.muted).multilineTextAlignment(.center)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
    }
}

struct ErrorText: View {
    var message: String?
    var body: some View {
        if let message {
            Label(message, systemImage: "exclamationmark.circle.fill")
                .font(.subheadline)
                .foregroundStyle(Palette.danger)
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.dangerSoft, in: .rect(cornerRadius: 14, style: .continuous))
                .transition(.move(edge: .top).combined(with: .opacity))
        }
    }
}

struct BannerView: View {
    let banner: AppModel.Banner

    var body: some View {
        Label(banner.text, systemImage: banner.symbol)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(banner.tint)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .glassy(cornerRadius: 30)
            .shadow(color: .black.opacity(0.08), radius: 12, y: 6)
            .padding(.horizontal)
    }
}

// MARK: Text for server values

enum Labels {
    static func energy(_ v: String) -> String {
        ["calm": L("Rustig"), "medium": L("Gemiddeld"), "high": L("Energiek")][v] ?? v
    }
    static func size(_ v: String) -> String {
        ["small": L("Klein"), "medium": L("Middel"), "large": L("Groot")][v] ?? v
    }
    static func level(_ v: String) -> String {
        v == "experienced" ? L("Met ervaring") : L("Voor iedereen")
    }
    static func sex(_ v: String) -> String { v == "male" ? L("Reu") : L("Teef") }
    static func treats(_ v: String) -> String {
        ["yes": L("Koekjes mogen"), "no": L("Geen koekjes"), "own": L("Alleen koekjes van de eigenaar")][v] ?? v
    }
    static func provides(_ v: String) -> String {
        ["bags": L("Poepzakjes"), "leash": L("Riem"), "water": L("Water"), "treats": L("Koekjes"), "harness": L("Tuigje"), "towel": L("Handdoek"), "light": L("Lampje")][v] ?? v.capitalized
    }
    static func experience(_ v: String) -> String {
        ["none": L("Nog geen ervaring"), "some": L("Wat ervaring"), "lots": L("Veel ervaring")][v] ?? v
    }
    static func status(_ v: String) -> (String, Color, Color) {
        switch v {
        case "pending": (L("Wacht op antwoord"), Palette.warn, Palette.warnSoft)
        case "accepted": ("Geaccepteerd", Palette.grass, Palette.grassSoft)
        case "declined": ("Afgewezen", Palette.danger, Palette.dangerSoft)
        case "completed": ("Gelopen", Palette.calm, Palette.calmSoft)
        case "cancelled": ("Geannuleerd", Palette.muted, Palette.sunken)
        default: (v, Palette.muted, Palette.sunken)
        }
    }
    static func badge(_ v: String) -> (String, String) {
        switch v {
        case "id-seen": (L("ID gezien"), "person.text.rectangle.fill")
        case "quiz": (L("Quiz gehaald"), "checkmark.seal.fill")
        case "regular": (L("Vaste wandelaar"), "star.fill")
        default: ("Nieuw", "leaf.fill")
        }
    }
    static func weekday(_ n: Int) -> String {
        ["", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"][max(0, min(7, n))]
    }
}

enum Format {
    static func distance(_ meters: Int?) -> String? {
        guard let meters else { return nil }
        if meters < 1000 { return L("\(max(100, (meters / 100) * 100)) m") }
        return String(format: "%.1f km", Double(meters) / 1000).replacingOccurrences(of: ".", with: ",")
    }

    static func distance(_ meters: Double) -> String {
        meters < 1000 ? "\(Int(meters)) m" : String(format: "%.2f km", meters / 1000).replacingOccurrences(of: ".", with: ",")
    }

    static let dutch = Locale.autoupdatingCurrent

    static func when(_ date: Date) -> String {
        let cal = Calendar.current
        let time = date.formatted(.dateTime.hour().minute().locale(dutch))
        if cal.isDateInToday(date) { return L("Vandaag \(time)") }
        if cal.isDateInTomorrow(date) { return L("Morgen \(time)") }
        let day = date.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(dutch))
        return day.prefix(1).uppercased() + day.dropFirst() + L(" · \(time)")
    }
}

/// A gentle staggered entrance for list items.
struct Appear: ViewModifier {
    var index: Int
    @State private var shown = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .opacity(shown ? 1 : 0)
            .offset(y: shown || reduceMotion ? 0 : 18)
            .onAppear {
                withAnimation(.spring(duration: 0.5, bounce: 0.25).delay(Double(min(index, 8)) * 0.05)) { shown = true }
            }
    }
}

extension View {
    func appear(_ index: Int) -> some View { modifier(Appear(index: index)) }
}
