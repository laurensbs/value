import Foundation

/// Starts (or continues) the walk for an accepted appointment. Shared by the appointment card and Guus's
/// next step, so both start a walk in exactly the same way. Busy state, haptics and banners stay with the caller.
@MainActor
enum WalkStarter {
    static func start(_ item: Appointment, model: AppModel, walk: WalkTracker) async throws {
        // The server's switch of this moment decides whether this walk shares a location at all.
        let features = ServerFeatures.shared
        await features.refresh(force: true)
        // A walk that shares no location (a first meeting, or the switch off): no location permission
        // is asked for it, and no GPS starts.
        let expected = sharesLocation(kind: item.kind, liveLocation: features.liveLocation)
        if expected { LocationService.shared.requestPermission() }
        let started: WalkStarted = try await APIClient.shared.post("/api/v1/walks", ["requestId": item.id])
        // The vet's details come from the dog's page, which the walker may see after acceptance.
        let detail: DogDetail? = try? await APIClient.shared.get("/api/v1/dogs/\(item.dog.id)")
        // When continuing a walk, the timer and planned end come from the server, not from now.
        let current: LiveWalk? = item.walkStatus == "active"
            ? try? await APIClient.shared.get("/api/walks/\(started.walkId)/live?after=999999999")
            : nil
        let live = sharesLocation(kind: item.kind, server: started.liveLocation, liveLocation: features.liveLocation, current: current?.liveLocation)
        if live && !expected { LocationService.shared.requestPermission() }
        walk.start(.init(
            walkId: started.walkId, dogName: item.dog.name, look: item.dog.look, startedAt: current?.startedAt ?? .now,
            plannedEnd: current?.plannedEndAt ?? .now.addingTimeInterval(Double(item.durationMin) * 60),
            ownerName: item.host?.name, ownerPhone: item.host?.phone, vetInfo: detail?.dog.vetInfo,
            liveLocation: live, kind: item.kind
        ))
        await model.refreshAppointments()
    }

    /// Whether a walk shares where the walker is (web lib/rules.ts walkHasLiveLocation): only a walk alone
    /// with the dog, and only with live location switched on. A first meeting never does: the owner or
    /// shelter walks along, so there is no map. `server` is the server's own answer for this walk
    /// (`liveLocation` from POST /api/v1/walks); older servers give none, and then the switch decides, as
    /// before. `current` is /live of a walk that was already running.
    nonisolated static func sharesLocation(kind: String, server: Bool? = nil, liveLocation: Bool, current: Bool? = nil) -> Bool {
        guard kind == "solo" else { return false }
        return (server ?? liveLocation) && current != false
    }

    /// A walk alone with the dog does not start while live location is off: the live map is how the
    /// owner follows it (safety protocol art. 2 and 3.5). A walk already running can always go on.
    /// The server's `paused` counts too (Appointment.waitsForLiveLocation).
    nonisolated static func blockedByLiveLocation(_ item: Appointment, liveLocation: Bool) -> Bool {
        item.waitsForLiveLocation(liveLocation: liveLocation)
    }
}
