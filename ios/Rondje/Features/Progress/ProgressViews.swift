import SwiftUI

/// Loads progress once and keeps it for the home screens and the badge page.
@MainActor
@Observable
final class ProgressStore {
    static let shared = ProgressStore()
    var progress: Progress?
    var challenges: Challenges?
    /// Set when the server says there is a new level to celebrate.
    var celebrate: Progress?

    func load() async {
        if let p: Progress = try? await APIClient.shared.get("/api/v1/progress") {
            withAnimation(.smooth) { progress = p }
            if p.levelUp || !(p.newAwards ?? []).isEmpty { celebrate = p }
        }
        if let c: Challenges = try? await APIClient.shared.get("/api/v1/challenges") {
            withAnimation(.smooth) { challenges = c }
        }
    }

    func seen() async {
        guard let level = celebrate?.level.number else { return }
        celebrate = nil
        let _: OK? = try? await APIClient.shared.post("/api/v1/progress/seen", ["level": level])
    }
}

/// The level ring: where you are and how far to the next level. Tap for badges.
struct LevelCard: View {
    let progress: Progress

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle().stroke(Palette.onGrass.opacity(0.2), lineWidth: 8)
                Circle().trim(from: 0, to: max(0.02, progress.level.progress))
                    .stroke(Palette.ball, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(progress.level.number)").font(.display(26, weight: .heavy)).foregroundStyle(Palette.onGrass)
            }
            .frame(width: 66, height: 66)
            .animation(.spring(duration: 0.8), value: progress.level.progress)
            VStack(alignment: .leading, spacing: 3) {
                Text(progress.level.name).font(.headline).foregroundStyle(Palette.onGrass)
                if let next = progress.level.next, let nextName = progress.level.nextName {
                    Text("Nog \(max(0, next - progress.points)) punten tot \(nextName)")
                        .font(.subheadline).foregroundStyle(Palette.onGrass.opacity(0.85))
                } else {
                    Text("Hoogste niveau. Wat een rondjes!").font(.subheadline).foregroundStyle(Palette.onGrass.opacity(0.85))
                }
                let earned = progress.badges.filter { $0.tier > 0 }.count
                Label("\(earned) badges", systemImage: "rosette").font(.caption.weight(.semibold)).foregroundStyle(Palette.ball)
            }
            Spacer()
            Image(systemName: "chevron.right").foregroundStyle(Palette.onGrass.opacity(0.7))
        }
        .padding(16)
        .background(LinearGradient(colors: [Palette.walkBackground, Palette.grass], startPoint: .topLeading, endPoint: .bottomTrailing),
                    in: .rect(cornerRadius: 24, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

/// "Utrecht loopt 50 rondjes in oktober": a shared goal, only totals, never who walked.
struct ChallengeCard: View {
    let challenges: Challenges

    var body: some View {
        let goal = challenges.city ?? challenges.all
        let fraction = min(1, Double(goal.walks) / Double(max(1, goal.goal)))
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Label("Samen deze maand", systemImage: "person.3.fill").font(.caption.weight(.bold)).foregroundStyle(Palette.calm)
                Spacer()
                if let days = challenges.daysLeft { Text("Nog \(days) dagen").font(.caption).foregroundStyle(Palette.muted) }
            }
            Text(goal.title).font(.headline)
            ProgressView(value: fraction).tint(goal.done ? Palette.grass : Palette.calm)
                .animation(.spring, value: fraction)
            HStack {
                Text(goal.progressText ?? "\(goal.walks) / \(goal.goal)").font(.subheadline.weight(.semibold))
                Spacer()
                if let mine = goal.mine, mine > 0 {
                    Label("\(mine) van jou", systemImage: "heart.fill").font(.caption.weight(.semibold)).foregroundStyle(Palette.grass)
                }
            }
            if let stats = goal.statsText { Text(stats).font(.footnote).foregroundStyle(Palette.muted) }
            if goal.done {
                Label("Gehaald! Dank je wel, allemaal.", systemImage: "party.popper.fill").font(.subheadline.weight(.bold)).foregroundStyle(Palette.grass)
            }
        }
        .padding(18)
        .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
    }
}

