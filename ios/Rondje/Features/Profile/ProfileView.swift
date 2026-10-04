import SwiftUI

/// Jij: who you are and everything about your account, in a few short groups. The main actions
/// (editing your profile, inviting someone) sit in the header; the rest is one tap away.
struct ProfileView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var progress = ProgressStore.shared
    @State private var confirmSignOut = false
    @State private var deleting = false
    @State private var membership = false

    private var walks: Bool { model.role != .owner }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header
                    // The first steps for walkers, until they are done (they used to stand on Ontdek).
                    FirstSteps { model.perform(.quiz) }
                    if let p = progress.progress {
                        NavigationLink { BadgesView() } label: { LevelCard(progress: p) }
                            .buttonStyle(.plain)
                    }
                    if let lift = MoodStore.averageLift, lift > 0 {
                        Label(L("Na een rondje voel je je gemiddeld beter dan ervoor. Alleen jij ziet dit."), systemImage: "sun.max.fill")
                            .font(.subheadline)
                            .foregroundStyle(Palette.ink)
                            .padding(14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Palette.grassSoft, in: .rect(cornerRadius: 18, style: .continuous))
                    }
                    RowGroup {
                        NavigationLink { NotificationsView() } label: {
                            ProfileRow(symbol: "bell.fill", title: L("Meldingen"), detail: (model.me?.unread ?? 0) > 0 ? L("\(model.me?.unread ?? 0) nieuw") : nil)
                        }
                        NavigationLink { MyDogsView() } label: {
                            ProfileRow(symbol: "pawprint.fill", title: L("Mijn honden"), detail: L("Voor jezelf, de buren of opa en oma"))
                        }
                    }
                    if walks {
                        RowGroup(title: L("Wandelen")) {
                            NavigationLink { LessonsView() } label: {
                                ProfileRow(symbol: "graduationcap.fill", title: L("Hondenschool"), detail: L("\(Keepsakes.shared.lessonsDone.count) van 5 lessen"))
                            }
                            NavigationLink { QuizView() } label: {
                                ProfileRow(symbol: "checkmark.seal.fill", title: L("Veiligheidsquiz"),
                                           detail: model.me?.profile?.quizPassed == true ? L("Gehaald") : L("Nodig voor zelfstandige rondjes"))
                            }
                            NavigationLink { DogFriendsView() } label: {
                                ProfileRow(symbol: "book.fill", title: L("Hondenvriendenboek"), detail: L("Alle honden met wie je liep"))
                            }
                        }
                    }
                    RowGroup(title: L("Instellingen")) {
                        // Seintjes are about walking other people's dogs, so only for people who walk.
                        if walks {
                            NavigationLink { NudgeSettingsView() } label: {
                                ProfileRow(symbol: "bell.badge.fill", title: L("Seintjes"), detail: Nudges.settings.enabled ? L("Aan") : L("Uit"))
                            }
                        }
                        SoundsToggle()
                        SettingToggle(symbol: "pawprint.circle.fill", title: L("Guus mag tips geven"),
                                      detail: L("Guus is de hond die je steeds de volgende stap laat zien."),
                                      isOn: Binding(get: { Keepsakes.shared.coachOn }, set: { Keepsakes.shared.coachOn = $0 }))
                        Button {
                            Keepsakes.shared.resetHints()
                            model.show(L("Guus legt het straks weer uit"))
                        } label: {
                            ProfileRow(symbol: "arrow.counterclockwise", title: L("Laat Guus alles opnieuw uitleggen"))
                        }
                        NavigationLink { RoleView() } label: {
                            ProfileRow(symbol: "arrow.left.arrow.right", title: L("Wat doe je op \(Brand.name)?"), detail: roleText)
                        }
                    }
                    HealthSettings()
                    RowGroup(title: L("Over \(Brand.name)")) {
                        Button { membership = true } label: {
                            ProfileRow(symbol: "heart.fill", title: L("Word lid van \(Brand.name)"), detail: L("Help een rondje: gratis voor iedereen, zonder reclame."))
                        }
                        Button { openURL(Brand.web("/safety")) } label: { ProfileRow(symbol: "shield.lefthalf.filled", title: L("Veiligheid"), external: true) }
                        Button { openURL(Brand.web("/legal/privacy")) } label: { ProfileRow(symbol: "hand.raised.fill", title: L("Privacy en voorwaarden"), external: true) }
                    }
                    RowGroup(title: L("Account")) {
                        Button { confirmSignOut = true } label: { ProfileRow(symbol: "rectangle.portrait.and.arrow.right", title: L("Uitloggen")) }
                        Button { deleting = true } label: { ProfileRow(symbol: "trash", title: L("Account verwijderen"), tint: Palette.danger) }
                    }
                    Text("\(Brand.name) \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")")
                        .font(.caption).foregroundStyle(Palette.muted)
                        .frame(maxWidth: .infinity)
                }
                .padding(20)
            }
            .screenBackground()
            .navigationTitle("Jij")
            .refreshable { await model.refreshMe() }
            .task { await progress.load() }
            .confirmationDialog("Uitloggen?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Uitloggen", role: .destructive) { Task { await model.signOut() } }
            }
            .sheet(isPresented: $deleting) { DeleteAccountSheet().presentationDetents([.medium]) }
            .sheet(isPresented: $membership) { MembershipView().presentationDetents([.large]).presentationCornerRadius(32) }
        }
    }

    /// Who you are, your numbers in one line, and the two things you do here most: edit and invite.
    private var header: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .center, spacing: 16) {
                Avatar(url: model.me?.profile?.photoUrl, name: model.firstName, size: 76)
                VStack(alignment: .leading, spacing: 4) {
                    Text(model.firstName).font(.display(26))
                    if let p = model.me?.profile {
                        Text("\(p.ageBand) jaar · \(p.city)").font(.subheadline).foregroundStyle(Palette.muted)
                    }
                    if walks, let t = model.me?.trust {
                        Text(stats(t)).font(.subheadline).foregroundStyle(Palette.muted)
                    }
                    if let badges = model.me?.trust?.badges, !badges.isEmpty {
                        FlowLayout(spacing: 6) {
                            ForEach(badges, id: \.self) { b in
                                let label = Labels.badge(b)
                                Chip(text: label.0, symbol: label.1, tint: Palette.calm, soft: Palette.calmSoft)
                            }
                        }
                        .padding(.top, 2)
                    }
                }
                Spacer(minLength: 0)
            }
            let layout = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 10)) : AnyLayout(HStackLayout(spacing: 10))
            layout {
                NavigationLink { EditProfileView() } label: {
                    Label("Profiel bewerken", systemImage: "pencil")
                }
                .buttonStyle(.secondary)
                if let code = model.me?.profile?.referralCode {
                    ShareLink(
                        item: Brand.share("/r/\(code)"),
                        subject: Text("Wandel je mee?"),
                        message: Text("Ik wandel met honden uit de buurt via \(Brand.name). Gratis, en je helpt er iemand mee. Doe je mee?")
                    ) {
                        Label("Nodig uit", systemImage: "person.2.wave.2.fill")
                    }
                    .buttonStyle(.secondary)
                }
            }
        }
    }

    /// "3 rondjes · 2× ID gezien · sinds 2026": the three numbers that used to be three tiles.
    /// An ID that was never seen yet says nothing, so it is left out.
    private func stats(_ t: Me.Trust) -> String {
        [
            t.walks == 1 ? L("1 rondje") : L("\(t.walks) rondjes"),
            t.idChecks > 0 ? L("\(t.idChecks)× ID gezien") : nil,
            L("sinds \(String(t.memberSinceYear))"),
        ].compactMap { $0 }.joined(separator: " · ")
    }

    private var roleText: String {
        switch model.role {
        case .walker: L("Ik wil wandelen")
        case .owner: L("Ik heb een hond")
        case .both: L("Allebei")
        }
    }
}

