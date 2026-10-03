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

    /// A tail wag: three light taps that grow a little, for Guus being pleased.
    static func wag() {
        play(.light, intensities: [0.5, 0.7, 0.9], gaps: [90, 90])
    }

    /// One crisp pop, for small things that went well (and for everything during a walk).
    static func pop() { UIImpactFeedbackGenerator(style: .rigid).impactOccurred(intensity: 0.8) }

    /// Six soft taps that speed up, just before a result is shown.
    static func drumroll() {
        play(.soft, intensities: Array(repeating: 0.7, count: 6), gaps: [160, 135, 110, 85, 60])
    }

    /// Plays impacts one after another; `gaps` are the milliseconds between them.
    private static func play(_ style: UIImpactFeedbackGenerator.FeedbackStyle, intensities: [CGFloat], gaps: [Int]) {
        Task { @MainActor in
            let generator = UIImpactFeedbackGenerator(style: style)
            generator.prepare()
            for (i, intensity) in intensities.enumerated() {
                if i > 0 { try? await Task.sleep(for: .milliseconds(gaps[min(i - 1, gaps.count - 1)])) }
                generator.impactOccurred(intensity: intensity)
            }
        }
    }

    static func error(_ sound: SoundFX.Sound? = .error) {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
        play(sound)
    }

    private static func play(_ sound: SoundFX.Sound?) {
        if let sound { SoundFX.play(sound) }
    }
}
