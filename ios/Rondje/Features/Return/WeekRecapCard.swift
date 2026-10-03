import SwiftUI

/// A short look back at a good week, from Sunday 17:00 until Monday night. Only when there were walks:
/// a week without walks shows nothing. Never a comparison with other weeks or other people.
struct WeekRecapCard: View {
    enum Side: Sendable { case walker, owner }
    let side: Side

    @Environment(AppModel.self) private var model

    struct Recap: Equatable, Sendable {
        struct Dog: Hashable, Sendable {
            var id: String?
            var name: String
            var look: DogLook
        }
        /// "yyyy-ww" of the week it covers; "Fijn" puts this week's card away.
        var key: String
        var lines: [String]
        var walks: Int
        var dogs: [Dog]
    }

    var body: some View {
        // Checks again every few minutes, so the card comes and goes on its own on Sunday and Monday.
        TimelineView(.periodic(from: .now, by: 300)) { context in
            card(now: context.date)
        }
    }

    @ViewBuilder
    private func card(now: Date) -> some View {
        let keepsakes = Keepsakes.shared
        if let recap = Self.recap(entries: WalkLog.entries, moods: MoodStore.entries, now: now, calendar: .current, side: side,
                                  activeWeeks: ProgressStore.shared.progress?.week?.activeWeeks),
           !keepsakes.has("recap." + recap.key) {
            CoachBubble(
                mood: .proud,
                text: recap.lines[0],
                detail: recap.lines.count > 1 ? recap.lines.dropFirst().joined(separator: " ") : nil,
                primary: rebook(recap),
                secondary: CoachButton(L("Fijn")) {
                    Haptics.tap()
                    withAnimation(.smooth) { Keepsakes.shared.mark("recap." + recap.key) }
                }
            ) {
                HStack(spacing: 8) {
                    ForEach(recap.dogs, id: \.self) { dog in
                        DogPortrait(look: dog.look, cornerRadius: 14)
                            .frame(width: 44, height: 44)
                            .accessibilityHidden(true)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .transition(.opacity)
        }
    }

    /// "Volgende week weer met <dog>?" for a dog walked this week that has nothing planned yet.
    private func rebook(_ recap: Recap) -> CoachButton? {
        guard side == .walker else { return nil }
        let outgoing = model.appointments.outgoing
        for dog in recap.dogs {
            guard let id = dog.id, !Keepsakes.shared.noRebook(id), !outgoing.contains(where: { $0.dog.id == id && $0.isOpen }),
                  let latest = outgoing.filter({ $0.dog.id == id }).max(by: { $0.startsAt < $1.startsAt }) else { continue }
            return CoachButton(L("Volgende week weer met \(dog.name)?")) {
                Haptics.tap()
                model.perform(.rebook(latest.id))
            }
        }
        return nil
    }

    // MARK: Recap

    /// The recap for `side`, or nil outside Sunday 17:00 to Monday 23:59 or for a week without walks.
    /// On Sunday it covers the current week, on Monday the week before.
    nonisolated static func recap(entries: [WalkLogEntry], moods: [MoodStore.Entry], now: Date, calendar: Calendar, side: Side,
                                  activeWeeks: Int? = nil) -> Recap? {
        var cal = calendar
        cal.firstWeekday = 2
        cal.minimumDaysInFirstWeek = 4
        let weekday = cal.component(.weekday, from: now)
        let reference: Date
        switch weekday {
        case 1 where cal.component(.hour, from: now) >= 17: reference = now
        case 2: reference = now.addingTimeInterval(-86_400)
        default: return nil
        }
        guard let week = cal.dateInterval(of: .weekOfYear, for: reference) else { return nil }
        let sideKey = side == .walker ? "walker" : "owner"
        let walks = entries
            .filter { $0.side == sideKey && $0.date >= week.start && $0.date < week.end && $0.date <= now }
            .sorted { $0.date < $1.date }
        guard !walks.isEmpty else { return nil }

        let c = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: week.start)
        let key = String(format: "%04d-%02d", c.yearForWeekOfYear ?? 0, c.weekOfYear ?? 0)

        // One entry per dog, in the order they were first walked.
        var dogs: [Recap.Dog] = []
        for walk in walks where !dogs.contains(where: { same($0, walk) }) {
            dogs.append(Recap.Dog(id: walk.dogId, name: walk.dogName, look: walk.look))
        }

        var lines: [String] = []
        switch side {
        case .walker:
            let names = list(dogs.map(\.name))
            if walks.count == 1 {
                lines.append(L("Jouw week: 1 rondje met \(walks[0].dogName)."))
            } else {
                let known = walks.compactMap(\.distanceM)
                let meters = known.reduce(0, +)
                if !known.isEmpty, meters > 0 {
                    lines.append(L("Jouw week: \(walks.count) rondjes, samen \(Format.distance(Double(meters))), met \(names)."))
                } else {
                    lines.append(L("Jouw week: \(walks.count) rondjes met \(names)."))
                }
            }
            let ids = Set(walks.map(\.walkId))
            let lifts = moods.compactMap { m -> Int? in
                guard ids.contains(m.walkId), let before = m.before, let after = m.after else { return nil }
                return after - before
            }
            if !lifts.isEmpty, Double(lifts.reduce(0, +)) / Double(lifts.count) > 0 {
                lines.append(L("Na je rondjes voelde je je beter. Alleen jij ziet dit."))
            }
            if let activeWeeks, activeWeeks >= 2 {
                lines.append(L("Je wandelde al in \(activeWeeks) verschillende weken."))
            }
        case .owner:
            for dog in dogs.prefix(2) {
                let mine = walks.filter { same(dog, $0) }
                var people: [String] = []
                for person in mine.compactMap(\.person) where !people.contains(person) { people.append(person) }
                if people.isEmpty {
                    lines.append(L("\(dog.name) ging deze week \(mine.count) keer extra naar buiten."))
                } else {
                    lines.append(L("\(dog.name) ging deze week \(mine.count) keer extra naar buiten, met \(list(people))."))
                }
            }
        }
        return Recap(key: key, lines: lines, walks: walks.count, dogs: dogs)
    }

    private nonisolated static func same(_ dog: Recap.Dog, _ walk: WalkLogEntry) -> Bool {
        if let id = dog.id, let other = walk.dogId { return id == other }
        return dog.name == walk.dogName
    }

    /// "Bobbie, Saar en Max" in the person's own language.
    private nonisolated static func list(_ names: [String]) -> String {
        names.formatted(.list(type: .and).locale(Format.locale))
    }
}
