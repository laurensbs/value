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

    static func web(_ path: String) -> URL {
        baseURL.appending(path: path.hasPrefix("/") ? String(path.dropFirst()) : path)
    }

    /// Charities Rondje wants to support with its membership (onderzoek/marktonderzoek-en-model.md).
    /// No agreement is signed yet, so the app speaks about them as intentions, never as partners.
    static let causes: [Cause] = [
        Cause(
            name: L("Depressie Vereniging"),
            symbol: "sun.max.fill",
            line: L("Voor mensen met een depressie en hun naasten. Wandelen met een hond helpt tegen somberheid.")
        ),
        Cause(
            name: L("Hulphond Nederland"),
            symbol: "pawprint.fill",
            line: L("Leidt honden op die mensen met een beperking of trauma helpen zelfstandig te leven.")
        ),
    ]

    struct Cause: Identifiable, Hashable {
        var id: String { name }
        let name: String
        let symbol: String
        let line: String
    }
}
