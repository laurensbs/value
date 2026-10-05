import Foundation
import Testing
@testable import Rondje

@Suite("Meeting prep and Guus hints")
@MainActor
struct MeetingPrepTests {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        return calendar
    }

    private func date(_ month: Int, _ day: Int, _ hour: Int, _ minute: Int = 0) -> Date {
        calendar.date(from: DateComponents(year: 2026, month: month, day: day, hour: hour, minute: minute))!
    }

    private func appointment(meet: Bool, meetingInfo: String = "Bij het hek van het park", walker: String? = "Sanne",
                             status: String = "accepted", walkStatus: String? = nil, startsAt: Date? = nil) -> Appointment {
        Appointment(
            id: "a1", kind: meet ? "meet" : "solo", status: status, startsAt: startsAt ?? date(10, 5, 18), durationMin: 45,
            weekly: false, message: "", flags: [], walkId: nil, walkStatus: walkStatus, feedbackGiven: nil,
            dog: .init(id: "d1", name: "Saar", photos: [], look: .sample, city: "Utrecht", isShelter: false, meetingInfo: meetingInfo),
            host: nil,
            walker: walker.map { .init(id: "w1", firstName: $0, photoUrl: nil, bio: "", experience: "some", ageBand: "18-25", city: "Utrecht", phone: nil, email: nil) },
            trust: nil
        )
    }

    private var allSets: [(name: String, items: [PrepItem])] {
        [
            ("walker meet", MeetingPrep.items(for: appointment(meet: true), asOwner: false)),
            ("walker solo", MeetingPrep.items(for: appointment(meet: false), asOwner: false)),
            ("owner meet", MeetingPrep.items(for: appointment(meet: true), asOwner: true)),
            ("owner solo", MeetingPrep.items(for: appointment(meet: false), asOwner: true)),
        ]
    }

    @Test func everyChecklistIsBiteSize() {
        for set in allSets {
            #expect((3...4).contains(set.items.count), "\(set.name)")
            #expect(Set(set.items.map(\.id)).count == set.items.count, "\(set.name)")
            #expect(set.items.allSatisfy { !$0.title.isEmpty && !$0.symbol.isEmpty }, "\(set.name)")
        }
    }

    @Test func theFixedRulesAreInTheChecklists() {
        let walkerMeet = MeetingPrep.items(for: appointment(meet: true), asOwner: false).map(\.id)
        let ownerMeet = MeetingPrep.items(for: appointment(meet: true), asOwner: true).map(\.id)
        #expect(walkerMeet.contains("id"))
        #expect(ownerMeet.contains("id"))
        #expect(ownerMeet.contains("trust"))
    }

    @Test func thePlaceComesFromTheDogOrTheChat() {
        let withPlace = MeetingPrep.items(for: appointment(meet: true), asOwner: false).first { $0.id == "where" }
        #expect(withPlace?.detail?.hasSuffix("Bij het hek van het park") == true)
        let without = MeetingPrep.items(for: appointment(meet: true, meetingInfo: "  "), asOwner: false).first { $0.id == "where" }
        #expect(without?.detail?.contains("Bij het hek") == false)
    }

    @Test func eveningReminderIsAtSevenTheDayBefore() {
        let fire = PrepReminder.fireDate(startsAt: date(10, 5, 18), now: date(10, 2, 12), calendar: calendar)
        #expect(fire == date(10, 4, 19))
    }

    @Test func noEveningReminderForANightMeeting() {
        #expect(PrepReminder.fireDate(startsAt: date(10, 5, 1), now: date(10, 2, 12), calendar: calendar) == nil)
        #expect(PrepReminder.fireDate(startsAt: date(10, 5, 3), now: date(10, 2, 12), calendar: calendar) == date(10, 4, 19))
    }

    @Test func noEveningReminderWhenTheEveningHasPassed() {
        #expect(PrepReminder.fireDate(startsAt: date(10, 5, 18), now: date(10, 4, 19, 30), calendar: calendar) == nil)
        #expect(PrepReminder.fireDate(startsAt: date(10, 5, 18), now: date(10, 4, 19), calendar: calendar) == nil)
    }

    @Test func tickingEverythingMeansReadyAndUntickingUndoesIt() {
        let keepsakes = Keepsakes(defaults: UserDefaults(suiteName: UUID().uuidString)!)
        let item = appointment(meet: true)
        let ids = MeetingPrep.items(for: item, asOwner: false).map(\.id)
        for id in ids.dropLast() {
            #expect(!MeetingPrep.toggle(id, for: item, asOwner: false, keepsakes: keepsakes))
        }
        #expect(!keepsakes.prepDone(item.id))
        #expect(MeetingPrep.toggle(ids.last!, for: item, asOwner: false, keepsakes: keepsakes))
        #expect(keepsakes.prepDone(item.id))
        let progress = MeetingPrep.progress(for: item, asOwner: false, keepsakes: keepsakes)
        #expect(progress.done == ids.count && progress.total == ids.count)
        #expect(!MeetingPrep.toggle(ids[0], for: item, asOwner: false, keepsakes: keepsakes))
        #expect(!keepsakes.prepDone(item.id))
        #expect(keepsakes.checks("prep." + item.id).count == ids.count - 1)
    }

    @Test func prepLinkOnlyBeforeTheStart() {
        let now = date(10, 5, 18)
        #expect(PrepLink.isShown(appointment(meet: true, startsAt: now.addingTimeInterval(3600)), now: now))
        #expect(PrepLink.isShown(appointment(meet: true, startsAt: now.addingTimeInterval(-20 * 60)), now: now))
        #expect(!PrepLink.isShown(appointment(meet: true, startsAt: now.addingTimeInterval(-40 * 60)), now: now))
        #expect(!PrepLink.isShown(appointment(meet: true, status: "pending", startsAt: now.addingTimeInterval(3600)), now: now))
        #expect(!PrepLink.isShown(appointment(meet: true, walkStatus: "active", startsAt: now.addingTimeInterval(600)), now: now))
    }

    @Test func allCopyFollowsTheGuusRules() {
        var lines: [String] = []
        for meet in [true, false] {
            for walker in ["Sanne", nil] as [String?] {
                for info in ["Bij het hek van het park", ""] {
                    let item = appointment(meet: meet, meetingInfo: info, walker: walker)
                    for asOwner in [false, true] {
                        for live in [true, false] {
                            for prep in MeetingPrep.items(for: item, asOwner: asOwner, liveLocation: live) {
                                lines.append(prep.title)
                                if let detail = prep.detail { lines.append(detail) }
                            }
                        }
                        lines.append(MeetingPrep.intro(for: item, asOwner: asOwner))
                        let text = PrepReminder.text(for: item, asOwner: asOwner)
                        lines += [text.title, text.body]
                    }
                }
            }
        }
        lines += [
            MeetingPrep.ready,
            "Bereid je voor",
            "Je vinkjes blijven op je telefoon.",
            "Tik op een hond om zijn verhaal te lezen. Begin gerust met Rustig.",
            "Eerst maak je kennis. De eigenaar loopt mee en bekijkt je ID.",
            "Op de dag zelf start je hier je rondje. Een half uur van tevoren mag het al.",
            "Hulp nodig? SOS staat altijd hier rechtsboven.",
            "Tik bij elke plas of poep. De eigenaar ziet het live.",
            "Hier zie je wie met je hond wil wandelen. Jij beslist altijd zelf.",
            "Je ziet live waar ze lopen. Foto's en plasjes komen hier vanzelf binnen.",
        ]
        for line in lines {
            #expect(!GuusLine.isBanned(line), "\(line)")
            #expect(line.filter { $0 == "!" }.count <= 1, "\(line)")
        }
    }
}
