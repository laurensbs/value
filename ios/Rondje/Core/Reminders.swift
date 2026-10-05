import Foundation
import UserNotifications

/// Local reminders before appointments. They are scheduled on the phone itself, so no server,
/// push service or personal data is involved. The text names only the dog.
@MainActor
enum Reminders {
    private static let prefix = "reminder-"
    private static let lead: TimeInterval = 30 * 60

    /// Asks once, at a moment where it makes sense (after a request was sent or accepted).
    static func askIfNeeded() async {
        let center = UNUserNotificationCenter.current()
        if await center.notificationSettings().authorizationStatus == .notDetermined {
            _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
        }
        await Push.registerIfAllowed()
    }

    /// Makes the scheduled reminders match the accepted appointments, both as walker and as owner.
    static func sync(with appointments: AppointmentsResponse) async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }

        var wanted: [String: UNNotificationRequest] = [:]
        // A walk alone that waits for live location does not start: no "zo meteen" for it, on either side.
        let liveLocation = ServerFeatures.shared.liveLocation
        for item in appointments.outgoing + appointments.incoming
        where item.status == "accepted" && !item.waitsForLiveLocation(liveLocation: liveLocation) {
            // The evening before a first meeting: one calm note to get ready (it opens the prep checklist).
            if item.isMeeting, let evening = PrepReminder.fireDate(startsAt: item.startsAt, now: .now, calendar: .current) {
                let asOwner = appointments.incoming.contains { $0.id == item.id }
                let text = PrepReminder.text(for: item, asOwner: asOwner)
                let content = UNMutableNotificationContent()
                content.title = text.title
                content.body = text.body
                content.sound = .default
                content.userInfo = ["tab": "appointments", "action": "prep:" + item.id]
                let parts = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: evening)
                let id = prefix + "eve-" + item.id
                wanted[id] = UNNotificationRequest(identifier: id, content: content, trigger: UNCalendarNotificationTrigger(dateMatching: parts, repeats: false))
            }
            let fireAt = item.startsAt.addingTimeInterval(-lead)
            guard fireAt > .now else { continue }
            let content = UNMutableNotificationContent()
            let asOwner = appointments.incoming.contains { $0.id == item.id }
            content.title = item.isMeeting ? L("Zo meteen: kennismaken met \(item.dog.name)") : L("Zo meteen: rondje met \(item.dog.name)")
            content.body = asOwner
                ? L("Over een half uur komt \(item.walker?.firstName ?? L("de wandelaar")). Fijne wandeling!")
                : L("Over een half uur. Neem je ID mee.")
            content.sound = .default
            content.userInfo = ["tab": "appointments"]
            let parts = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fireAt)
            let id = prefix + item.id
            wanted[id] = UNNotificationRequest(identifier: id, content: content, trigger: UNCalendarNotificationTrigger(dateMatching: parts, repeats: false))
        }

        let pending = await center.pendingNotificationRequests().map(\.identifier).filter { $0.hasPrefix(prefix) }
        let stale = pending.filter { wanted[$0] == nil }
        if !stale.isEmpty { center.removePendingNotificationRequests(withIdentifiers: stale) }
        for request in wanted.values { try? await center.add(request) }
    }

    /// On sign-out and account deletion: the planned ones and the ones already in Notification Center,
    /// which name dogs and people of this account.
    static func clearAll() {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()
        center.removeAllDeliveredNotifications()
    }
}

/// Opens the right tab when someone taps a reminder.
final class NotificationRouter: NSObject, UNUserNotificationCenterDelegate, @unchecked Sendable {
    static let shared = NotificationRouter()
    var onOpen: (@MainActor (String) -> Void)?
    /// For notifications that carry an "action" link (see CoachAction.init(link:)).
    var onAction: (@MainActor (CoachAction) -> Void)?

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let info = response.notification.request.content.userInfo
        // Local reminders say which tab; pushes from the server carry the website path ("/chat/…", "/walk/…").
        let tab = info["tab"] as? String ?? Push.tab(forPath: info["url"] as? String ?? "")
        let link = info["action"] as? String
        // "Minder seintjes" (Nudges) is answered in the background: it opens nothing.
        let opensApp = response.actionIdentifier != "fewer"
        await MainActor.run {
            if !opensApp {
                return
            } else if let action = link.flatMap(CoachAction.init(link:)) {
                onAction?(action)
            } else {
                onOpen?(tab)
            }
        }
        // Handled here and awaited, not through an observer: after "Minder seintjes" iOS may have launched
        // the app in the background without any screen, and may suspend it as soon as this returns.
        let kind = info["kind"] as? String ?? ""
        let actionIdentifier = response.actionIdentifier
        await Nudges.opened(kind: kind, action: actionIdentifier)
        NotificationCenter.default.post(name: .rondjeNotificationOpened, object: nil, userInfo: [
            "kind": kind,
            "actionIdentifier": actionIdentifier,
        ])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }
}