/// A group of rows on one card, with an optional heading above it. Dividers go between the rows.
struct RowGroup<Content: View>: View {
    var title: String? = nil
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title {
                Text(title)
                    .font(.headline)
                    .padding(.horizontal, 4)
                    .accessibilityAddTraits(.isHeader)
            }
            VStack(spacing: 0) {
                Group(subviews: content) { rows in
                    ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                        if index > 0 { Divider().padding(.leading, 58) }
                        row
                    }
                }
            }
            .buttonStyle(.plain)
            .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
        }
    }
}

/// One row under Jij: an icon, a title, maybe a short line, and where it goes.
struct ProfileRow: View {
    var symbol: String
    var title: String
    var detail: String? = nil
    var external = false
    var tint: Color = Palette.ink

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: symbol)
                .frame(width: 28)
                .foregroundStyle(tint == Palette.ink ? Palette.grass : tint)
            VStack(alignment: .leading, spacing: 1) {
                Text(title).foregroundStyle(tint)
                if let detail { Text(detail).font(.caption).foregroundStyle(Palette.muted) }
            }
            .multilineTextAlignment(.leading)
            Spacer(minLength: 8)
            Image(systemName: external ? "arrow.up.right" : "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Palette.muted)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(minHeight: 44)
        .contentShape(.rect)
    }
}

