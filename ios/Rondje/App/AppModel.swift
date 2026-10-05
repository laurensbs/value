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
    /// The last refresh failed: the screens show saved data.
    var offline = false
    /// A step Guus or a notification asked for; the screen that handles it takes it (see CoachAction).
    var pendingAction: CoachAction?
    /// The celebration on screen right now, if any (see Celebration.swift).
    var celebration: CelebrationEvent?
    /// A Guus sheet (CoachRoutes) is up: the level-up cover waits until it closes.
    var coachSheetOpen = false

    enum Tab: Hashable { case discover, home, appointments, profile }

    /// What someone does on Rondje, from their profile: it shapes the tabs and the home screen.
    enum Role { case walker, owner, both }

    /// Whether this person may ask to meet or walk a dog: walkers pass the safety quiz first
    /// (the server checks it too and answers "needs-quiz").
    var quizPassed: Bool { me?.profile?.quizPassed == true || me?.trust?.quizPassed == true }

    /// A new walker does the safety quiz right after making the profile, before the app opens.
    /// Owners and shelter staff skip it. It stays until "Laat me de honden zien" on the quiz's done
    /// screen (which removes the mark), so passing never jumps past that screen.
    var needsOnboardingQuiz: Bool {
        Self.onboardingQuiz(marked: Keepsakes.shared.has("onboarding.quiz"), wantsToWalk: me?.profile?.wantsToWalk == true,
                            inOrg: !(me?.orgs.isEmpty ?? true))
    }

    nonisolated static func onboardingQuiz(marked: Bool, wantsToWalk: Bool, inOrg: Bool) -> Bool {
        marked && wantsToWalk && !inOrg
    }

    var role: Role {
        let p = me?.profile
        switch (p?.wantsToWalk ?? true, p?.hasDogs ?? false) {
        case (true, true): return .both
        case (false, true): return .owner
        default: return .walker
        }
    }

    struct Banner: Identifiable, Equatable {
        let id = UUID()
        var text: String
        var symbol: String = "checkmark.circle.fill"
        var tint: Color = Palette.grass
    }

    private let api = APIClient.shared
    /// Bumped by `reset()`. A refresh that was sent for the old session checks it after every await,
    /// so a late answer never writes the old account's data, reminders or walk log back to the phone.
    @ObservationIgnored private var session = 0

    init() {
        UNUserNotificationCenter.current().delegate = NotificationRouter.shared
        NotificationRouter.shared.onOpen = { [weak self] tab in
            switch tab {
            case "appointments": self?.selectedTab = .appointments
            case "discover": self?.selectedTab = .discover
            case "profile": self?.selectedTab = .profile
            default: break
            }
        }
        NotificationRouter.shared.onAction = { [weak self] action in
            // A notification of an account that signed out leads nowhere.
            guard let self, self.phase != .signedOut else { return }
            self.perform(action)
        }
        Nudges.start()
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
        // Show what we had straight away (also without signal), then refresh.
        if let cached = Cache.load(Me.self, from: "me"), cached.profile != nil {
            me = cached
            appointments = Cache.load(AppointmentsResponse.self, from: "appointments") ?? appointments
            phase = .ready
        }
        await refreshMe()
    }

    func refreshMe() async {
        let mine = session
        do {
            let me: Me = try await api.get("/api/v1/me")
            guard mine == session else { return }
            self.me = me
            Cache.save(me, as: "me")
            phase = me.profile == nil ? .onboarding : .ready
            if phase == .ready {
                await refreshAppointments()
                await Push.registerIfAllowed()
                // Whether walks share a live location (features.liveLocation); at most every few minutes.
                await ServerFeatures.shared.refresh()
            }
        } catch APIError.unauthorized {
            if mine == session { reset() }
        } catch {
            guard mine == session else { return }
            // Offline at launch: keep the last state if there is one, otherwise show sign-in.
            if me == nil { phase = api.hasSession ? .ready : .signedOut }
        }
    }

    func refreshAppointments() async {
        let mine = session
        let loaded: AppointmentsResponse? = try? await api.get("/api/v1/requests")
        guard mine == session, phase != .signedOut else { return }
        guard let result = loaded else {
            offline = true
            return
        }
        appointments = result
        offline = false
        Cache.save(result, as: "appointments")
        WalkLog.syncFromAppointments(result)
        publishNextWalk()
        await Reminders.sync(with: result)
        guard mine == session else {
            // Signed out while the reminders were being planned: take them away again.
            Reminders.clearAll()
            return
        }
        await Nudges.reschedule(appointments: result, allowed: role != .owner)
    }

    func signedIn() async {
        await refreshMe()
        Haptics.success()
    }

    func signOut() async {
        WalkTracker.shared.stop()
        await Push.unregister()
        await api.signOut()
        reset()
    }

    func reset() {
        session += 1
        Keychain.clear()
        me = nil
        appointments = AppointmentsResponse(outgoing: [], incoming: [])
        SharedStore.save(nil)
        Cache.clear()
        MoodStore.clear()
        Keepsakes.shared.clear()
        Reminders.clearAll()
        Nudges.clear()
        ProgressStore.shared.reset()
        WidgetCenter.shared.reloadAllTimelines()
        phase = .signedOut
    }

    func show(_ text: String, symbol: String = "checkmark.circle.fill", tint: Color = Palette.grass) {
        withAnimation(.spring(duration: 0.4)) { banner = Banner(text: text, symbol: symbol, tint: tint) }
    }

    /// The server answered 'live-location-off' to accepting or starting a walk alone: live location went
    /// off in the meantime. Said calmly with the same note as on the card, never as an error, and the
    /// cards follow (LiveLocationPause).
    func liveLocationPaused() async {
        ServerFeatures.shared.liveLocationSwitchedOff()
        show(LiveLocationPause.note, symbol: "location.slash", tint: Palette.muted)
        await refreshAppointments()
    }

    /// The next accepted appointment, for the Home Screen widget (no contact details).
    private func publishNextWalk() {
        // A walk alone that waits for live location does not start, so it is not the next walk either.
        let liveLocation = ServerFeatures.shared.liveLocation
        let next = appointments.outgoing
            .filter { $0.status == "accepted" && $0.startsAt > .now.addingTimeInterval(-2 * 3600) }
            .filter { !$0.waitsForLiveLocation(liveLocation: liveLocation) }
            .min { $0.startsAt < $1.startsAt }
        SharedStore.save(next.map {
            NextWalkSnapshot(dogName: $0.dog.name, startsAt: $0.startsAt, kind: $0.kind, city: $0.dog.city, look: $0.dog.look)
        })
        WidgetCenter.shared.reloadAllTimelines()
    }
}
