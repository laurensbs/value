import Foundation

/// The one thing to do next, said by Guus on top of Ontdek and Thuis, with one big button that goes straight there.
/// The list is finite and ends in a calm "done": nothing is ever lost by skipping a step.
struct NextStep: Equatable, Sendable {
    var id: String
    var mood: DogMood
    var text: String
    var detail: String? = nil
    var button: String? = nil
    var action: CoachAction? = nil
    /// Whether "Later" may put this step away until tomorrow morning.
    var snoozable = true
    /// A few dogs to choose from, shown as tiles under the bubble.
    var picks: [DogCard] = []
}

/// Where the step is shown: Ontdek (the walker side) or Thuis (the owner side).
enum NextStepPlacement: Sendable { case discover, home }

/// A nonisolated mirror of `AppModel.Role`, so the engine can be tested without the app model.
enum NextStepRole: Sendable { case walker, owner, both }

/// Everything the engine looks at. Built by `NextStepCard` from the app model, the progress store and Keepsakes.
struct NextStepContext: Sendable {
    var now: Date = .now
    var calendar: Calendar = .current
    var placement: NextStepPlacement = .discover
    var role: NextStepRole = .walker
    var firstName: String = ""
    var country: String = "NL"
    var quizPassed = false
    var walksDone = 0
    var outgoing: [Appointment] = []
    var incoming: [Appointment] = []
    /// nil while the owner's dogs are still loading.
    var myDogsCount: Int? = nil
    var weekGoal: Int? = nil
    var weekWalks = 0
    var nearbyDogs: [DogCard] = []
    /// False while the dogs nearby are still loading, so Guus never says there are none before he looked.
    var nearbyLoaded = true
    /// True when loading the dogs nearby failed (offline, for example): Guus then skips the picks.
    var nearbyFailed = false
    /// Dogs the walker reported as aggressive or unsafe: never suggested again.
    var noRebook: Set<String> = []
    /// Active snoozes from Keepsakes, without the "snooze." prefix (like "next.picks").
    var snoozed: Set<String> = []
    /// Appointment ids whose meeting prep is done.
    var prepDone: Set<String> = []
    /// Live location on the server (features.liveLocation). While it is off, a walk alone with the dog
    /// does not start, so Guus does not offer to start one.
    var liveLocation = true
}

extension NextStep {
    private struct Candidate {
        var step: NextStep
        /// A suggestion (not real-time, not safety): at night Guus sleeps instead.
        var suggestion = false
    }

    private static let day: TimeInterval = 86_400

    /// The first step in the fixed priority list that is not snoozed, or "done".
    static func compute(_ c: NextStepContext) -> NextStep {
        let candidates = c.placement == .discover ? discover(c) : home(c)
        let night = isNight(c.now, calendar: c.calendar)
        for candidate in candidates {
            let step = candidate.step
            if step.snoozable && c.snoozed.contains("next." + step.id) { continue }
            if night && candidate.suggestion { return sleeping }
            return step
        }
        return NextStep(
            id: "done", mood: .calm,
            text: moment(on: c.now, calendar: c.calendar, country: c.country) ?? L("Alles gedaan. Geniet van je dag."),
            snoozable: false
        )
    }

    /// What "Later" puts away and until when. "Later" on a rebook suggestion puts all of them away for
    /// 14 days (the key "rebook"), so the next dog does not take its place; everything else comes back
    /// the next morning.
    static func snooze(for step: NextStep, now: Date, calendar: Calendar = .current) -> (key: String, until: Date) {
        if step.id.hasPrefix("rebook.") { return ("rebook", now.addingTimeInterval(14 * day)) }
        return ("next." + step.id, Keepsakes.nextMorning(after: now, calendar: calendar))
    }

    /// Between 23:00 and 06:00 suggestions wait until tomorrow.
    static func isNight(_ date: Date, calendar: Calendar) -> Bool {
        let hour = calendar.component(.hour, from: date)
        return hour >= 23 || hour < 6
    }

    private static var sleeping: NextStep {
        NextStep(id: "night", mood: .sleepy, text: L("Guus slaapt al. Plannen kan morgen ook."), snoozable: false)
    }

