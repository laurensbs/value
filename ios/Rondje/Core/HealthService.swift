import CoreLocation
import Foundation
import HealthKit

/// Apple Health, opt-in and off by default.
/// - "Rondjes bewaren": a finished rondje becomes an outdoor walk (time, distance, and the route without its first
///   and last 200 m, so nobody's front door ends up in Health), and the breathing minute a mindful session.
/// - "Stemming bewaren", a separate switch: how you felt after a walk, as a State of Mind.
/// Everything is written on this iPhone only. Rondje reads nothing from Health and sends none of it to the server.
@MainActor
@Observable
final class HealthService {
    static let shared = HealthService()

    enum Availability: Equatable {
        case available
        /// No Health on this device (for example an iPad without the Health app).
        case noHealth
        /// This build was signed without the HealthKit capability (for example with a free Apple ID).
        case notInThisBuild
    }

    private enum Key {
        static let walks = "health.walks"
        static let mood = "health.mood"
    }

    private(set) var availability: Availability
    private(set) var savesWalks: Bool
    private(set) var savesMood: Bool

    private let store: HKHealthStore?

    nonisolated static var walkTypes: Set<HKSampleType> {
        [HKObjectType.workoutType(), HKQuantityType(.distanceWalkingRunning), HKSeriesType.workoutRoute(), HKCategoryType(.mindfulSession)]
    }

    nonisolated static var moodTypes: Set<HKSampleType> { [HKSampleType.stateOfMindType()] }

    init() {
        let availability: Availability = !HKHealthStore.isHealthDataAvailable() ? .noHealth
            : Self.profileLacksHealthKit() ? .notInThisBuild : .available
        self.availability = availability
        store = availability == .noHealth ? nil : HKHealthStore()
        savesWalks = availability == .available && UserDefaults.standard.bool(forKey: Key.walks)
        savesMood = availability == .available && UserDefaults.standard.bool(forKey: Key.mood)
    }

    // MARK: The switches

    /// Turns saving walks on (asking iOS for permission first) or off. Returns a short note when it did not work.
    func setSavesWalks(_ on: Bool) async -> String? {
        let (allowed, note) = on ? await authorize(Self.walkTypes, decidingType: HKObjectType.workoutType()) : (false, nil)
        savesWalks = allowed
        UserDefaults.standard.set(allowed, forKey: Key.walks)
        return note
    }

    func setSavesMood(_ on: Bool) async -> String? {
        let (allowed, note) = on ? await authorize(Self.moodTypes, decidingType: HKSampleType.stateOfMindType()) : (false, nil)
        savesMood = allowed
        UserDefaults.standard.set(allowed, forKey: Key.mood)
        return note
    }

    /// Rondje only asks to write, never to read. iOS tells an app honestly whether it may write a type.
    private func authorize(_ types: Set<HKSampleType>, decidingType: HKObjectType) async -> (Bool, String?) {
        guard let store, availability == .available else { return (false, L("Apple Gezondheid is niet beschikbaar op dit toestel.")) }
        do {
            try await store.requestAuthorization(toShare: types, read: [])
        } catch {
            if Self.isMissingCapability(error) {
                availability = .notInThisBuild
                return (false, L("Apple Gezondheid is niet beschikbaar op dit toestel."))
            }
            return (false, L("Dat lukte even niet. Probeer het later nog eens."))
        }
        guard store.authorizationStatus(for: decidingType) == .sharingAuthorized else {
            return (false, L("\(Brand.name) mag nog niets bewaren in Gezondheid. Dat zet je aan in Instellingen > Privacy en beveiliging > Gezondheid."))
        }
        return (true, nil)
    }

    // MARK: Writing

