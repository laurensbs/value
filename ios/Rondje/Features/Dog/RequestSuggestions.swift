import Foundation

/// Ready-made moments and sentences, so asking for a walk or answering a chat never starts with an
/// empty box. Pure: no network, no storage, and the same answer for the same input.
enum RequestSuggestions {
    /// A moment to suggest; `fromSlot` when it is one of the dog's regular times.
    struct Moment: Hashable, Sendable {
        var date: Date
        var fromSlot: Bool
    }

    /// The server's window for a new appointment: from 20 minutes from now up to 60 days ahead.
    static let lead: TimeInterval = 20 * 60
    static let horizon: TimeInterval = 60 * 86_400

    // MARK: Moments

    /// The next occurrence of each regular time of the dog (at most three, soonest first). Without
    /// usable regular times: tomorrow 18:00, Saturday 10:00 and Sunday 14:00.
    static func moments(slots: [Slot], now: Date, calendar: Calendar) -> [Moment] {
        let earliest = now.addingTimeInterval(lead)
        let latest = now.addingTimeInterval(horizon)
        let fromSlots = slots.compactMap { slot -> Date? in
            guard let match = components(of: slot) else { return nil }
            return calendar.nextDate(after: now, matching: match, matchingPolicy: .nextTime)
        }
        let usable = unique(fromSlots.filter { $0 >= earliest && $0 <= latest })
        if !usable.isEmpty {
            return usable.prefix(3).map { Moment(date: $0, fromSlot: true) }
        }

        // Weekday 7 is Saturday and 1 is Sunday in Calendar terms.
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now))
            .flatMap { calendar.date(bySettingHour: 18, minute: 0, second: 0, of: $0) }
        let saturday = calendar.nextDate(after: earliest, matching: DateComponents(hour: 10, minute: 0, second: 0, weekday: 7), matchingPolicy: .nextTime)
        let sunday = calendar.nextDate(after: earliest, matching: DateComponents(hour: 14, minute: 0, second: 0, weekday: 1), matchingPolicy: .nextTime)
        let fallback = [tomorrow, saturday, sunday].compactMap { $0 }.filter { $0 >= earliest }
        return unique(fallback).prefix(3).map { Moment(date: $0, fromSlot: false) }
    }

    /// Whether `date` falls on one of the dog's regular times.
    static func isSlot(_ date: Date, slots: [Slot], calendar: Calendar) -> Bool {
        let c = calendar.dateComponents([.weekday, .hour, .minute], from: date)
        return slots.contains { slot in
            guard let match = components(of: slot) else { return false }
            return match.weekday == c.weekday && match.hour == c.hour && match.minute == c.minute
        }
    }

    /// The same time a week after `startsAt`, or as many weeks later as needed to be at least
    /// 20 minutes from now.
    static func rebookDate(from startsAt: Date, now: Date, calendar: Calendar) -> Date {
        let earliest = now.addingTimeInterval(lead)
        var weeks = 1
        var date = later(startsAt, weeks: weeks, calendar: calendar)
        while date < earliest && weeks < 600 {
            weeks += 1
            date = later(startsAt, weeks: weeks, calendar: calendar)
        }
        return date
    }

    // MARK: Words

    /// The prefilled message for a weekly rebook: it names the weekday and time of the series, so the
    /// owner reads what they are asked ("every Tuesday at 18:00"), not a single walk "next week".
    static func rebookMessage(date: Date, calendar: Calendar, locale: Locale = Format.locale) -> String {
        let style = Date.FormatStyle(locale: locale, calendar: calendar, timeZone: calendar.timeZone)
        var day = date.formatted(style.weekday(.wide))
        if locale.language.languageCode != .english { day = day.lowercased() }
        let time = date.formatted(style.hour(.twoDigits(amPM: .omitted)).minute(.twoDigits))
        return L("Zin om vaker samen te gaan? Elke \(day) om \(time)?")
    }

    /// A short hello for the request, written in the walker's own words as far as we know them.
    static func intro(firstName: String, city: String, experience: String, dogName: String, kind: RequestFlow.Kind) -> String {
        let name = firstName.trimmingCharacters(in: .whitespaces)
        let place = city.trimmingCharacters(in: .whitespaces)
        let hello = place.isEmpty ? L("Hoi! Ik ben \(name).") : L("Hoi! Ik ben \(name) uit \(place).")
        let background = switch experience {
        case "none": L("Ik heb nog geen ervaring met honden, maar ik leer graag.")
        case "lots": L("Ik heb veel ervaring met honden.")
        default: L("Ik heb wat ervaring met honden.")
        }
        let wish = kind == .meet ? L("Ik zou \(dogName) graag leren kennen.") : L("Zin om weer samen op pad te gaan!")
        return [hello, background, wish].joined(separator: " ")
    }

    /// Sentences to add to the hello with one tap.
    static func chips(kind: RequestFlow.Kind) -> [String] {
        var all = [
            L("Ik kan meestal 's avonds."),
            L("Ik kan meestal overdag."),
            L("Ik ben student."),
            L("Ik ben met pensioen."),
            L("Ik had vroeger zelf een hond."),
            L("Ik wandel graag in het park."),
        ]
        if kind == .meet { all.append(L("Ik neem mijn ID mee.")) }
        return all
    }

    /// Replies that fit where the appointment is. Tapping one only fills the field; nothing is sent by itself.
    /// The ID lines only appear for a first meeting, because that is when the owner looks at the ID.
    static func chatReplies(for item: Appointment, asOwner: Bool) -> [String] {
        let dog = item.dog.name
        let walked = item.status == "completed" || item.walkStatus == "ended"
        if asOwner {
            // "Tot volgende week!" only for a weekly walk: otherwise it reads as a commitment nobody made.
            if walked { return [L("Dank je wel!"), L("\(dog) ligt heerlijk te slapen.")] + (item.weekly ? [L("Tot volgende week!")] : []) }
            switch item.status {
            case "pending":
                return [L("Leuk! Wanneer kun je kennismaken?"), L("Dank je! Ik kijk even in mijn agenda.")]
            case "accepted":
                return [L("Leuk, tot dan!")] + (item.isMeeting ? [L("Neem je je ID mee?")] : []) + [L("Ik sta bij de voordeur.")]
            default:
                return []
            }
        }
        if walked { return [L("Dank je wel voor het vertrouwen!"), L("\(dog) was een schatje.")] }
        switch item.status {
        case "pending":
            return [L("Ik kan ook op een ander moment.")]
        case "accepted":
            return [L("Leuk, tot dan!")] + (item.isMeeting ? [L("Ik neem mijn ID mee.")] : []) + [L("Ik ben er over 5 minuten.")]
        default:
            return []
        }
    }

    /// One-tap thanks from the owner when the dog is home again. A tap sends at once, so nothing in here
    /// may promise anything; "Tot volgende week!" only appears for a weekly walk.
    static func thanks(dogName: String, weekly: Bool = false) -> [String] {
        [L("Dank je wel!"), L("\(dogName) ligt heerlijk te slapen."), L("Daar knapt \(dogName) van op.")]
            + (weekly ? [L("Tot volgende week!")] : [])
    }

    // MARK: Helpers

    /// Slot.weekday runs 1 (Monday) to 7 (Sunday); Calendar runs 1 (Sunday) to 7 (Saturday).
    private static func components(of slot: Slot) -> DateComponents? {
        guard (1...7).contains(slot.weekday) else { return nil }
        let parts = slot.time.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2, (0...23).contains(parts[0]), (0...59).contains(parts[1]) else { return nil }
        return DateComponents(hour: parts[0], minute: parts[1], second: 0, weekday: (slot.weekday % 7) + 1)
    }

    private static func later(_ date: Date, weeks: Int, calendar: Calendar) -> Date {
        calendar.date(byAdding: .day, value: 7 * weeks, to: date) ?? date.addingTimeInterval(Double(weeks) * 7 * 86_400)
    }

    /// Sorted, without duplicates.
    private static func unique(_ dates: [Date]) -> [Date] {
        Array(Set(dates)).sorted()
    }
}
