import ActivityKit
import CoreLocation
import Foundation

/// Records the route of an active walk and sends it to the server, so the owner can watch along.
/// GPS runs only between "start" and "end"; the Live Activity shows the walk on the Lock Screen.
/// With live location switched off on the server (LiveLocation.swift) there is no GPS at all: the walk
/// runs on its timer, report and photos, and nothing about where you are leaves the phone.
@MainActor
@Observable
final class WalkTracker {
    struct Info: Codable, Equatable {
        var walkId: String
        var dogName: String
        var look: DogLook
        var startedAt: Date
        var plannedEnd: Date
        var ownerName: String?
        var ownerPhone: String?
        var vetInfo: String?
        /// Live location for this walk: features.liveLocation when it started, false once the server
        /// switched it off during the walk. Missing in a walk saved by an older version: on.
        var liveLocation: Bool? = nil

        var sharesLocation: Bool { liveLocation != false }
    }

    static let shared = WalkTracker()
    private static let storageKey = "activeWalk"

    private(set) var info: Info?
    private(set) var route: [CLLocationCoordinate2D] = []
    private(set) var distanceM: Double = 0
    private(set) var lastFix: Date?
    private(set) var overdueMin = 0
    private(set) var signalWeak = false
    /// The recorded fixes with their times, for Apple Health (only used when the walker switched that on).
    @ObservationIgnored private(set) var locations: [CLLocation] = []

    private var pending: [[String: Double]] = []
    private var lastLocation: CLLocation?
    private var updatesTask: Task<Void, Never>?
    private var flushTask: Task<Void, Never>?
    private var background: CLBackgroundActivitySession?
    private var activityID: String?

    var isActive: Bool { info != nil }
    /// This walk records and shares where you are (see Info.liveLocation).
    var sharesLocation: Bool { info?.sharesLocation ?? true }
    /// GPS is running right now.
    var isTrackingLocation: Bool { updatesTask != nil }

    /// `restore`: carry on with a walk the app was closed during (false only in tests).
    init(restore: Bool = true) {
        if restore, let data = UserDefaults.standard.data(forKey: Self.storageKey),
           let saved = try? JSONDecoder().decode(Info.self, from: data) {
            // The app was closed during a walk: carry on where it was.
            info = saved
            activityID = Activity<WalkActivityAttributes>.activities.first { $0.attributes.walkId == saved.walkId }?.id
            startUpdates()
        }
    }

    func start(_ info: Info) {
        guard self.info?.walkId != info.walkId else { return }
        self.info = info
        route = []
        locations = []
        distanceM = 0
        overdueMin = 0
        pending = []
        lastLocation = nil
        save()
        startLiveActivity(info)
        startUpdates()
    }

    /// The server switched live location off during this walk (features.liveLocation, or
    /// 403 live-location-off on the points). GPS stops, the points not sent yet are dropped, and the walk
    /// carries on with the timer, the report and photos.
    func liveLocationOff() {
        guard var info, info.sharesLocation else { return }
        info.liveLocation = false
        self.info = info
        save()
        updatesTask?.cancel()
        updatesTask = nil
        background?.invalidate()
        background = nil
        pending = []
        route = []
        locations = []
        lastLocation = nil
        distanceM = 0
        signalWeak = false
        Task { await updateLiveActivity() }
    }

    private func save() {
        guard let info, let data = try? JSONEncoder().encode(info) else { return }
        UserDefaults.standard.set(data, forKey: Self.storageKey)
    }

    /// Sends the last points and stops GPS. Returns the distance the server measured.
    func finish() async throws -> Int {
        guard let info else { return 0 }
        await flush()
        let result: WalkEnded = try await APIClient.shared.post("/api/v1/walks/\(info.walkId)/end", [String: String]())
        stop(finalDistance: result.distanceM)
        return result.distanceM
    }

    /// Stops everything locally, for example when the server says the walk already ended.
    func stop(finalDistance: Int? = nil) {
        updatesTask?.cancel()
        updatesTask = nil
        flushTask?.cancel()
        flushTask = nil
        background?.invalidate()
        background = nil
        let distance = finalDistance ?? Int(distanceM)
        if let activityID {
            let state = WalkActivityAttributes.ContentState(distanceM: distance, plannedEnd: info?.plannedEnd ?? .now, overdue: false, liveLocation: info?.liveLocation)
            Task { await Self.endActivity(id: activityID, state: state) }
        }
        activityID = nil
        info = nil
        UserDefaults.standard.removeObject(forKey: Self.storageKey)
    }

