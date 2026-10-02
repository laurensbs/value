import Foundation
import SwiftUI

/// One step Guus (or a notification) can send someone to. Screens never import each other for this:
/// they call `model.perform(_:)`, and the tab or sheet that owns the step picks it up.
/// The String payloads are appointment ids, except for `dog` (a dog id) and `walkId`.
enum CoachAction: Hashable, Identifiable, Sendable {
    case appointments(String?)
    case startWalk(String)
    case feedback(walkId: String, appointmentId: String)
    case trust(String)
    case follow(String)
    case prep(String)
    case rebook(String)
    case quiz
    case lessons
    case discover(calm: Bool)
    case dog(String)
    case addDog
    case nudgeSettings
    case badges

    var id: CoachAction { self }

    /// Shown as a sheet over the tabs (by `CoachRoutes`), instead of on a tab.
    var isSheet: Bool {
        switch self {
        case .feedback, .trust, .follow, .prep, .rebook, .quiz, .lessons, .addDog, .nudgeSettings, .badges: true
        case .appointments, .startWalk, .discover, .dog: false
        }
    }

    /// Reads the "action" link of a local notification, like "prep:<appointment id>".
    init?(link: String) {
        let parts = link.split(separator: ":", maxSplits: 1).map(String.init)
        guard let head = parts.first else { return nil }
        let value = parts.count > 1 ? parts[1] : nil
        if let value, value.isEmpty { return nil }
        switch (head, value) {
        case ("appointments", let id): self = .appointments(id)
        case ("prep", let id?): self = .prep(id)
        case ("rebook", let id?): self = .rebook(id)
        case ("dog", let id?): self = .dog(id)
        case ("discover", nil): self = .discover(calm: false)
        case ("discover", "calm"): self = .discover(calm: true)
        case ("lessons", nil): self = .lessons
        case ("quiz", nil): self = .quiz
        case ("nudgeSettings", nil): self = .nudgeSettings
        default: return nil
        }
    }

    /// The notification link for this action, when it can be opened from a notification.
    var link: String? {
        switch self {
        case .appointments(let id): id.map { "appointments:" + $0 } ?? "appointments"
        case .prep(let id): "prep:" + id
        case .rebook(let id): "rebook:" + id
        case .dog(let id): "dog:" + id
        case .discover(let calm): calm ? "discover:calm" : "discover"
        case .lessons: "lessons"
        case .quiz: "quiz"
        case .nudgeSettings: "nudgeSettings"
        case .startWalk, .feedback, .trust, .follow, .addDog, .badges: nil
        }
    }
}

extension Notification.Name {
    /// Posted after someone opened a notification; userInfo has "kind" and "actionIdentifier".
    static let rondjeNotificationOpened = Notification.Name("rondjeNotificationOpened")
}

extension AppModel {
    /// Goes to the right tab for `action` and leaves the action for the screen that handles it.
    func perform(_ action: CoachAction) {
        switch action {
        case .appointments:
            selectedTab = .appointments
        case .discover, .dog:
            // Owners have no Discover tab.
            guard role != .owner else { return }
            selectedTab = .discover
        default:
            break
        }
        pendingAction = action
    }

    /// Takes the pending action when `pick` recognises it, so only one screen handles it.
    func take<T>(_ pick: (CoachAction) -> T?) -> T? {
        guard let action = pendingAction, let value = pick(action) else { return nil }
        pendingAction = nil
        return value
    }
}

/// The sheet for each sheet-type action.
enum CoachRouter {
    @MainActor @ViewBuilder
    static func destination(_ action: CoachAction, model: AppModel) -> some View {
        let all = model.appointments.incoming + model.appointments.outgoing
        switch action {
        case let .feedback(walkId, appointmentId):
            let asOwner = model.appointments.incoming.contains { $0.id == appointmentId }
            FeedbackSheet(walkId: walkId, role: asOwner ? .owner : .walker, dogName: all.first { $0.id == appointmentId }?.dog.name ?? "")
                .presentationDetents([.large])
                .onDisappear { Task { await model.refreshAppointments() } }
        case .trust(let id):
            if let item = model.appointments.incoming.first(where: { $0.id == id }), let walker = item.walker {
                TrustSheet(item: item, walker: walker)
                    .presentationDetents([.medium])
            }
        case .follow(let id):
            if let item = all.first(where: { $0.id == id }) {
                FollowWalkView(walkId: item.walkId ?? "", dogName: item.dog.name)
            }
        case .quiz:
            NavigationStack { QuizView() }
        case .addDog:
            AddDogView { }
        case .badges:
            NavigationStack { BadgesView() }
        case .prep: AppointmentsView() // fallback: prep-hints
        case .rebook: AppointmentsView() // fallback: request-flow
        case .lessons: NavigationStack { QuizView() } // fallback: lessons
        case .nudgeSettings: NavigationStack { NudgeSettingsView() }
        case .appointments, .startWalk, .discover, .dog:
            EmptyView()
        }
    }
}

/// Presents the sheet-type actions from `model.pendingAction`, unless something full screen is open.
struct CoachRoutes: ViewModifier {
    var blocked: Bool
    @Environment(AppModel.self) private var model
    @State private var route: CoachAction?

    func body(content: Content) -> some View {
        content
            .onAppear { pick() }
            .onChange(of: model.pendingAction) { pick() }
            .onChange(of: blocked) { pick() }
            .onChange(of: route) { pick() }
            .sheet(item: $route) { CoachRouter.destination($0, model: model) }
    }

    private func pick() {
        guard !blocked, route == nil, let action = model.pendingAction, action.isSheet else { return }
        model.pendingAction = nil
        route = action
    }
}

extension View {
    /// Lets Guus and notifications open sheets over these tabs.
    func coachRoutes(blocked: Bool) -> some View {
        modifier(CoachRoutes(blocked: blocked))
    }
}
