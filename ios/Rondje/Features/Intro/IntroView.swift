import SwiftUI

/// The first thing a new person sees: four calm pages that explain Rondje step by step,
/// before any form. Shown once; "Overslaan" is always there.
struct IntroView: View {
    var done: () -> Void
    @State private var page = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private struct Page: Identifiable {
        let id: Int
        let title: String
        let text: String
        let looks: [DogLook]
        let tint: Color
        let symbol: String
    }

    private var pages: [Page] {
        [
            Page(id: 0, title: L("Er wacht een hond op je"),
                 text: L("Bij jou in de buurt wonen honden van mensen die zelf niet ver meer kunnen lopen. Een extra rondje maakt hun dag."),
                 looks: [Self.golden, Self.border, Self.brown], tint: Palette.grassSoft, symbol: "pawprint.fill"),
            Page(id: 1, title: L("Eerst kennismaken"),
                 text: L("Je loopt de eerste keer samen met de eigenaar. Zo leer je de hond kennen en weet iedereen waar hij aan toe is."),
                 looks: [Self.border], tint: Palette.calmSoft, symbol: "person.2.fill"),
            Page(id: 2, title: L("Samen op pad"),
                 text: L("Daarna wandel je zelfstandig. De eigenaar kijkt live mee, en jij stuurt een foto of een plasje door."),
                 looks: [Self.brown], tint: Palette.warnSoft, symbol: "figure.walk"),
            Page(id: 3, title: L("Goed voor jullie allebei"),
                 text: L("Buiten zijn met een hond helpt tegen stress en eenzaamheid. Het is gratis, zonder reclame, en veilig."),
                 looks: [Self.golden, Self.brown], tint: Palette.grassSoft, symbol: "heart.fill"),
        ]
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button("Overslaan") { done() }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.muted)
                    .opacity(page < pages.count - 1 ? 1 : 0)
            }
            .padding(.horizontal, 24)
            .padding(.top, 8)

            TabView(selection: $page) {
                ForEach(pages) { p in
                    VStack(spacing: 28) {
                        Spacer(minLength: 10)
                        IntroScene(looks: p.looks, tint: p.tint, symbol: p.symbol, active: page == p.id && !reduceMotion)
                            .frame(height: 300)
                        VStack(spacing: 12) {
                            Text(p.title).font(.display(30)).multilineTextAlignment(.center)
                            Text(p.text).font(.title3).foregroundStyle(Palette.muted).multilineTextAlignment(.center)
                        }
                        .padding(.horizontal, 28)
                        Spacer()
                    }
                    .tag(p.id)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            HStack(spacing: 8) {
                ForEach(pages) { p in
                    Capsule()
                        .fill(p.id == page ? Palette.grass : Palette.line)
                        .frame(width: p.id == page ? 26 : 8, height: 8)
                }
            }
            .animation(.spring(duration: 0.35), value: page)
            .padding(.bottom, 20)

            Button {
                if page < pages.count - 1 { withAnimation(.snappy) { page += 1 } } else { done() }
            } label: {
                Text(page < pages.count - 1 ? L("Volgende") : L("Aan de slag"))
            }
            .buttonStyle(.primary)
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
        }
        .screenBackground()
        .sensoryFeedback(.selection, trigger: page)
    }

    static let golden = DogLook(fur: "#e2b45c", ears: "#c99540", muzzle: "#f2d79b", earStyle: "floppy", head: "round", tongue: true, collar: "#1f5a3d", tile: "#f6ebcf")
    static let border = DogLook(fur: "#20242a", ears: "#20242a", muzzle: "#ffffff", earStyle: "pointy", head: "narrow", blaze: "#ffffff", collar: "#c0392b", tile: "#dfe5ea")
    static let brown = DogLook(fur: "#c47c3e", ears: "#6b3f1f", muzzle: "#ffffff", earStyle: "fold", head: "wide", brows: "#e8bf7a", collar: "#2d5d8a", tile: "#ecdcd0")
}

/// A soft circle with dogs that bob gently, and a badge with the page's symbol.
private struct IntroScene: View {
    let looks: [DogLook]
    let tint: Color
    let symbol: String
    let active: Bool
    @State private var bob = false

    var body: some View {
        ZStack {
            Circle().fill(tint).frame(width: 280, height: 280)
            Circle().strokeBorder(Palette.ball, style: StrokeStyle(lineWidth: 10, lineCap: .round, dash: [18, 26]))
                .frame(width: 300, height: 300)
                .rotationEffect(.degrees(bob ? 20 : 0))
            ForEach(Array(looks.enumerated()), id: \.offset) { i, look in
                let spread = CGFloat(i) - CGFloat(looks.count - 1) / 2
                DogPortrait(look: look, cornerRadius: 32)
                    .frame(width: looks.count == 1 ? 170 : 120, height: looks.count == 1 ? 170 : 120)
                    .rotationEffect(.degrees(Double(spread) * 8))
                    .offset(x: spread * 86, y: bob ? -6 + abs(spread) * 14 : abs(spread) * 14)
                    .shadow(color: .black.opacity(0.1), radius: 12, y: 8)
            }
            Image(systemName: symbol)
                .font(.title2.weight(.bold))
                .foregroundStyle(Palette.onBall)
                .frame(width: 56, height: 56)
                .background(Palette.ball, in: .circle)
                .offset(x: 110, y: -110)
                .scaleEffect(bob ? 1.05 : 0.95)
        }
        .onAppear { if active { start() } }
        .onChange(of: active) { _, on in if on { start() } }
    }

    private func start() {
        withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) { bob = true }
    }
}