/// All badges, earned ones in colour; each shows what the next step is.
struct BadgesView: View {
    @State private var store = ProgressStore.shared
    @Environment(AppModel.self) private var model
    @State private var goal: Int?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let p = store.progress {
                    LevelCard(progress: p)
                    weekGoal(p)
                    SectionTitle(title: L("Badges"), subtitle: L("Alleen voor jezelf. Ze geven geen voorrang."))
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                        ForEach(p.badges) { badge($0) }
                    }
                    if let recent = p.recent, !recent.isEmpty {
                        SectionTitle(title: L("Laatst verdiend"))
                        ForEach(Array(recent.prefix(8).enumerated()), id: \.offset) { _, r in
                            HStack {
                                Text(r.label).font(.subheadline)
                                Spacer()
                                Text("+\(r.points)").font(.subheadline.weight(.bold)).foregroundStyle(Palette.grass)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                } else {
                    ProgressView().frame(maxWidth: .infinity).padding(40)
                }
            }
            .padding(20)
        }
        .screenBackground()
        .navigationTitle("Jouw niveau")
        .task {
            await store.load()
            goal = store.progress?.week?.goal
        }
    }

    private func badge(_ b: Progress.Badge) -> some View {
        let earned = b.tier > 0
        return VStack(spacing: 6) {
            Image(systemName: Self.symbol(b))
                .font(.title2)
                .foregroundStyle(earned ? Palette.onBall : Palette.muted)
                .frame(width: 60, height: 60)
                .background(earned ? Self.tint(b.color) : Palette.sunken, in: .circle)
                .overlay(alignment: .topTrailing) {
                    if b.new == true { Circle().fill(Palette.danger).frame(width: 12, height: 12) }
                }
            Text(b.title ?? b.name).font(.caption.weight(.semibold)).multilineTextAlignment(.center).lineLimit(2)
            if let next = b.next {
                ProgressView(value: Double(b.value), total: Double(next)).tint(Palette.grass).frame(width: 56)
            }
        }
        .frame(maxWidth: .infinity)
        .opacity(earned ? 1 : 0.75)
        .accessibilityElement(children: .combine)
        .accessibilityHint(b.hint ?? "")
    }

    private func weekGoal(_ p: Progress) -> some View {
        Card {
            HStack {
                Text("Weekdoel").font(.headline)
                Spacer()
                if let w = p.week, let g = w.goal {
                    Text("\(w.walks) van \(g) deze week").font(.subheadline).foregroundStyle(Palette.muted)
                }
            }
            Picker("Weekdoel", selection: Binding(get: { goal ?? 0 }, set: { v in goal = v == 0 ? nil : v; Task { await saveGoal() } })) {
                Text("Geen").tag(0)
                ForEach(1...4, id: \.self) { Text("\($0)×").tag($0) }
            }
            .pickerStyle(.segmented)
            Text("Een rustig doel voor jezelf. Haal je het een week niet, dan is er niets verloren.")
                .font(.footnote).foregroundStyle(Palette.muted)
        }
    }

    private struct GoalPayload: Encodable { var weeklyGoal: Int? }

    private func saveGoal() async {
        let _: OK? = try? await APIClient.shared.patch("/api/v1/profile", GoalPayload(weeklyGoal: goal))
        Haptics.tap(.select)
        await store.load()
    }

    nonisolated static func symbol(_ b: Progress.Badge) -> String {
        switch b.key {
        case "walks": "figure.walk"
        case "buddy": "heart.fill"
        case "pack": "pawprint.fill"
        case "early": "sunrise.fill"
        case "evening": "moon.stars.fill"
        case "weekend": "sun.max.fill"
        case "seasons": "leaf.fill"
        case "photos": "camera.fill"
        case "reports": "list.clipboard.fill"
        case "shelter": "building.2.fill"
        case "quiz": "checkmark.seal.fill"
        case "host": "house.fill"
        case "friends": "person.2.fill"
        case "invite": "envelope.fill"
        default: "rosette"
        }
    }

    static func tint(_ color: String?) -> Color {
        switch color {
        case "bronze": Color(hex: 0xD9A06B)
        case "silver": Color(hex: 0xC9CED3)
        case "gold": Color(hex: 0xF2C94C)
        case "green": Palette.grassSoft
        default: Palette.ball
        }
    }
}

/// A short celebration for a new level or badge. Shown once, then marked as seen.
struct LevelUpView: View {
    let progress: Progress
    var close: () -> Void
    @State private var pop = false

    var body: some View {
        VStack(spacing: 18) {
            Spacer()
            ZStack {
                ForEach(0..<12, id: \.self) { i in
                    Image(systemName: "pawprint.fill")
                        .font(.caption)
                        .foregroundStyle(i.isMultiple(of: 2) ? Palette.ball : Palette.onGrass.opacity(0.6))
                        .offset(y: pop ? -130 : -20)
                        .rotationEffect(.degrees(Double(i) * 30))
                        .opacity(pop ? 0 : 1)
                }
                Text("\(progress.level.number)")
                    .font(.display(64, weight: .heavy))
                    .foregroundStyle(Palette.onBall)
                    .frame(width: 140, height: 140)
                    .background(Palette.ball, in: .circle)
                    .scaleEffect(pop ? 1 : 0.3)
            }
            .frame(height: 280)
            if progress.levelUp {
                Text("Nieuw niveau!").font(.title3.weight(.semibold)).foregroundStyle(Palette.onGrass.opacity(0.85))
                Text(progress.level.name).font(.display(36)).foregroundStyle(Palette.onGrass)
            }
            ForEach(progress.newAwards ?? [], id: \.self) { a in
                Label(a.title ?? a.name, systemImage: "rosette").font(.headline).foregroundStyle(Palette.ball)
            }
            Spacer()
            Button("Verder") { close() }.buttonStyle(.ball)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Palette.walkBackground.ignoresSafeArea())
        .onAppear {
            Haptics.success(.levelUp)
            withAnimation(.spring(duration: 0.9, bounce: 0.5)) { pop = true }
        }
    }
}
