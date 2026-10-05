import ActivityKit
import Foundation

/// The Live Activity on the Lock Screen and in the Dynamic Island while a walk is running.
struct WalkActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable, Sendable {
        var distanceM: Int
        var plannedEnd: Date
        var overdue: Bool
        /// False while this walk shares no location: no distance, and no "the owner watches along".
        var liveLocation: Bool? = nil
        /// A first meeting: they walk together, so the Lock Screen says that instead of "live location is off".
        var together: Bool? = nil
    }

    var walkId: String
    var dogName: String
    var startedAt: Date
    var look: DogLook
}
