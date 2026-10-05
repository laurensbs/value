import CoreLocation
import Foundation

// The JSON of the app API (web/src/app/api/v1). Optional wherever the server may send null.

struct Host: Codable, Hashable, Sendable {
    var kind: String
    var id: String
    var name: String
    var photoUrl: String?
    var city: String
    var verified: Bool
    var bio: String?
    var phone: String?
    var email: String?
    var website: String?
    var instagram: String?
    var walkingTimes: String?

    var isShelter: Bool { kind == "shelter" }
}

struct DogCard: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var name: String
    var breed: String
    var sex: String
    var ageYears: Int?
    var size: String
    var energy: String
    var level: String
    var photos: [String]
    var look: DogLook
    var story: String
    var traits: [String]
    var walkMinutes: Int
    var city: String
    var country: String
    var lat: Double?
    var lng: Double?
    var isDemo: Bool
    var distanceM: Int?
    var host: Host

    var coordinate: CLLocationCoordinate2D? {
        guard let lat, let lng else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lng)
    }
}

struct DogsResponse: Codable, Sendable { var dogs: [DogCard] }

struct DogFull: Codable, Hashable, Sendable {
    var id: String
    var name: String
    var breed: String
    var sex: String
    var ageYears: Int?
    var size: String
    var energy: String
    var level: String
    var ppp: Bool
    var photos: [String]
    var look: DogLook
    var story: String
    var needs: String
    var traits: [String]
    var treats: String
    var treatsNote: String
    var provides: [String]
    var offLeash: Bool
    var walkMinutes: Int
    var city: String
    var country: String
    var lat: Double?
    var lng: Double?
    var biteHistory: Bool
    var biteNote: String
    var isDemo: Bool
    var meetingInfo: String
    var vetInfo: String
}

struct Slot: Codable, Hashable, Sendable { var weekday: Int; var time: String }

struct GroupWalk: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var orgId: String?
    var orgName: String?
    var city: String?
    var startsAt: Date
    var durationMin: Int
    var capacity: Int
    var booked: Int
    var level: String
    var meetingPoint: String
    var notes: String?
    var isDemo: Bool?
    var mine: Bool?

    var spotsLeft: Int { max(0, capacity - booked) }
}

struct GroupWalksResponse: Codable, Sendable { var groupWalks: [GroupWalk] }

struct DogDetail: Codable, Sendable {
    struct CanRequest: Codable, Sendable { var meet: String?; var solo: String? }
    var dog: DogFull
    var host: Host
    var slots: [Slot]
    var groupWalks: [GroupWalk]
    var canSeePrivate: Bool
    var isMine: Bool
    var canRequest: CanRequest
}

struct Appointment: Codable, Identifiable, Hashable, Sendable {
    struct Dog: Codable, Hashable, Sendable {
        var id: String
        var name: String
        var photos: [String]
        var look: DogLook
        var city: String
        var isShelter: Bool
        var meetingInfo: String
        /// The owner (a person) or the shelter, to report or block from the chat. Missing from older servers.
        var ownerId: String?
        var orgId: String?
    }
    struct Contact: Codable, Hashable, Sendable {
        var kind: String
        var name: String
        var phone: String?
        var email: String?
    }
    struct Walker: Codable, Hashable, Sendable {
        var id: String
        var firstName: String
        var photoUrl: String?
        var bio: String
        var experience: String
        var ageBand: String
        var city: String
        var phone: String?
        var email: String?
    }
    struct Trust: Codable, Hashable, Sendable { var idSeen: Bool; var soloAllowed: Bool }

    var id: String
    var kind: String
    /// How a first meeting happens: walk, home, phone or video. Missing from older servers: then a walk.
    var meetVia: String?
    var status: String
    var startsAt: Date
    var durationMin: Int
    var weekly: Bool
    var message: String
    var flags: [String]
    var walkId: String?
    var walkStatus: String?
    var feedbackGiven: Bool?
    var dog: Dog
    var host: Contact?
    var walker: Walker?
    var trust: Trust?

    var isMeeting: Bool { kind == "meet" }
    var isOpen: Bool { status == "pending" || status == "accepted" }
    var via: MeetVia { MeetVia(rawValue: meetVia ?? "walk") ?? .walk }
    /// A first call (phone or video): never counts as meeting in person (lib/rules.ts).
    var isCall: Bool { isMeeting && !via.inPerson }

    /// A walk can be started from 30 minutes before until 2 hours after the appointment (lib/rules.ts),
    /// and never from a first call.
    func canStart(now: Date = .now) -> Bool {
        guard status == "accepted", !isCall else { return false }
        let diff = now.timeIntervalSince(startsAt) / 60
        return diff >= -30 && diff <= 120
    }
}