    /// A small seasonal line for the done state, about the dog's wellbeing.
    static func moment(on date: Date, calendar: Calendar, country: String) -> String? {
        let parts = calendar.dateComponents([.month, .day], from: date)
        let month = parts.month ?? 1
        let md = month * 100 + (parts.day ?? 1)
        if md == 1004, ["NL", "BE"].contains(country.uppercased()) { return L("Het is Dierendag. Een extra aai telt ook.") }
        if md >= 1227 || md <= 101 { return L("Vuurwerk is eng voor honden. Loop kort, aan de lijn en voor het donker.") }
        if [12, 1, 2].contains(month) { return L("Strooizout prikt in pootjes. Even afvegen na het rondje.") }
        if (615...831).contains(md) { return L("Warm buiten? Voel met je hand of de stoep niet te heet is.") }
        return nil
    }

    // MARK: Ontdek (walker side)

    private static func discover(_ c: NextStepContext) -> [Candidate] {
        var list: [Candidate] = []
        let outgoing = c.outgoing

        // a. A walk of your own dog happening right now (only for people who walk and have a dog).
        if c.role == .both {
            for item in c.incoming where item.walkStatus == "active" {
                list.append(Candidate(step: NextStep(
                    id: "live.\(item.id)", mood: .happy,
                    text: L("\(item.dog.name) is nu op pad met \(walkerName(item))."),
                    button: L("Kijk live mee"), action: .follow(item.id), snoozable: false
                )))
            }
        }

        // b. A walk that can start now.
        let startable = outgoing
            .filter { $0.canStart(now: c.now) && $0.walkStatus != "ended" && $0.walkStatus != "active" }
            .filter { !WalkStarter.blockedByLiveLocation($0, liveLocation: c.liveLocation) }
            .sorted { $0.startsAt < $1.startsAt }
        for item in startable {
            let at = when(item.startsAt, c)
            list.append(Candidate(step: NextStep(
                id: "start.\(item.id)", mood: .happy,
                text: item.isMeeting ? L("\(at) kennismaken met \(item.dog.name). ID bij je?") : L("\(at) een rondje met \(item.dog.name). Klaar voor?"),
                button: L("Start het rondje"), action: .startWalk(item.id)
            )))
        }

        // c. Two taps about a walk that ended.
        for item in needsFeedback(outgoing, c) {
            guard let walkId = item.walkId else { continue }
            list.append(Candidate(step: NextStep(
                id: "feedback.\(walkId)", mood: .curious,
                text: L("Hoe ging het met \(item.dog.name)? Twee tikjes."), detail: feedbackDetail,
                button: L("Vertel het"), action: .feedback(walkId: walkId, appointmentId: item.id)
            )))
        }

        // d. A first meeting coming up.
        for item in needsPrep(outgoing, c) {
            list.append(Candidate(step: NextStep(
                id: "prep.\(item.id)", mood: .curious,
                text: L("\(when(item.startsAt, c)) kennismaken met \(item.dog.name). Even voorbereiden?"),
                button: L("Bereid je voor"), action: .prep(item.id)
            )))
        }

        // e. The safety quiz comes before any request (the server checks it too). The five Hondenschool
        // lessons are an extra, reachable from the quiz and under Jij; they are no step of their own.
        if !c.quizPassed {
            list.append(Candidate(step: NextStep(
                id: "quiz", mood: .curious,
                text: L("Eerst de veiligheidsquiz, dan kun je een hond aanvragen. Acht vragen, geen tijdsdruk."),
                button: L("Start de quiz"), action: .quiz
            ), suggestion: true))
        }

        // f. Nothing planned yet: three dogs to start with. Skipped when they could not be loaded,
        // so a later step comes through instead of a 'still looking' that never ends.
        if outgoing.isEmpty && !(c.nearbyFailed && c.nearbyDogs.isEmpty) {
            list.append(Candidate(step: picks(c), suggestion: true))
        }

        let waiting = outgoing.filter { $0.status == "pending" }.sorted { $0.startsAt < $1.startsAt }

        // g. A request the owner is still looking at.
        if let item = waiting.first {
            list.append(Candidate(step: NextStep(
                id: "waiting", mood: .calm,
                text: L("De eigenaar van \(item.dog.name) kijkt nog naar je aanvraag. Ik laat het je weten.")
            )))
        }

        // h. Another walk with a dog you walked in the last 14 days; the server decides whether that can be solo.
        // At most one at a time, and "Later" on it backs off for 14 days (see `snooze(for:now:)`), so it never nags.
        let open = Set(outgoing.filter { $0.status == "pending" || ($0.status == "accepted" && $0.startsAt > c.now) }.map(\.dog.id))
        let walked = outgoing
            .filter { ($0.status == "completed" || $0.walkStatus == "ended") && !$0.weekly && recent($0, c) }
            .sorted { $0.startsAt > $1.startsAt }
        if !c.snoozed.contains("rebook"), let item = walked.first(where: {
            !open.contains($0.dog.id) && !c.snoozed.contains("rebook.\($0.dog.id)")
                && !c.snoozed.contains("next.rebook.\($0.dog.id)") && !c.noRebook.contains($0.dog.id)
        }) {
            list.append(Candidate(step: NextStep(
                id: "rebook.\(item.dog.id)", mood: .happy,
                text: L("Nog een rondje met \(item.dog.name) plannen? Een vast moment werkt het best."),
                button: L("Plan een moment"), action: .rebook(item.id)
            ), suggestion: true))
        }

        // i. The weekly goal someone set themselves.
        if let goal = c.weekGoal, c.weekWalks < goal {
            let left = goal - c.weekWalks
            list.append(Candidate(step: NextStep(
                id: "goal", mood: .calm,
                text: left == 1 ? L("Nog 1 rondje voor je weekdoel. Geen haast.") : L("Nog \(left) rondjes voor je weekdoel. Geen haast."),
                button: L("Kies een hond"), action: .discover(calm: false)
            ), suggestion: true))
        }
        return list
    }

