import SwiftUI

/// First screen: what Rondje is, then sign in or create an account.
struct WelcomeView: View {
    @Environment(AppModel.self) private var model
    @State private var mode: AuthView.Mode?
    @State private var social = SocialSignIn.shared
    @State private var height: CGFloat = 900
    @AppStorage("introRole") private var role = ""

    private let looks: [DogLook] = [
        DogLook(fur: "#e2b45c", ears: "#c99540", muzzle: "#f2d79b", earStyle: "floppy", head: "round", tongue: true, collar: "#1f5a3d", tile: "#f6ebcf"),
        DogLook(fur: "#20242a", ears: "#20242a", muzzle: "#ffffff", earStyle: "pointy", head: "narrow", blaze: "#ffffff", collar: "#c0392b", tile: "#dfe5ea"),
        DogLook(fur: "#c47c3e", ears: "#6b3f1f", muzzle: "#ffffff", earStyle: "fold", head: "wide", brows: "#e8bf7a", tongue: false, collar: "#2d5d8a", tile: "#ecdcd0"),
    ]

    /// With Apple and Google on offer there are more buttons: on a smaller iPhone the dogs make room.
    private var compact: Bool { social.options.any && height < 760 }

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: compact ? 8 : 24)
            ZStack {
                ForEach(Array(looks.enumerated()), id: \.offset) { i, look in
                    DogPortrait(look: look, cornerRadius: 36)
                        .frame(width: 132, height: 132)
                        .rotationEffect(.degrees(Double(i - 1) * 9))
                        .offset(x: CGFloat(i - 1) * 96, y: i == 1 ? -18 : 14)
                        .shadow(color: .black.opacity(0.12), radius: 16, y: 10)
                        // Only the bobbing repeats: a phase animator keeps layout changes (such as the
                        // sign-in buttons appearing) out of the endless animation.
                        .phaseAnimator([false, true]) { portrait, up in
                            portrait.offset(y: up ? (i == 1 ? -6 : 4) : 0)
                        } animation: { _ in
                            .easeInOut(duration: 2.2).delay(Double(i) * 0.3)
                        }
                }
            }
            .scaleEffect(compact ? 0.75 : 1)
            .frame(height: compact ? 165 : 220)

            VStack(spacing: 14) {
                Text(Brand.name)
                    .font(.display(46, weight: .heavy))
                    .foregroundStyle(Palette.grass)
                Text(role == "owner" ? L("Iemand uit je buurt maakt graag een rondje met je hond. Gratis en veilig.") : L("Wandel met een hond uit je buurt die een extra rondje goed kan gebruiken."))
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
            .padding(.top, compact ? 12 : 28)

            Spacer()

            VStack(spacing: 12) {
                if social.options.any {
                    SocialSignInButtons { message in
                        model.show(message, symbol: "exclamationmark.circle.fill", tint: Palette.danger)
                    }
                }
                Button("Maak een account") { mode = .signUp }.buttonStyle(.primary)
                Button("Ik heb al een account") { mode = .signIn }.buttonStyle(.secondary)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
        }
        .screenBackground()
        .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { height = $0 }
        .task { await social.load() }
        .animation(.snappy, value: social.options)
        .sheet(item: $mode) { mode in
            AuthView(mode: mode)
                .presentationDetents([.large])
                .presentationCornerRadius(32)
        }
    }
}
