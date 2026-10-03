import Foundation
import Testing
@testable import Rondje

@Suite("Walk done: points, levels and friendship")
struct WalkDoneTests {
    private let start = Date(timeIntervalSince1970: 1_790_000_000)

    private func level(floor: Int, next: Int?) -> Rondje.Progress.Level {
        Rondje.Progress.Level(number: 2, key: "k", name: "Wandelaar", floor: floor, next: next, nextName: next == nil ? nil : "Speurneus", progress: 0)
    }

    @Test func pointRowsKeepThisWalkOnly() {
        let recent = [
            Rondje.Progress.Recent(kind: "walk", points: 10, at: start, label: "Rondje gelopen"),
            Rondje.Progress.Recent(kind: "walk-care", points: 2, at: start, label: "Rapportje ingevuld"),
            Rondje.Progress.Recent(kind: "walk-photo", points: 2, at: start, label: "Foto gedeeld"),
            Rondje.Progress.Recent(kind: "walk", points: 10, at: start.addingTimeInterval(-3 * 86_400), label: "Eerder rondje"),
            Rondje.Progress.Recent(kind: "quiz", points: 20, at: start.addingTimeInterval(-121), label: "Quiz gehaald"),
        ]
        let rows = WalkDoneMath.pointRows(recent, since: start)
        #expect(rows.map(\.kind) == ["walk", "walk-care", "walk-photo"])
        #expect(rows.map(\.label) == ["Rondje gelopen", "Rapportje ingevuld", "Foto gedeeld"])
        let justBefore = [Rondje.Progress.Recent(kind: "walk", points: 10, at: start.addingTimeInterval(-120), label: "x")]
        #expect(WalkDoneMath.pointRows(justBefore, since: start).count == 1)
    }

    @Test func levelFraction() {
        #expect(WalkDoneMath.levelFraction(points: 100, level: level(floor: 100, next: 200)) == 0)
        #expect(WalkDoneMath.levelFraction(points: 150, level: level(floor: 100, next: 200)) == 0.5)
        #expect(WalkDoneMath.levelFraction(points: 999, level: level(floor: 100, next: 200)) == 1)
        #expect(WalkDoneMath.levelFraction(points: 50, level: level(floor: 100, next: 200)) == 0)
        #expect(WalkDoneMath.levelFraction(points: 5000, level: level(floor: 1000, next: nil)) == 1)
    }

    @Test func bondStepAfterTheFirstWalk() {
        let step = WalkDoneMath.bondStep(walks: 1)
        #expect(step.name == "Net kennisgemaakt")
        #expect(step.nextName == "Wandelmaatjes")
        #expect(step.toGo == 1)
        #expect(WalkDoneMath.bondStep(walks: 3).nextName == "Goede vrienden")
        #expect(WalkDoneMath.bondStep(walks: 3).toGo == 2)
        #expect(WalkDoneMath.bondStep(walks: 12).nextName == nil)
    }

    @Test func tierUp() {
        #expect(WalkDoneMath.tierUp(walks: 2))
        #expect(WalkDoneMath.tierUp(walks: 5))
        #expect(WalkDoneMath.tierUp(walks: 10))
        #expect(!WalkDoneMath.tierUp(walks: 1))
        #expect(!WalkDoneMath.tierUp(walks: 3))
        #expect(!WalkDoneMath.tierUp(walks: 11))
    }

    @Test func copyIsKind() {
        let copy = [
            "Rondje klaar!",
            "Bobbie en jij liepen 1,20 km in 34 minuten.",
            "Jouw punten",
            "Nieuw niveau: Speurneus!",
            "Vertel hoe het ging",
            "Je punten tellen we zodra je weer verbinding hebt.",
            "Hoe ging het met Bobbie?",
            "Alleen Rondje ziet dit, nooit de eigenaar.",
            "Dank je.",
            "Dank je dat je het vertelt. Iemand van Rondje kijkt ernaar.",
            "Jullie vriendschap",
            "Nieuw in je vriendenboek: Bobbie",
            "Nog 1 rondje tot Wandelmaatjes",
            "Nog 3 rondjes tot Goede vrienden",
            "Jullie zijn nu Wandelmaatjes!",
            "Tot vrijdag! Je krijgt een seintje een half uur van tevoren.",
            "Mooi kennisgemaakt.",
            "Voelde het goed? Dan kan de eigenaar je vertrouwen geven voor zelfstandige rondjes. Je hoort het vanzelf.",
            "Doe alvast de Hondenschool",
            "Zin om dit vaker te doen? Vaste momenten werken het best.",
            "Ja, elke vrijdag om 18:00",
            "Zin om vaker samen te gaan? Elke dinsdag om 18:00?",
            "Weer samen met de eigenaar?",
            "Nu niet",
            "Aangevraagd. De eigenaar beslist.",
            "Dank je wel namens Bobbie.",
        ]
        for line in copy {
            #expect(!GuusLine.isBanned(line), "\(line)")
            #expect(line.filter { $0 == "!" }.count <= 1, "\(line)")
        }
    }
}