/// Account deletion inside the app, as the App Store asks. Typing the word avoids accidents.
struct DeleteAccountSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var confirm = ""
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Je account, profiel, honden, afspraken en routes worden direct en voorgoed verwijderd.")
                    TextField("Typ VERWIJDER", text: $confirm)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                }
                if let error { Text(error).foregroundStyle(Palette.danger) }
                Button("Verwijder mijn account", role: .destructive) { Task { await delete() } }
                    .disabled(confirm.trimmingCharacters(in: .whitespaces).uppercased() != "VERWIJDER")
            }
            .rondjeForm()
            .navigationTitle("Account verwijderen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Annuleer") { dismiss() } } }
        }
    }

    private func delete() async {
        do {
            let _: OK = try await APIClient.shared.delete("/api/v1/me", ["confirm": confirm])
            dismiss()
            model.reset()
        } catch {
            self.error = error.plainText
        }
    }
}

struct NotificationsView: View {
    @Environment(AppModel.self) private var model
    @State private var items: [AppNotification] = []
    @State private var loaded = false

    var body: some View {
        List {
            if loaded && items.isEmpty {
                EmptyState(symbol: "bell", title: L("Geen meldingen"), text: L("Hier zie je nieuwe aanvragen, antwoorden en rondjes."))
                    .listRowBackground(Color.clear)
            }
            ForEach(items) { n in
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: symbol(n.kind))
                        .foregroundStyle(Palette.grass)
                        .frame(width: 28)
                    VStack(alignment: .leading, spacing: 3) {
                        Text(text(n)).font(.subheadline.weight(n.read ? .regular : .semibold))
                        Text(n.createdAt, style: .relative).font(.caption).foregroundStyle(Palette.muted)
                    }
                }
                .listRowBackground(Palette.surface)
            }
        }
        .scrollContentBackground(.hidden)
        .screenBackground()
        .navigationTitle("Meldingen")
        .task {
            if let r: NotificationsResponse = try? await APIClient.shared.get("/api/v1/notifications") { items = r.notifications }
            loaded = true
            let _: OK? = try? await APIClient.shared.post("/api/v1/notifications", [String: String]())
            await model.refreshMe()
        }
    }

    private func symbol(_ kind: String) -> String {
        switch kind {
        case "request-new": "envelope.badge.fill"
        case "request-accepted": "checkmark.circle.fill"
        case "request-declined", "request-cancelled": "xmark.circle"
        case "walk-started": "figure.walk"
        case "walk-ended": "house.fill"
        case "walk-overdue": "clock.badge.exclamationmark"
        case "chat-message": "bubble.left.fill"
        case "trust-granted": "hand.thumbsup.fill"
        default: "bell.fill"
        }
    }

    private func text(_ n: AppNotification) -> String {
        let dog = n.text("dogName"), walker = n.text("walkerName")
        switch n.kind {
        case "request-new": return L("\(walker) wil graag met \(dog) wandelen.")
        case "request-accepted": return L("Je afspraak met \(dog) is geaccepteerd.")
        case "request-declined": return L("Je aanvraag voor \(dog) is afgewezen.")
        case "request-cancelled": return L("De afspraak met \(dog) is geannuleerd.")
        case "walk-started": return L("\(walker) is op pad met \(dog). Kijk live mee.")
        case "walk-ended": return L("\(dog) is weer thuis.")
        case "walk-overdue": return L("Het rondje met \(dog) loopt uit.")
        case "chat-message": return L("\(n.text("senderName")) stuurde een bericht over \(dog).")
        case "trust-granted": return L("Je mag nu zelfstandig met \(dog) wandelen.")
        case "group-walk-new": return L("Er is een nieuwe groepswandeling bij een opvang.")
        default: return L("Nieuwe melding")
        }
    }
}
