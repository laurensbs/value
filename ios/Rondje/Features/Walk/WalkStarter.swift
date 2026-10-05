import Foundation

/// Starts (or continues) the walk for an accepted appointment. Shared by the appointment card and Guus's
/// next step, so both start a walk in exactly the same way. Busy state, haptics and banners stay with the caller.
@MainActor
enum WalkStarter {
    static func start(_ item: Appointment, model: AppModel, walk: WalkTracker) async throws {
        // The server's switch of this moment decides whether this walk shares a location at all.
        let features = ServerFeatures.shared
        await features.refresh(force: true)
        let live = features.liveLocation
        // Live location off: no location permission is asked for a walk, and no GPS starts.
        if live { LocationService.shared.requestPermission() }
        let started: WalkStarted = try await APIClient.shared.post("/api/v1/walks", ["requestId": item.id])
        // The vet's details come from the dog's page, which the walker may see after acceptance.
        let detail: DogDetail? = try? await APIClient.shared.get("/api/v1/dogs/\(item.dog.id)")
        // When continuing a walk, the timer and planned end come from the server, not from now.
        let current: LiveWalk? = item.walkStatus == "active"
            ? try? await APIClient.shared.get("/api/walks/\(started.walkId)/live?after=999999999")
            : nil
        walk.start(.init(
            walkId: started.walkId, dogName: item.dog.name, look: item.dog.look, startedAt: current?.startedAt ?? .now,
            plannedEnd: current?.plannedEndAt ?? .now.addingTimeInterval(Double(item.durationMin) * 60),
            ownerName: item.host?.name, ownerPhone: item.host?.phone, vetInfo: detail?.dog.vetInfo,
            liveLocation: live && current?.liveLocation != false
        ))
        await model.refreshAppointments()
    }

    /// A walk alone with the dog does not start while live location is off: the live map is how the
    /// owner follows it (safety protocol art. 2 and 3.5). A walk already running can always go on.
    nonisolated static func blockedByLiveLocation(_ item: Appointment, liveLocation: Bool) -> Bool {
        !liveLocation && item.kind == "solo" && item.walkStatus != "active"
    }
}
