import Foundation

/// The language the app shows itself in. iOS picks it from the phone's languages, or from the choice
/// under Settings › Rondje Mee › Language (Apple's per-app language; Jij › Taal opens that page).
/// The server gets the same language, so its texts match the screen.
enum AppLanguage {
    /// The app's languages, as on the website. Dutch is the source.
    static let supported = ["nl", "en", "fr", "es"]

    /// "nl", "en", "fr" or "es": the localization iOS chose for this app right now.
    static var code: String { code(from: Bundle.main.preferredLocalizations) }

    /// The first of our languages in a list such as Bundle.preferredLocalizations ("en-GB" counts as "en").
    static func code(from localizations: [String]) -> String {
        for identifier in localizations {
            let base = identifier.lowercased().split(whereSeparator: { $0 == "-" || $0 == "_" }).first.map(String.init) ?? ""
            if supported.contains(base) { return base }
        }
        return "nl"
    }

    /// The language's own name, as the website's language switcher shows it: "Nederlands", "English" …
    static func name(of code: String) -> String {
        let own = Locale(identifier: code)
        let name = own.localizedString(forLanguageCode: code) ?? code
        return name.prefix(1).uppercased(with: own) + name.dropFirst()
    }

    static var name: String { name(of: code) }
}
