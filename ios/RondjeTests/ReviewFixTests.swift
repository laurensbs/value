import Foundation
import Testing
@testable import Rondje

/// The fixes from the Guus review: rebook suggestions that back off, seintjes that leave active weeks
/// and reported dogs alone, wording that matches what is really asked, and lessons that cover the quiz.
@Suite("Review fixes")
@MainActor
struct ReviewFixTests {
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

    private func appointment(_ id: String, status: String = "completed", startsAt: Date, weekly: Bool = false, walkStatus: String? = "ended",
                             dogId: String = "d1", dogName: String = "Bobbie") -> Appointment {
        Appointment(
            id: id, kind: "solo", status: status, startsAt: startsAt, durationMin: 30, weekly: weekly, message: "", flags: [],
            walkId: "w-" + id, walkStatus: walkStatus, feedbackGiven: true,
            dog: .init(id: dogId, name: dogName, photos: [], look: .sample, city: "Utrecht", isShelter: false, meetingInfo: ""),
            host: nil, walker: nil, trust: nil
        )
    }

    private func context() -> NextStepContext {
        NextStepContext(now: Self.now, calendar: Self.calendar, placement: .discover, role: .walker, firstName: "Sam", country: "NL", quizPassed: true)
    }

    // MARK: Rebook suggestions

    @Test func rebookOnlyForWalksOfTheLastTwoWeeks() {
        var c = context()
        c.outgoing = [appointment("old", startsAt: Self.now.addingTimeInterval(-40 * 86_400), dogId: "d9")]
        #expect(NextStep.compute(c).id == "done")
        c.outgoing.append(appointment("new", startsAt: Self.now.addingTimeInterval(-3 * 86_400), dogId: "d3"))
        #expect(NextStep.compute(c).id == "rebook.d3")
    }

    @Test func onlyOneRebookAtATimeAndLaterBacksOffForTwoWeeks() {
        var c = context()
        c.outgoing = [
            appointment("a1", startsAt: Self.now.addingTimeInterval(-2 * 86_400), dogId: "d1"),
            appointment("a2", startsAt: Self.now.addingTimeInterval(-4 * 86_400), dogId: "d2"),
        ]
        let step = NextStep.compute(c)
        #expect(step.id == "rebook.d1")

        let snooze = NextStep.snooze(for: step, now: Self.now, calendar: Self.calendar)
        #expect(snooze.key == "rebook")
        #expect(snooze.until == Self.now.addingTimeInterval(14 * 86_400))

        // Saying 'Later' to one dog does not bring up the next dog.
        c.snoozed = [snooze.key]
        #expect(NextStep.compute(c).id == "done")
    }

    @Test func laterOnOtherStepsStillMeansTomorrowMorning() {
        let step = NextStep(id: "lessons", mood: .curious, text: "x")
        let snooze = NextStep.snooze(for: step, now: Self.now, calendar: Self.calendar)
        #expect(snooze.key == "next.lessons")
        #expect(snooze.until == Self.at(10, 3, 6))
    }

    // MARK: Seintjes

    private var nudges: NudgeSettings {
        var s = NudgeSettings()
        s.enabled = true
        s.days = [1, 3, 5, 6, 7]
        s.hour = 18
        s.minute = 30
        s.perWeek = 3
        return s
    }

    private func isoWeek(_ date: Date) -> Int {
        var cal = Self.calendar
        cal.firstWeekday = 2
        cal.minimumDaysInFirstWeek = 4
        return cal.component(.weekOfYear, from: date)
    }

    @Test func noSeintjeInAWeekThatWasAlreadyWalked() {
        let free = Nudges.plan(nudges, outgoing: [], now: Self.now, calendar: Self.calendar)
        #expect(free.contains { isoWeek($0) == isoWeek(Self.now) })

        let walked = appointment("w", startsAt: Self.at(9, 28, 10))
        let dates = Nudges.plan(nudges, outgoing: [walked], now: Self.now, calendar: Self.calendar)
        #expect(!dates.isEmpty)
        #expect(!dates.contains { isoWeek($0) == isoWeek(Self.now) })
    }

    @Test func noSeintjeThisWeekOnceTheWeeklyGoalIsMet() {
        let dates = Nudges.plan(nudges, outgoing: [], now: Self.now, calendar: Self.calendar, weekGoalMet: true)
        #expect(!dates.isEmpty)
        #expect(!dates.contains { isoWeek($0) == isoWeek(Self.now) })
    }

    @Test func seintjesNeverNameAReportedDog() {
        let calm = DogCard(
            id: "x", name: "Rex", breed: "Labrador", sex: "male", ageYears: 5, size: "large", energy: "calm", level: "starter",
            photos: [], look: .sample, story: "", traits: [], walkMinutes: 30, city: "Utrecht", country: "NL", lat: nil, lng: nil,
            isDemo: false, distanceM: 300,
            host: Host(kind: "owner", id: "h1", name: "Ans", photoUrl: nil, city: "Utrecht", verified: false)
        )
        for index in 0..<6 {
            let c = Nudges.content(for: Self.now, buddy: nil, nearby: [calm], index: index, blocked: ["x"])
            #expect(!c.body.contains("Rex"))
            #expect(c.link != "dog:x")
        }
        let buddy = appointment("b", startsAt: Self.now.addingTimeInterval(-86_400), dogId: "x", dogName: "Rex")
        let c = Nudges.content(for: Self.now, buddy: buddy, nearby: [], index: 0, blocked: ["x"])
        #expect(c.link == "discover")
    }

