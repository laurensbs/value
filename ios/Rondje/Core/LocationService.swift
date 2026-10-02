import CoreLocation
import Foundation

/// Where the person is, only when they allow it. For finding dogs the position is rounded to about
/// 1 km before it leaves the phone; precise positions are only sent during a walk (see WalkTracker).
@MainActor
@Observable
final class LocationService: NSObject, CLLocationManagerDelegate {
    static let shared = LocationService()

    private let manager = CLLocationManager()
    private var waiters: [CheckedContinuation<CLLocation?, Never>] = []
    private(set) var authorization: CLAuthorizationStatus
    private(set) var last: CLLocation?

    override init() {
        authorization = manager.authorizationStatus
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    var allowed: Bool { authorization == .authorizedWhenInUse || authorization == .authorizedAlways }

    func requestPermission() {
        if authorization == .notDetermined { manager.requestWhenInUseAuthorization() }
    }

    /// A rough position for sorting dogs by distance, rounded to two decimals (≈ 1 km).
    func roughPosition() async -> (lat: Double, lng: Double)? {
        guard allowed else { return nil }
        let location: CLLocation?
        if let last, last.timestamp.timeIntervalSinceNow > -600 {
            location = last
        } else {
            location = await withCheckedContinuation { continuation in
                waiters.append(continuation)
                manager.requestLocation()
            }
        }
        guard let c = location?.coordinate else { return nil }
        return ((c.latitude * 100).rounded() / 100, (c.longitude * 100).rounded() / 100)
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in self.authorization = status }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let location = locations.last
        Task { @MainActor in
            self.last = location
            self.resume(location)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.resume(nil) }
    }

    private func resume(_ location: CLLocation?) {
        let pending = waiters
        waiters.removeAll()
        pending.forEach { $0.resume(returning: location) }
    }
}
