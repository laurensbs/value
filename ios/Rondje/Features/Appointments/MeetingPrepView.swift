import SwiftUI

// MARK: Checklist

/// One small thing to have done before a meeting or a walk.
struct PrepItem: Identifiable, Hashable {
    let id: String
    let title: String
    let detail: String?
    let symbol: String
}

/// Meeting prep for both sides, in bite-size steps. It repeats the fixed rules in the moment itself:
/// meet first, the owner walks along, the ID is seen in person, and trust only comes afterwards.
/// The checklist is optional and never blocks anything; the ticks stay on this phone.
enum MeetingPrep {
    /// The checklist for this appointment: walker or owner, first meeting or a walk on your own.
    static func items(for item: Appointment, asOwner: Bool) -> [PrepItem] {
        let dog = item.dog.name
        let walker = item.walker?.firstName ?? L("de wandelaar")
        switch (asOwner, item.isMeeting) {
        case (false, true):
            let when = Format.when(item.startsAt)
            let place = item.dog.meetingInfo.trimmingCharacters(in: .whitespacesAndNewlines)
            return [
                PrepItem(id: "id", title: L("ID in je tas"),
                         detail: L("De eigenaar bekijkt het even. \(Brand.name) bewaart nooit een kopie."),
                         symbol: "person.text.rectangle.fill"),
                PrepItem(id: "where", title: L("Waar en wanneer"),
                         detail: place.isEmpty ? L("\(when). Spreek de plek af in de chat.") : when + ". " + place,
                         symbol: "mappin.and.ellipse"),
                PrepItem(id: "questions", title: L("Drie vragen voor de eigenaar"),
                         detail: L("Waar schrikt \(dog) van? Mag \(dog) koekjes? Hoe loopt \(dog) aan de lijn?"),
                         symbol: "questionmark.bubble.fill"),
                PrepItem(id: "how", title: L("Zo gaat het"),
                         detail: L("Jullie lopen samen. Daarna beslist de eigenaar of je zelfstandig met \(dog) mag."),
                         symbol: "figure.2"),
            ]
        case (false, false):
            let end = item.startsAt.addingTimeInterval(Double(item.durationMin) * 60)
            let time = end.formatted(.dateTime.hour().minute().locale(Format.locale))
            return [
                // The owner provides the bags (see the request flow); extra ones are only a backup.
                PrepItem(id: "phone", title: L("Telefoon opgeladen"),
                         detail: L("De eigenaar legt zakjes klaar. Neem er gerust een paar extra mee."), symbol: "iphone"),
                PrepItem(id: "water", title: L("Water als het warm is"),
                         detail: L("Voel met je hand of de stoep niet te heet is."), symbol: "drop.fill"),
                PrepItem(id: "sos", title: L("Weet waar SOS zit"),
                         detail: L("Tijdens het rondje staat SOS rechtsboven."), symbol: "sos"),
                PrepItem(id: "time", title: L("Terug rond \(time)"),
                         detail: L("Loop je later? Laat het de eigenaar meteen weten."), symbol: "clock.fill"),
            ]
        case (true, true):
            return [
                PrepItem(id: "ready", title: L("Riem en zakjes klaar"), detail: nil, symbol: "bag.fill"),
                PrepItem(id: "id", title: L("Vraag naar het ID"),
                         detail: L("Bekijk het even. Maak geen kopie of foto."), symbol: "person.text.rectangle.fill"),
                PrepItem(id: "walk", title: L("Loop samen een rondje"),
                         detail: L("Zo zie je hoe \(walker) met \(dog) omgaat."), symbol: "figure.2"),
                PrepItem(id: "trust", title: L("Na afloop: Vertrouwen"),
                         detail: L("Voelde het goed? Tik dan op Vertrouwen. Pas daarna mag \(walker) zelfstandig."),
                         symbol: "hand.thumbsup.fill"),
            ]
        case (true, false):
            return [
                PrepItem(id: "ready", title: L("Riem, zakjes en een koekje bij de deur"), detail: nil, symbol: "bag.fill"),
                PrepItem(id: "tell", title: L("Vertel waar \(dog) van schrikt"), detail: nil, symbol: "text.bubble.fill"),
                PrepItem(id: "phone", title: L("Houd je telefoon bij de hand"),
                         detail: L("Je kunt live meekijken zodra het rondje start."), symbol: "iphone"),
            ]
        }
    }

