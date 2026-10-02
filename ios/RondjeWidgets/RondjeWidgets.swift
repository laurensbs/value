import ActivityKit
import SwiftUI
import WidgetKit

@main
struct RondjeWidgetBundle: WidgetBundle {
    var body: some Widget {
        NextWalkWidget()
        WalkLiveActivity()
    }
}

// MARK: Next walk on the Home Screen

struct NextWalkEntry: TimelineEntry {
    let date: Date
    let next: NextWalkSnapshot?
}

struct NextWalkProvider: TimelineProvider {
    func placeholder(in context: Context) -> NextWalkEntry {
        NextWalkEntry(date: .now, next: NextWalkSnapshot(dogName: "Saar", startsAt: .now.addingTimeInterval(3600 * 20), kind: "solo", city: "Utrecht", look: .sample))
    }

    func getSnapshot(in context: Context, completion: @escaping (NextWalkEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : NextWalkEntry(date: .now, next: SharedStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NextWalkEntry>) -> Void) {
        let next = SharedStore.load()
        // Refresh after the appointment, so a past walk disappears by itself.
        let refresh = next.map { $0.startsAt.addingTimeInterval(2 * 3600) } ?? .now.addingTimeInterval(6 * 3600)
        completion(Timeline(entries: [NextWalkEntry(date: .now, next: next)], policy: .after(refresh)))
    }
}

struct NextWalkWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NextWalk", provider: NextWalkProvider()) { entry in
            NextWalkView(entry: entry)
                .containerBackground(for: .widget) { Palette.paper }
        }
        .configurationDisplayName("Volgende rondje")
        .description("Met welke hond je straks gaat wandelen.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

struct NextWalkView: View {
    let entry: NextWalkEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        if let next = entry.next {
            switch family {
            case .accessoryRectangular:
                VStack(alignment: .leading) {
                    Label(next.dogName, systemImage: "pawprint.fill").font(.headline)
                    Text(next.startsAt, style: .relative)
                }
            case .systemMedium:
                HStack(spacing: 14) {
                    portrait(next).frame(width: 110, height: 110)
                    details(next)
                    Spacer(minLength: 0)
                }
            default:
                VStack(alignment: .leading, spacing: 6) {
                    portrait(next).frame(width: 56, height: 56)
                    Spacer(minLength: 0)
                    details(next)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        } else {
            VStack(alignment: .leading, spacing: 6) {
                Image(systemName: "pawprint.fill").font(.title2).foregroundStyle(Palette.grass)
                Spacer(minLength: 0)
                Text("Geen rondje gepland").font(.headline).foregroundStyle(Palette.ink)
                Text("Zoek een hond in de app.").font(.caption).foregroundStyle(Palette.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func portrait(_ next: NextWalkSnapshot) -> some View {
        ZStack {
            Color(css: next.look.tile ?? "#f6ebcf")
            DogFace(look: next.look).padding(4)
        }
        .clipShape(.rect(cornerRadius: 18, style: .continuous))
    }

    private func details(_ next: NextWalkSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(next.kind == "meet" ? L("Kennismaken") : L("Rondje")).font(.caption.weight(.semibold)).foregroundStyle(Palette.grass)
            Text(next.dogName).font(.system(.title3, design: .rounded).weight(.bold)).foregroundStyle(Palette.ink)
            Text(next.startsAt, format: .dateTime.weekday(.abbreviated).hour().minute())
                .font(.caption).foregroundStyle(Palette.muted)
                .environment(\.locale, Locale.autoupdatingCurrent)
        }
    }
}

// MARK: Live Activity during a walk

struct WalkLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WalkActivityAttributes.self) { context in
            HStack(spacing: 14) {
                ZStack {
                    Color(css: context.attributes.look.tile ?? "#f6ebcf")
                    DogFace(look: context.attributes.look).padding(3)
                }
                .frame(width: 56, height: 56)
                .clipShape(.rect(cornerRadius: 16, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Rondje met \(context.attributes.dogName)").font(.headline)
                    Text(context.state.overdue ? L("Over tijd: laat even iets weten") : L("De eigenaar kijkt mee"))
                        .font(.caption)
                        .foregroundStyle(context.state.overdue ? Palette.warn : .secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(context.attributes.startedAt, style: .timer)
                        .font(.system(.title3, design: .rounded).weight(.bold).monospacedDigit())
                        .multilineTextAlignment(.trailing)
                    Text(distance(context.state.distanceM)).font(.caption.monospacedDigit())
                }
            }
            .padding(16)
            .activityBackgroundTint(Palette.paper)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(context.attributes.dogName, systemImage: "pawprint.fill").font(.headline)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.startedAt, style: .timer).monospacedDigit().frame(width: 70)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(distance(context.state.distanceM) + L(" gelopen")).font(.caption)
                }
            } compactLeading: {
                Image(systemName: "pawprint.fill").foregroundStyle(Palette.ball)
            } compactTrailing: {
                Text(context.attributes.startedAt, style: .timer).monospacedDigit().frame(width: 44)
            } minimal: {
                Image(systemName: "pawprint.fill").foregroundStyle(Palette.ball)
            }
        }
    }

    private func distance(_ m: Int) -> String {
        m < 1000 ? L("\(m) m") : String(format: L("%.1f km"), Double(m) / 1000).replacingOccurrences(of: ".", with: ",")
    }
}
