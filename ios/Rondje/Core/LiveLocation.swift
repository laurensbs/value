import Foundation

// Live location during walks can be switched off for everyone on the server (LIVE_LOCATION, web
// lib/live-location.ts); since #37 it is off unless the server turns it on, until the DPIA is done
// (privacy art. 14). GET /api/v1/config says so as `features.liveLocation`. Off means: the app asks for
// no location permission for a walk, starts no GPS and no background location, sends no points, and
// shows no map or distance; it says so calmly instead. A first meeting (the owner or shelter is there)
// still starts; a walk alone with the dog cannot be asked for, accepted or started ('live-location-off'
// from the server), and its card says why on both sides (LiveLocationPause, below). Older servers send no
// `features`, and they always had it on.
//
// Even with the switch on, only a walk alone with the dog shares where the walker is (web lib/rules.ts
// walkHasLiveLocation, WalkStarter.sharesLocation). A first meeting never does: "Jullie lopen samen, dus
// er is geen kaart nodig." POST /api/v1/walks says per walk whether it shares (`liveLocation`), and
// /live says it with the walk's `kind`.

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
        set(liveLocation: config.liveLocation)
    }

    /// The server just answered 'live-location-off' (a request, accepting or starting a walk alone):
    /// remembered straight away, without another call, so every card says it from now on.
    func liveLocationSwitchedOff() {
        set(liveLocation: false)
    }

    private func set(liveLocation: Bool) {
        self.liveLocation = liveLocation
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

// MARK: A walk alone that waits

// While live location is off, a walk alone with the dog cannot be asked for, accepted or started (web
// lib/rules.ts canRequestSolo and liveLocationReason; the server answers 'live-location-off'). One agreed
// while it was on stays agreed: both sides read one calm note on its card, Start and Accepteer wait, and
// Weiger and Annuleer always work. A first meeting (walking together) is never affected.

enum LiveLocationPause {
    /// The server's reason ('live-location-off': `paused`, `canRequest.solo` and the errors).
    static let reason = "live-location-off"

    /// The note both sides read, the same words as the website (request.reasons.live-location-off).
    static var note: String {
        L("Live locatie staat voorlopig uit, dus een rondje alleen start nog niet. Samen lopen kan wel.")
    }
}

extension APIError {
    /// The server says live location is off, so this walk alone cannot be asked for, accepted or started.
    var liveLocationOff: Bool { code == LiveLocationPause.reason }
}

extension Appointment {
    /// `paused` in GET /api/v1/requests: `{ reason, message }`, or null. Read leniently: anything without a
    /// reason counts as not paused, so an odd value never hides an appointment.
    struct Paused: Codable, Hashable, Sendable {
        var reason: String
        var message: String?

        init(reason: String = LiveLocationPause.reason, message: String? = nil) {
            self.reason = reason
            self.message = message
        }

        private enum CodingKeys: String, CodingKey { case reason, message }

        init(from decoder: Decoder) throws {
            let c = try? decoder.container(keyedBy: CodingKeys.self)
            reason = (try? c?.decodeIfPresent(String.self, forKey: .reason)) ?? ""
            message = (try? c?.decodeIfPresent(String.self, forKey: .message)) ?? nil
        }
    }

    /// A walk alone with the dog, asked for or agreed and not running yet, that waits because live location
    /// is off. The server says so per appointment (`paused`); an older server does not, and then the switch
    /// as this phone last heard it decides with the same rule. Either one is enough: privacy first.
    func waitsForLiveLocation(liveLocation: Bool) -> Bool {
        guard kind == "solo", isOpen, walkStatus != "active" else { return false }
        return paused?.reason.isEmpty == false || !liveLocation
    }

    /// Saying yes to this request now. A walk alone waits while live location is off; saying no never waits.
    func canAccept(liveLocation: Bool) -> Bool {
        status == "pending" && !waitsForLiveLocation(liveLocation: liveLocation)
    }
}

/// The calm line about live location on an appointment card.
struct LiveLocationNote: Equatable {
    var text: String
    var symbol: String

    /// A walk alone that waits: on every such card, for the walker and the owner alike, from the request
    /// on. Around the start, for the walker only: a first meeting shares no location (they walk together),
    /// and a walk alone already running while the switch is off shares none either.
    static func make(for item: Appointment, asOwner: Bool, liveLocation: Bool, now: Date = .now) -> LiveLocationNote? {
        if item.waitsForLiveLocation(liveLocation: liveLocation) {
            return LiveLocationNote(text: LiveLocationPause.note, symbol: "location.slash")
        }
        guard !asOwner, !item.isCall, item.canStart(now: now), item.walkStatus != "ended" else { return nil }
        if item.isMeeting {
            return LiveLocationNote(text: L("Jullie lopen samen, dus er is geen kaart nodig."), symbol: "figure.2")
        }
        if !liveLocation {
            return LiveLocationNote(text: L("Live locatie staat op dit moment uit: je telefoon deelt tijdens dit rondje geen locatie."), symbol: "location.slash")
        }
        return nil
    }
}
