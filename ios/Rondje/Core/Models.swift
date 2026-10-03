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

    /// A walk can be started from 30 minutes before until 2 hours after the appointment (lib/rules.ts).
    func canStart(now: Date = .now) -> Bool {
        guard status == "accepted" else { return false }
        let diff = now.timeIntervalSince(startsAt) / 60
        return diff >= -30 && diff <= 120
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
