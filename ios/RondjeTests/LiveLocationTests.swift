import CoreLocation
import Foundation
import Testing
@testable import Rondje

/// What the points endpoint was sent, and what it answers (a stand-in for the server in tests).
@MainActor
final class PointsServer {
    var batches: [[[String: Double]]] = []
    var answer: Error?

    func post(_ walkId: String, _ points: [[String: Double]]) throws -> WalkTracker.PointsResult {
        batches.append(points)
        if let answer { throw answer }
        return .init(status: "active", overdueMin: 0)
    }

    /// Whether a batch held the fix at this latitude.
    func sent(_ batch: Int, latitude: Double) -> Bool {
        batches.indices.contains(batch) && batches[batch].contains { $0["lat"] == latitude }
    }
}

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
        #expect(off.kind == nil)
        let older = try APIClient.makeDecoder().decode(LiveWalk.self, from: Data(json.replacingOccurrences(of: #","liveLocation":false"#, with: "").utf8))
        #expect(older.liveLocation == nil)
    }

    @Test func theLiveViewSaysTheKindOfWalk() throws {
        // As the website sends it now (api/walks/[id]/live/route.ts, branch claude/voorwaarden-opnieuw).
        let base = #"{"status":"active","startedAt":"2026-10-05T10:00:00.000Z","plannedEndAt":"2026-10-05T10:30:00.000Z","endedAt":null,"lastAt":null,"overdueMin":0,"care":{"pee":1,"poo":0,"water":2},"photos":[],"points":[]"#
        let decoder = APIClient.makeDecoder()
        let meet = try decoder.decode(LiveWalk.self, from: Data((base + #","kind":"meet","liveLocation":false}"#).utf8))
        #expect(meet.kind == "meet")
        #expect(meet.liveLocation == false)
        #expect(meet.care?.water == 2)
        let solo = try decoder.decode(LiveWalk.self, from: Data((base + #","kind":"solo","liveLocation":true}"#).utf8))
        #expect(solo.kind == "solo")
        #expect(solo.liveLocation == true)
        // The request is gone (null), or something odd: still a walk to watch.
        let gone = try decoder.decode(LiveWalk.self, from: Data((base + #","kind":null,"liveLocation":false}"#).utf8))
        #expect(gone.kind == nil)
        let odd = try decoder.decode(LiveWalk.self, from: Data((base + #","kind":7,"liveLocation":"nee"}"#).utf8))
        #expect(odd.kind == nil)
        #expect(odd.liveLocation == nil)
        #expect(odd.status == "active")
    }

    @Test func startingAWalkSaysWhetherItSharesLocation() throws {
        let decoder = APIClient.makeDecoder()
        // POST /api/v1/walks answers 201 { walkId, liveLocation } (branch claude/voorwaarden-opnieuw).
        let solo = try decoder.decode(WalkStarted.self, from: Data(#"{"walkId":"w1","liveLocation":true}"#.utf8))
        #expect(solo.walkId == "w1")
        #expect(solo.liveLocation == true)
        #expect(try decoder.decode(WalkStarted.self, from: Data(#"{"walkId":"w2","liveLocation":false}"#.utf8)).liveLocation == false)
        // Older servers send only the walk; something odd never stops the walk from starting.
        #expect(try decoder.decode(WalkStarted.self, from: Data(#"{"walkId":"w3"}"#.utf8)).liveLocation == nil)
        let odd = try decoder.decode(WalkStarted.self, from: Data(#"{"walkId":"w4","liveLocation":"ja"}"#.utf8))
        #expect(odd.walkId == "w4")
        #expect(odd.liveLocation == nil)
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

    @Test func onlyAWalkAloneSharesWhereYouAre() {
        // A first meeting never does: not with the switch on, and not even if a server said so.
        #expect(!WalkStarter.sharesLocation(kind: "meet", liveLocation: true))
        #expect(!WalkStarter.sharesLocation(kind: "meet", server: true, liveLocation: true))
        // Nor any other kind of walk.
        for kind in ["group", "", "Solo"] {
            #expect(!WalkStarter.sharesLocation(kind: kind, server: true, liveLocation: true), "\(kind)")
        }
        // A walk alone with the dog: the server's answer for this walk counts.
        #expect(WalkStarter.sharesLocation(kind: "solo", server: true, liveLocation: false))
        #expect(!WalkStarter.sharesLocation(kind: "solo", server: false, liveLocation: true))
        // An older server gives no answer: the switch decides, as before.
        #expect(WalkStarter.sharesLocation(kind: "solo", liveLocation: true))
        #expect(!WalkStarter.sharesLocation(kind: "solo", liveLocation: false))
        // A walk that was already running and has it off stays off.
        #expect(!WalkStarter.sharesLocation(kind: "solo", server: true, liveLocation: true, current: false))
        #expect(WalkStarter.sharesLocation(kind: "solo", liveLocation: true, current: nil))
    }

    @Test func theOwnerSeesAMapOnlyForAWalkAlone() {
        // A first meeting: no map, whatever the switch or the server says.
        #expect(!FollowWalkView.showsMap(kind: "meet", live: true, liveLocation: true))
        #expect(!FollowWalkView.showsMap(kind: "meet", live: nil, liveLocation: true))
        // A walk alone: the walk's own answer from /live.
        #expect(FollowWalkView.showsMap(kind: "solo", live: true, liveLocation: false))
        #expect(!FollowWalkView.showsMap(kind: "solo", live: false, liveLocation: true))
        // Before /live answers, or an older server: what the phone last heard of the switch.
        #expect(FollowWalkView.showsMap(kind: "solo", live: nil, liveLocation: true))
        #expect(!FollowWalkView.showsMap(kind: nil, live: nil, liveLocation: false))
        #expect(FollowWalkView.showsMap(kind: nil, live: nil, liveLocation: true))
    }

    @Test func theLockScreenSaysTheyWalkTogether() throws {
        // The widget has its own strings; it is built into the app.
        let widgets = try #require(Bundle.main.builtInPlugInsURL?.appendingPathComponent("RondjeWidgets.appex"))
        let bundle = try #require(Bundle(url: widgets))
        for (lang, expected) in [("en", "You're walking together"), ("fr", "Vous vous promenez ensemble"), ("es", "Paseáis juntos")] {
            let path = try #require(bundle.path(forResource: lang, ofType: "lproj"), "\(lang).lproj")
            let value = try #require(Bundle(path: path)).localizedString(forKey: "Jullie lopen samen", value: "", table: nil)
            #expect(value == expected, "\(lang)")
        }
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

    private func info(_ live: Bool?, kind: String? = nil) -> WalkTracker.Info {
        WalkTracker.Info(walkId: "test-walk-\(UUID().uuidString)", dogName: "Bobbie", look: .sample, startedAt: .now,
                         plannedEnd: .now.addingTimeInterval(1800), liveLocation: live, kind: kind)
    }

    /// A good GPS fix, `metres` north of the last one.
    private func fix(_ metres: Double) -> CLLocation {
        CLLocation(coordinate: .init(latitude: 52.09 + metres / 111_000, longitude: 5.12), altitude: 0,
                   horizontalAccuracy: 8, verticalAccuracy: 8, timestamp: .now)
    }

    @Test func aWalkSavedByAnOlderVersionKeepsSharing() throws {
        let saved = #"{"walkId":"w1","dogName":"Bobbie","look":\#(String(decoding: try JSONEncoder().encode(DogLook.sample), as: UTF8.self)),"startedAt":0,"plannedEnd":1800}"#
        let info = try JSONDecoder().decode(WalkTracker.Info.self, from: Data(saved.utf8))
        #expect(info.liveLocation == nil)
        #expect(info.sharesLocation)
        let off = try JSONDecoder().decode(WalkTracker.Info.self, from: JSONEncoder().encode(self.info(false)))
        #expect(off.sharesLocation == false)
        #expect(info.kind == nil)
        #expect(!info.together)
    }

    @MainActor
    @Test func aFirstMeetingNeverStartsGPS() {
        let tracker = WalkTracker(restore: false)
        defer { tracker.stop() }
        tracker.start(info(false, kind: "meet"))
        #expect(tracker.isActive)
        #expect(tracker.info?.together == true)
        #expect(tracker.sharesLocation == false)
        #expect(tracker.isTrackingLocation == false)
        // Even a fix that comes in anyway is never kept or queued.
        tracker.record(fix(0))
        tracker.record(fix(20))
        #expect(tracker.queuedPoints == 0)
        #expect(tracker.route.isEmpty)
    }

    @MainActor
    @Test func theServerSayingFirstMeetingStopsGPS() {
        // A walk saved by an older version (no kind) that turns out to be a first meeting.
        let tracker = WalkTracker(restore: false)
        defer { tracker.stop() }
        tracker.start(info(nil))
        #expect(tracker.isTrackingLocation)
        tracker.record(fix(0))
        #expect(tracker.queuedPoints == 1)
        let now = Date.now
        tracker.apply(LiveWalk(status: "active", startedAt: now, plannedEndAt: now.addingTimeInterval(1800), kind: "meet"))
        #expect(tracker.info?.together == true)
        #expect(tracker.sharesLocation == false)
        #expect(tracker.isTrackingLocation == false)
        #expect(tracker.queuedPoints == 0)
        // /live never switches location back on.
        tracker.apply(LiveWalk(status: "active", startedAt: now, plannedEndAt: now.addingTimeInterval(1800), liveLocation: true, kind: "solo"))
        #expect(tracker.sharesLocation == false)
        #expect(tracker.isTrackingLocation == false)
    }

    @MainActor
    @Test func a403EmptiesTheQueueForGood() async {
        let tracker = WalkTracker(restore: false)
        defer { tracker.stop() }
        let server = PointsServer()
        server.answer = APIError.server(code: "live-location-off", message: "Jullie lopen samen, dus er is geen kaart nodig.")
        tracker.postPoints = { try server.post($0, $1) }
        tracker.start(info(true, kind: "solo"))
        tracker.record(fix(0))
        tracker.record(fix(20))
        #expect(tracker.queuedPoints == 2)
        await tracker.flush()
        #expect(server.batches.count == 1)
        #expect(tracker.queuedPoints == 0)
        #expect(tracker.sharesLocation == false)
        #expect(tracker.isTrackingLocation == false)
        #expect(tracker.isActive)
        // Nothing new is queued, and nothing more is posted.
        tracker.record(fix(40))
        #expect(tracker.queuedPoints == 0)
        await tracker.flush()
        #expect(server.batches.count == 1)
    }

    @MainActor
    @Test func aBatchTheServerRefusesDoesNotGetStuck() async {
        let tracker = WalkTracker(restore: false)
        defer { tracker.stop() }
        let server = PointsServer()
        server.answer = APIError.offline
        tracker.postPoints = { try server.post($0, $1) }
        tracker.start(info(true, kind: "solo"))
        let first = fix(0), second = fix(20)
        tracker.record(first)
        // No connection: the points wait for the next try.
        await tracker.flush()
        #expect(server.sent(0, latitude: first.coordinate.latitude))
        #expect(tracker.sharesLocation)
        // A batch the server will never take (it still held the waiting fix): dropped, and the walk
        // keeps sharing.
        server.answer = APIError.server(code: "invalid", message: "")
        await tracker.flush()
        #expect(server.sent(1, latitude: first.coordinate.latitude))
        #expect(tracker.sharesLocation)
        // The next batch goes out without it.
        server.answer = nil
        tracker.record(second)
        await tracker.flush()
        #expect(server.sent(2, latitude: second.coordinate.latitude))
        #expect(!server.sent(2, latitude: first.coordinate.latitude))
        #expect(tracker.sharesLocation)
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
