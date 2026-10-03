import Foundation
import Testing
@testable import Rondje

@Suite("Ready-made requests and replies")
struct RequestSuggestionsTests {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        return calendar
    }

    private func date(_ year: Int, _ month: Int, _ day: Int, _ hour: Int, _ minute: Int = 0) -> Date {
        calendar.date(from: DateComponents(year: year, month: month, day: day, hour: hour, minute: minute))!
    }

    private func appointment(status: String, kind: String = "meet", walkStatus: String? = nil) -> Appointment {
        Appointment(
            id: "a1", kind: kind, status: status, startsAt: date(2026, 10, 2, 18), durationMin: 30, weekly: false,
            message: "", flags: [], walkId: walkStatus == nil ? nil : "w1", walkStatus: walkStatus, feedbackGiven: nil,
            dog: .init(id: "d1", name: "Bobbie", photos: [], look: .sample, city: "Utrecht", isShelter: false, meetingInfo: ""),
            host: nil, walker: nil, trust: nil
        )
    }

    @Test func momentsComeFromTheDogsRegularTimes() {
        // Friday 2 October 2026, 18:20.
        let now = date(2026, 10, 2, 18, 20)
        let slots = [
            Slot(weekday: 2, time: "18:30"), // Tuesday
            Slot(weekday: 5, time: "18:30"), // Friday: only 10 minutes from now
            Slot(weekday: 7, time: "10:00"), // Sunday
        ]
        let moments = RequestSuggestions.moments(slots: slots, now: now, calendar: calendar)
        #expect(moments == [
            .init(date: date(2026, 10, 4, 10), fromSlot: true),
            .init(date: date(2026, 10, 6, 18, 30), fromSlot: true),
        ])
        #expect(!moments.contains { $0.date < now.addingTimeInterval(20 * 60) })
    }

    @Test func atMostThreeMomentsWithoutDuplicates() {
        let now = date(2026, 10, 2, 9)
        let slots = (1...7).map { Slot(weekday: $0, time: "12:00") } + [Slot(weekday: 1, time: "12:00"), Slot(weekday: 9, time: "nope")]
        let moments = RequestSuggestions.moments(slots: slots, now: now, calendar: calendar)
        #expect(moments.map(\.date) == [date(2026, 10, 2, 12), date(2026, 10, 3, 12), date(2026, 10, 4, 12)])
    }

    @Test func withoutRegularTimesThreeMomentsAhead() {
        // A Thursday evening, and a Saturday at 09:50 (Saturday 10:00 is then too close).
        for now in [date(2026, 10, 1, 20), date(2026, 10, 3, 9, 50)] {
            let moments = RequestSuggestions.moments(slots: [], now: now, calendar: calendar)
            #expect(moments.count == 3)
            #expect(moments.allSatisfy { $0.date >= now.addingTimeInterval(20 * 60) && !$0.fromSlot })
            #expect(moments.map(\.date) == moments.map(\.date).sorted())
            #expect(Set(moments.map(\.date)).count == 3)
        }
        let thursday = RequestSuggestions.moments(slots: [], now: date(2026, 10, 1, 20), calendar: calendar)
        #expect(thursday.map(\.date) == [date(2026, 10, 2, 18), date(2026, 10, 3, 10), date(2026, 10, 4, 14)])
    }

    @Test func rebookingIsTheSameTimeNextWeek() {
        let now = date(2026, 10, 2, 12)
        #expect(RequestSuggestions.rebookDate(from: date(2026, 10, 1, 18), now: now, calendar: calendar) == date(2026, 10, 8, 18))
        // A week after 20 September is already past, so it becomes two weeks later.
        #expect(RequestSuggestions.rebookDate(from: date(2026, 9, 20, 18, 30), now: now, calendar: calendar) == date(2026, 10, 4, 18, 30))
        // Exactly a week later but within 20 minutes: one more week.
        #expect(RequestSuggestions.rebookDate(from: date(2026, 9, 25, 12, 10), now: now, calendar: calendar) == date(2026, 10, 9, 12, 10))
    }

    @Test func theHelloIsPersonal() {
        let meet = RequestSuggestions.intro(firstName: "Sanne", city: "Utrecht", experience: "none", dogName: "Bobbie", kind: .meet)
        #expect(meet.contains("Sanne"))
        #expect(meet.contains("Utrecht"))
        #expect(meet.contains("Bobbie"))
        let solo = RequestSuggestions.intro(firstName: "Sanne", city: "", experience: "lots", dogName: "Bobbie", kind: .solo)
        #expect(solo.contains("Sanne"))
        #expect(!solo.contains("  "))
    }

    @Test func chipsAddTheIDOnlyForAMeeting() {
        #expect(RequestSuggestions.chips(kind: .meet).count == RequestSuggestions.chips(kind: .solo).count + 1)
        #expect(RequestSuggestions.chips(kind: .meet).contains(L("Ik neem mijn ID mee.")))
        #expect(!RequestSuggestions.chips(kind: .solo).contains(L("Ik neem mijn ID mee.")))
    }

    @Test func repliesFitTheAppointment() {
        #expect(RequestSuggestions.chatReplies(for: appointment(status: "pending"), asOwner: true)
            == [L("Leuk! Wanneer kun je kennismaken?"), L("Dank je! Ik kijk even in mijn agenda.")])
        #expect(RequestSuggestions.chatReplies(for: appointment(status: "accepted"), asOwner: true)
            == [L("Leuk, tot dan!"), L("Neem je je ID mee?"), L("Ik sta bij de voordeur.")])
        #expect(RequestSuggestions.chatReplies(for: appointment(status: "accepted", kind: "solo"), asOwner: true)
            == [L("Leuk, tot dan!"), L("Ik sta bij de voordeur.")])
        #expect(RequestSuggestions.chatReplies(for: appointment(status: "accepted", walkStatus: "ended"), asOwner: true).first == L("Dank je wel!"))
        #expect(RequestSuggestions.chatReplies(for: appointment(status: "pending"), asOwner: false) == [L("Ik kan ook op een ander moment.")])
        #expect(RequestSuggestions.chatReplies(for: appointment(status: "completed"), asOwner: false).count == 2)
        #expect(RequestSuggestions.chatReplies(for: appointment(status: "declined"), asOwner: true).isEmpty)
        #expect(RequestSuggestions.thanks(dogName: "Bobbie").contains { $0.contains("Bobbie") })
    }

    @Test func everyLineFollowsTheCopyRules() {
        var lines = RequestSuggestions.chips(kind: .meet) + RequestSuggestions.chips(kind: .solo) + RequestSuggestions.thanks(dogName: "Bobbie")
        for experience in ["none", "some", "lots"] {
            for kind in [RequestFlow.Kind.meet, .solo] {
                lines.append(RequestSuggestions.intro(firstName: "Sanne", city: "Utrecht", experience: experience, dogName: "Bobbie", kind: kind))
            }
        }
        for status in ["pending", "accepted", "completed", "declined", "cancelled"] {
            for kind in ["meet", "solo"] {
                for owner in [true, false] {
                    lines += RequestSuggestions.chatReplies(for: appointment(status: status, kind: kind), asOwner: owner)
                }
            }
        }
        // What Guus says in the request flow, the rebook sheet and on the homecoming card.
        let guus = [
            "Kies een moment. De eigenaar loopt de eerste keer mee.",
            "Kies een moment dat je vaak kunt. Vaste momenten werken het best.",
            "Ik laat het je weten zodra de eigenaar van Bobbie antwoordt.",
            "Intussen kun je de Hondenschool doen. Vijf lessen van 2 minuten.",
            "Zin om vaker samen te gaan? Elke dinsdag om 18:00?",
            "Je kunt nu geen nieuwe afspraak maken met Bobbie.",
            "Je kunt nu geen nieuwe afspraak maken.",
            "Bobbie is weer thuis!",
            "Verstuurd!",
            "Afspraak is afspraak",
            "Ik beloof het, verstuur",
            "Tik om toe te voegen",
            "Verstuurd naar Sanne",
            "Hoe was Bobbie na het rondje?",
        ]
        #expect(lines.count > 30)
        for line in lines + guus {
            #expect(!GuusLine.isBanned(line), "\(line)")
        }
        for line in guus + RequestSuggestions.chips(kind: .meet) + RequestSuggestions.thanks(dogName: "Bobbie") {
            #expect(line.filter { $0 == "!" }.count <= 1, "\(line)")
        }
    }
}
