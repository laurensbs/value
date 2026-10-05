import Foundation

/// Everything that names the product: Rondje Mee, at https://rondjemee.nl. To rename it, change
/// APP_DISPLAY_NAME in project.yml and the copy below, and the whole app follows.
enum Brand {
    /// The name on the Home Screen, read from the bundle so it is set in exactly one place.
    static var name: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String ?? "Rondje Mee"
    }

    static var tagline: String { L("Samen een rondje met een hond die dat goed kan gebruiken.") }

    /// The website and API. Debug builds talk to the local server, release builds to production.
    static var baseURL: URL {
        let raw = Bundle.main.object(forInfoDictionaryKey: "RondjeAPIBaseURL") as? String ?? ""
        return URL(string: raw) ?? URL(string: "https://rondjemee.nl")!
    }

    /// Links people share always point to the public website, also from a debug build.
    static let publicURL = URL(string: "https://rondjemee.nl")!

    static func share(_ path: String) -> URL {
        publicURL.appending(path: path.hasPrefix("/") ? String(path.dropFirst()) : path)
    }

    static func web(_ path: String) -> URL {
        baseURL.appending(path: path.hasPrefix("/") ? String(path.dropFirst()) : path)
    }
}
