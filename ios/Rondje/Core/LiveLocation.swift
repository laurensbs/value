import Foundation

// Live location during walks can be switched off for everyone on the server (LIVE_LOCATION, web
// lib/live-location.ts), for example until the DPIA is done (privacy art. 14). GET /api/v1/config says
// so as `features.liveLocation`. Off means: the app asks for no location permission for a walk, starts
// no GPS and no background location, sends no points, and shows no map or distance; it says so calmly
// instead. A first meeting (the owner or shelter is there) still starts; a walk alone with the dog does
// not ('live-location-off' from the server, and the Start button says why). Older servers send no
// `features`, and they always had it on.

/// `features` in GET /api/v1/config: switches the server sets for everyone.
struct ServerSwitches: Decodable, Equatable, Sendable {
    /// Live location during walks. Missing (or null) means on, as on every server before the switch.
    var liveLocation = true

    init(liveLocation: Bool = true) {
        self.liveLocation = liveLocation
    }

    private enum Keys: String, CodingKey { case liveLocation }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        liveLocation = Self.switchOn(c, .liveLocation)
    }

    /// The server sends a JSON boolean. Anything else is read like LIVE_LOCATION itself (support.ts
    /// switchOn): 1, "1", "true", "on", "ja", "aan" are on; any other value is off, so a switch someone
    /// meant to turn off never stays on by accident. Missing or null: on.
    private static func switchOn(_ c: KeyedDecodingContainer<Keys>, _ key: Keys) -> Bool {
        guard c.contains(key), (try? c.decodeNil(forKey: key)) != true else { return true }
        if let value = try? c.decode(Bool.self, forKey: key) { return value }
        if let value = try? c.decode(Int.self, forKey: key) { return value == 1 }
        if let value = try? c.decode(String.self, forKey: key) {
            return ["", "1", "true", "on", "ja", "aan"].contains(value.trimmingCharacters(in: .whitespaces).lowercased())
        }
        return false
    }
}

/// The server's switches as this phone last heard them, kept between launches (so a walk that starts
/// without signal follows the last answer). Loaded when the app comes to the front and right before a
/// walk starts.
@MainActor
@Observable
final class ServerFeatures {
    static let shared = ServerFeatures()
    private static let liveLocationKey = "feature.liveLocation"

    /// Live location during walks (features.liveLocation). On until a server says otherwise.
    private(set) var liveLocation: Bool
    @ObservationIgnored private var loadedAt: Date?
    @ObservationIgnored private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        liveLocation = defaults.object(forKey: Self.liveLocationKey) as? Bool ?? true
    }

    func apply(_ config: AppConfig) {
        liveLocation = config.liveLocation
        defaults.set(liveLocation, forKey: Self.liveLocationKey)
        loadedAt = .now
    }

    /// `force`: right before a walk starts, so the walk follows the server's switch of this moment.
    func refresh(force: Bool = false) async {
        if !force, let loadedAt, loadedAt.timeIntervalSinceNow > -5 * 60 { return }
        // No connection: keep the last answer.
        guard let config = try? await APIClient.shared.config() else { return }
        apply(config)
    }
}
