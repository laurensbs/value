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
