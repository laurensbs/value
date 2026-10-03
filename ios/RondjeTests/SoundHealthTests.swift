import CoreLocation
import Foundation
import Testing
@testable import Rondje

@Suite("Sounds and Apple Health")
struct SoundHealthTests {
    /// A straight walk northwards, one fix every 50 m, a minute apart.
    private func line(metres: Int, from start: CLLocationCoordinate2D = .init(latitude: 52.09, longitude: 5.12)) -> [CLLocation] {
        stride(from: 0, through: metres, by: 50).map { m in
            CLLocation(coordinate: .init(latitude: start.latitude + Double(m) / 111_195, longitude: start.longitude),
                       altitude: 0, horizontalAccuracy: 5, verticalAccuracy: 5, timestamp: Date(timeIntervalSince1970: Double(m) * 1.2))
        }
    }

    @Test func theRouteForHealthLeavesOutTheFrontDoor() {
        let walk = line(metres: 1000)
        let kept = HealthMath.withoutEnds(walk)
        #expect(!kept.isEmpty)
        for fix in kept {
            #expect(fix.distance(from: walk.first!) > 200)
            #expect(fix.distance(from: walk.last!) > 200)
        }
        // Still in time order, as Health wants it.
        #expect(kept.map(\.timestamp) == kept.map(\.timestamp).sorted())
    }

    @Test func aShortLoopAroundTheHouseKeepsNoRouteAtAll() {
        let out = line(metres: 150)
        let loop = out + out.reversed().dropFirst()
        #expect(HealthMath.withoutEnds(loop).isEmpty)
        #expect(HealthMath.withoutEnds([]).isEmpty)
    }

    @Test func moodFacesMapOntoHealthsScale() {
        #expect(HealthMath.valence(mood: 1) == -1)
        #expect(HealthMath.valence(mood: 3) == 0)
        #expect(HealthMath.valence(mood: 4) == 0.5)
        #expect(HealthMath.valence(mood: 5) == 1)
        #expect(HealthMath.valence(mood: 0) == -1)
        #expect(HealthMath.valence(mood: 9) == 1)
    }

    @MainActor @Test func everySoundIsInTheApp() {
        for sound in SoundFX.Sound.allCases {
            #expect(Bundle.main.url(forResource: sound.rawValue, withExtension: "wav") != nil, "\(sound.rawValue).wav is missing")
        }
    }

    @MainActor @Test func soundsAreOnUntilSwitchedOff() {
        let defaults = UserDefaults.standard
        let saved = defaults.object(forKey: SoundFX.enabledKey)
        defer { defaults.set(saved, forKey: SoundFX.enabledKey) }
        defaults.removeObject(forKey: SoundFX.enabledKey)
        #expect(SoundFX.enabled)
        defaults.set(false, forKey: SoundFX.enabledKey)
        #expect(!SoundFX.enabled)
    }
}
