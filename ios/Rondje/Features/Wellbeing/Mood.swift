import SwiftUI

/// "Hoe voel je je?" before and after a walk. Stays on this phone only (the website promises the same):
/// it is for the walker, not for Rondje, and never leaves the device.
enum MoodStore {
    struct Entry: Codable { var walkId: String; var before: Int?; var after: Int?; var date: Date }
    private static let key = "moods"

    static var entries: [Entry] {
        guard let data = UserDefaults.standard.data(forKey: key) else { return [] }
        return (try? JSONDecoder().decode([Entry].self, from: data)) ?? []
    }

    static func set(walkId: String, before: Int? = nil, after: Int? = nil) {
        var all = entries
        if let i = all.firstIndex(where: { $0.walkId == walkId }) {
            if let before { all[i].before = before }
            if let after { all[i].after = after }
        } else {
            all.append(Entry(walkId: walkId, before: before, after: after, date: .now))
        }
        if let data = try? JSONEncoder().encode(all.suffix(200)) { UserDefaults.standard.set(data, forKey: key) }
    }

    static func entry(_ walkId: String) -> Entry? { entries.first { $0.walkId == walkId } }

    /// How much better (on a 1–5 scale) walks made the walker feel on average, when there is enough to say.
    static var averageLift: Double? {
        let pairs = entries.compactMap { e -> Double? in
            guard let b = e.before, let a = e.after else { return nil }
            return Double(a - b)
        }
        guard pairs.count >= 2 else { return nil }
        return pairs.reduce(0, +) / Double(pairs.count)
    }

    static func clear() { UserDefaults.standard.removeObject(forKey: key) }
}

/// Five faces from "zwaar" to "top". Big targets, a soft haptic, no wrong answer.
struct MoodPicker: View {
    let title: String
    var selected: Int?
    var picked: (Int) -> Void

    static let faces = ["😞", "😕", "😐", "🙂", "😄"]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.subheadline.weight(.semibold))
            HStack(spacing: 8) {
                ForEach(1...5, id: \.self) { value in
                    Button {
                        Haptics.soft()
                        picked(value)
                    } label: {
                        Text(Self.faces[value - 1])
                            .font(.system(size: 30))
                            .frame(maxWidth: .infinity, minHeight: 52)
                            .background(selected == value ? Palette.ball : Palette.surface.opacity(0.85), in: .rect(cornerRadius: 16, style: .continuous))
                            .scaleEffect(selected == value ? 1.08 : 1)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Self.label(value))
                }
            }
            .animation(.spring(duration: 0.3, bounce: 0.5), value: selected)
        }
    }

    static func label(_ value: Int) -> String {
        [L("Zwaar"), L("Niet zo goed"), L("Gewoon"), L("Goed"), L("Top")][max(0, min(4, value - 1))]
    }
}