    /// After a finished walk. Returns a gentle note for a banner when it was not saved, otherwise nil.
    func saveWalk(start: Date, end: Date, distanceM: Double, locations: [CLLocation]) async -> String? {
        guard savesWalks, let store, end > start else { return nil }
        guard store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized else {
            // Permission was taken back in Settings: stop trying, and say so once.
            savesWalks = false
            UserDefaults.standard.set(false, forKey: Key.walks)
            return L("Niet bewaard in Apple Gezondheid: \(Brand.name) heeft daar geen toestemming meer voor.")
        }
        let withDistance = store.authorizationStatus(for: HKQuantityType(.distanceWalkingRunning)) == .sharingAuthorized
        let route = store.authorizationStatus(for: HKSeriesType.workoutRoute()) == .sharingAuthorized ? HealthMath.withoutEnds(locations) : []
        do {
            try await Self.write(store: store, start: start, end: end, distanceM: withDistance ? distanceM : 0, route: route, brand: Brand.name)
            return nil
        } catch {
            return L("Dit rondje kon niet in Apple Gezondheid worden bewaard.")
        }
    }

    /// After the breathing minute (or most of it).
    func saveMindfulMinute(start: Date, end: Date) {
        let type = HKCategoryType(.mindfulSession)
        guard savesWalks, let store, end.timeIntervalSince(start) >= 30, store.authorizationStatus(for: type) == .sharingAuthorized else { return }
        let session = HKCategorySample(type: type, value: HKCategoryValue.notApplicable.rawValue, start: start, end: end,
                                       metadata: [HKMetadataKeyWorkoutBrandName: Brand.name])
        Task { try? await store.save(session) }
    }

    /// The mood after a walk (1 = zwaar … 5 = top), only with its own switch on.
    func saveMood(_ mood: Int, at date: Date = .now) {
        guard savesMood, let store, store.authorizationStatus(for: HKSampleType.stateOfMindType()) == .sharingAuthorized else { return }
        let state = HKStateOfMind(date: date, kind: .momentaryEmotion, valence: HealthMath.valence(mood: mood), labels: [], associations: [.fitness])
        Task { try? await store.save(state) }
    }

    private nonisolated static func write(store: HKHealthStore, start: Date, end: Date, distanceM: Double, route: [CLLocation], brand: String) async throws {
        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .walking
        configuration.locationType = .outdoor
        let builder = HKWorkoutBuilder(healthStore: store, configuration: configuration, device: .local())
        try await builder.beginCollection(at: start)
        if distanceM > 0 {
            let distance = HKQuantitySample(type: HKQuantityType(.distanceWalkingRunning),
                                            quantity: HKQuantity(unit: .meter(), doubleValue: distanceM), start: start, end: end)
            try await builder.addSamples([distance])
        }
        try await builder.addMetadata([HKMetadataKeyWorkoutBrandName: brand, HKMetadataKeyIndoorWorkout: false])
        try await builder.endCollection(at: end)
        guard let workout = try await builder.finishWorkout(), route.count >= 2 else { return }
        let routeBuilder = HKWorkoutRouteBuilder(healthStore: store, device: .local())
        try await routeBuilder.insertRouteData(route)
        try await routeBuilder.finishRoute(with: workout, metadata: nil)
    }

    // MARK: Is HealthKit in this build?

    /// Development and ad-hoc builds carry their provisioning profile: without HealthKit in it, asking would only fail.
    /// App Store builds have no embedded profile; there the capability is always in place.
    private static func profileLacksHealthKit() -> Bool {
        guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
              let profile = try? Data(contentsOf: url) else { return false }
        return profile.range(of: Data("com.apple.developer.healthkit".utf8)) == nil
    }

    private static func isMissingCapability(_ error: Error) -> Bool {
        let error = error as NSError
        return error.domain == HKErrorDomain
            && (error.code == HKError.Code.errorAuthorizationDenied.rawValue || error.localizedDescription.contains("entitlement"))
    }
}

/// Pure helpers, kept apart so they can be tested.
enum HealthMath {
    /// The route without everything within `radius` of where it started and ended: walks start and end at the
    /// dog's home, and that address does not belong in the walker's Health app.
    nonisolated static func withoutEnds(_ locations: [CLLocation], radius: CLLocationDistance = 200) -> [CLLocation] {
        guard let first = locations.first, let last = locations.last else { return [] }
        return locations.filter { $0.distance(from: first) > radius && $0.distance(from: last) > radius }
    }

    /// Rondje's five faces (1 … 5) on Health's scale from very unpleasant (-1) to very pleasant (1).
    nonisolated static func valence(mood: Int) -> Double {
        Double(min(5, max(1, mood)) - 3) / 2
    }
}
