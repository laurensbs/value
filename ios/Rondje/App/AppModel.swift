import Foundation
import SwiftUI
import UserNotifications
import WidgetKit

/// The app's session: who is signed in and the data most screens share.
@MainActor
@Observable
final class AppModel {
    enum Phase: Equatable { case loading, signedOut, onboarding, ready }

    var phase: Phase = .loading
    var me: Me?
    var appointments = AppointmentsResponse(outgoing: [], incoming: [])
    var selectedTab: Tab = .discover
    var banner: Banner?

    enum Tab: Hashable { case discover, appointments, profile }

    struct Banner: Identifiable, Equatable {
        let id = UUID()
        var text: String
        var symbol: String = "checkmark.circle.fill"
        var tint: Color = Palette.grass
    }

    private let api = APIClient.shared

    init() {
        UNUserNotificationCenter.current().delegate = NotificationRouter.shared
        NotificationRouter.shared.onOpen = { [weak self] tab in
            if tab == "appointments" { self?.selectedTab = .appointments }
        }
        NotificationCenter.default.addObserver(forName: .rondjeSignedOut, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.reset() }
        }
    }

    var firstName: String { me?.profile?.firstName ?? me?.user.name ?? "" }
    var pendingIncoming: Int { appointments.incoming.filter { $0.status == "pending" }.count }

    func bootstrap() async {
        // Keychain items outlive an uninstall; a fresh install must never reuse an old session.
        if !UserDefaults.standard.bool(forKey: "installed") {
            Keychain.clear()
            UserDefaults.standard.set(true, forKey: "installed")
        }
        guard api.hasSession else { phase = .signedOut; return }
        await refreshMe()
    }

    func refreshMe() async {
        do {
            let me: Me = try await api.get("/api/v1/me")
            self.me = me
            phase = me.profile == nil ? .onboarding : .ready
            if phase == .ready { await refreshAppointments() }
        } catch APIError.unauthorized {
            reset()
        } catch {
            // Offline at launch: keep the last state if there is one, otherwise show sign-in.
            if me == nil { phase = api.hasSession ? .ready : .signedOut }
        }
    }

    func refreshAppointments() async {
        guard let result: AppointmentsResponse = try? await api.get("/api/v1/requests") else { return }
        appointments = result
        publishNextWalk()
        await Reminders.sync(with: result)
    }

    func signedIn() async {
        await refreshMe()
        Haptics.success()
    }

    func signOut() async {
        WalkTracker.shared.stop()
        await api.signOut()
        reset()
    }

    func reset() {
        Keychain.clear()
        me = nil
        appointments = AppointmentsResponse(outgoing: [], incoming: [])
        SharedStore.save(nil)
        Reminders.clearAll()
        WidgetCenter.shared.reloadAllTimelines()
        phase = .signedOut
    }

    func show(_ text: String, symbol: String = "checkmark.circle.fill", tint: Color = Palette.grass) {
        withAnimation(.spring(duration: 0.4)) { banner = Banner(text: text, symbol: symbol, tint: tint) }
    }

    /// The next accepted appointment, for the Home Screen widget (no contact details).
    private func publishNextWalk() {
        let next = appointments.outgoing
            .filter { $0.status == "accepted" && $0.startsAt > .now.addingTimeInterval(-2 * 3600) }
            .min { $0.startsAt < $1.startsAt }
        SharedStore.save(next.map {
            NextWalkSnapshot(dogName: $0.dog.name, startsAt: $0.startsAt, kind: $0.kind, city: $0.dog.city, look: $0.dog.look)
        })
        WidgetCenter.shared.reloadAllTimelines()
    }
}
