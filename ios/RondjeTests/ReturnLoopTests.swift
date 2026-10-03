import Foundation
import Testing
@testable import Rondje

@Suite("Coming back without pressure")
@MainActor
struct ReturnLoopTests {
    private static let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        return calendar
    }()

    /// Friday 2 October 2026, 14:00 in Amsterdam.
    private static let now = at(10, 2, 14)

    private static func at(_ month: Int, _ day: Int, _ hour: Int, _ minute: Int = 0) -> Date {
        calendar.date(from: DateComponents(year: 2026, month: month, day: day, hour: hour, minute: minute))!
    }

    private func appointment(_ id: String, status: String = "accepted", startsAt: Date, walkId: String? = nil, walkStatus: String? = nil,
                             dogId: String = "d1", dogName: String = "Bobbie") -> Appointment {
        Appointment(
            id: id, kind: "solo", status: status, startsAt: startsAt, durationMin: 30, weekly: false, message: "", flags: [],
            walkId: walkId, walkStatus: walkStatus, feedbackGiven: nil,
            dog: .init(id: dogId, name: dogName, photos: [], look: .sample, city: "Utrecht", isShelter: false, meetingInfo: ""),
            host: nil, walker: nil, trust: nil
        )
    }

    private func entry(_ walkId: String, dog: String, dogId: String, date: Date, side: String = "walker", distance: Int? = 1500) -> WalkLogEntry {
        WalkLogEntry(walkId: walkId, dogId: dogId, dogName: dog, look: .sample, side: side, person: side == "owner" ? "Sanne" : nil,
                     distanceM: distance, minutes: 30, photos: 0, date: date)
    }

    private var everyDay: NudgeSettings {
        var s = NudgeSettings()
        s.enabled = true
        s.days = [1, 3, 5]
        s.hour = 18
        s.minute = 30
        s.perWeek = 1
        return s
    }

    private func week(_ date: Date) -> Int {
        var cal = Self.calendar
        cal.firstWeekday = 2
        cal.minimumDaysInFirstWeek = 4
        return cal.component(.weekOfYear, from: date)
    }

    // MARK: Plan

    @Test func planRespectsPerWeek() {
        var s = everyDay
        let one = Nudges.plan(s, outgoing: [], now: Self.now, calendar: Self.calendar)
        let weeks = Dictionary(grouping: one, by: week)
        #expect(!one.isEmpty)
        #expect(weeks.values.allSatisfy { $0.count <= 1 })

        s.perWeek = 2
        let two = Nudges.plan(s, outgoing: [], now: Self.now, calendar: Self.calendar)
        #expect(Dictionary(grouping: two, by: week).values.allSatisfy { $0.count <= 2 })
        #expect(two.count > one.count)
        #expect(two == two.sorted())
        #expect(two.allSatisfy { $0 > Self.now && $0 <= Self.now.addingTimeInterval(14 * 86_400) })
        // Always at the chosen time.
        #expect(two.allSatisfy { Self.calendar.component(.hour, from: $0) == 18 && Self.calendar.component(.minute, from: $0) == 30 })
    }

    @Test func planSkipsAWeekWithAnAcceptedAppointment() {
        var s = everyDay
        s.perWeek = 3
        // Wednesday 7 October: a walk is planned that week, so no seintje in it.
        let planned = appointment("a1", startsAt: Self.at(10, 7, 10))
        let dates = Nudges.plan(s, outgoing: [planned], now: Self.now, calendar: Self.calendar)
        #expect(!dates.isEmpty)
        #expect(!dates.contains { week($0) == week(planned.startsAt) })
        #expect(dates.allSatisfy { abs($0.timeIntervalSince(planned.startsAt)) >= 86_400 })

        // A declined one does not count.
        let declined = appointment("a2", status: "declined", startsAt: Self.at(10, 7, 10))
        let free = Nudges.plan(s, outgoing: [declined], now: Self.now, calendar: Self.calendar)
        #expect(free.contains { week($0) == week(declined.startsAt) })
    }

    @Test func planSkipsDatesBeforePausedUntil() {
        var s = everyDay
        s.pausedUntil = Self.at(10, 10, 0)
        let dates = Nudges.plan(s, outgoing: [], now: Self.now, calendar: Self.calendar)
        #expect(!dates.isEmpty)
        #expect(dates.allSatisfy { $0 >= Self.at(10, 10, 0) })
    }

    @Test func planIsEmptyWhenDisabled() {
        var s = everyDay
        s.enabled = false
        #expect(Nudges.plan(s, outgoing: [], now: Self.now, calendar: Self.calendar).isEmpty)
    }

    @Test func planStaysOutOfQuietHours() {
        var s = everyDay
        s.hour = 23
        s.minute = 0
        let dates = Nudges.plan(s, outgoing: [], now: Self.now, calendar: Self.calendar)
        #expect(dates.allSatisfy { Self.calendar.component(.hour, from: $0) * 60 + Self.calendar.component(.minute, from: $0) <= 21 * 60 })
    }

    // MARK: Back-off

    @Test func backOffStopsAfterThreeIgnoredAndResetsOnOpen() {
        var s = everyDay
        let fired = Self.now.addingTimeInterval(-3 * 86_400)
        s.delivered = ["nudge-1": fired, "nudge-2": fired.addingTimeInterval(60), "nudge-future": Self.now.addingTimeInterval(86_400)]
        Nudges.backOff(&s, now: Self.now)
        #expect(s.ignored == 2)
        #expect(s.enabled)
        #expect(s.delivered.keys.sorted() == ["nudge-future"])

        // Opened within a day: the count starts again.
        s.delivered = ["nudge-3": Self.now.addingTimeInterval(-3600)]
        Nudges.backOff(&s, now: Self.now)
        #expect(s.ignored == 0)
        #expect(s.enabled)

        // Three ignored in a row: Guus stops them himself and says so.
        s.delivered = ["a": fired, "b": fired.addingTimeInterval(60), "c": fired.addingTimeInterval(120)]
        Nudges.backOff(&s, now: Self.now)
        #expect(s.ignored == 3)
        #expect(!s.enabled)
        #expect(s.stoppedByGuus)
        #expect(Nudges.plan(s, outgoing: [], now: Self.now, calendar: Self.calendar).isEmpty)
    }

    // MARK: Content

    @Test func contentNamesADogNeverAPerson() {
        let buddy = appointment("a9", status: "completed", startsAt: Self.now.addingTimeInterval(-86_400), walkId: "w9", walkStatus: "ended", dogName: "Saar")
        let withBuddy = Nudges.content(for: Self.now, buddy: buddy, nearby: [], index: 0)
        #expect(withBuddy.link == "rebook:a9")
        #expect(withBuddy.body.contains("Saar"))
        let generic = Nudges.content(for: Self.now, buddy: nil, nearby: [], index: 5)
        #expect(generic.link == "discover")
        for index in 0..<4 {
            let c = Nudges.content(for: Self.now, buddy: buddy, nearby: [], index: index)
            #expect(CoachAction(link: c.link) != nil)
            #expect(!GuusLine.isBanned(c.title) && !GuusLine.isBanned(c.body))
        }
    }

    // MARK: Recap

    @Test func recapIsNilOnAWednesday() {
        let wednesday = Self.at(9, 30, 18)
        let entries = [entry("w1", dog: "Bobbie", dogId: "d1", date: Self.at(9, 29, 10))]
        #expect(WeekRecapCard.recap(entries: entries, moods: [], now: wednesday, calendar: Self.calendar, side: .walker) == nil)
    }

    @Test func recapIsNilForAWeekWithoutWalks() {
        let sunday = Self.at(10, 4, 18)
        // Only a walk from the week before, and one on the owner side.
        let entries = [
            entry("w1", dog: "Bobbie", dogId: "d1", date: Self.at(9, 25, 10)),
            entry("w2", dog: "Max", dogId: "d3", date: Self.at(10, 2, 10), side: "owner"),
        ]
        #expect(WeekRecapCard.recap(entries: entries, moods: [], now: sunday, calendar: Self.calendar, side: .walker) == nil)
        // Sunday afternoon is too early.
        let early = Self.at(10, 4, 15)
        #expect(WeekRecapCard.recap(entries: entries, moods: [], now: early, calendar: Self.calendar, side: .owner) == nil)
    }

    @Test func recapOnSundayEveningCountsTwoWalksWithTwoDogs() throws {
        let sunday = Self.at(10, 4, 18)
        let entries = [
            entry("w1", dog: "Bobbie", dogId: "d1", date: Self.at(9, 29, 10)),
            entry("w2", dog: "Saar", dogId: "d2", date: Self.at(10, 3, 10)),
            entry("w0", dog: "Max", dogId: "d3", date: Self.at(9, 27, 10)),
        ]
        let moods = [
            MoodStore.Entry(walkId: "w1", before: 2, after: 4, date: Self.at(9, 29, 10)),
            MoodStore.Entry(walkId: "w2", before: 3, after: 3, date: Self.at(10, 3, 10)),
        ]
        let recap = try #require(WeekRecapCard.recap(entries: entries, moods: moods, now: sunday, calendar: Self.calendar, side: .walker, activeWeeks: 3))
        #expect(recap.walks == 2)
        #expect(recap.dogs.map(\.name) == ["Bobbie", "Saar"])
        #expect(recap.lines[0].contains("Bobbie") && recap.lines[0].contains("Saar") && recap.lines[0].contains("2"))
        #expect(recap.lines.count == 3)
        #expect(recap.lines.allSatisfy { !GuusLine.isBanned($0) })

        // On Monday it is the same week, and on Tuesday it is gone.
        let monday = try #require(WeekRecapCard.recap(entries: entries, moods: [], now: Self.at(10, 5, 9), calendar: Self.calendar, side: .walker))
        #expect(monday.key == recap.key)
        #expect(WeekRecapCard.recap(entries: entries, moods: [], now: Self.at(10, 6, 9), calendar: Self.calendar, side: .walker) == nil)
    }

    @Test func ownerRecapHasALinePerDogAtMostTwo() throws {
        let sunday = Self.at(10, 4, 18)
        let entries = ["d1", "d2", "d3"].enumerated().map { i, id in
            entry("o\(i)", dog: "Hond \(id)", dogId: id, date: Self.at(10, 1 + i, 9), side: "owner")
        }
        let recap = try #require(WeekRecapCard.recap(entries: entries, moods: [], now: sunday, calendar: Self.calendar, side: .owner))
        #expect(recap.lines.count == 2)
        #expect(recap.lines[0].contains("Sanne"))
    }

    // MARK: Copy

    @Test func allCopyFollowsTheRules() {
        let lines = [
            "Ik stuur je alleen een seintje op een moment dat jij kiest. Hooguit zo vaak als jij wilt.",
            "Seintjes van Guus",
            "Meldingen staan uit in Instellingen.",
            "Wil je een rustig seintje op een vast moment? Jij kiest wanneer.",
            "Kies een moment",
            "Nee, dank je",
            "Ik stuur je even geen seintjes meer. Aanzetten kan altijd bij Jij, Seintjes.",
            "Een rondje deze week?",
            "Zin in een rondje met Bobbie? Je kunt het de eigenaar vragen.",
            "Even naar buiten?",
            "Bobbie woont bij jou in de buurt. Rustig, 30 minuten.",
            "Er wonen honden bij jou in de buurt. Kijk wie er mee wil.",
            "Minder seintjes",
            "Jouw week: 1 rondje met Bobbie.",
            "Jouw week: 2 rondjes, samen 3,00 km, met Bobbie en Saar.",
            "Na je rondjes voelde je je beter. Alleen jij ziet dit.",
            "Je wandelde al in 3 verschillende weken.",
            "Jouw week: Bobbie ging 2 keer extra naar buiten, met Sanne.",
            "Max ging 1 keer extra naar buiten.",
            "Volgende week weer met Bobbie?",
            "Er staat geen seintje gepland. Je hebt al een afspraak deze week, of je seintjes staan uit.",
            "Kies een dag, dan plant Guus een seintje.",
            "Seintjes worden op je telefoon ingepland. Er gaat niets via een server. Afspraak-herinneringen tellen niet mee.",
            "Tussen half tien 's avonds en half negen 's ochtends stuurt Guus nooit iets.",
            "Gepauzeerd tot je ze weer aanzet",
        ]
        for line in lines {
            #expect(!GuusLine.isBanned(line), "\(line)")
            #expect(line.filter { $0 == "!" }.count <= 1, "\(line)")
        }
    }
}
