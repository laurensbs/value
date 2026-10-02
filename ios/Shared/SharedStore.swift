import Foundation

/// The next appointment, shared with the widget through the app group. Holds no contact details.
struct NextWalkSnapshot: Codable, Sendable {
    var dogName: String
    var startsAt: Date
    var kind: String
    var city: String
    var look: DogLook
}

enum SharedStore {
    static let appGroup = "group.app.rondje.mobile"
    private static let key = "nextWalk"

    private static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    static func save(_ snapshot: NextWalkSnapshot?) {
        guard let defaults else { return }
        if let snapshot, let data = try? JSONEncoder().encode(snapshot) {
            defaults.set(data, forKey: key)
        } else {
            defaults.removeObject(forKey: key)
        }
    }

    static func load() -> NextWalkSnapshot? {
        guard let data = defaults?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(NextWalkSnapshot.self, from: data)
    }
}
