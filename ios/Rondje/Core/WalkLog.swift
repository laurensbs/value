import Foundation

/// One finished walk, as this phone remembers it: for the week recap and nothing else.
/// `side` is "walker" (you walked) or "owner" (someone walked your dog).
struct WalkLogEntry: Codable, Hashable, Sendable {
    var walkId: String
    var dogId: String?
    var dogName: String
    var look: DogLook
    var side: String
    var person: String?
    var distanceM: Int?
    var minutes: Int?
    var photos: Int
    var date: Date
}

/// The walks of the last while, kept on the phone in the encrypted Cache (never backed up,
/// removed on sign-out with Cache.clear()). Only the last 300 walks are kept.
@MainActor
enum WalkLog {
    private static let name = "walklog"
    private static let limit = 300

    static var entries: [WalkLogEntry] {
        Cache.load([WalkLogEntry].self, from: name) ?? []
    }

    /// Adds a walk, once per walkId.
    static func record(_ e: WalkLogEntry) {
        var all = entries
        guard !all.contains(where: { $0.walkId == e.walkId }) else { return }
        all.append(e)
        save(all)
    }

    /// Fills in the walks the phone did not see end: your dogs walked by others (owner side),
    /// and your own walks that ended on another device (walker side, without distance).
    static func syncFromAppointments(_ r: AppointmentsResponse) {
        var all = entries
        var known = Set(all.map(\.walkId))
        var added = false
        for item in r.incoming where item.walkStatus == "ended" {
            guard let walkId = item.walkId, !known.contains(walkId) else { continue }
            all.append(WalkLogEntry(walkId: walkId, dogId: item.dog.id, dogName: item.dog.name, look: item.dog.look, side: "owner",
                                    person: item.walker?.firstName, distanceM: nil, minutes: nil, photos: 0, date: item.startsAt))
            known.insert(walkId)
            added = true
        }
        for item in r.outgoing where item.walkStatus == "ended" {
            guard let walkId = item.walkId, !known.contains(walkId) else { continue }
            all.append(WalkLogEntry(walkId: walkId, dogId: item.dog.id, dogName: item.dog.name, look: item.dog.look, side: "walker",
                                    person: nil, distanceM: nil, minutes: nil, photos: 0, date: item.startsAt))
            known.insert(walkId)
            added = true
        }
        if added { save(all) }
    }

    private static func save(_ all: [WalkLogEntry]) {
        let kept = all.sorted { $0.date < $1.date }.suffix(limit)
        Cache.save(Array(kept), as: name)
    }
}
