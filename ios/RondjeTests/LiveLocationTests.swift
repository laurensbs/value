import Foundation
import Testing
@testable import Rondje

/// The server's switch for live location during walks (LIVE_LOCATION, features.liveLocation).
@Suite("Live locatie aan of uit")
struct LiveLocationTests {
    private func config(_ json: String) throws -> AppConfig {
        try APIClient.makeDecoder().decode(AppConfig.self, from: Data(json.utf8))
    }

    // MARK: Decoding /api/v1/config

    @Test func olderServersKeepItOn() throws {
        // GET https://rondjemee.nl/api/v1/config on 5 October 2026, before the switch existed.
        let live = try config(#"{"apiVersion":1,"legal":{"terms":"/legal/terms"},"emergencyNumber":"112","auth":{"providers":[],"appleNative":false}}"#)
        #expect(live.features == nil)
        #expect(live.liveLocation)
        #expect(try config("{}").liveLocation)
        #expect(try config(#"{"features":{}}"#).liveLocation)
        #expect(try config(#"{"features":{"liveLocation":null}}"#).liveLocation)
    }

    @Test func theServerCanSwitchItOff() throws {
        // As the website sends it (api/v1/config/route.ts, branch claude/voorwaarden-opnieuw).
        let off = try config(#"{"apiVersion":1,"auth":{"providers":["apple"],"appleNative":true},"features":{"liveLocation":false},"terms":{"version":"0.3","effectiveAt":"2026-11-08T23:00:00.000Z"}}"#)
        #expect(off.liveLocation == false)
        // The rest of the config reads as before.
        #expect(off.auth?.providers == ["apple"])
        #expect(try config(#"{"features":{"liveLocation":true}}"#).liveLocation)
    }

    @Test func otherValuesAreReadLikeTheServerSwitch() throws {
        for on in [#"1"#, #""1""#, #""aan""#, #""true""#, #"" On ""#] {
            #expect(try config(#"{"features":{"liveLocation":\#(on)}}"#).liveLocation, "\(on)")
        }
        // A typo never leaves it on by accident.
        for off in [#"0"#, #""0""#, #""uit""#, #""of""#, #"[]"#] {
            #expect(try config(#"{"features":{"liveLocation":\#(off)}}"#).liveLocation == false, "\(off)")
        }
    }

    @Test func theLiveViewSaysItToo() throws {
        let json = #"{"status":"active","startedAt":"2026-10-05T10:00:00.000Z","plannedEndAt":"2026-10-05T10:30:00.000Z","endedAt":null,"lastAt":null,"overdueMin":0,"points":[],"liveLocation":false}"#
        let off = try APIClient.makeDecoder().decode(LiveWalk.self, from: Data(json.utf8))
        #expect(off.liveLocation == false)
        let older = try APIClient.makeDecoder().decode(LiveWalk.self, from: Data(json.replacingOccurrences(of: #","liveLocation":false"#, with: "").utf8))
        #expect(older.liveLocation == nil)
    }

    // MARK: What the phone remembers

    @MainActor
    @Test func thePhoneRemembersTheLastAnswer() throws {
        let name = "rondje.tests.features.\(UUID().uuidString)"
        let defaults = try #require(UserDefaults(suiteName: name))
        defer { defaults.removePersistentDomain(forName: name) }
        #expect(ServerFeatures(defaults: defaults).liveLocation)
        let features = ServerFeatures(defaults: defaults)
        features.apply(try config(#"{"features":{"liveLocation":false}}"#))
        #expect(features.liveLocation == false)
        // Without signal on the next launch, the last answer still holds.
        #expect(ServerFeatures(defaults: defaults).liveLocation == false)
        features.apply(try config("{}"))
        #expect(ServerFeatures(defaults: defaults).liveLocation)
    }

    // MARK: Which walks start

    private static let now = Date(timeIntervalSince1970: 1_791_201_600)

    private func appointment(_ id: String, kind: String, walkStatus: String? = nil) -> Appointment {
        Appointment(
            id: id, kind: kind, status: "accepted", startsAt: Self.now.addingTimeInterval(10 * 60), durationMin: 30, weekly: false, message: "", flags: [],
            walkId: walkStatus == nil ? nil : "w-\(id)", walkStatus: walkStatus, feedbackGiven: nil,
            dog: .init(id: "d-\(id)", name: "Bobbie", photos: [], look: .sample, city: "Utrecht", isShelter: false, meetingInfo: ""),
            host: nil, walker: nil, trust: nil
        )
    }

    @Test func aWalkAloneWaitsAMeetingDoesNot() {
        let solo = appointment("s", kind: "solo"), meet = appointment("m", kind: "meet")
        #expect(WalkStarter.blockedByLiveLocation(solo, liveLocation: false))
        #expect(!WalkStarter.blockedByLiveLocation(meet, liveLocation: false))
        #expect(!WalkStarter.blockedByLiveLocation(solo, liveLocation: true))
        // A walk already running can always go on (the server returns it as it is).
        #expect(!WalkStarter.blockedByLiveLocation(appointment("r", kind: "solo", walkStatus: "active"), liveLocation: false))
    }

    @Test func guusOnlyOffersWalksThatCanStart() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        var c = NextStepContext(now: Self.now, calendar: calendar, placement: .discover, role: .walker, firstName: "Sam", country: "NL", quizPassed: true)
        c.outgoing = [appointment("s", kind: "solo")]
        #expect(NextStep.compute(c).action == .startWalk("s"))
        c.liveLocation = false
        #expect(NextStep.compute(c).action != .startWalk("s"))
        c.outgoing.append(appointment("m", kind: "meet"))
        #expect(NextStep.compute(c).action == .startWalk("m"))
    }

    // MARK: The walk itself

    private func info(_ live: Bool?) -> WalkTracker.Info {
        WalkTracker.Info(walkId: "test-walk-\(UUID().uuidString)", dogName: "Bobbie", look: .sample, startedAt: .now,
                         plannedEnd: .now.addingTimeInterval(1800), liveLocation: live)
    }

    @Test func aWalkSavedByAnOlderVersionKeepsSharing() throws {
        let saved = #"{"walkId":"w1","dogName":"Bobbie","look":\#(String(decoding: try JSONEncoder().encode(DogLook.sample), as: UTF8.self)),"startedAt":0,"plannedEnd":1800}"#
        let info = try JSONDecoder().decode(WalkTracker.Info.self, from: Data(saved.utf8))
        #expect(info.liveLocation == nil)
        #expect(info.sharesLocation)
        let off = try JSONDecoder().decode(WalkTracker.Info.self, from: JSONEncoder().encode(self.info(false)))
        #expect(off.sharesLocation == false)
    }

    @MainActor
    @Test func withLiveLocationOffNoGPSStarts() {
        let tracker = WalkTracker(restore: false)
        defer { tracker.stop() }
        tracker.start(info(false))
        #expect(tracker.isActive)
        #expect(tracker.sharesLocation == false)
        #expect(tracker.isTrackingLocation == false)
        #expect(tracker.route.isEmpty)
    }

    @MainActor
    @Test func switchedOffDuringAWalkStopsGPSAndKeepsTheWalk() throws {
        let tracker = WalkTracker(restore: false)
        defer { tracker.stop() }
        let walk = info(true)
        tracker.start(walk)
        #expect(tracker.isTrackingLocation)
        tracker.liveLocationOff()
        #expect(tracker.isActive)
        #expect(tracker.info?.walkId == walk.walkId)
        #expect(tracker.sharesLocation == false)
        #expect(tracker.isTrackingLocation == false)
        #expect(tracker.distanceM == 0)
        // Remembered, so a restart mid-walk does not switch GPS back on.
        let data = try #require(UserDefaults.standard.data(forKey: "activeWalk"))
        #expect(try JSONDecoder().decode(WalkTracker.Info.self, from: data).liveLocation == false)
    }
}
