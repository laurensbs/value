import Foundation
import SwiftUI
import Testing
@testable import Rondje

@Suite("Guus the coach")
@MainActor
struct CoachTests {
    private func freshKeepsakes() -> Keepsakes {
        Keepsakes(defaults: UserDefaults(suiteName: UUID().uuidString)!)
    }

    private func day(_ year: Int, _ month: Int, _ day: Int, hour: Int = 12) -> Date {
        Calendar(identifier: .gregorian).date(from: DateComponents(year: year, month: month, day: day, hour: hour))!
    }

    @Test func guusNeverSaysGuiltOrUrgency() {
        #expect(GuusLine.isBanned("We missen je!"))
        #expect(GuusLine.isBanned("Een rondje \u{2014} nu"))
        #expect(GuusLine.isBanned("Je STREAK staat op het spel"))
        #expect(!GuusLine.isBanned("Geen haast."))
        #expect(!GuusLine.isBanned("Zin in een rondje?"))
    }

    @Test func coachCopyFollowsTheRules() {
        let lines = [
            "Guus mag tips geven",
            "Guus is de hond die je steeds de volgende stap laat zien.",
            "Laat Guus alles opnieuw uitleggen",
            "Guus legt het straks weer uit",
            "Snap ik",
        ]
        for line in lines { #expect(!GuusLine.isBanned(line), "\(line)") }
    }

    @Test func snoozesHoldUntilTheirDate() {
        let keepsakes = freshKeepsakes()
        let now = day(2026, 10, 2)
        keepsakes.snooze("nudge.walk", until: now.addingTimeInterval(3600))
        keepsakes.snooze("nudge.old", until: now.addingTimeInterval(-60))
        #expect(keepsakes.isSnoozed("nudge.walk", now: now))
        #expect(!keepsakes.isSnoozed("nudge.walk", now: now.addingTimeInterval(7200)))
        #expect(!keepsakes.isSnoozed("nudge.old", now: now))
        #expect(!keepsakes.isSnoozed("never", now: now))
        #expect(keepsakes.activeSnoozes(now: now) == ["nudge.walk"])
        #expect(keepsakes.has("snooze.nudge.walk"))
    }

    @Test func marksAndChecksSurviveARestart() {
        let defaults = UserDefaults(suiteName: UUID().uuidString)!
        let first = Keepsakes(defaults: defaults)
        first.mark("hint.home")
        first.toggleCheck("prep.a1", "id")
        first.lessonsDone = ["body-language"]
        let second = Keepsakes(defaults: defaults)
        #expect(second.has("hint.home"))
        #expect(second.checks("prep.a1") == ["id"])
        #expect(second.lessonsDone == ["body-language"])
        #expect(second.toggleCheck("prep.a1", "id") == false)
        #expect(second.checks("prep.a1").isEmpty)
    }

    @Test func welcomeBackOnlyAfterSixDays() {
        let now = day(2026, 10, 2)
        let five = freshKeepsakes()
        five.recordVisit(now: now.addingTimeInterval(-5 * 86_400))
        five.recordVisit(now: now)
        #expect(!five.has("welcomeBack"))
        #expect(five.date("visit.last") == now)

        let six = freshKeepsakes()
        six.recordVisit(now: now.addingTimeInterval(-6 * 86_400))
        six.recordVisit(now: now)
        #expect(six.has("welcomeBack"))

        let first = freshKeepsakes()
        first.recordVisit(now: now)
        #expect(!first.has("welcomeBack"))
    }

    @Test func clearKeepsTheTipsSetting() {
        let keepsakes = freshKeepsakes()
        keepsakes.coachOn = false
        keepsakes.mark("hint.home")
        keepsakes.setChecks("lessons", ["one"])
        keepsakes.clear()
        #expect(!keepsakes.coachOn)
        #expect(!keepsakes.has("hint.home"))
        #expect(keepsakes.lessonsDone.isEmpty)
    }

    @Test func resetHintsLetsGuusExplainAgain() {
        let keepsakes = freshKeepsakes()
        keepsakes.mark("hint.home")
        keepsakes.mark("hint.appointments")
        keepsakes.mark("met.guus")
        keepsakes.mark("prepDone.a1")
        keepsakes.resetHints()
        #expect(keepsakes.keys(withPrefix: "hint.").isEmpty)
        #expect(!keepsakes.has("met.guus"))
        #expect(keepsakes.prepDone("a1"))
    }

    @Test func nextMorningIsSixOClock() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Amsterdam")!
        let evening = calendar.date(from: DateComponents(year: 2026, month: 10, day: 2, hour: 21))!
        let morning = Keepsakes.nextMorning(after: evening, calendar: calendar)
        #expect(calendar.dateComponents([.day, .hour, .minute], from: morning) == DateComponents(day: 3, hour: 6, minute: 0))
        let early = calendar.date(from: DateComponents(year: 2026, month: 10, day: 2, hour: 4))!
        #expect(calendar.component(.day, from: Keepsakes.nextMorning(after: early, calendar: calendar)) == 2)
    }

