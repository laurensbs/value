import SwiftUI

/// On Ontdek, once: Guus offers a calm seintje on a fixed moment. And if Guus stopped the seintjes
/// himself because they were not opened, he says so once, calmly. Never both at the same time.
struct NudgeOfferCard: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let settings = Nudges.settings
        if settings.stoppedByGuus {
            CoachBubble(
                mood: .calm,
                text: L("Ik stuur je even geen seintjes meer. Aanzetten kan altijd bij Jij, Seintjes."),
                secondary: CoachButton(L("Oké")) {
                    Haptics.tap()
                    withAnimation(.smooth) { Nudges.update { $0.stoppedByGuus = false } }
                }
            )
            .transition(.opacity)
        } else if !settings.offered, !settings.enabled, (model.me?.trust?.walks ?? 0) >= 1 {
            CoachBubble(
                mood: .happy,
                text: L("Wil je een rustig seintje op een vast moment? Jij kiest wanneer."),
                primary: CoachButton(L("Kies een moment")) {
                    Haptics.tap()
                    Nudges.update { $0.offered = true }
                    model.perform(.nudgeSettings)
                },
                secondary: CoachButton(L("Nee, dank je")) {
                    Haptics.tap()
                    withAnimation(.smooth) { Nudges.update { $0.offered = true } }
                }
            )
            .transition(.opacity)
        }
    }
}
