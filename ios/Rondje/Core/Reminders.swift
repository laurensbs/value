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
        guard await center.notificationSettings().authorizationStatus == .notDetermined else { return }
        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
    }

    /// Makes the scheduled reminders match the accepted appointments, both as walker and as owner.
    static func sync(with appointments: AppointmentsResponse) async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }

        var wanted: [String: UNNotificationRequest] = [:]
        for item in appointments.outgoing + appointments.incoming where item.status == "accepted" {
            let fireAt = item.startsAt.addingTimeInterval(-lead)
            guard fireAt > .now else { continue }
            let content = UNMutableNotificationContent()
            let asOwner = appointments.incoming.contains { $0.id == item.id }
            content.title = item.isMeeting ? L("Zo meteen: kennismaken met \(item.dog.name)") : L("Zo meteen: rondje met \(item.dog.name)")
            content.body = asOwner
                ? L("Over een half uur komt \(item.walker?.firstName ?? L("de wandelaar")). Fijne wandeling!")
                : L("Over een half uur. Neem je ID mee en vergeet de zakjes niet.")
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

    static func clearAll() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }
}

/// Opens the right tab when someone taps a reminder.
final class NotificationRouter: NSObject, UNUserNotificationCenterDelegate, @unchecked Sendable {
    static let shared = NotificationRouter()
    var onOpen: (@MainActor (String) -> Void)?

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let tab = response.notification.request.content.userInfo["tab"] as? String ?? ""
        await MainActor.run { onOpen?(tab) }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }
}