    @Test func notificationLinksRoundTrip() {
        let linked: [CoachAction] = [
            .appointments(nil), .appointments("a1"), .prep("a1"), .rebook("a1"), .dog("d1"),
            .discover(calm: false), .discover(calm: true), .lessons, .quiz, .nudgeSettings,
        ]
        for action in linked {
            #expect(action.link != nil, "\(action)")
            #expect(action.link.flatMap(CoachAction.init(link:)) == action)
        }
        let unlinked: [CoachAction] = [.startWalk("a1"), .feedback(walkId: "w1", appointmentId: "a1"), .trust("a1"), .follow("a1"), .addDog, .badges]
        for action in unlinked { #expect(action.link == nil) }
        #expect(CoachAction(link: "discover") == .discover(calm: false))
        #expect(CoachAction(link: "prep:") == nil)
        #expect(CoachAction(link: "prep") == nil)
        #expect(CoachAction(link: "somewhere") == nil)
    }

    @Test func sheetActionsAreSheets() {
        #expect(CoachAction.quiz.isSheet)
        #expect(CoachAction.feedback(walkId: "w", appointmentId: "a").isSheet)
        #expect(!CoachAction.appointments(nil).isSheet)
        #expect(!CoachAction.discover(calm: true).isSheet)
    }

    @Test func guusDressesForTheSeason() {
        #expect(Guus.accessory(on: day(2026, 10, 2)) == .leaf)
        #expect(Guus.accessory(on: day(2027, 1, 5)) == .scarf)
        #expect(Guus.accessory(on: day(2026, 8, 1)) == nil)
        #expect(Guus.accessory(on: day(2026, 4, 10)) == .flower)
        #expect(Guus.look(on: day(2027, 1, 5)).collar == "#c0392b")
        #expect(Guus.look(on: day(2026, 4, 27), region: "NL").collar == "#F28C28")
        #expect(Guus.look(on: day(2026, 4, 27), region: "BE").collar == IntroView.golden.collar)
    }

    @Test func everyMoodRenders() {
        for look in [DogLook.sample, IntroView.border, IntroView.brown] {
            for mood in DogMood.allCases {
                for blink in [false, true] {
                    let renderer = ImageRenderer(content: DogFace(look: look, blink: blink, mood: mood).frame(width: 120, height: 120))
                    #expect(renderer.uiImage != nil, "\(mood)")
                }
            }
        }
    }

    @Test func celebrationsHappenOncePerKey() {
        let model = AppModel()
        let key = "test.\(UUID().uuidString)"
        model.celebrate(.party(nil), once: key)
        let first = model.celebration
        model.celebration = nil
        model.celebrate(.party(nil), once: key)
        #expect(model.celebration == nil)
        if !WalkTracker.shared.isActive { #expect(first != nil) }
        Keepsakes.shared.unmark("party." + key)
    }

    @Test func performGoesToTheRightPlace() {
        let model = AppModel()
        model.perform(.appointments("a1"))
        #expect(model.selectedTab == .appointments)
        #expect(model.take { if case .appointments(let id) = $0 { id } else { nil } } == "a1")
        #expect(model.pendingAction == nil)
        model.perform(.quiz)
        #expect(model.take { if case .lessons = $0 { true } else { nil } } == nil)
        #expect(model.pendingAction == .quiz)
    }
}