/// How a first meeting happens, as on the website (lib/rules.ts: MEET_VIAS). Only walking together
/// and a visit at home are in person; after a call, the next step is meeting in person.
enum MeetVia: String, CaseIterable, Identifiable, Codable, Sendable {
    case walk, home, phone, video
    var id: String { rawValue }
    var inPerson: Bool { self == .walk || self == .home }
    var symbol: String {
        switch self {
        case .walk: "figure.walk"
        case .home: "house.fill"
        case .phone: "phone.fill"
        case .video: "video.fill"
        }
    }
    var title: String {
        switch self {
        case .walk: L("Samen wandelen")
        case .home: L("Bij de eigenaar thuis")
        case .phone: L("Eerst bellen")
        case .video: L("Eerst videobellen")
        }
    }
    var hint: String {
        switch self {
        case .walk: L("Jullie lopen samen een rondje. De eigenaar loopt mee en bekijkt je ID.")
        case .home: L("Je komt langs bij de eigenaar en de hond. De eigenaar bekijkt je ID.")
        case .phone: L("Eerst even kennismaken aan de telefoon. Daarna spreken jullie af in het echt, met de hond erbij.")
        case .video: L("Eerst kennismaken in een videogesprek. Daarna spreken jullie af in het echt, met de hond erbij.")
        }
    }
}

struct AppointmentsResponse: Codable, Sendable {
    var outgoing: [Appointment]
    var incoming: [Appointment]
}

struct Me: Codable, Sendable {
    struct User: Codable, Sendable { var id: String; var email: String; var name: String; var isAdmin: Bool }
    struct Profile: Codable, Sendable {
        var firstName: String
        var birthDate: String
        var ageBand: String
        var country: String
        var city: String
        var bio: String
        var experience: String
        var photoUrl: String?
        var phone: String?
        var wantsToWalk: Bool
        var hasDogs: Bool
        var quizPassed: Bool
        var referralCode: String
        var emailNotifications: Bool
        var banned: Bool
    }
    struct Trust: Codable, Sendable {
        var walks: Int
        var idChecks: Int
        var quizPassed: Bool
        var memberSinceYear: Int
        var badges: [String]
    }
    struct Org: Codable, Sendable { var id: String; var name: String; var status: String; var role: String; var country: String }

    var user: User
    var profile: Profile?
    var trust: Trust?
    var orgs: [Org]
    var unread: Int
    /// Where this person stands with the terms (server/terms.ts termsForApp; Terms.swift). Missing from
    /// older servers: then the app asks nothing.
    var termsVersion: String? = nil
    var termsAccepted: Bool? = nil
    var termsEffectiveAt: Date? = nil
    var termsRequired: Bool? = nil
    /// Only while the yes is still needed: what changed.
    var termsChanges: TermsChanges? = nil
}

extension Me {
    private enum Keys: String, CodingKey {
        case user, profile, trust, orgs, unread, termsVersion, termsAccepted, termsEffectiveAt, termsRequired, termsChanges
    }

    /// The account fields as before; the terms fields leniently, so whatever is odd about them can
    /// never stop the app from knowing who is signed in.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        user = try c.decode(User.self, forKey: .user)
        profile = try c.decodeIfPresent(Profile.self, forKey: .profile)
        trust = try c.decodeIfPresent(Trust.self, forKey: .trust)
        orgs = try c.decode([Org].self, forKey: .orgs)
        unread = try c.decode(Int.self, forKey: .unread)
        termsVersion = (try? c.decodeIfPresent(String.self, forKey: .termsVersion)) ?? nil
        termsAccepted = (try? c.decodeIfPresent(Bool.self, forKey: .termsAccepted)) ?? nil
        termsEffectiveAt = (try? c.decodeIfPresent(Date.self, forKey: .termsEffectiveAt)) ?? nil
        termsRequired = (try? c.decodeIfPresent(Bool.self, forKey: .termsRequired)) ?? nil
        termsChanges = (try? c.decodeIfPresent(TermsChanges.self, forKey: .termsChanges)) ?? nil
    }
}

struct Quiz: Codable, Sendable {
    struct Question: Codable, Identifiable, Sendable { var id: String; var question: String; var options: [String] }
    var title: String
    var lede: String
    var passed: Bool
    var questions: [Question]
}

struct QuizResult: Codable, Sendable { var passed: Bool; var wrong: [String] }

struct AppNotification: Codable, Identifiable, Sendable {
    var id: String
    var kind: String
    var data: [String: JSONValue]
    var read: Bool
    var createdAt: Date

    func text(_ key: String) -> String {
        if case .string(let s) = data[key] { return s }
        return ""
    }
}

