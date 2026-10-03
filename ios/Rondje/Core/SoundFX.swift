import AVFoundation
import UIKit

/// Small, gentle sounds for the moments that matter (made by design/sounds.py; the website plays the same files).
/// They follow the silent switch, never interrupt music or a podcast, never play in the background,
/// and can be switched off under Jij. Most of them come with a haptic: see `Haptics`.
@MainActor
enum SoundFX {
    enum Sound: String, CaseIterable {
        case tap, select, send, success, start, finish
        case levelUp = "levelup"
        case breatheIn = "breathe-in"
        case breatheOut = "breathe-out"
        case error

        /// The small ticks stay quieter than the moments.
        var volume: Float {
            switch self {
            case .tap, .select: 0.55
            case .breatheIn, .breatheOut: 0.7
            default: 0.8
            }
        }
    }

    /// On by default; the switch is under Jij.
    static let enabledKey = "sounds.enabled"

    static var enabled: Bool {
        get { UserDefaults.standard.object(forKey: enabledKey) as? Bool ?? true }
        set {
            UserDefaults.standard.set(newValue, forKey: enabledKey)
            if newValue { play(.select) }
        }
    }

    private static var players: [Sound: AVAudioPlayer] = [:]
    private static var prepared = false

    static func play(_ sound: Sound) {
        guard enabled, UIApplication.shared.applicationState == .active else { return }
        prepare()
        guard let player = players[sound] else { return }
        player.currentTime = 0
        player.play()
    }

    /// Sets up the audio session and loads every sound once, so none of them waits for the disk.
    /// `.ambient` mixes with other audio and respects the silent switch.
    static func prepare() {
        guard !prepared else { return }
        prepared = true
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        for sound in Sound.allCases {
            guard let url = Bundle.main.url(forResource: sound.rawValue, withExtension: "wav"),
                  let player = try? AVAudioPlayer(contentsOf: url) else { continue }
            player.volume = sound.volume
            player.prepareToPlay()
            players[sound] = player
        }
    }
}