    /// What Guus says above the checklist.
    static func intro(for item: Appointment, asOwner: Bool) -> String {
        if asOwner { return L("Zo gaat de overdracht vanzelf.") }
        return item.isMeeting
            ? L("Zo ben je er klaar voor. Tik af wat je hebt gedaan.")
            : L("Even klaarzetten voor het rondje met \(item.dog.name).")
    }

    /// What Guus says once everything is ticked.
    static var ready: String { L("Je bent er klaar voor.") }

    /// The Keepsakes checklist that holds the ticks for this appointment.
    static func list(_ appointmentId: String) -> String { "prep." + appointmentId }

    /// How many of this appointment's items are ticked.
    @MainActor
    static func progress(for item: Appointment, asOwner: Bool, keepsakes: Keepsakes = .shared) -> (done: Int, total: Int) {
        let ids = Set(items(for: item, asOwner: asOwner).map(\.id))
        return (ids.intersection(keepsakes.checks(list(item.id))).count, ids.count)
    }

    /// Ticks or unticks one item and keeps "prepDone.<id>" in step with it. Returns whether all items are ticked now.
    @MainActor @discardableResult
    static func toggle(_ prepId: String, for item: Appointment, asOwner: Bool, keepsakes: Keepsakes = .shared) -> Bool {
        keepsakes.toggleCheck(list(item.id), prepId)
        let (done, total) = progress(for: item, asOwner: asOwner, keepsakes: keepsakes)
        let complete = total > 0 && done == total
        if complete {
            if !keepsakes.prepDone(item.id) { keepsakes.mark("prepDone." + item.id) }
        } else {
            keepsakes.unmark("prepDone." + item.id)
        }
        return complete
    }
}

/// The evening-before reminder for a first meeting.
enum PrepReminder {
    /// 19:00 on the day before `startsAt`. Nil when that moment has passed, or when the meeting is
    /// less than 8 hours after it (a meeting in the middle of the night gets no evening reminder).
    static func fireDate(startsAt: Date, now: Date, calendar: Calendar) -> Date? {
        guard let dayBefore = calendar.date(byAdding: .day, value: -1, to: calendar.startOfDay(for: startsAt)),
              let evening = calendar.date(bySettingHour: 19, minute: 0, second: 0, of: dayBefore)
        else { return nil }
        guard evening > now, startsAt.timeIntervalSince(evening) >= 8 * 3600 else { return nil }
        return evening
    }

    /// The notification text. It names only the dog or a first name.
    static func text(for item: Appointment, asOwner: Bool) -> (title: String, body: String) {
        if asOwner {
            let walker = item.walker?.firstName ?? L("de wandelaar")
            return (L("Morgen komt \(walker) kennismaken"), L("Leg riem en zakjes klaar, en vraag naar het ID."))
        }
        return (L("Morgen kennismaken met \(item.dog.name)"), L("Leg je ID alvast klaar. Tik om je voor te bereiden."))
    }
}

// MARK: Screen

/// Guus walks you through the meeting or the walk, one tick at a time.
struct MeetingPrepView: View {
    let item: Appointment
    let asOwner: Bool

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var items: [PrepItem] { MeetingPrep.items(for: item, asOwner: asOwner) }
    private var ticked: Set<String> { Keepsakes.shared.checks(MeetingPrep.list(item.id)) }