    // MARK: Recap

    @Test func ownerRecapOnMondayDoesNotSayThisWeek() throws {
        let entries = [
            WalkLogEntry(walkId: "o1", dogId: "d1", dogName: "Bobbie", look: .sample, side: "owner", person: "Sanne",
                         distanceM: 1500, minutes: 30, photos: 0, date: Self.at(10, 1, 9)),
        ]
        let monday = try #require(WeekRecapCard.recap(entries: entries, moods: [], now: Self.at(10, 5, 9), calendar: Self.calendar, side: .owner))
        #expect(monday.lines.allSatisfy { !$0.contains("deze week") })
        #expect(monday.lines[0].hasPrefix("Jouw week:"))
    }

    // MARK: Wording

    @Test func rebookMessageNamesTheWeeklyMoment() {
        let tuesday = Self.at(10, 6, 18)
        let text = RequestSuggestions.rebookMessage(date: tuesday, calendar: Self.calendar, locale: Locale(identifier: "nl_NL"))
        #expect(text == "Zin om vaker samen te gaan? Elke dinsdag om 18:00?")
        #expect(!text.contains("volgende week"))
        #expect(!GuusLine.isBanned(text))
    }

    @Test func seeYouNextWeekOnlyForAWeeklyWalk() {
        #expect(!RequestSuggestions.thanks(dogName: "Bobbie").contains("Tot volgende week!"))
        #expect(RequestSuggestions.thanks(dogName: "Bobbie", weekly: true).contains("Tot volgende week!"))
        let oneOff = appointment("c", startsAt: Self.now.addingTimeInterval(-86_400))
        #expect(!RequestSuggestions.chatReplies(for: oneOff, asOwner: true).contains("Tot volgende week!"))
        let weekly = appointment("d", status: "accepted", startsAt: Self.now.addingTimeInterval(-86_400), weekly: true)
        #expect(RequestSuggestions.chatReplies(for: weekly, asOwner: true).contains("Tot volgende week!"))
    }

    @Test func walkerPrepNoLongerAsksForBags() {
        let solo = appointment("p", status: "accepted", startsAt: Self.now.addingTimeInterval(3600), walkStatus: nil)
        let items = MeetingPrep.items(for: solo, asOwner: false)
        #expect(!items.contains { $0.title.contains("Zakjes") })
        #expect(items.contains { $0.id == "phone" })
    }

    @Test func newCopyFollowsTheRules() {
        let lines = [
            "Vijf mini-lessen van 2 minuten. Daarna ben je goed voorbereid op de quiz.",
            "Klaar voor de quiz? Acht vragen, geen tijdsdruk.",
            "Klaar voor de quiz? Je bent goed voorbereid.",
            "Je deed alle vijf de lessen. Je bent goed voorbereid.",
            "Het rondje is klaar",
            "Tot vrijdag!",
            "Telefoon opgeladen",
            "De eigenaar legt zakjes klaar. Neem er gerust een paar extra mee.",
            "Jouw week: Bobbie ging 2 keer extra naar buiten.",
        ]
        for line in lines {
            #expect(!GuusLine.isBanned(line), "\(line)")
            #expect(!line.contains("\u{2014}"), "\(line)")
        }
    }

    // MARK: Lessons

    @Test func lessonsCoverLeashAndBiteFromTheQuiz() {
        var questions: [String] = []
        for lesson in Lessons.all {
            for card in lesson.cards {
                if case let .choice(question, _, _) = card { questions.append(question) }
            }
        }
        #expect(questions.contains("Mag de hond los?"))
        #expect(questions.contains("De hond bijt een andere hond. Wat doe je?"))
    }

    @Test func escapedDogMeansCallingTheOwnerRightAway() throws {
        let help = try #require(Lessons.all.first { $0.id == "help" })
        let right = help.cards.compactMap { card -> String? in
            guard case let .choice(question, options, _) = card, question.contains("losgeschoten") else { return nil }
            return options.first(where: \.correct)?.text
        }
        #expect(right.first?.contains("meteen de eigenaar bellen") == true)
    }

    // MARK: Reports

    @Test func aReportIsRememberedPerWalk() throws {
        let defaults = try #require(UserDefaults(suiteName: "review-fix-tests"))
        defaults.removePersistentDomain(forName: "review-fix-tests")
        let keepsakes = Keepsakes(defaults: defaults)
        #expect(!keepsakes.reported(walkId: "w1"))
        keepsakes.markReported(walkId: "w1")
        #expect(keepsakes.reported(walkId: "w1"))
        #expect(!keepsakes.reported(walkId: "w2"))
        keepsakes.clear()
        #expect(!keepsakes.reported(walkId: "w1"))
        defaults.removePersistentDomain(forName: "review-fix-tests")
    }
}
