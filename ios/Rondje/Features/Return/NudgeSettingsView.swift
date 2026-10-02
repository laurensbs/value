import SwiftUI
import UserNotifications

/// "Seintjes": calm reminders on moments the person picks, planned on the phone itself.
/// Off by default, at most three a week, with a pause and a clear view of the next one.
struct NudgeSettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL
    @State private var settings = Nudges.settings
    @State private var denied = false
    @State private var customTime = false

    private struct Preset: Identifiable {
        var title: String
        var hour: Int
        var minute: Int
        var id: String { title }
    }

    private var presets: [Preset] {
        [
            Preset(title: L("Ochtend 9:00"), hour: 9, minute: 0),
            Preset(title: L("Middag 13:00"), hour: 13, minute: 0),
            Preset(title: L("Avond 18:30"), hour: 18, minute: 30),
        ]
    }

    private var dayNames: [String] { [L("Ma"), L("Di"), L("Wo"), L("Do"), L("Vr"), L("Za"), L("Zo")] }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                CoachBubble(mood: .calm, text: L("Ik stuur je alleen een seintje op een moment dat jij kiest. Hooguit zo vaak als jij wilt."))

                Card {
                    Toggle(isOn: Binding(get: { settings.enabled }, set: { toggle($0) })) {
                        Text("Seintjes van Guus").font(.headline)
                    }
                    .tint(Palette.grass)
                    if denied {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Meldingen staan uit in Instellingen.")
                                .font(.subheadline)
                                .foregroundStyle(Palette.muted)
                            Button("Open Instellingen") {
                                if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                            }
                            .buttonStyle(.secondary)
                        }
                    }
                }

                if settings.enabled {
                    Card { days }
                    Card { time }
                    Card { often }
                    Card { pause }
                }

                Label(nextLine, systemImage: "bell.badge")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.grass)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text("Seintjes worden op je telefoon ingepland. Er gaat niets via een server. Afspraak-herinneringen tellen niet mee.")
                    .font(.footnote)
                    .foregroundStyle(Palette.muted)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .animation(.smooth, value: settings.enabled)
        }
        .screenBackground()
        .navigationTitle("Seintjes")
        .navigationBarTitleDisplayMode(.inline)
        .task { await checkPermission() }
        .onChange(of: settings) { _, new in
            guard new.choices != Nudges.settings.choices else { return }
            Nudges.update { stored in
                let delivered = stored.delivered
                stored = new
                stored.delivered = delivered
            }
            Task { await Nudges.reschedule(appointments: model.appointments) }
        }
        .onChange(of: Nudges.settings) { _, stored in
            // A notification action ("Minder seintjes") or the back-off changed them meanwhile.
            if stored.choices != settings.choices { settings = stored }
        }
    }

    // MARK: Sections

    private var days: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Op welke dagen?").font(.headline)
            Text("Kies er hooguit drie.").font(.subheadline).foregroundStyle(Palette.muted)
            HStack(spacing: 6) {
                ForEach(1...7, id: \.self) { day in
                    let on = settings.days.contains(day)
                    Button {
                        tapDay(day)
                    } label: {
                        Text(dayNames[day - 1])
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .foregroundStyle(on ? Palette.onGrass : Palette.ink)
                            .background(on ? Palette.grass : Palette.sunken, in: .capsule)
                            .contentShape(.capsule)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Calendar.current.weekdaySymbols[day % 7])
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
        }
    }

    private var time: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Hoe laat?").font(.headline)
            FlowChips {
                ForEach(presets) { preset in
                    choice(preset.title, on: !customTime && settings.hour == preset.hour && settings.minute == preset.minute) {
                        customTime = false
                        settings.hour = preset.hour
                        settings.minute = preset.minute
                    }
                }
                choice(L("Ander tijdstip"), on: customTime || !presets.contains { $0.hour == settings.hour && $0.minute == settings.minute }) {
                    customTime = true
                }
            }
            if customTime {
                DatePicker("Tijdstip", selection: timeBinding, in: timeRange, displayedComponents: .hourAndMinute)
                    .tint(Palette.grass)
            }
            Text("Tussen half tien 's avonds en half negen 's ochtends stuurt Guus nooit iets.")
                .font(.footnote)
                .foregroundStyle(Palette.muted)
        }
    }

    private var often: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Hooguit 1, 2 of 3 per week").font(.headline)
            Picker("Hooguit 1, 2 of 3 per week", selection: $settings.perWeek) {
                ForEach(1...3, id: \.self) { Text(verbatim: "\($0)").tag($0) }
            }
            .pickerStyle(.segmented)
        }
    }

    @ViewBuilder
    private var pause: some View {
        if settings.isPaused(), let until = settings.pausedUntil {
            HStack {
                Label(pausedText(until), systemImage: "pause.circle.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.ink)
                Spacer()
                Button("Hervat") {
                    Haptics.tap()
                    settings.pausedUntil = nil
                }
                .font(.subheadline.weight(.semibold))
                .frame(minHeight: 44)
            }
        } else {
            Menu {
                Button("1 week") { pauseFor(days: 7) }
                Button("2 weken") { pauseFor(days: 14) }
                Button("Tot ik ze weer aanzet") { settings.pausedUntil = .distantFuture }
            } label: {
                Label("Even pauze", systemImage: "pause.circle")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            }
        }
    }

    private func choice(_ title: String, on: Bool, action: @escaping () -> Void) -> some View {
        Button {
            Haptics.tap()
            action()
        } label: {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 14)
                .frame(minHeight: 44)
                .foregroundStyle(on ? Palette.onGrass : Palette.ink)
                .background(on ? Palette.grass : Palette.sunken, in: .capsule)
                .contentShape(.capsule)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }

    // MARK: Logic

    private var nextLine: String {
        let next = Nudges.plan(settings, outgoing: model.appointments.outgoing, now: .now, calendar: .current).first
        guard let next, !settings.isPaused() else {
            if settings.enabled, settings.days.isEmpty { return L("Kies een dag, dan plant Guus een seintje.") }
            return L("Er staat geen seintje gepland. Je hebt al een afspraak deze week, of je seintjes staan uit.")
        }
        let day = next.formatted(.dateTime.weekday(.wide).locale(Format.locale))
        let time = next.formatted(.dateTime.hour(.twoDigits(amPM: .omitted)).minute(.twoDigits).locale(Format.locale))
        return L("Volgende seintje: \(day) \(time)")
    }

    private func pausedText(_ until: Date) -> String {
        if until > .now.addingTimeInterval(365 * 86_400) { return L("Gepauzeerd tot je ze weer aanzet") }
        return L("Gepauzeerd tot \(until.formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Format.locale)))")
    }

    private func pauseFor(days: Int) {
        Haptics.tap()
        settings.pausedUntil = Calendar.current.date(byAdding: .day, value: days, to: .now)
    }

    private func tapDay(_ day: Int) {
        if let i = settings.days.firstIndex(of: day) {
            Haptics.tap()
            settings.days.remove(at: i)
        } else if settings.days.count < 3 {
            Haptics.tap()
            settings.days.append(day)
            settings.days.sort()
        } else {
            Haptics.soft()
        }
    }

    private func toggle(_ on: Bool) {
        Haptics.tap()
        settings.enabled = on
        if on {
            settings.offered = true
            settings.stoppedByGuus = false
            settings.ignored = 0
            Task {
                await Reminders.askIfNeeded()
                await checkPermission()
                // Permission may have just been given: plan again now that it is allowed.
                await Nudges.reschedule(appointments: model.appointments)
            }
        }
    }

    private func checkPermission() async {
        denied = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus == .denied
    }

    private var timeRange: ClosedRange<Date> {
        let calendar = Calendar.current
        let today = Date.now
        let start = calendar.date(bySettingHour: Nudges.earliest / 60, minute: Nudges.earliest % 60, second: 0, of: today) ?? today
        let end = calendar.date(bySettingHour: Nudges.latest / 60, minute: Nudges.latest % 60, second: 0, of: today) ?? today
        return start...end
    }

    private var timeBinding: Binding<Date> {
        Binding {
            Calendar.current.date(bySettingHour: settings.hour, minute: settings.minute, second: 0, of: .now) ?? .now
        } set: { date in
            let c = Calendar.current.dateComponents([.hour, .minute], from: date)
            let minutes = min(max((c.hour ?? 18) * 60 + (c.minute ?? 30), Nudges.earliest), Nudges.latest)
            settings.hour = minutes / 60
            settings.minute = minutes % 60
        }
    }
}

