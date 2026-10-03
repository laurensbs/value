import UIKit

/// Small, meaningful haptics: a tap for choices, success for real milestones, never constant buzzing.
/// Real moments also get a soft sound, so a call site says it once: `Haptics.success(.finish)`.
/// `success` and `error` bring their own sound by default; taps and soft touches stay silent unless asked.
@MainActor
enum Haptics {
    static func tap(_ sound: SoundFX.Sound? = nil) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        play(sound)
    }

    static func soft(_ sound: SoundFX.Sound? = nil) {
        UIImpactFeedbackGenerator(style: .soft).impactOccurred(intensity: 0.7)
        play(sound)
    }

    static func success(_ sound: SoundFX.Sound? = .success) {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        play(sound)
    }

    static func warning() { UINotificationFeedbackGenerator().notificationOccurred(.warning) }

    static func error(_ sound: SoundFX.Sound? = .error) {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
        play(sound)
    }

    private static func play(_ sound: SoundFX.Sound?) {
        if let sound { SoundFX.play(sound) }
    }
}
