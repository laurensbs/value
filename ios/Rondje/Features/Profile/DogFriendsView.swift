import SwiftUI

/// "Hondenvriendenboek": every dog you walked with, like pages in a friendship book.
/// The more walks together, the more the friendship grows (a gentle label, not a score to chase).
struct DogFriendsView: View {
    @State private var friends: [DogFriend] = []
    @State private var loaded = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if loaded && friends.isEmpty {
                    EmptyState(symbol: "book.fill", title: L("Je vriendenboek is nog leeg"),
                               text: L("Na je eerste rondje krijgt de hond hier een eigen pagina."))
                } else if !friends.isEmpty {
                    summary
                }
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)], spacing: 14) {
                    ForEach(Array(friends.enumerated()), id: \.element.id) { index, friend in
                        NavigationLink(value: friend.id) { page(friend) }
                            .buttonStyle(.plain)
                            .appear(index)
                    }
                }
            }
            .padding(20)
        }
        .screenBackground()
        .navigationTitle("Hondenvriendenboek")
        .navigationDestination(for: String.self) { DogDetailView(dogId: $0, preview: nil) }
        .task {
            if let r: DogFriendsResponse = try? await APIClient.shared.get("/api/v1/me/dogs") { withAnimation { friends = r.dogs } }
            loaded = true
        }
    }

    private var summary: some View {
        let walks = friends.reduce(0) { $0 + $1.walks }
        let meters = friends.reduce(0) { $0 + $1.meters }
        return HStack(spacing: 10) {
            stat("\(friends.count)", friends.count == 1 ? L("hondenvriend") : L("hondenvrienden"))
            stat("\(walks)", walks == 1 ? L("rondje") : L("rondjes"))
            stat(Format.distance(Double(meters)), L("samen gelopen"))
        }
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.display(20)).minimumScaleFactor(0.7).lineLimit(1)
            Text(label).font(.caption).foregroundStyle(Palette.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Palette.surface, in: .rect(cornerRadius: 18, style: .continuous))
    }

    private func page(_ f: DogFriend) -> some View {
        let bond = Self.bond(f.walks)
        return VStack(alignment: .leading, spacing: 8) {
            DogPortrait(look: f.look, photoURL: f.photos.first.flatMap(URL.init(string:)), cornerRadius: 20)
                .frame(height: 130)
                .overlay(alignment: .topTrailing) {
                    Text("\(f.walks)×")
                        .font(.caption.weight(.heavy))
                        .foregroundStyle(Palette.onBall)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(Palette.ball, in: .capsule)
                        .padding(8)
                }
            Text(f.name).font(.headline).foregroundStyle(Palette.ink)
            Label(bond.0, systemImage: bond.1)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Palette.grass)
            if let first = f.firstAt {
                Text("Sinds \(first.formatted(.dateTime.month(.wide).year().locale(Format.locale)))")
                    .font(.caption2).foregroundStyle(Palette.muted)
            }
        }
        .padding(10)
        .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    /// How close you are with a dog, by walks together.
    nonisolated static func bond(_ walks: Int) -> (String, String) {
        switch walks {
        case ..<2: (L("Net kennisgemaakt"), "hand.wave.fill")
        case 2..<5: (L("Wandelmaatjes"), "figure.walk")
        case 5..<10: (L("Goede vrienden"), "heart.fill")
        default: (L("Beste vrienden"), "star.fill")
        }
    }
}