/// Chips that wrap onto the next line when they do not fit.
private struct FlowChips: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let rows = arrange(width: proposal.width ?? .infinity, subviews: subviews)
        let height = rows.map(\.height).reduce(0, +) + spacing * CGFloat(max(0, rows.count - 1))
        let width = rows.map(\.width).max() ?? 0
        return CGSize(width: proposal.width ?? width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in arrange(width: bounds.width, subviews: subviews) {
            var x = bounds.minX
            for index in row.items {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
                x += size.width + spacing
            }
            y += row.height + spacing
        }
    }

    private struct Row { var items: [Int] = []; var width: CGFloat = 0; var height: CGFloat = 0 }

    private func arrange(width: CGFloat, subviews: Subviews) -> [Row] {
        var rows: [Row] = [Row()]
        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            let extra = rows[rows.count - 1].items.isEmpty ? size.width : size.width + spacing
            if rows[rows.count - 1].width + extra > width, !rows[rows.count - 1].items.isEmpty {
                rows.append(Row())
            }
            let isFirst = rows[rows.count - 1].items.isEmpty
            rows[rows.count - 1].items.append(index)
            rows[rows.count - 1].width += isFirst ? size.width : size.width + spacing
            rows[rows.count - 1].height = max(rows[rows.count - 1].height, size.height)
        }
        return rows
    }
}
