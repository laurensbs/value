import Foundation
import SwiftUI
import Testing
@testable import Rondje

@Suite("Models and formatting")
struct RondjeTests {
    @Test func decodesADogCardFromTheAPI() throws {
        let json = """
        {"id":"d1","name":"Saar","breed":"Labrador","sex":"female","ageYears":9,"size":"large","energy":"calm",
         "level":"starter","photos":[],"look":{"fur":"#6e4632","ears":"#583624","muzzle":"#8d5e44","earStyle":"floppy","collar":"#c0392b","tile":"#efe0cf"},
         "story":"","traits":[],"walkMinutes":30,"city":"Utrecht","country":"NL","lat":52.09,"lng":5.12,"isDemo":true,"distanceM":881,
         "host":{"kind":"owner","id":"u1","name":"Ans","photoUrl":null,"city":"Utrecht","verified":false}}
        """
        let dog = try APIClient.makeDecoder().decode(DogCard.self, from: Data(json.utf8))
        #expect(dog.name == "Saar")
        #expect(dog.look.head == nil)
        #expect(dog.coordinate?.latitude == 52.09)
        #expect(!dog.host.isShelter)
    }

    @Test func drawsADogFromAPartialPortrait() throws {
        let look = try JSONDecoder().decode(DogLook.self, from: Data(##"{"fur":"#b98a62","ears":"#8e6443","muzzle":"#f1dfcb","tongue":false}"##.utf8))
        #expect(look.earStyle == "floppy")
        #expect(look.collar == "#1f5a3d")
    }

    @Test func aPushOpensTheRightTab() {
        #expect(Push.tab(forPath: "/chat/r1") == "appointments")
        #expect(Push.tab(forPath: "/walk/w1") == "appointments")
        #expect(Push.tab(forPath: "/requests") == "appointments")
        #expect(Push.tab(forPath: "/dogs/d1") == "discover")
        #expect(Push.tab(forPath: "/notifications") == "profile")
    }

    @Test func moneyTalkInChatGetsAWarning() {
        #expect(ChatView.mentionsMoney("Kun je even een Tikkie sturen?"))
        #expect(ChatView.mentionsMoney("Dat kost €10"))
        #expect(!ChatView.mentionsMoney("Tot morgen om zes uur!"))
    }

    @Test func friendshipGrowsWithWalks() {
        #expect(DogFriendsView.bond(1).1 == "hand.wave.fill")
        #expect(DogFriendsView.bond(3).1 == "figure.walk")
        #expect(DogFriendsView.bond(7).1 == "heart.fill")
        #expect(DogFriendsView.bond(12).1 == "star.fill")
    }

    @Test func darkCoatsGetVisibleEyes() {
        #expect(DogFace.isDark("#20242a"))
        #expect(!DogFace.isDark("#e2b45c"))
        #expect(!DogFace.isDark("not a colour"))
    }

    @Test func decodesDatesWithAndWithoutMilliseconds() throws {
        struct Box: Decodable { var a: Date; var b: Date }
        let box = try APIClient.makeDecoder().decode(Box.self, from: Data(#"{"a":"2026-10-02T11:31:00.000Z","b":"2026-10-02T11:31:00Z"}"#.utf8))
        #expect(box.a == box.b)
    }

    @Test func aWalkStartsFromHalfAnHourBeforeUntilTwoHoursAfter() {
        let start = Date(timeIntervalSince1970: 1_800_000_000)
        let item = appointment(status: "accepted", startsAt: start)
        #expect(item.canStart(now: start.addingTimeInterval(-29 * 60)))
        #expect(!item.canStart(now: start.addingTimeInterval(-31 * 60)))
        #expect(item.canStart(now: start.addingTimeInterval(119 * 60)))
        #expect(!item.canStart(now: start.addingTimeInterval(121 * 60)))
        #expect(!appointment(status: "pending", startsAt: start).canStart(now: start))
    }

    @Test func distancesReadNaturallyInDutch() {
        #expect(Format.distance(Optional(881)) == "800 m")
        #expect(Format.distance(Optional(40)) == "100 m")
        #expect(Format.distance(Optional(2610)) == "2,6 km")
        #expect(Format.distance(Optional<Int>.none) == nil)
        #expect(Format.distance(1234.0) == "1,23 km")
    }

    @Test func cssColoursFallBackSafely() {
        #expect(Color(css: "#ffffff") != Color.gray)
        #expect(Color(css: "red") == Color.gray)
        #expect(Color(css: nil) == Color.gray)
    }

    private func appointment(status: String, startsAt: Date) -> Appointment {
        Appointment(
            id: "r1", kind: "solo", status: status, startsAt: startsAt, durationMin: 30, weekly: false, message: "", flags: [],
            walkId: nil, walkStatus: nil, feedbackGiven: nil,
            dog: .init(id: "d1", name: "Bobbie", photos: [], look: .sample, city: "Utrecht", isShelter: false, meetingInfo: ""),
            host: nil, walker: nil, trust: nil
        )
    }
}
