import Foundation
import UserNotifications

/// What someone chose for Guus's seintjes. Off until they switch it on themselves.
struct NudgeSettings: Codable, Equatable, Sendable {
    var enabled = false
    /// 1 = Monday ... 7 = Sunday, at most 3.
    var days: [Int] = []
    var hour = 18
    var minute = 30
    /// 1 to 3.
    var perWeek = 1
    var pausedUntil: Date?
    /// The offer on Ontdek was shown and answered.
    var offered = false
    /// How many seintjes in a row were not opened.
    var ignored = 0
    /// Guus switched them off himself after three ignored ones.
    var stoppedByGuus = false
    /// Notification id -> when it fires, for the ones scheduled now.
    var delivered: [String: Date] = [:]

    func isPaused(now: Date = .now) -> Bool { pausedUntil.map { $0 > now } ?? false }

    /// Everything except the bookkeeping of planned seintjes.
    var choices: NudgeSettings {
        var c = self
        c.delivered = [:]
        return c
    }
}

/// Keeps the settings observable for SwiftUI.
@MainActor
@Observable
final class NudgeStore {
    static let shared = NudgeStore()
    static let key = "nudges"

    var value: NudgeSettings {
        didSet {
            if let data = try? JSONEncoder().encode(value) { UserDefaults.standard.set(data, forKey: Self.key) }
        }
    }

    private init() {
        value = UserDefaults.standard.data(forKey: Self.key).flatMap { try? JSONDecoder().decode(NudgeSettings.self, from: $0) } ?? NudgeSettings()
    }
}

/// Gentle, opt-in seintjes on moments the person picks. Planned on the phone, never sent by a server.
/// At most a few a week, none in a week that already has a walk planned, and they stop by themselves
/// when they are not opened. Appointment reminders (Reminders) are separate and never count.
@MainActor
enum Nudges {
    static let prefix = "nudge-"
    static let category = "nudge"
    static let fewerAction = "fewer"
    /// Quiet hours run from 21:30 to 08:30: a seintje is always between 08:30 and 21:00.
    nonisolated static let earliest = 8 * 60 + 30
    nonisolated static let latest = 21 * 60
    /// After this many ignored seintjes in a row, Guus stops them.
    nonisolated static let ignoredLimit = 3
    private static var started = false
    /// The reschedule that runs now; a new one waits for it, so two never interleave.
    private static var running: Task<Void, Never>?
    private static var generation = 0

    static var settings: NudgeSettings {
        get { NudgeStore.shared.value }
        set { NudgeStore.shared.value = newValue }
    }

    static func update(_ change: (inout NudgeSettings) -> Void) {
        var s = settings
        change(&s)
        settings = s
    }

    // MARK: Planning

    /// The moments a seintje would go off, from the chosen days and time over the next 14 days.
    nonisolated static func plan(_ s: NudgeSettings, outgoing: [Appointment], now: Date, calendar: Calendar) -> [Date] {
        guard s.enabled, !s.days.isEmpty else { return [] }
        let time = min(max(s.hour * 60 + s.minute, earliest), latest)
        var weeks = calendar
        weeks.firstWeekday = 2
        weeks.minimumDaysInFirstWeek = 4
        let week = { (date: Date) -> String in
            let c = weeks.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
            return "\(c.yearForWeekOfYear ?? 0)-\(c.weekOfYear ?? 0)"
        }
        let planned = outgoing.filter { $0.status == "pending" || $0.status == "accepted" }.map(\.startsAt)
        let busyWeeks = Set(planned.map(week))
        let horizon = now.addingTimeInterval(14 * 86_400)
        let days = Set(s.days.prefix(3))

        var candidates: [Date] = []
        let today = calendar.startOfDay(for: now)
        for offset in 0...14 {
            guard let day = calendar.date(byAdding: .day, value: offset, to: today) else { continue }
            let weekday = (calendar.component(.weekday, from: day) + 5) % 7 + 1
            guard days.contains(weekday),
                  let date = calendar.date(bySettingHour: time / 60, minute: time % 60, second: 0, of: day),
                  date > now, date <= horizon else { continue }
            if let pausedUntil = s.pausedUntil, date < pausedUntil { continue }
            if busyWeeks.contains(week(date)) { continue }
            if planned.contains(where: { abs($0.timeIntervalSince(date)) < 86_400 }) { continue }
            candidates.append(date)
        }

        var perWeek: [String: Int] = [:]
        let limit = min(max(s.perWeek, 1), 3)
        return candidates.sorted().filter { date in
            let key = week(date)
            guard perWeek[key, default: 0] < limit else { return false }
            perWeek[key, default: 0] += 1
            return true
        }
    }

    /// The text of one seintje. Rotates by `index` over the options that really exist; names a dog, never a person.
    nonisolated static func content(for date: Date, buddy: Appointment?, nearby: [DogCard], index: Int) -> (title: String, body: String, link: String) {
        var options: [(title: String, body: String, link: String)] = []
        if let buddy {
            options.append((L("Een rondje deze week?"), L("Zin in een rondje met \(buddy.dog.name)? Je kunt het de eigenaar vragen."), "rebook:" + buddy.id))
        }
        let calm = nearby.filter { !$0.isDemo && $0.energy == "calm" }
        if !calm.isEmpty {
            let dog = calm[abs(index) % calm.count]
            options.append((L("Even naar buiten?"),
                            L("\(dog.name) woont bij jou in de buurt. \(Labels.energy(dog.energy)), \(dog.walkMinutes) minuten."),
                            "dog:" + dog.id))
        }
        options.append((L("Even naar buiten?"), L("Er wonen honden bij jou in de buurt. Kijk wie er mee wil."), "discover"))
        return options[abs(index) % options.count]
    }

