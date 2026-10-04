import SwiftUI

/// What a rebook (or another step from Guus) fills in up front. The flow then opens on the last step.
struct RequestPrefill: Hashable {
    var date: Date
    var weekly: Bool
    var message: String?
}

/// Asking to walk a dog in three small steps, with the words already written: when, a short hello,
/// and the promise. The server keeps every rule (meet first, solo only with trust and the quiz,
/// at most five open requests); this only makes asking easy.
struct RequestFlow: View {
    enum Kind: String, Identifiable { case meet, solo; var id: String { rawValue } }

    let dog: DogFull
    let slots: [Slot]
    let kind: Kind
    /// The owner or shelter: named in the confirmation. A shelter dog is met on the shelter's
    /// location, during a walk (the server enforces this too).
    let host: Host
    let prefill: RequestPrefill?
    var sent: () async -> Void

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var typeSize

    @State private var step: Int
    @State private var moments: [RequestSuggestions.Moment] = []
    @State private var picked: Date?
    @State private var custom = false
    @State private var customDate: Date
    @State private var weekly: Bool
    @State private var message: String
    /// How a first meeting happens; after a first call, the app opens this flow on "Samen wandelen".
    @State private var via: MeetVia
    @State private var prepared = false
    @State private var busy = false
    @State private var error: String?
    @State private var outcome: Outcome?
    /// The confirmation comes in piece by piece: the paper plane, the text, then the three steps.
    @State private var shown = 0
    @State private var toLessons = false

    private struct Outcome: Equatable { var flagged: Bool }
    private static let steps = 3
    private static let maxMessage = 800