    /// Up to three calm dogs for beginners, nearest first; any real dogs when there are no calm ones.
    private static func picks(_ c: NextStepContext) -> NextStep {
        guard c.nearbyLoaded || !c.nearbyDogs.isEmpty else {
            return NextStep(id: "picks", mood: .curious, text: L("Ik zoek een paar honden voor je uit."), snoozable: false)
        }
        let real = c.nearbyDogs.filter { !$0.isDemo }.sorted { ($0.distanceM ?? .max) < ($1.distanceM ?? .max) }
        guard !real.isEmpty else {
            return NextStep(id: "picks", mood: .happy, text: L("Er wonen nog geen honden bij jou in de buurt. Een groepswandeling bij een opvang is een fijne start."))
        }
        let calm = real.filter { $0.energy == "calm" && $0.level == "starter" }
        let chosen = Array((calm.isEmpty ? real : calm).prefix(3))
        let text: String
        switch (chosen.count, calm.isEmpty) {
        case (1, false): text = L("Ik heb een hond voor je uitgezocht. Rustig en voor iedereen.")
        case (2, false): text = L("Ik heb twee honden voor je uitgezocht. Rustig en voor iedereen.")
        case (_, false): text = L("Ik heb drie honden voor je uitgezocht. Rustig en voor iedereen.")
        case (1, true): text = L("Ik heb een hond voor je uitgezocht.")
        case (2, true): text = L("Ik heb twee honden voor je uitgezocht.")
        case (_, true): text = L("Ik heb drie honden voor je uitgezocht.")
        }
        return NextStep(id: "picks", mood: .happy, text: text, button: L("Kijk alle honden"), action: .discover(calm: !calm.isEmpty), picks: chosen)
    }

    // MARK: Thuis (owner side)