    /// Counts the seintjes that already went off: opened (we are running within a day) or ignored.
    /// After three ignored ones in a row Guus stops them, and says so once.
    nonisolated static func backOff(_ s: inout NudgeSettings, now: Date) {
        for (id, fireAt) in s.delivered where fireAt <= now {
            if now.timeIntervalSince(fireAt) <= 86_400 {
                s.ignored = 0
            } else {
                s.ignored += 1
            }
            s.delivered[id] = nil
        }
        if s.ignored >= ignoredLimit, s.enabled {
            s.enabled = false
            s.stoppedByGuus = true
        }
    }

    /// How many seintjes may be planned ahead: never more than can go unopened before Guus stops them,
    /// so after three ignored ones nothing else fires, even when the app is not opened again.
    nonisolated static func pendingLimit(_ s: NudgeSettings) -> Int {
        max(0, ignoredLimit - s.ignored)
    }

    /// Brings the scheduled seintjes in line with the settings and the appointments.
    /// Calls run one after the other; when several are waiting, only the newest one plans.
    /// `allowed` is false for people who only have a dog: seintjes are about walking other dogs.
    static func reschedule(appointments: AppointmentsResponse, allowed: Bool = true, now: Date = .now) async {
        generation += 1
        let mine = generation
        let previous = running
        let task = Task { @MainActor in
            await previous?.value
            guard mine == generation else { return }
            await apply(appointments: appointments, allowed: allowed, now: now)
        }
        running = task
        await task.value
    }

    private static func apply(appointments: AppointmentsResponse, allowed: Bool, now: Date) async {
        var s = settings
        backOff(&s, now: now)
        // The ones still to come are planned again below.
        s.delivered = [:]
        settings = s

        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests().map(\.identifier).filter { $0.hasPrefix(prefix) }
        if !pending.isEmpty { center.removePendingNotificationRequests(withIdentifiers: pending) }

        guard allowed, s.enabled, !s.isPaused(now: now) else { return }
        let status = await center.notificationSettings().authorizationStatus
        guard status == .authorized || status == .provisional else { return }

        let calendar = Calendar.current
        let dates = plan(s, outgoing: appointments.outgoing, now: now, calendar: calendar).prefix(pendingLimit(s))
        // Never a dog the walker reported as aggressive or unsafe.
        let blocked = Keepsakes.shared.noRebookDogs
        let buddy = appointments.outgoing
            .filter { $0.walkStatus == "ended" && !blocked.contains($0.dog.id) }
            .max { $0.startsAt < $1.startsAt }
        let nearby = Cache.load([DogCard].self, from: "nearbyDogs") ?? []
        let ids = DateFormatter()
        ids.locale = Locale(identifier: "en_US_POSIX")
        ids.calendar = calendar
        ids.dateFormat = "yyyyMMddHHmm"

        var delivered: [String: Date] = [:]
        for date in dates {
            let text = content(for: date, buddy: buddy, nearby: nearby, index: calendar.component(.weekOfYear, from: date) + calendar.component(.weekday, from: date))
            let body = UNMutableNotificationContent()
            body.title = text.title
            body.body = text.body
            body.sound = .default
            body.categoryIdentifier = category
            body.userInfo = ["kind": "nudge", "action": text.link]
            let id = prefix + ids.string(from: date)
            let parts = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: date)
            let request = UNNotificationRequest(identifier: id, content: body, trigger: UNCalendarNotificationTrigger(dateMatching: parts, repeats: false))
            do {
                try await center.add(request)
                delivered[id] = date
            } catch {}
        }
        update { $0.delivered = delivered }
    }

    // MARK: Lifecycle

    /// Registers the "Minder seintjes" action. Called from AppModel.init, so it also runs when iOS
    /// launches the app in the background for that action. Opened seintjes come in through
    /// NotificationRouter, which calls `opened(kind:action:)` directly.
    static func start() {
        guard !started else { return }
        started = true
        let fewer = UNNotificationAction(identifier: fewerAction, title: L("Minder seintjes"), options: [])
        let nudge = UNNotificationCategory(identifier: category, actions: [fewer], intentIdentifiers: [])
        Task {
            let center = UNUserNotificationCenter.current()
            var categories = await center.notificationCategories().filter { $0.identifier != category }
            categories.insert(nudge)
            center.setNotificationCategories(categories)
        }
    }

    /// A seintje was opened, or "Minder seintjes" was tapped. Awaits the new plan, so the
    /// notification delegate can return only when the extra seintjes are gone.
    static func opened(kind: String, action: String) async {
        guard kind == "nudge" || action == fewerAction else { return }
        update { s in
            if kind == "nudge" { s.ignored = 0 }
            if action == fewerAction {
                s.perWeek -= 1
                if s.perWeek <= 0 {
                    s.enabled = false
                    s.perWeek = 1
                }
            }
        }
        if action == fewerAction {
            let cached = Cache.load(AppointmentsResponse.self, from: "appointments") ?? AppointmentsResponse(outgoing: [], incoming: [])
            await reschedule(appointments: cached)
        }
    }

    /// Forgets the settings and removes any planned seintjes (on sign-out).
    static func clear() {
        generation += 1
        let ids = Array(settings.delivered.keys)
        let center = UNUserNotificationCenter.current()
        if !ids.isEmpty { center.removePendingNotificationRequests(withIdentifiers: ids) }
        // Also the ones a reschedule may not have recorded yet.
        Task {
            let pending = await center.pendingNotificationRequests().map(\.identifier).filter { $0.hasPrefix(prefix) }
            if !pending.isEmpty { center.removePendingNotificationRequests(withIdentifiers: pending) }
        }
        NudgeStore.shared.value = NudgeSettings()
        UserDefaults.standard.removeObject(forKey: NudgeStore.key)
    }
}
