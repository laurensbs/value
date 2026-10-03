import Foundation

/// Everything that names the product. The working name may change (for example to "Goed Rondje"):
/// change APP_DISPLAY_NAME in project.yml and the copy below, and the whole app follows.
enum Brand {
    /// The name on the Home Screen, read from the bundle so it is set in exactly one place.
    static var name: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String ?? "Rondje"
    }

    static var tagline: String { L("Samen een rondje met een hond die dat goed kan gebruiken.") }

    /// The website and API. Debug builds talk to the local server, release builds to production.
    static var baseURL: URL {
        let raw = Bundle.main.object(forInfoDictionaryKey: "RondjeAPIBaseURL") as? String ?? ""
        return URL(string: raw) ?? URL(string: "https://rondje-five.vercel.app")!
    }

    /// Links people share always point to the public website, also from a debug build.
    static let publicURL = URL(string: "https://rondje-five.vercel.app")!

    static func share(_ path: String) -> URL {
        publicURL.appending(path: path.hasPrefix("/") ? String(path.dropFirst()) : path)
    }

    static func web(_ path: String) -> URL {
        baseURL.appending(path: path.hasPrefix("/") ? String(path.dropFirst()) : path)
    }

    /// The kind of causes members' gifts should go to later. No agreement with any organisation
    /// exists yet, so the app names kinds of causes, never organisations.
    static let causes: [Cause] = [
        Cause(
            name: L("Dierenopvangen"),
            symbol: "pawprint.fill",
            line: L("Opvangen die honden een nieuwe kans geven, met eten, zorg en wandelingen.")
        ),
        Cause(
            name: L("Ouderen in de buurt"),
            symbol: "house.fill",
            line: L("Initiatieven die ervoor zorgen dat ouderen met een hond langer zelfstandig kunnen blijven.")
        ),
    ]

    struct Cause: Identifiable, Hashable {
        var id: String { name }
        let name: String
        let symbol: String
        let line: String
    }
}
