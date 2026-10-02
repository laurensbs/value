import SwiftUI

/// First screen: what Rondje is, then sign in or create an account.
struct WelcomeView: View {
    @State private var mode: AuthView.Mode?
    @State private var bounce = false

    private let looks: [DogLook] = [
        DogLook(fur: "#e2b45c", ears: "#c99540", muzzle: "#f2d79b", earStyle: "floppy", head: "round", tongue: true, collar: "#1f5a3d", tile: "#f6ebcf"),
        DogLook(fur: "#20242a", ears: "#20242a", muzzle: "#ffffff", earStyle: "pointy", head: "narrow", blaze: "#ffffff", collar: "#c0392b", tile: "#dfe5ea"),
        DogLook(fur: "#c47c3e", ears: "#6b3f1f", muzzle: "#ffffff", earStyle: "fold", head: "wide", brows: "#e8bf7a", tongue: false, collar: "#2d5d8a", tile: "#ecdcd0"),
    ]

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 24)
            ZStack {
                ForEach(Array(looks.enumerated()), id: \.offset) { i, look in
                    DogPortrait(look: look, cornerRadius: 36)
                        .frame(width: 132, height: 132)
                        .rotationEffect(.degrees(Double(i - 1) * 9))
                        .offset(x: CGFloat(i - 1) * 96, y: i == 1 ? -18 : 14)
                        .shadow(color: .black.opacity(0.12), radius: 16, y: 10)
                        .offset(y: bounce ? (i == 1 ? -6 : 4) : 0)
                        .animation(.easeInOut(duration: 2.2).repeatForever().delay(Double(i) * 0.3), value: bounce)
                }
            }
            .frame(height: 220)
            .onAppear { bounce = true }

            VStack(spacing: 14) {
                Text(Brand.name)
                    .font(.display(46, weight: .heavy))
                    .foregroundStyle(Palette.grass)
                Text("Wandel met een hond uit je buurt die een extra rondje goed kan gebruiken.")
                    .font(.title3.weight(.medium))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Palette.ink)
                HStack(spacing: 8) {
                    Chip(text: L("Gratis"), symbol: "heart.fill")
                    Chip(text: L("Geen reclame"), symbol: "hand.raised.fill", tint: Palette.calm, soft: Palette.calmSoft)
                    Chip(text: "18+", symbol: "checkmark.shield.fill", tint: Palette.warn, soft: Palette.warnSoft)
                }
            }
            .padding(.horizontal, 28)
            .padding(.top, 28)

            Spacer()

            VStack(spacing: 12) {
                Button("Maak een account") { mode = .signUp }.buttonStyle(.primary)
                Button("Ik heb al een account") { mode = .signIn }.buttonStyle(.secondary)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
        }
        .screenBackground()
        .sheet(item: $mode) { mode in
            AuthView(mode: mode)
                .presentationDetents([.large])
                .presentationCornerRadius(32)
        }
    }
}
