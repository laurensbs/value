import SwiftUI

/// Rondje's palette, the same tokens as the website (web/src/app/globals.css), light and dark.
enum Palette {
    static let paper = Color(light: 0xF4F6F0, dark: 0x0D1310)
    static let surface = Color(light: 0xFFFFFF, dark: 0x161F1A)
    static let sunken = Color(light: 0xE7ECE3, dark: 0x1D2822)
    static let ink = Color(light: 0x16201A, dark: 0xE7EEE8)
    static let muted = Color(light: 0x55635A, dark: 0x9EAFA4)
    static let line = Color(light: 0xD3DBD0, dark: 0x2A372F)
    static let grass = Color(light: 0x1F5A3D, dark: 0x8FDCAE)
    static let grassSoft = Color(light: 0xDCEBE0, dark: 0x1F3529)
    static let onGrass = Color(light: 0xFFFFFF, dark: 0x0D1310)
    static let ball = Color(hex: 0xD9F05A)
    static let onBall = Color(hex: 0x16201A)
    static let calm = Color(light: 0x2D5D8A, dark: 0x9CC4EA)
    static let calmSoft = Color(light: 0xE1EBF5, dark: 0x1A2A3A)
    static let warn = Color(light: 0xA35A00, dark: 0xF2B45A)
    static let warnSoft = Color(light: 0xFBECD6, dark: 0x3A2A12)
    static let danger = Color(light: 0xB3261E, dark: 0xF2A49E)
    static let dangerSoft = Color(light: 0xF9DEDC, dark: 0x3D1715)
    static let route = Color(light: 0x1F5A3D, dark: 0xD9F05A)
    static let walkBackground = Color(light: 0x1F5A3D, dark: 0x143A2A)
    /// Text and icons on walkBackground: stays light in both modes (onGrass turns dark in dark mode).
    static let onWalk = Color(light: 0xFFFFFF, dark: 0xE7EEE8)
}

/// One motion language, the same six values as the website (web/src/app/globals.css: --motion-*).
/// Something appearing may take a little longer than something leaving. With Reduce Motion, use
/// `Motion.or(_:reduce:)`: then nothing moves, it only fades.
enum Motion {
    /// Pressing a button (scale 0.97). Web: 120 ms.
    static let tik = Animation.spring(response: 0.25, dampingFraction: 0.7)
    /// A tick, chip, status label or counter. Web: 200 ms.
    static let klein = Animation.spring(response: 0.3, dampingFraction: 0.85)
    /// A step, sheet or card coming in. Web: 320 ms.
    static let scherm = Animation.spring(response: 0.4, dampingFraction: 0.9)
    /// Something leaving. Web: 200 ms.
    static let weg = Animation.easeIn(duration: 0.2)
    /// A paw, level ball or tick appearing: about 6% overshoot, cheerful without bouncing. Web: 500 ms.
    static let pop = Animation.spring(response: 0.5, dampingFraction: 0.65)
    /// The breathing minute: 4 seconds in, 6 seconds out.
    static func adem(in breathingIn: Bool) -> Animation { .easeInOut(duration: ademDuur(in: breathingIn)) }
    static func ademDuur(in breathingIn: Bool) -> TimeInterval { breathingIn ? 4 : 6 }

    /// With Reduce Motion: only opacity, in 200 ms.
    static let vervaag = Animation.easeInOut(duration: 0.2)

    static func or(_ animation: Animation, reduce: Bool) -> Animation { reduce ? vervaag : animation }
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }

    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            let hex = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(
                red: CGFloat((hex >> 16) & 0xFF) / 255,
                green: CGFloat((hex >> 8) & 0xFF) / 255,
                blue: CGFloat(hex & 0xFF) / 255,
                alpha: 1
            )
        })
    }

    /// "#e2b45c" → Color. Falls back to grey for anything unexpected from the server.
    init(css: String?) {
        guard let css, css.hasPrefix("#"), let value = UInt32(css.dropFirst(), radix: 16) else {
            self = .gray
            return
        }
        self.init(hex: value)
    }
}

extension Font {
    /// Rounded, friendly display type for titles (the website uses Bricolage Grotesque).
    /// Scales with the person's text size setting (Dynamic Type), like the system text styles.
    static func display(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        .system(size: UIFontMetrics(forTextStyle: .title1).scaledValue(for: size), weight: weight, design: .rounded)
    }
}

/// A translated string from the string catalog (Localizable.xcstrings), for places that take a plain String.
/// Literals in Text, Label, Button and friends are translated by SwiftUI already.
func L(_ value: String.LocalizationValue) -> String {
    String(localized: value)
}
