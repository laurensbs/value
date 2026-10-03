import UIKit
import UserNotifications

/// Push notifications from the server (new request, chat message, walk started …).
/// The device token goes to the server only after the person allowed notifications, and is
/// removed again on sign-out. The server sends nothing until Apple push keys are configured.
@MainActor
enum Push {
    private static let tokenKey = "pushToken"

    static func registerIfAllowed() async {
        let status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
        guard status == .authorized || status == .provisional else { return }
        UIApplication.shared.registerForRemoteNotifications()
    }

    private struct Device: Encodable { var token: String; var sandbox: Bool }

    static func didRegister(_ deviceToken: Data) async {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        guard APIClient.shared.hasSession else { return }
        #if DEBUG
        let sandbox = true
        #else
        let sandbox = false
        #endif
        let saved: OK? = try? await APIClient.shared.post("/api/v1/devices", Device(token: token, sandbox: sandbox))
        if saved != nil { UserDefaults.standard.set(token, forKey: tokenKey) }
    }

    /// Before signing out: this phone should no longer get this person's notifications.
    static func unregister() async {
        guard let token = UserDefaults.standard.string(forKey: tokenKey) else { return }
        let _: OK? = try? await APIClient.shared.delete("/api/v1/devices", ["token": token])
        UserDefaults.standard.removeObject(forKey: tokenKey)
        UIApplication.shared.unregisterForRemoteNotifications()
    }

    /// Which tab fits a website path from a push.
    nonisolated static func tab(forPath path: String) -> String {
        if path.hasPrefix("/chat") || path.hasPrefix("/walk") || path.hasPrefix("/follow") || path.hasPrefix("/requests") {
            return "appointments"
        }
        if path.hasPrefix("/dogs") { return "discover" }
        return "profile"
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { await Push.didRegister(deviceToken) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // No push (for example without an Apple team in a local build): reminders and in-app notifications still work.
    }
}
