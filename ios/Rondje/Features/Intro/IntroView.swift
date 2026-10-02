import SwiftUI

/// The first thing a new person sees: four calm pages that explain Rondje step by step,
/// before any form. Shown once; "Overslaan" is always there.
struct IntroView: View {
    var done: () -> Void
    @State private var page = 0
    /// "walker", "owner" or "both": chosen on the first page, used for the pages after it and as the onboarding default.
    @AppStorage("introRole") private var role = ""
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private struct Page: Identifiable {
        let id: Int
        let title: String
        let text: String
        let looks: [DogLook]
        let tint: Color
        let symbol: String
    }

    private var walkerPages: [Page] {
        [
            Page(id: 1, title: L("Er wacht een hond op je"),
                 text: L("Bij jou in de buurt wonen honden van mensen die zelf niet ver meer kunnen lopen. Een extra rondje maakt hun dag."),
                 looks: [Self.golden, Self.border, Self.brown], tint: Palette.grassSoft, symbol: "pawprint.fill"),
            Page(id: 2, title: L("Eerst kennismaken"),
                 text: L("Je loopt de eerste keer samen met de eigenaar. Zo leer je de hond kennen en weet iedereen waar hij aan toe is."),
                 looks: [Self.border], tint: Palette.calmSoft, symbol: "person.2.fill"),
            Page(id: 3, title: L("Samen op pad"),
                 text: L("Daarna wandel je zelfstandig. De eigenaar kijkt live mee, en jij stuurt een foto of een plasje door."),
                 looks: [Self.brown], tint: Palette.warnSoft, symbol: "figure.walk"),
            Page(id: 4, title: L("Goed voor jullie allebei"),
                 text: L("Samen buiten zijn met een hond kan je dag goed doen. Het is gratis, zonder reclame, en veilig."),
                 looks: [Self.golden, Self.brown], tint: Palette.grassSoft, symbol: "heart.fill"),
        ]
    }

    private var ownerPages: [Page] {
        [
            Page(id: 1, title: L("Hulp voor je hond"),
                 text: L("Kun je zelf niet meer zo ver lopen? Iemand uit je buurt maakt graag een rondje met je hond."),
                 looks: [Self.golden], tint: Palette.grassSoft, symbol: "house.fill"),
            Page(id: 2, title: L("Jij beslist"),
                 text: L("Je kiest zelf wie er komt. De eerste keer loop je samen en zie je het ID van de wandelaar."),
                 looks: [Self.border], tint: Palette.calmSoft, symbol: "hand.raised.fill"),
            Page(id: 3, title: L("Kijk live mee"),
                 text: L("Tijdens het rondje zie je waar ze lopen, krijg je een foto, en hoor je of je hond heeft geplast."),
                 looks: [Self.brown], tint: Palette.warnSoft, symbol: "dot.radiowaves.left.and.right"),
            Page(id: 4, title: L("Gratis en veilig"),
                 text: L("Geen kosten, geen reclame. Wandelaars zijn 18+, en alles wat niet klopt kun je melden."),
                 looks: [Self.golden, Self.brown], tint: Palette.grassSoft, symbol: "checkmark.shield.fill"),
        ]
    }

    private var pages: [Page] { role == "owner" ? ownerPages : walkerPages }
    private var total: Int { pages.count + 1 }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button("Overslaan") { done() }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.muted)
                    .opacity(page < total - 1 ? 1 : 0)
            }
            .padding(.horizontal, 24)
            .padding(.top, 8)

            TabView(selection: $page) {
                choice.tag(0)
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
                ForEach(0..<total, id: \.self) { i in
                    Capsule()
                        .fill(i == page ? Palette.grass : Palette.line)
                        .frame(width: i == page ? 26 : 8, height: 8)
                }
            }
            .animation(.spring(duration: 0.35), value: page)
            .padding(.bottom, 20)

            Button {
                if page < total - 1 { withAnimation(.snappy) { page += 1 } } else { done() }
            } label: {
                Text(page < total - 1 ? L("Volgende") : L("Aan de slag"))
            }
            .buttonStyle(.primary)
            .disabled(page == 0 && role.isEmpty)
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
        }
        .screenBackground()
        .sensoryFeedback(.selection, trigger: page)
    }

    private var choice: some View {
        VStack(alignment: .leading, spacing: 16) {
            Spacer(minLength: 10)
            HStack(spacing: -24) {
                DogPortrait(look: Self.golden, cornerRadius: 28).frame(width: 96, height: 96).rotationEffect(.degrees(-8))
                DogPortrait(look: Self.border, cornerRadius: 28).frame(width: 110, height: 110).zIndex(1)
                DogPortrait(look: Self.brown, cornerRadius: 28).frame(width: 96, height: 96).rotationEffect(.degrees(8))
            }
            .frame(maxWidth: .infinity)
            .padding(.bottom, 8)
            Text("Hoi! Wat brengt je hier?").font(.display(30))
            Text("Dan laten we je precies zien wat voor jou belangrijk is.").foregroundStyle(Palette.muted)
            option("walker", L("Ik wil wandelen"), L("Met een hond uit de buurt of uit de opvang."), "figure.walk")
            option("owner", L("Ik heb een hond"), L("Of ik zoek hulp voor de hond van een buurvrouw, opa of oma."), "house.fill")
            option("both", L("Allebei"), L("Wandelen met andere honden, en hulp voor je eigen hond."), "arrow.left.arrow.right")
            Spacer()
        }
        .padding(.horizontal, 24)
    }

    private func option(_ id: String, _ title: String, _ text: String, _ symbol: String) -> some View {
        let selected = role == id
        return Button {
            role = id
            Haptics.tap()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { withAnimation(.snappy) { page = 1 } }
        } label: {
            HStack(spacing: 14) {
                Image(systemName: symbol)
                    .font(.title3)
                    .frame(width: 46, height: 46)
                    .background(selected ? Palette.grass : Palette.sunken, in: .rect(cornerRadius: 14, style: .continuous))
                    .foregroundStyle(selected ? Palette.onGrass : Palette.ink)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.headline)
                    Text(text).font(.subheadline).foregroundStyle(Palette.muted).multilineTextAlignment(.leading)
                }
                Spacer()
            }
            .padding(14)
            .background(Palette.surface, in: .rect(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(selected ? Palette.grass : .clear, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .animation(.snappy, value: role)
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
