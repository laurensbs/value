import Foundation

/// Starts (or continues) the walk for an accepted appointment. Shared by the appointment card and Guus's
/// next step, so both start a walk in exactly the same way. Busy state, haptics and banners stay with the caller.
@MainActor
enum WalkStarter {
    static func start(_ item: Appointment, model: AppModel, walk: WalkTracker) async throws {
        LocationService.shared.requestPermission()
        let started: WalkStarted = try await APIClient.shared.post("/api/v1/walks", ["requestId": item.id])
        // The vet's details come from the dog's page, which the walker may see after acceptance.
        let detail: DogDetail? = try? await APIClient.shared.get("/api/v1/dogs/\(item.dog.id)")
        // When continuing a walk, the timer and planned end come from the server, not from now.
        let live: LiveWalk? = item.walkStatus == "active"
            ? try? await APIClient.shared.get("/api/walks/\(started.walkId)/live?after=999999999")
            : nil
        walk.start(.init(
            walkId: started.walkId, dogName: item.dog.name, look: item.dog.look, startedAt: live?.startedAt ?? .now,
            plannedEnd: live?.plannedEndAt ?? .now.addingTimeInterval(Double(item.durationMin) * 60),
            ownerName: item.host?.name, ownerPhone: item.host?.phone, vetInfo: detail?.dog.vetInfo
        ))
        await model.refreshAppointments()
    }
}