    private func startUpdates() {
        updatesTask?.cancel()
        updatesTask = nil
        // Live location switched off: no GPS and no background location at all, only the timer.
        if sharesLocation {
            // Keeps location updates alive with the phone in a pocket; iOS shows the blue location pill.
            background = CLBackgroundActivitySession()
            updatesTask = Task { [weak self] in
                do {
                    for try await update in CLLocationUpdate.liveUpdates(.fitness) {
                        guard let self, !Task.isCancelled else { return }
                        if let location = update.location { self.record(location) }
                    }
                } catch {}
            }
        }
        flushTask?.cancel()
        flushTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(10))
                await self?.flush()
            }
        }
    }

    private func record(_ location: CLLocation) {
        guard sharesLocation else { return }
        lastFix = .now
        // Inaccurate fixes make a route zig-zag: skip them, and ignore standing still.
        guard location.horizontalAccuracy >= 0, location.horizontalAccuracy <= 50 else {
            signalWeak = true
            return
        }
        signalWeak = false
        if let lastLocation {
            let step = location.distance(from: lastLocation)
            guard step >= 5 else { return }
            if step < 400 { distanceM += step }
        }
        lastLocation = location
        route.append(location.coordinate)
        locations.append(location)
        pending.append([
            "lat": location.coordinate.latitude,
            "lng": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy,
            "t": (location.timestamp.timeIntervalSince1970 * 1000).rounded(),
        ])
        if pending.count >= 60 { Task { await flush() } }
    }

    private struct PointsBody: Encodable { var points: [[String: Double]] }
    private struct PointsResult: Decodable { var status: String; var overdueMin: Int? }

    private func flush() async {
        guard let info else { return }
        let batch = Array(pending.prefix(120))
        do {
            if !batch.isEmpty {
                let result: PointsResult = try await APIClient.shared.post("/api/walks/\(info.walkId)/points", PointsBody(points: batch))
                pending.removeFirst(min(batch.count, pending.count))
                if result.status != "active" { stop(); return }
                overdueMin = result.overdueMin ?? 0
            } else if !info.sharesLocation {
                // No points go out, so ask how the walk stands: that is also how running late still
                // reaches the owner (the server checks it on every look).
                let live: LiveWalk = try await APIClient.shared.get("/api/walks/\(info.walkId)/live?after=999999999")
                if live.status != "active" { stop(); return }
                overdueMin = live.overdueMin
            } else {
                overdueMin = max(0, Int(Date.now.timeIntervalSince(info.plannedEnd) / 60) - 20)
            }
        } catch let error as APIError where error.code == "live-location-off" {
            // Switched off on the server: the points are not kept, and no new ones are recorded.
            liveLocationOff()
        } catch {
            // Offline: the points stay queued and go out with the next flush.
        }
        await updateLiveActivity()
    }

    private func startLiveActivity(_ info: Info) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        let attributes = WalkActivityAttributes(walkId: info.walkId, dogName: info.dogName, startedAt: info.startedAt, look: info.look)
        let state = WalkActivityAttributes.ContentState(distanceM: 0, plannedEnd: info.plannedEnd, overdue: false, liveLocation: info.liveLocation)
        activityID = (try? Activity.request(attributes: attributes, content: ActivityContent(state: state, staleDate: nil)))?.id
    }

    private func updateLiveActivity() async {
        guard let activityID, let info else { return }
        let state = WalkActivityAttributes.ContentState(distanceM: Int(distanceM), plannedEnd: info.plannedEnd, overdue: overdueMin > 0, liveLocation: info.liveLocation)
        await Self.updateActivity(id: activityID, state: state)
    }

    // Activity is not Sendable, so it is looked up by id where it is used instead of being stored.
    private nonisolated static func updateActivity(id: String, state: WalkActivityAttributes.ContentState) async {
        for activity in Activity<WalkActivityAttributes>.activities where activity.id == id {
            await activity.update(ActivityContent(state: state, staleDate: nil))
        }
    }

    private nonisolated static func endActivity(id: String, state: WalkActivityAttributes.ContentState) async {
        for activity in Activity<WalkActivityAttributes>.activities where activity.id == id {
            await activity.end(ActivityContent(state: state, staleDate: nil), dismissalPolicy: .after(.now + 60 * 5))
        }
    }
}