    private static func home(_ c: NextStepContext) -> [Candidate] {
        var list: [Candidate] = []
        let incoming = c.incoming

        // a. Someone wants to walk your dog. Live walks are not a step here: the yellow live card covers them.
        let pending = incoming.filter { $0.status == "pending" }.sorted { $0.startsAt < $1.startsAt }
        if let first = pending.first {
            list.append(Candidate(step: NextStep(
                id: "pending.\(first.id)", mood: .curious,
                text: pending.count == 1
                    ? L("\(walkerName(first)) wil met \(first.dog.name) wandelen. Kijk eerst wie het is.")
                    : L("\(pending.count) mensen willen met je hond wandelen. Kijk eerst wie het zijn."),
                button: L("Bekijk de aanvraag"), action: .appointments(first.id)
            )))
        }

        // b. Two taps about a walk that ended.
        for item in needsFeedback(incoming, c) {
            guard let walkId = item.walkId else { continue }
            list.append(Candidate(step: NextStep(
                id: "feedback.\(walkId)", mood: .curious,
                text: L("Hoe was \(item.dog.name) na het rondje met \(walkerName(item))?"), detail: feedbackDetail,
                button: L("Vertel het"), action: .feedback(walkId: walkId, appointmentId: item.id)
            )))
        }

        // c. After meeting in person: the ID, and maybe trust for solo walks.
        let met = incoming.filter { item in
            guard item.isMeeting, item.walker != nil, recent(item, c) else { return false }
            let over = item.status == "completed"
                || (item.status == "accepted" && item.startsAt.addingTimeInterval(Double(item.durationMin) * 60) < c.now)
            return over && item.trust?.idSeen != true && item.trust?.soloAllowed != true
        }
        for item in met.sorted(by: { $0.startsAt > $1.startsAt }) {
            list.append(Candidate(step: NextStep(
                id: "trust.\(item.id)", mood: .curious,
                text: L("Hoe was de kennismaking met \(walkerName(item))? Heb je het ID gezien?"),
                detail: L("Alleen als het goed voelde, geef je vertrouwen."),
                button: L("Vertrouwen invullen"), action: .trust(item.id)
            )))
        }

        // d. A first meeting coming up.
        for item in needsPrep(incoming, c) {
            list.append(Candidate(step: NextStep(
                id: "prep.\(item.id)", mood: .curious,
                text: L("\(when(item.startsAt, c)) komt \(walkerName(item)) kennismaken met \(item.dog.name). Even voorbereiden?"),
                button: L("Bereid je voor"), action: .prep(item.id)
            )))
        }

        // e. No dog on Rondje yet.
        if c.myDogsCount == 0 {
            list.append(Candidate(step: NextStep(
                id: "adddog", mood: .happy,
                text: L("Zet je hond erop. Ik help je stap voor stap."),
                button: L("Hond toevoegen"), action: .addDog
            )))
        }

        // f. The dog is on, nobody asked yet.
        if let count = c.myDogsCount, count > 0, incoming.isEmpty {
            list.append(Candidate(step: NextStep(
                id: "owner.waiting", mood: .calm,
                text: L("Je hond staat erop. Zodra iemand wil wandelen, laat ik het je weten.")
            ), suggestion: true))
        }
        return list
    }

    // MARK: Helpers

    private static var feedbackDetail: String { L("Alleen \(Brand.name) ziet je antwoord.") }

    private static func walkerName(_ item: Appointment) -> String {
        item.walker?.firstName ?? L("de wandelaar")
    }

    /// Started in the last 14 days (and not in the future).
    private static func recent(_ item: Appointment, _ c: NextStepContext) -> Bool {
        item.startsAt <= c.now && c.now.timeIntervalSince(item.startsAt) <= 14 * day
    }

    /// Ended walks without feedback from the last 14 days, most recent first.
    private static func needsFeedback(_ items: [Appointment], _ c: NextStepContext) -> [Appointment] {
        items.filter { $0.walkStatus == "ended" && $0.feedbackGiven != true && $0.walkId != nil && recent($0, c) }
            .sorted { $0.startsAt > $1.startsAt }
    }

    /// Accepted first meetings in the next 36 hours whose prep is not done, soonest first.
    private static func needsPrep(_ items: [Appointment], _ c: NextStepContext) -> [Appointment] {
        items.filter { item in
            let ahead = item.startsAt.timeIntervalSince(c.now)
            return item.isMeeting && item.status == "accepted" && ahead > 0 && ahead <= 36 * 3600 && !c.prepDone.contains(item.id)
        }
        .sorted { $0.startsAt < $1.startsAt }
    }

    /// "Vandaag 18:00", "Morgen 18:00" or "Zaterdag 4 oktober · 18:00", like `Format.when`, but relative to the context's now.
    static func when(_ date: Date, _ c: NextStepContext) -> String {
        let style = Date.FormatStyle(locale: Format.locale, calendar: c.calendar, timeZone: c.calendar.timeZone)
        let time = date.formatted(style.hour().minute())
        if c.calendar.isDate(date, inSameDayAs: c.now) { return L("Vandaag \(time)") }
        if let tomorrow = c.calendar.date(byAdding: .day, value: 1, to: c.now), c.calendar.isDate(date, inSameDayAs: tomorrow) {
            return L("Morgen \(time)")
        }
        let day = date.formatted(style.weekday(.wide).day().month(.wide))
        return day.prefix(1).uppercased() + day.dropFirst() + L(" · \(time)")
    }
}