struct NotificationsResponse: Codable, Sendable { var notifications: [AppNotification] }

struct MyDog: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var name: String
    var breed: String
    var status: String
    var photos: [String]
    var look: DogLook
    var city: String
    var walkMinutes: Int
}

struct MyDogsResponse: Codable, Sendable { var dogs: [MyDog] }

struct LivePoint: Codable, Hashable, Sendable { var id: Int; var lat: Double; var lng: Double; var t: Double }

struct LiveWalk: Codable, Sendable {
    var status: String
    var startedAt: Date
    var plannedEndAt: Date
    var endedAt: Date?
    var lastAt: Date?
    var overdueMin: Int
    var care: Care?
    var photos: [WalkPhoto]?
    var points: [LivePoint]
    /// False while live location is switched off on the server (LIVE_LOCATION): no map, no new points.
    /// Missing from older servers, which always had it on.
    var liveLocation: Bool?
}

/// The walk report: how often the dog peed, pooped and drank (0 to 20 each).
struct Care: Codable, Hashable, Sendable {
    var pee = 0
    var poo = 0
    var water = 0

    subscript(kind: String) -> Int {
        switch kind {
        case "pee": pee
        case "poo": poo
        default: water
        }
    }
}

struct WalkPhoto: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var url: String
    var t: Double
}

struct WalkStarted: Codable, Sendable { var walkId: String }
struct WalkEnded: Codable, Sendable { var ok: Bool; var distanceM: Int }
struct OK: Codable, Sendable { var ok: Bool? }

/// A small JSON value, for the free-form data of notifications.
enum JSONValue: Codable, Hashable, Sendable {
    case string(String), number(Double), bool(Bool), null

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let b = try? c.decode(Bool.self) { self = .bool(b) }
        else if let n = try? c.decode(Double.self) { self = .number(n) }
        else if let s = try? c.decode(String.self) { self = .string(s) }
        else { self = .null }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let s): try c.encode(s)
        case .number(let n): try c.encode(n)
        case .bool(let b): try c.encode(b)
        case .null: try c.encodeNil()
        }
    }
}

struct ChatMessage: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var senderId: String
    var name: String
    var body: String
    var t: Double

    var date: Date { Date(timeIntervalSince1970: t / 1000) }
}

struct ChatResponse: Codable, Sendable {
    var messages: [ChatMessage]
    var canSend: Bool
}

/// A dog from the walker's "hondenvriendenboek".
struct DogFriend: Codable, Identifiable, Hashable, Sendable {
    var id: String
    var name: String
    var breed: String
    var city: String
    var photos: [String]
    var look: DogLook
    var walks: Int
    var meters: Int
    var lastAt: Date?
    var firstAt: Date?
}

struct DogFriendsResponse: Codable, Sendable { var dogs: [DogFriend] }

// Levels, badges and monthly challenges (GET /api/v1/progress and /api/v1/challenges).
// Points only come from real things; nothing is ever lost, and levels are private.

struct Progress: Codable, Sendable {
    struct Level: Codable, Sendable {
        var number: Int
        var key: String
        var name: String
        var floor: Int
        var next: Int?
        var nextName: String?
        var progress: Double
    }
    struct Roles: Codable, Sendable { var walker: Bool; var owner: Bool }
    struct Week: Codable, Sendable { var goal: Int?; var walks: Int; var activeWeeks: Int }
    struct Badge: Codable, Identifiable, Hashable, Sendable {
        var key: String
        var icon: String?
        var name: String
        var hint: String?
        var title: String?
        var nextTitle: String?
        var tier: Int
        var tiers: [Int]
        var value: Int
        var next: Int?
        var color: String?
        var earnedAt: Date?
        var new: Bool?
        var id: String { key }
    }
    struct Award: Codable, Hashable, Sendable { var key: String; var tier: Int; var name: String; var title: String?; var color: String? }
    struct Recent: Codable, Hashable, Sendable { var kind: String; var points: Int; var at: Date; var label: String }

    var points: Int
    var level: Level
    var levelUp: Bool
    var roles: Roles?
    var week: Week?
    var badges: [Badge]
    var newAwards: [Award]?
    var recent: [Recent]?
}

struct Challenges: Codable, Sendable {
    struct Goal: Codable, Sendable {
        var name: String?
        var walks: Int
        var km: Double?
        var dogs: Int?
        var walkers: Int?
        var mine: Int?
        var goal: Int
        var done: Bool
        var title: String
        var progressText: String?
        var statsText: String?
    }
    var month: String
    var season: String?
    var daysLeft: Int?
    var city: Goal?
    var all: Goal
}
