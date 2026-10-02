import ActivityKit
import Foundation

/// The Live Activity on the Lock Screen and in the Dynamic Island while a walk is running.
struct WalkActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable, Sendable {
        var distanceM: Int
        var plannedEnd: Date
        var overdue: Bool
    }

    var walkId: String
    var dogName: String
    var startedAt: Date
    var look: DogLook
}
