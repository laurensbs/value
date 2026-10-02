import Foundation

/// What the app remembers on this phone for Guus and the small steps: which hints were read, which
/// checklists were ticked, what was snoozed and when someone last opened the app.
/// Nothing in here ever leaves the phone, and nothing in here is ever used to punish or nag.
@MainActor
@Observable
final class Keepsakes {
    static let shared = Keepsakes()

    private static let marksKey = "keepsakes.marks"
    private static let checksKey = "keepsakes.checks"
    private static let tipsKey = "guusTips"
    private static let snoozePrefix = "snooze."

    @ObservationIgnored private let defaults: UserDefaults
    /// Key -> when it was marked; for snoozes, the moment the snooze ends.
    private var marks: [String: Date]
    /// Checklist name -> the ticked items.
    private var lists: [String: [String]]
    private var tips: Bool

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        marks = defaults.data(forKey: Self.marksKey).flatMap { try? JSONDecoder().decode([String: Date].self, from: $0) } ?? [:]
        lists = defaults.data(forKey: Self.checksKey).flatMap { try? JSONDecoder().decode([String: [String]].self, from: $0) } ?? [:]
        tips = defaults.object(forKey: Self.tipsKey) as? Bool ?? true
    }

    // MARK: Marks

    func has(_ key: String) -> Bool { marks[key] != nil }

    /// When `key` was marked (or until when it is snoozed), if at all.
    func date(_ key: String) -> Date? { marks[key] }

    func mark(_ key: String, at date: Date = .now) {
        marks[key] = date
        saveMarks()
    }

    func unmark(_ key: String) {
        guard marks.removeValue(forKey: key) != nil else { return }
        saveMarks()
    }

    /// The full keys that start with `prefix`.
    func keys(withPrefix prefix: String) -> Set<String> {
        Set(marks.keys.filter { $0.hasPrefix(prefix) })
    }

    // MARK: Snoozes

    func snooze(_ key: String, until date: Date) {
        mark(Self.snoozePrefix + key, at: date)
    }

    func isSnoozed(_ key: String, now: Date = .now) -> Bool {
        guard let until = marks[Self.snoozePrefix + key] else { return false }
        return until > now
    }

    /// The keys (without the "snooze." prefix) that are still snoozed at `now`.
    func activeSnoozes(now: Date = .now) -> Set<String> {
        Set(marks.compactMap { key, until in
            key.hasPrefix(Self.snoozePrefix) && until > now ? String(key.dropFirst(Self.snoozePrefix.count)) : nil
        })
    }

    // MARK: Checklists

    func checks(_ list: String) -> Set<String> { Set(lists[list] ?? []) }

    func setChecks<S: Sequence>(_ list: String, _ items: S) where S.Element == String {
        let sorted = Set(items).sorted()
        lists[list] = sorted.isEmpty ? nil : sorted
        saveLists()
    }

    /// Ticks or unticks one item; returns whether it is ticked now.
    @discardableResult
    func toggleCheck(_ list: String, _ item: String) -> Bool {
        var current = checks(list)
        let ticked = current.insert(item).inserted
        if !ticked { current.remove(item) }
        setChecks(list, current)
        return ticked
    }

    /// The Hondenschool lessons someone finished.
    var lessonsDone: Set<String> {
        get { checks("lessons") }
        set { setChecks("lessons", newValue) }
    }

    /// Whether the meeting prep for this appointment was done.
    func prepDone(_ appointmentId: String) -> Bool { has("prepDone." + appointmentId) }

    // MARK: Guus

    /// Whether Guus shows himself and his tips. The guidance stays either way.
    var coachOn: Bool {
        get { tips }
        set {
            tips = newValue
            defaults.set(newValue, forKey: Self.tipsKey)
        }
    }

    /// Lets Guus explain every screen again.
    func resetHints() {
        for key in keys(withPrefix: "hint.") { marks[key] = nil }
        marks["met.guus"] = nil
        saveMarks()
    }

    /// Notes an app visit. After a break of six days or more, "welcomeBack" is marked so a screen can
    /// say hello warmly (never how long it was).
    func recordVisit(now: Date = .now) {
        if let last = marks["visit.last"], now.timeIntervalSince(last) >= 6 * 86_400 {
            marks["welcomeBack"] = now
        }
        marks["visit.last"] = now
        saveMarks()
    }

    /// The next 06:00 after `date`: a calm moment to show something again.
    nonisolated static func nextMorning(after date: Date, calendar: Calendar = .current) -> Date {
        calendar.nextDate(after: date, matching: DateComponents(hour: 6, minute: 0, second: 0), matchingPolicy: .nextTime)
            ?? date.addingTimeInterval(86_400)
    }

    /// Forgets everything (on sign-out), except whether Guus may give tips.
    func clear() {
        marks = [:]
        lists = [:]
        defaults.removeObject(forKey: Self.marksKey)
        defaults.removeObject(forKey: Self.checksKey)
    }

    // MARK: Storage

    private func saveMarks() {
        if let data = try? JSONEncoder().encode(marks) { defaults.set(data, forKey: Self.marksKey) }
    }

    private func saveLists() {
        if let data = try? JSONEncoder().encode(lists) { defaults.set(data, forKey: Self.checksKey) }
    }
}
