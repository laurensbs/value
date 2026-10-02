import Foundation
import Testing
@testable import Rondje

@Suite("Guus's next step")
struct NextStepTests {
    private static let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        return calendar
    }()

    /// Friday 2 October 2026, 14:00 in Amsterdam.
    private static let now = at(10, 2, 14)

    private static func at(_ month: Int, _ day: Int, _ hour: Int, _ minute: Int = 0, year: Int = 2026) -> Date {
        calendar.date(from: DateComponents(year: year, month: month, day: day, hour: hour, minute: minute))!
    }

    private func context(_ placement: NextStepPlacement = .discover, role: NextStepRole = .walker, now: Date = NextStepTests.now) -> NextStepContext {
        NextStepContext(now: now, calendar: Self.calendar, placement: placement, role: role, firstName: "Sam", country: "NL", quizPassed: true)
    }

    private func appointment(
        _ id: String, kind: String = "solo", status: String = "accepted", startsAt: Date, durationMin: Int = 30, weekly: Bool = false,
        walkId: String? = nil, walkStatus: String? = nil, feedbackGiven: Bool? = nil, dogId: String = "d1", dogName: String = "Bobbie",
        walker: Appointment.Walker? = nil, trust: Appointment.Trust? = nil
    ) -> Appointment {
        Appointment(
            id: id, kind: kind, status: status, startsAt: startsAt, durationMin: durationMin, weekly: weekly, message: "", flags: [],
            walkId: walkId, walkStatus: walkStatus, feedbackGiven: feedbackGiven,
            dog: .init(id: dogId, name: dogName, photos: [], look: .sample, city: "Utrecht", isShelter: false, meetingInfo: ""),
            host: nil, walker: walker, trust: trust
        )
    }

    private var sanne: Appointment.Walker {
        .init(id: "u2", firstName: "Sanne", photoUrl: nil, bio: "", experience: "some", ageBand: "25-34", city: "Utrecht", phone: nil, email: nil)
    }

    private func dog(_ id: String, energy: String = "calm", level: String = "starter", demo: Bool = false, distance: Int? = nil) -> DogCard {
        DogCard(
            id: id, name: "Hond \(id)", breed: "Labrador", sex: "female", ageYears: 5, size: "large", energy: energy, level: level,
            photos: [], look: .sample, story: "", traits: [], walkMinutes: 30, city: "Utrecht", country: "NL", lat: nil, lng: nil,
            isDemo: demo, distanceM: distance,
            host: Host(kind: "owner", id: "h1", name: "Ans", photoUrl: nil, city: "Utrecht", verified: false)
        )
    }

    // MARK: Fixtures

    private var startable: Appointment { appointment("a1", startsAt: Self.now.addingTimeInterval(10 * 60)) }
    private var ended: Appointment {
        appointment("a2", status: "completed", startsAt: Self.now.addingTimeInterval(-2 * 86_400), walkId: "w2", walkStatus: "ended", dogId: "d2", dogName: "Saar")
    }
    private var walkedBefore: Appointment {
        appointment("a3", status: "completed", startsAt: Self.now.addingTimeInterval(-3 * 86_400), walkId: "w3", walkStatus: "ended", feedbackGiven: true, dogId: "d3", dogName: "Max")
    }
    private var meetingSoon: Appointment {
        appointment("m1", kind: "meet", startsAt: Self.now.addingTimeInterval(20 * 3600), walker: sanne)
    }
    private var nearby: [DogCard] {
        [
            dog("demo", demo: true, distance: 10),
            dog("far", distance: 900),
            dog("near", distance: 300),
            dog("unknown"),
            dog("lively", energy: "high", distance: 100),
            dog("expert", level: "experienced", distance: 50),
            dog("further", distance: 2000),
        ]
    }

    // MARK: Priority

    @Test func startBeatsFeedbackAndFeedbackBeatsPicks() {
        var c = context()
        c.nearbyDogs = nearby
        c.outgoing = [ended, startable]
        let start = NextStep.compute(c)
        #expect(start.id == "start.a1")
        #expect(start.action == .startWalk("a1"))
        #expect(start.mood == .happy)
        #expect(start.text.contains("Bobbie"))

        c.outgoing = [ended]
        let feedback = NextStep.compute(c)
        #expect(feedback.id == "feedback.w2")
        #expect(feedback.action == .feedback(walkId: "w2", appointmentId: "a2"))
        #expect(feedback.detail != nil)

        c.outgoing = []
        let picks = NextStep.compute(c)
        #expect(picks.id == "picks")
        #expect(picks.picks.map(\.id) == ["near", "far", "further"])
        #expect(picks.action == .discover(calm: true))
    }

    @Test func picksFallBackGently() {
        var c = context()
        c.nearbyDogs = [dog("demo", demo: true), dog("lively", energy: "high", distance: 400), dog("expert", level: "experienced", distance: 50)]
        let any = NextStep.compute(c)
        #expect(any.picks.map(\.id) == ["expert", "lively"])
        #expect(any.action == .discover(calm: false))

        c.nearbyDogs = [dog("demo", demo: true)]
        let none = NextStep.compute(c)
        #expect(none.id == "picks")
        #expect(none.picks.isEmpty)
        #expect(none.button == nil && none.action == nil)

        c.nearbyDogs = []
        c.nearbyLoaded = false
        let looking = NextStep.compute(c)
        #expect(looking.id == "picks")
        #expect(looking.action == nil)
        #expect(looking.text != none.text)
    }

    @Test func liveOnlyOnDiscoverAndOnlyForPeopleWhoDoBoth() {
        let live = appointment("l1", startsAt: Self.now.addingTimeInterval(-600), walkId: "wl", walkStatus: "active", walker: sanne)
        var c = context(role: .both)
        c.incoming = [live]
        c.outgoing = [startable]
        let step = NextStep.compute(c)
        #expect(step.id == "live.l1")
        #expect(step.action == .follow("l1"))
        #expect(!step.snoozable)
        #expect(step.text.contains("Sanne"))

        c.role = .walker
        #expect(NextStep.compute(c).id == "start.a1")

        var home = context(.home, role: .both)
        home.incoming = [live]
        home.myDogsCount = 1
        #expect(!NextStep.compute(home).id.hasPrefix("live"))
    }

    @Test func aPendingRequestComesFirstOnHome() {
        let pending = appointment("p1", kind: "meet", status: "pending", startsAt: Self.now.addingTimeInterval(86_400), walker: sanne)
        var c = context(.home, role: .owner)
        c.myDogsCount = 1
        c.incoming = [ended, pending]
        let step = NextStep.compute(c)
        #expect(step.id == "pending.p1")
        #expect(step.action == .appointments("p1"))
        #expect(step.text.contains("Sanne"))

        let later = appointment("p2", kind: "meet", status: "pending", startsAt: Self.now.addingTimeInterval(3 * 86_400))
        c.incoming = [later, pending, ended]
        let several = NextStep.compute(c)
        #expect(several.id == "pending.p1")
        #expect(several.action == .appointments("p1"))
        #expect(several.text.contains("2"))

        c.incoming = [ended]
        #expect(NextStep.compute(c).id == "feedback.w2")
    }

    @Test func trustOnlyAfterMeetingWithoutTheIDSeen() {
        var c = context(.home, role: .owner)
        c.myDogsCount = 1
        let met = appointment("t1", kind: "meet", status: "completed", startsAt: Self.now.addingTimeInterval(-86_400), walker: sanne)
        c.incoming = [met]
        let step = NextStep.compute(c)
        #expect(step.id == "trust.t1")
        #expect(step.action == .trust("t1"))

        let seen = appointment("t1", kind: "meet", status: "completed", startsAt: Self.now.addingTimeInterval(-86_400), walker: sanne,
                               trust: .init(idSeen: true, soloAllowed: false))
        c.incoming = [seen]
        #expect(NextStep.compute(c).id == "done")

        let justOver = appointment("t2", kind: "meet", startsAt: Self.now.addingTimeInterval(-45 * 60), walker: sanne)
        c.incoming = [justOver]
        #expect(NextStep.compute(c).id == "trust.t2")

        let stillWalking = appointment("t3", kind: "meet", startsAt: Self.now.addingTimeInterval(-10 * 60), walker: sanne)
        c.incoming = [stillWalking]
        #expect(NextStep.compute(c).id != "trust.t3")

        let longAgo = appointment("t4", kind: "meet", status: "completed", startsAt: Self.now.addingTimeInterval(-20 * 86_400), walker: sanne)
        c.incoming = [longAgo]
        #expect(NextStep.compute(c).id == "done")
    }

    @Test func prepWithin36HoursUntilItIsDone() {
        var c = context()
        c.outgoing = [meetingSoon]
        let step = NextStep.compute(c)
        #expect(step.id == "prep.m1")
        #expect(step.action == .prep("m1"))

        c.prepDone = ["m1"]
        #expect(NextStep.compute(c).id == "done")

        c.prepDone = []
        c.outgoing = [appointment("m2", kind: "meet", startsAt: Self.now.addingTimeInterval(40 * 3600))]
        #expect(NextStep.compute(c).id == "done")

        var home = context(.home, role: .owner)
        home.myDogsCount = 1
        home.incoming = [meetingSoon]
        let owner = NextStep.compute(home)
        #expect(owner.id == "prep.m1")
        #expect(owner.text.contains("Sanne"))
        home.prepDone = ["m1"]
        #expect(NextStep.compute(home).id == "done")
    }

    @Test func atNightSuggestionsSleepButFeedbackStays() {
        let night = Self.at(10, 2, 23, 30)
        var c = context(now: night)
        c.nearbyDogs = nearby
        let picks = NextStep.compute(c)
        #expect(picks.id == "night")
        #expect(picks.mood == .sleepy)
        #expect(picks.button == nil)

        c.outgoing = [walkedBefore]
        #expect(NextStep.compute(c).id == "night")
        var day = c
        day.now = Self.now
        let rebook = NextStep.compute(day)
        #expect(rebook.id == "rebook.d3")
        #expect(rebook.action == .rebook("a3"))

        c.outgoing = [walkedBefore, appointment("a2", status: "completed", startsAt: night.addingTimeInterval(-3 * 3600), walkId: "w2", walkStatus: "ended")]
        #expect(NextStep.compute(c).id == "feedback.w2")

        var early = context(.home, role: .owner, now: Self.at(10, 3, 5, 15))
        early.myDogsCount = 1
        #expect(NextStep.compute(early).id == "night")
    }

    @Test func rebookSkipsDogsWithSomethingPlanned() {
        var c = context()
        let planned = appointment("a4", status: "accepted", startsAt: Self.now.addingTimeInterval(3 * 86_400), dogId: "d3", dogName: "Max")
        c.outgoing = [walkedBefore, planned]
        #expect(NextStep.compute(c).id == "done")

        let weekly = appointment("a5", status: "completed", startsAt: Self.now.addingTimeInterval(-86_400), weekly: true, walkStatus: "ended", feedbackGiven: true, dogId: "d5")
        c.outgoing = [weekly]
        #expect(NextStep.compute(c).id == "done")

        c.outgoing = [walkedBefore]
        c.snoozed = ["rebook.d3"]
        #expect(NextStep.compute(c).id == "done")
    }

    @Test func aSnoozedStepFallsThroughToTheNextOne() {
        var c = context()
        c.outgoing = [startable, ended]
        c.snoozed = ["next.start.a1"]
        #expect(NextStep.compute(c).id == "feedback.w2")

        let second = appointment("a6", startsAt: Self.now.addingTimeInterval(20 * 60), dogId: "d6")
        c.outgoing = [startable, second]
        #expect(NextStep.compute(c).id == "start.a6")
    }

    @Test func schoolBeforeTheQuizAndThenWaiting() {
        var c = context()
        c.quizPassed = false
        c.lessonsDone = 2
        let request = appointment("r1", kind: "meet", status: "pending", startsAt: Self.now.addingTimeInterval(2 * 86_400))
        c.outgoing = [request]
        let lessons = NextStep.compute(c)
        #expect(lessons.id == "lessons")
        #expect(lessons.action == .lessons)

        c.lessonsDone = 5
        let quiz = NextStep.compute(c)
        #expect(quiz.id == "quiz")
        #expect(quiz.action == .quiz)

        c.snoozed = ["next.quiz"]
        let waiting = NextStep.compute(c)
        #expect(waiting.id == "waiting")
        #expect(waiting.button == nil)
        #expect(waiting.text.contains("Bobbie"))
    }

    @Test func theWeekGoalIsCalm() {
        var c = context()
        c.outgoing = [appointment("x", status: "declined", startsAt: Self.now.addingTimeInterval(-86_400))]
        c.weekGoal = 3
        c.weekWalks = 1
        let goal = NextStep.compute(c)
        #expect(goal.id == "goal")
        #expect(goal.action == .discover(calm: false))
        #expect(goal.text.contains("2"))
        c.weekWalks = 3
        #expect(NextStep.compute(c).id == "done")
    }

    @Test func ownersWithoutADogAreHelpedToAddOne() {
        var c = context(.home, role: .owner)
        #expect(NextStep.compute(c).id == "done")
        c.myDogsCount = 0
        let add = NextStep.compute(c)
        #expect(add.id == "adddog")
        #expect(add.action == .addDog)
        c.myDogsCount = 2
        let waiting = NextStep.compute(c)
        #expect(waiting.id == "owner.waiting")
        #expect(waiting.button == nil)
    }

    @Test func nothingLeftIsDone() {
        var c = context()
        c.outgoing = [appointment("x", status: "declined", startsAt: Self.now.addingTimeInterval(-86_400))]
        let done = NextStep.compute(c)
        #expect(done.id == "done")
        #expect(done.mood == .calm)
        #expect(!done.snoozable)
        #expect(done.button == nil && done.action == nil)
    }

    @Test func dierendagIsForTheNetherlandsAndBelgium() {
        let dierendag = Self.at(10, 4, 12)
        #expect(NextStep.moment(on: dierendag, calendar: Self.calendar, country: "NL") != nil)
        #expect(NextStep.moment(on: dierendag, calendar: Self.calendar, country: "BE") != nil)
        #expect(NextStep.moment(on: dierendag, calendar: Self.calendar, country: "ES") == nil)
        #expect(NextStep.moment(on: Self.now, calendar: Self.calendar, country: "NL") == nil)
        #expect(NextStep.moment(on: Self.at(12, 31, 12), calendar: Self.calendar, country: "ES") != nil)
        #expect(NextStep.moment(on: Self.at(7, 20, 12), calendar: Self.calendar, country: "NL") != nil)
        #expect(NextStep.moment(on: Self.at(12, 31, 12), calendar: Self.calendar, country: "NL")
            != NextStep.moment(on: Self.at(2, 10, 12, year: 2027), calendar: Self.calendar, country: "NL"))

        var c = context(now: dierendag)
        c.outgoing = [appointment("x", status: "declined", startsAt: dierendag.addingTimeInterval(-86_400))]
        #expect(NextStep.compute(c).text == NextStep.moment(on: dierendag, calendar: Self.calendar, country: "NL"))
        c.country = "ES"
        #expect(NextStep.compute(c).text != NextStep.moment(on: dierendag, calendar: Self.calendar, country: "NL"))
    }

    // MARK: Copy

    /// Every step from every fixture, walking down each list by snoozing what came before.
    private var everyStep: [NextStep] {
        var contexts: [NextStepContext] = []
        for now in [Self.now, Self.at(10, 3, 0, 30), Self.at(10, 4, 14), Self.at(12, 30, 14), Self.at(1, 20, 14, year: 2027), Self.at(7, 1, 14, year: 2027)] {
            let live = appointment("l1", startsAt: now.addingTimeInterval(-600), walkId: "wl", walkStatus: "active", walker: sanne)
            let pending = appointment("p1", kind: "meet", status: "pending", startsAt: now.addingTimeInterval(86_400), walker: sanne)
            let met = appointment("t1", kind: "meet", status: "completed", startsAt: now.addingTimeInterval(-86_400), walker: sanne)
            let soon = appointment("m1", kind: "meet", startsAt: now.addingTimeInterval(20 * 3600), walker: sanne)
            let meetNow = appointment("m3", kind: "meet", startsAt: now.addingTimeInterval(5 * 60))
            let endedHere = appointment("e1", status: "completed", startsAt: now.addingTimeInterval(-86_400), walkId: "we", walkStatus: "ended", walker: sanne)
            let rebookable = appointment("a3", status: "completed", startsAt: now.addingTimeInterval(-3 * 86_400), walkStatus: "ended", feedbackGiven: true, dogId: "d3")
            let request = appointment("r1", status: "pending", startsAt: now.addingTimeInterval(2 * 86_400), dogId: "d4")
            let startHere = appointment("a1", startsAt: now.addingTimeInterval(10 * 60))
            for role in [NextStepRole.walker, .both] {
                for lessons in [0, 5] {
                    var c = context(role: role, now: now)
                    c.quizPassed = false
                    c.lessonsDone = lessons
                    c.weekGoal = 3
                    c.weekWalks = lessons == 0 ? 2 : 0
                    c.incoming = [live]
                    c.outgoing = [startHere, meetNow, endedHere, soon, rebookable, request]
                    contexts.append(c)
                    for dogs in [nearby, [dog("lively", energy: "high")], [dog("x", demo: true)], [dog("one")], [dog("one"), dog("two")]] {
                        var empty = context(role: role, now: now)
                        empty.nearbyDogs = dogs
                        contexts.append(empty)
                    }
                    var loading = context(role: role, now: now)
                    loading.nearbyLoaded = false
                    contexts.append(loading)
                }
            }
            for dogs in [nil, 0, 2] {
                var home = context(.home, role: .owner, now: now)
                home.myDogsCount = dogs
                home.incoming = [pending, appointment("p2", status: "pending", startsAt: now.addingTimeInterval(2 * 86_400)), endedHere, met, soon]
                contexts.append(home)
                var single = home
                single.incoming = [pending]
                contexts.append(single)
                var quiet = home
                quiet.incoming = []
                contexts.append(quiet)
            }
        }
        var steps: [NextStep] = []
        for var c in contexts {
            for _ in 0..<30 {
                let step = NextStep.compute(c)
                steps.append(step)
                guard step.snoozable else { break }
                c.snoozed.insert("next." + step.id)
            }
        }
        return steps
    }

    @Test func everyLineFollowsGuussRules() {
        let steps = everyStep
        let ids = Set(steps.map { $0.id.split(separator: ".").first.map(String.init) ?? $0.id })
        for kind in ["live", "start", "feedback", "prep", "picks", "lessons", "quiz", "waiting", "rebook", "goal",
                     "pending", "trust", "adddog", "owner", "night", "done"] {
            #expect(ids.contains(kind), "no \(kind) step in the fixtures")
        }
        for step in steps {
            #expect(!GuusLine.isBanned(step.text), "\(step.id): \(step.text)")
            #expect(!GuusLine.isBanned(step.detail ?? ""), "\(step.id): \(step.detail ?? "")")
            #expect(step.text.filter { $0 == "!" }.count <= 1, "\(step.id): \(step.text)")
            #expect(step.button == nil || step.action != nil, "\(step.id)")
        }
        let card = [
            "Hoi Sam! Ik ben Guus. Ik laat je steeds zien wat de volgende stap is.",
            "Hoi! Ik ben Guus. Ik laat je steeds zien wat de volgende stap is.",
            "Laat maar zien",
            "Fijn je weer te zien! Alles staat er nog precies zo.",
            "Kies samen met Guus een hond",
        ]
        for line in card { #expect(!GuusLine.isBanned(line), "\(line)") }
    }
}