    var body: some View {
        let items = items
        let ticked = ticked
        let done = items.filter { ticked.contains($0.id) }.count
        let complete = !items.isEmpty && done == items.count
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    CoachBubble(mood: complete ? .proud : .curious,
                                text: complete ? MeetingPrep.ready : MeetingPrep.intro(for: item, asOwner: asOwner))

                    VStack(alignment: .leading, spacing: 8) {
                        Text("\(done) van \(items.count) klaar")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(complete ? Palette.grass : Palette.muted)
                            .contentTransition(.numericText(value: Double(done)))
                        ProgressView(value: Double(done), total: Double(max(items.count, 1)))
                            .tint(Palette.grass)
                            .accessibilityHidden(true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .animation(reduceMotion ? nil : .snappy, value: done)

                    VStack(spacing: 10) {
                        ForEach(items) { prep in
                            row(prep, done: ticked.contains(prep.id))
                        }
                    }

                    Label("Je vinkjes blijven op je telefoon.", systemImage: "lock.fill")
                        .font(.footnote)
                        .foregroundStyle(Palette.muted)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(20)
            }
            .screenBackground()
            .navigationTitle("Bereid je voor")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Sluit", systemImage: "xmark") { dismiss() } }
            }
        }
    }

    private func row(_ prep: PrepItem, done: Bool) -> some View {
        Button { toggle(prep) } label: {
            HStack(spacing: 14) {
                Image(systemName: prep.symbol)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(done ? Palette.onGrass : Palette.grass)
                    .frame(width: 46, height: 46)
                    .background(done ? Palette.grass : Palette.grassSoft, in: .circle)
                VStack(alignment: .leading, spacing: 3) {
                    Text(prep.title)
                        .font(.headline)
                        .foregroundStyle(Palette.ink)
                    if let detail = prep.detail {
                        Text(detail)
                            .font(.subheadline)
                            .foregroundStyle(Palette.muted)
                    }
                }
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: done ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(done ? Palette.grass : Palette.line)
                    .contentTransition(.symbolEffect(.replace))
                    .scaleEffect(done || reduceMotion ? 1 : 0.92)
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
            .background(Palette.surface, in: .rect(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .strokeBorder(done ? Palette.grass.opacity(0.45) : Palette.line.opacity(0.6), lineWidth: done ? 1.5 : 0.5)
            )
            .contentShape(.rect(cornerRadius: 20))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(done ? .isSelected : [])
    }

    private func toggle(_ prep: PrepItem) {
        Haptics.tap()
        let complete = withAnimation(reduceMotion ? .easeInOut(duration: 0.2) : .spring(duration: 0.35, bounce: 0.5)) {
            MeetingPrep.toggle(prep.id, for: item, asOwner: asOwner)
        }
        if complete {
            model.celebrate(.wag(MeetingPrep.ready), once: "prep." + item.id)
        }
    }
}

// MARK: Link on the appointment

/// "Bereid je voor" on an accepted appointment that has not started yet. Opens the checklist.
struct PrepLink: View {
    let item: Appointment
    let asOwner: Bool

    @State private var open = false

    /// Accepted, not started, and not more than half an hour past its start.
    static func isShown(_ item: Appointment, now: Date = .now) -> Bool {
        item.status == "accepted" && item.walkStatus == nil && item.startsAt > now.addingTimeInterval(-30 * 60)
    }

    var body: some View {
        if Self.isShown(item) {
            let progress = MeetingPrep.progress(for: item, asOwner: asOwner)
            let ready = Keepsakes.shared.prepDone(item.id)
            Button {
                Haptics.tap()
                open = true
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "checklist")
                        .font(.body.weight(.semibold))
                    Text("Bereid je voor")
                        .font(.subheadline.weight(.semibold))
                    Spacer(minLength: 8)
                    if ready {
                        Label("Klaar", systemImage: "checkmark")
                            .font(.subheadline.weight(.semibold))
                    } else {
                        Text("\(progress.done) van \(progress.total)")
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(Palette.muted)
                    }
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Palette.muted)
                }
                .foregroundStyle(Palette.grass)
                .padding(.horizontal, 16)
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(Palette.grassSoft, in: .capsule)
                .contentShape(.capsule)
            }
            .buttonStyle(.plain)
            .sheet(isPresented: $open) {
                MeetingPrepView(item: item, asOwner: asOwner)
                    .presentationDetents([.large])
            }
        }
    }
}