    init(dog: DogFull, slots: [Slot], kind: Kind, host: Host, via: MeetVia = .walk,
         prefill: RequestPrefill? = nil, sent: @escaping () async -> Void) {
        self.dog = dog
        self.slots = slots
        self.kind = kind
        self.host = host
        self.prefill = prefill
        self.sent = sent
        let calendar = Calendar.current
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: .now)
            .flatMap { calendar.date(bySettingHour: 18, minute: 0, second: 0, of: $0) } ?? .now.addingTimeInterval(86_400)
        _step = State(initialValue: prefill == nil ? 0 : Self.steps - 1)
        _picked = State(initialValue: prefill?.date)
        _customDate = State(initialValue: prefill?.date ?? tomorrow)
        _weekly = State(initialValue: kind == .solo && prefill?.weekly == true)
        _message = State(initialValue: prefill?.message ?? "")
        _via = State(initialValue: via)
    }

    private var range: ClosedRange<Date> { Date.now.addingTimeInterval(RequestSuggestions.lead)...Date.now.addingTimeInterval(RequestSuggestions.horizon) }
    private var when: Date? { custom ? customDate : picked }
    private var title: String { kind == .meet ? L("Kennismaken met \(dog.name)") : L("Rondje met \(dog.name)") }
    /// A shelter meets on its own location, during a walk; a solo walk is always a walk.
    private var choosesVia: Bool { kind == .meet && !host.isShelter }
    private var meetVia: MeetVia { choosesVia ? via : .walk }

    var body: some View {
        VStack(spacing: 0) {
            if let outcome {
                done(outcome)
                    .transition(.opacity)
            } else {
                flow
            }
        }
        .screenBackground()
        .sensoryFeedback(.selection, trigger: step)
        .onAppear(perform: prepare)
        .onDisappear(perform: finish)
        .onChange(of: message) { _, text in
            if text.count > Self.maxMessage { message = String(text.prefix(Self.maxMessage)) }
        }
    }

    // MARK: Steps

    @ViewBuilder
    private var flow: some View {
        HStack(spacing: 6) {
            ForEach(0..<Self.steps, id: \.self) { i in
                Capsule()
                    .fill(i <= step ? Palette.grass : Palette.line)
                    .frame(height: 5)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 16)
        .animation(Motion.klein, value: step)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L("Stap \(step + 1) van 3"))

        header

        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                switch step {
                case 0: whenStep
                case 1: introStep
                default: promiseStep
                }
                ErrorText(message: error)
            }
            .padding(24)
            .id(step)
            .transition(stepTransition)
        }
        .scrollDismissesKeyboard(.interactively)

        bottomBar
    }

    private var stepTransition: AnyTransition {
        reduceMotion ? .opacity : .asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .move(edge: .leading).combined(with: .opacity))
    }

    private var header: some View {
        HStack(spacing: 14) {
            DogPortrait(look: dog.look, photoURL: dog.photos.first.flatMap(URL.init(string:)), cornerRadius: 16)
                .frame(width: 56, height: 56)
                .accessibilityHidden(true)
            Text(title)
                .font(.display(20))
                .foregroundStyle(Palette.ink)
                .lineLimit(2)
                .accessibilityAddTraits(.isHeader)
            Spacer(minLength: 0)
            Button { dismiss() } label: {
                Image(systemName: "xmark")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Palette.muted)
                    .frame(width: 36, height: 36)
                    .background(Palette.sunken, in: .circle)
                    .frame(width: 44, height: 44)
                    .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Sluit")
        }
        .padding(.horizontal, 24)
        .padding(.top, 14)
    }

    /// Step 1: how to meet (for a first meeting), and a moment, from the dog's regular times when it has them.
    private var whenStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            if choosesVia {
                meetChoice
                    .padding(.bottom, 12)
            }
            Text("Wanneer?").font(.display(30))
            CoachBubble(
                mood: .curious,
                text: kind == .solo
                    ? L("Kies een moment dat je vaak kunt. Vaste momenten werken het best.")
                    : meetVia.inPerson ? L("Kies een moment. De eigenaar loopt de eerste keer mee.") : meetVia.hint
            )
            .padding(.bottom, 4)

            ForEach(moments, id: \.self) { moment in
                tile(
                    Format.when(moment.date),
                    caption: moment.fromSlot ? L("Vast moment van \(dog.name)") : nil,
                    symbol: moment.fromSlot ? "clock.fill" : "calendar",
                    selected: !custom && picked == moment.date
                ) { choose(moment) }
            }
            tile(L("Ander moment"), caption: custom ? Format.when(customDate) : nil, symbol: "calendar.badge.plus", selected: custom) {
                chooseOther()
            }
            if custom {
                Card {
                    DatePicker("Wanneer", selection: $customDate, in: range)
                        .environment(\.locale, Format.locale)
                        .tint(Palette.grass)
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
            if kind == .solo {
                Toggle(isOn: $weekly) {
                    Label {
                        Text("Elke week op dit moment").font(.headline).foregroundStyle(Palette.ink)
                    } icon: {
                        Image(systemName: "repeat").foregroundStyle(Palette.grass)
                    }
                }
                .tint(Palette.grass)
                .padding(.horizontal, 16)
                .frame(minHeight: 64)
                .background(Palette.surface, in: .rect(cornerRadius: 20, style: .continuous))
                .sensoryFeedback(.selection, trigger: weekly)
            }
        }
    }

    /// The four ways to meet the first time, with their icon and one line each (as on the website).
    private var meetChoice: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Hoe maken jullie kennis?").font(.display(30))
            ForEach(MeetVia.allCases) { option in
                tile(option.title, caption: via == option ? option.hint : nil, symbol: option.symbol, selected: via == option) {
                    Haptics.tap()
                    withAnimation(Motion.klein) { via = option }
                }
            }
            switch via {
            case .home:
                Label("Veilig op bezoek: spreek overdag af, laat iemand weten waar je bent, en familie of een buur mag er gerust bij zijn. Het adres en het telefoonnummer zie je pas na acceptatie.", systemImage: "shield.lefthalf.filled")
                    .font(.footnote).foregroundStyle(Palette.muted)
            case .phone:
                Label("Na acceptatie zien jullie elkaars telefoonnummer, als dat is ingevuld. Spreek in de chat af wie wie belt. Een gesprek telt nog niet als kennismaking in het echt.", systemImage: "phone.fill")
                    .font(.footnote).foregroundStyle(Palette.muted)
            case .video:
                Label("\(Brand.name) heeft zelf geen videobellen. Spreek in de chat af welke app jullie gebruiken en deel daar de link. Een gesprek telt nog niet als kennismaking in het echt.", systemImage: "video.fill")
                    .font(.footnote).foregroundStyle(Palette.muted)
            case .walk:
                EmptyView()
            }
        }
    }

    /// Step 2: a hello that is already written, with sentences to add in one tap.
    private var introStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Stel je voor").font(.display(30))
            TextField("Stel je kort voor", text: $message, axis: .vertical)
                .lineLimit(3...6)
                .padding(14)
                .background(Palette.surface, in: .rect(cornerRadius: 16, style: .continuous))
            Text("Tik om toe te voegen")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Palette.muted)
                .padding(.top, 4)
            FlowLayout(spacing: 8) {
                ForEach(RequestSuggestions.chips(kind: kind), id: \.self) { sentence in
                    chip(sentence)
                }
            }
            Text("Spreek geen geld af: \(Brand.name) is gratis. De eigenaar zorgt voor zakjes en koekjes.")
                .font(.footnote)
                .foregroundStyle(Palette.muted)
                .padding(.top, 4)
        }
    }

    /// Step 3: the code of conduct as three (or four) promises. The send button is the agreement.
    private var promiseStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            if prefill != nil { summary }
            Text("Afspraak is afspraak").font(.display(30))
            Card {
                promise("link", L("Altijd aan de lijn"))
                promise("fork.knife", L("Geen koekjes zonder toestemming"))
                promise("exclamationmark.bubble.fill", L("Meteen melden als er iets gebeurt"))
                if kind == .meet && meetVia.inPerson {
                    promise("person.text.rectangle", L("Neem je ID mee. De eigenaar bekijkt het."))
                }
            }
            Button { openURL(Brand.web("/legal/conduct")) } label: {
                Text("Lees de hele gedragscode")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Palette.grass)
                    .frame(minHeight: 44)
                    .contentShape(.rect)
            }
            .buttonStyle(.plain)
        }
    }

    /// With a prefill: what will be sent, with a way back to each part.
    private var summary: some View {
        Card {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    Label(when.map(Format.when) ?? "", systemImage: "calendar")
                        .font(.headline)
                    if choosesVia {
                        Label(via.title, systemImage: via.symbol)
                            .font(.subheadline)
                            .foregroundStyle(Palette.muted)
                    }
                    if kind == .solo && weekly {
                        Label("Elke week", systemImage: "repeat")
                            .font(.subheadline)
                            .foregroundStyle(Palette.muted)
                    }
                }
                Spacer(minLength: 0)
                edit(L("Moment aanpassen")) { go(to: 0) }
            }
            Divider()
            HStack(alignment: .top, spacing: 10) {
                Text(firstLine.isEmpty ? L("Nog geen bericht") : "“\(firstLine)”")
                    .font(.subheadline)
                    .italic(!firstLine.isEmpty)
                    .foregroundStyle(firstLine.isEmpty ? Palette.muted : Palette.ink)
                    .lineLimit(2)
                Spacer(minLength: 0)
                edit(L("Bericht aanpassen")) { go(to: 1) }
            }
        }
    }

    private var firstLine: String {
        message.split(whereSeparator: \.isNewline).first.map { String($0).trimmingCharacters(in: .whitespaces) } ?? ""
    }

    /// Side by side, or stacked at accessibility text sizes so the promise is never cut off.
    private var bottomBar: some View {
        let stacked = typeSize.isAccessibilitySize
        let layout = stacked ? AnyLayout(VStackLayout(spacing: 10)) : AnyLayout(HStackLayout(spacing: 12))
        return layout {
            if step > 0 {
                Button("Terug") { go(to: step - 1) }
                    .buttonStyle(.secondary)
                    .frame(maxWidth: stacked ? .infinity : 120)
                    .disabled(busy)
            }
            if step < Self.steps - 1 {
                Button("Verder") { go(to: step + 1) }
                    .buttonStyle(.primary)
                    .disabled(step == 0 && when == nil)
            } else {
                Button {
                    Task { await send() }
                } label: {
                    if busy {
                        ProgressView().tint(Palette.onGrass)
                    } else {
                        Text("Ik beloof het, verstuur")
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                            .minimumScaleFactor(0.85)
                    }
                }
                .buttonStyle(.primary)
                .disabled(busy || when == nil)
            }
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
    }

    // MARK: Done

    private var offersLessons: Bool {
        kind == .meet && model.me?.profile?.quizPassed != true && Keepsakes.shared.lessonsDone.count < 5
    }

    /// The sheet itself is the confirmation: no banner on top of it, and it stays until "Klaar".
    /// The text scrolls at large text sizes; "Klaar" stays pinned below it.
    private func done(_ outcome: Outcome) -> some View {
        ZStack(alignment: .top) {
            VStack(spacing: 16) {
                ScrollView {
                    doneText(outcome)
                        .padding(.vertical, 16)
                        .frame(maxWidth: .infinity)
                }
                .scrollBounceBehavior(.basedOnSize)
                .defaultScrollAnchor(.center, for: .alignment)
                Button("Klaar") { dismiss() }
                    .buttonStyle(.primary)
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            if !reduceMotion {
                Confetti(count: 24, duration: 1.6)
                    .frame(height: 360)
                    .frame(maxWidth: .infinity)
                    .allowsHitTesting(false)
            }
        }
        .task { await reveal() }
    }

    /// The owner's or shelter's name; "de eigenaar" when the server sent none.
    private var hostName: String {
        let name = host.name.trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? L("de eigenaar") : name
    }

    private var doneTitle: String {
        host.name.trimmingCharacters(in: .whitespaces).isEmpty ? L("Verstuurd!") : L("Verstuurd naar \(hostName).")
    }

    private var nextSteps: [String] { Self.nextSteps(kind: kind, via: meetVia, hostName: hostName, dogName: dog.name) }

    /// What happens now, in three steps. Only what is true for this kind of request: a solo walk
    /// needs no meeting, and after a call you still meet in person.
    static func nextSteps(kind: Kind, via: MeetVia, hostName: String, dogName: String) -> [String] {
        let who = hostName.prefix(1).uppercased() + hostName.dropFirst()
        let read = L("\(who) leest je bericht.")
        guard kind == .meet else {
            return [read, L("Zegt \(hostName) ja, dan staat het rondje vast."), L("Op de dag zelf start je het rondje bij Afspraken.")]
        }
        let together = switch via {
        case .walk: L("De eerste keer lopen jullie samen.")
        case .home: L("De eerste keer kom je langs bij \(hostName) en \(dogName).")
        case .phone, .video: L("Eerst bellen jullie. Daarna ontmoet je \(dogName) in het echt.")
        }
        return [read, L("Jullie spreken een moment af."), together]
    }

    private func doneText(_ outcome: Outcome) -> some View {
        VStack(spacing: 16) {
            ZStack(alignment: .bottomTrailing) {
                Guus(mood: .happy, size: typeSize.isAccessibilitySize ? 72 : 120)
                Image(systemName: "paperplane.fill")
                    .font(.headline)
                    .foregroundStyle(Palette.onBall)
                    .frame(width: 44, height: 44)
                    .background(Palette.ball, in: .circle)
                    .offset(x: 10, y: 6)
                    .scaleEffect(shown >= 1 || reduceMotion ? 1 : 0.6)
                    .opacity(shown >= 1 ? 1 : 0)
            }
            .accessibilityHidden(true)
            VStack(spacing: 8) {
                Text(doneTitle)
                    .font(.display(30))
                    .foregroundStyle(Palette.ink)
                    .multilineTextAlignment(.center)
                    .accessibilityAddTraits(.isHeader)
                if outcome.flagged {
                    Text("Verstuurd. Berichten over geld worden gecontroleerd.")
                        .font(.subheadline)
                        .foregroundStyle(Palette.warn)
                        .multilineTextAlignment(.center)
                }
            }
            .opacity(shown >= 2 ? 1 : 0)
            .offset(y: shown >= 2 || reduceMotion ? 0 : 8)
            VStack(alignment: .leading, spacing: 12) {
                Text("Wat er nu gebeurt")
                    .font(.headline)
                    .foregroundStyle(Palette.ink)
                    .opacity(shown >= 2 ? 1 : 0)
                ForEach(Array(nextSteps.enumerated()), id: \.offset) { i, line in
                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text(verbatim: "\(i + 1)")
                            .font(.subheadline.weight(.heavy))
                            .foregroundStyle(Palette.onBall)
                            .frame(width: 28, height: 28)
                            .background(Palette.ball, in: .circle)
                            .accessibilityHidden(true)
                        Text(line)
                            .font(.body)
                            .foregroundStyle(Palette.ink)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 0)
                    }
                    .opacity(shown >= 3 + i ? 1 : 0)
                    .offset(y: shown >= 3 + i || reduceMotion ? 0 : 6)
                }
                Text("Je krijgt een melding zodra \(hostName) antwoordt.")
                    .font(.subheadline)
                    .foregroundStyle(Palette.muted)
                    .padding(.top, 2)
                    .opacity(shown >= 3 + nextSteps.count ? 1 : 0)
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
            if offersLessons {
                VStack(spacing: 12) {
                    Text("Intussen kun je de Hondenschool doen. Vijf lessen van 2 minuten.")
                        .font(.subheadline)
                        .foregroundStyle(Palette.ink)
                        .multilineTextAlignment(.center)
                    Button("Naar de Hondenschool") {
                        toLessons = true
                        dismiss()
                    }
                    .buttonStyle(.secondary)
                }
                .padding(16)
                .background(Palette.surface, in: .rect(cornerRadius: 20, style: .continuous))
                .padding(.top, 8)
                .opacity(shown >= 3 + nextSteps.count ? 1 : 0)
            }
        }
    }

    /// The paper plane pops (500 ms), the text follows 150 ms later, then the steps one by one,
    /// 80 ms apart. With Reduce Motion everything fades in together in 200 ms.
    private func reveal() async {
        guard shown == 0 else { return }
        let last = 3 + nextSteps.count
        if reduceMotion {
            withAnimation(Motion.vervaag) { shown = last }
            return
        }
        withAnimation(Motion.pop) { shown = 1 }
        try? await Task.sleep(for: .milliseconds(150))
        withAnimation(Motion.scherm) { shown = 2 }
        for next in 3...last {
            try? await Task.sleep(for: .milliseconds(80))
            guard !Task.isCancelled else { return }
            withAnimation(Motion.klein) { shown = next }
        }
    }

    // MARK: Pieces

    private func tile(_ title: String, caption: String?, symbol: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: symbol)
                    .font(.title3)
                    .frame(width: 44, height: 44)
                    .background(selected ? Palette.grass : Palette.sunken, in: .rect(cornerRadius: 14, style: .continuous))
                    .foregroundStyle(selected ? Palette.onGrass : Palette.ink)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.headline).foregroundStyle(Palette.ink)
                    if let caption {
                        Text(caption).font(.subheadline).foregroundStyle(Palette.muted)
                    }
                }
                .multilineTextAlignment(.leading)
                Spacer(minLength: 0)
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(selected ? Palette.grass : Palette.line)
                    .contentTransition(.symbolEffect(.replace))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
            .background(Palette.surface, in: .rect(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(selected ? Palette.grass : .clear, lineWidth: 2))
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
        .animation(Motion.klein, value: selected)
    }

    private func chip(_ sentence: String) -> some View {
        let used = message.contains(sentence)
        return Button { toggle(sentence) } label: {
            HStack(spacing: 5) {
                if used { Image(systemName: "checkmark").imageScale(.small) }
                Text(sentence)
            }
            .font(.subheadline.weight(.semibold))
            .padding(.horizontal, 12)
            .frame(minHeight: 36)
            .foregroundStyle(used ? Palette.onGrass : Palette.grass)
            .background(used ? Palette.grass : Palette.grassSoft, in: .capsule)
            // The chip looks 36pt tall, but the tap area is 44pt.
            .frame(minHeight: 44)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(used ? .isSelected : [])
    }

    private func promise(_ symbol: String, _ text: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: symbol)
                .font(.headline)
                .foregroundStyle(Palette.onBall)
                .frame(width: 44, height: 44)
                .background(Palette.ball, in: .circle)
                .accessibilityHidden(true)
            Text(text)
                .font(.body.weight(.semibold))
                .foregroundStyle(Palette.ink)
            Spacer(minLength: 0)
        }
    }

    private func edit(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text("Aanpassen")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Palette.grass)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(.rect)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    // MARK: Actions

    private func prepare() {
        guard !prepared else { return }
        prepared = true
        let calendar = Calendar.current
        var list = RequestSuggestions.moments(slots: slots, now: .now, calendar: calendar)
        if let date = prefill?.date, !list.contains(where: { $0.date == date }) {
            list.append(.init(date: date, fromSlot: RequestSuggestions.isSlot(date, slots: slots, calendar: calendar)))
            list.sort { $0.date < $1.date }
        }
        moments = list
        if prefill?.message == nil, message.isEmpty {
            let profile = model.me?.profile
            message = RequestSuggestions.intro(
                firstName: profile?.firstName ?? model.firstName, city: profile?.city ?? "",
                experience: profile?.experience ?? "some", dogName: dog.name, kind: kind
            )
        }
    }

    private func go(to target: Int) {
        withAnimation(Motion.or(Motion.scherm, reduce: reduceMotion)) {
            step = max(0, min(Self.steps - 1, target))
            error = nil
        }
    }

    private func choose(_ moment: RequestSuggestions.Moment) {
        withAnimation(Motion.klein) {
            custom = false
            picked = moment.date
            weekly = kind == .solo && (moment.fromSlot || prefill?.weekly == true)
        }
    }

    private func chooseOther() {
        withAnimation(Motion.klein) {
            custom = true
            customDate = min(max(customDate, range.lowerBound), range.upperBound)
            weekly = kind == .solo && prefill?.weekly == true
        }
    }

    /// Adds the sentence with a space, or takes it out again when it is already in.
    private func toggle(_ sentence: String) {
        Haptics.tap()
        withAnimation(Motion.klein) {
            var text = message
            if let range = text.range(of: " " + sentence) ?? text.range(of: sentence + " ") ?? text.range(of: sentence) {
                text.removeSubrange(range)
            } else {
                let base = text.trimmingCharacters(in: .whitespacesAndNewlines)
                text = base.isEmpty ? sentence : base + " " + sentence
            }
            message = text.trimmingCharacters(in: .whitespacesAndNewlines)
        }
    }

    private struct Payload: Encodable {
        var dogId, kind, meetVia, date, time, message: String
        /// Only for solo walks; a first meeting is never weekly.
        var weekly: Bool?
    }

    private func send() async {
        guard let when, !busy else { return }
        busy = true
        defer { busy = false }
        // The server works in Dutch time (Europe/Amsterdam), like the website.
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Europe/Amsterdam") ?? .current
        let c = cal.dateComponents([.year, .month, .day, .hour, .minute], from: when)
        let date = String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
        let time = String(format: "%02d:%02d", c.hour ?? 0, c.minute ?? 0)
        struct Sent: Decodable { var ok: Bool; var flagged: Bool }
        do {
            let payload = Payload(dogId: dog.id, kind: kind.rawValue, meetVia: meetVia.rawValue, date: date, time: time,
                                  message: message.trimmingCharacters(in: .whitespacesAndNewlines),
                                  weekly: kind == .solo ? weekly : nil)
            let result: Sent = try await APIClient.shared.post("/api/v1/requests", payload)
            // Felt and heard together with the paper plane (send, 420 ms).
            Haptics.success(.send)
            withAnimation(Motion.or(Motion.scherm, reduce: reduceMotion)) { outcome = Outcome(flagged: result.flagged) }
            AccessibilityNotification.Announcement(doneTitle).post()
            await model.refreshAppointments()
            await sent()
        } catch {
            Haptics.error()
            withAnimation(Motion.or(Motion.klein, reduce: reduceMotion)) { self.error = error.plainText }
        }
    }

    /// After the sheet closes on the done screen: ask about notifications (as before), and open the
    /// Hondenschool when that was the choice.
    private func finish() {
        guard outcome != nil else { return }
        let lessons = toLessons
        let model = model
        Task {
            if lessons {
                // Let this sheet finish closing before the next one opens.
                try? await Task.sleep(for: .milliseconds(450))
                model.perform(.lessons)
            }
            await Reminders.askIfNeeded()
        }
    }
}
