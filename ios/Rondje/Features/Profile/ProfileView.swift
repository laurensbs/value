import SwiftUI

struct ProfileView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL
    @State private var confirmSignOut = false
    @State private var deleting = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    header
                    MembershipCard()
                    if let trust = model.me?.trust { stats(trust) }
                    links
                    Text("\(Brand.name) \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")")
                        .font(.caption).foregroundStyle(Palette.muted)
                }
                .padding(20)
            }
            .screenBackground()
            .navigationTitle("Jij")
            .refreshable { await model.refreshMe() }
            .confirmationDialog("Uitloggen?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Uitloggen", role: .destructive) { Task { await model.signOut() } }
            }
            .sheet(isPresented: $deleting) { DeleteAccountSheet().presentationDetents([.medium]) }
        }
    }

    private var header: some View {
        HStack(spacing: 16) {
            Text(String(model.firstName.prefix(1)).uppercased())
                .font(.display(34, weight: .heavy))
                .foregroundStyle(Palette.onGrass)
                .frame(width: 76, height: 76)
                .background(
                    LinearGradient(colors: [Palette.grass, Palette.grass.opacity(0.75)], startPoint: .topLeading, endPoint: .bottomTrailing),
                    in: .rect(cornerRadius: 24, style: .continuous)
                )
            VStack(alignment: .leading, spacing: 6) {
                Text(model.firstName).font(.display(26))
                if let p = model.me?.profile {
                    Text("\(p.ageBand) jaar · \(p.city)").font(.subheadline).foregroundStyle(Palette.muted)
                }
                if let badges = model.me?.trust?.badges {
                    HStack(spacing: 6) {
                        ForEach(badges, id: \.self) { b in
                            let label = Labels.badge(b)
                            Chip(text: label.0, symbol: label.1, tint: Palette.calm, soft: Palette.calmSoft)
                        }
                    }
                }
            }
            Spacer()
        }
    }

    private func stats(_ t: Me.Trust) -> some View {
        HStack(spacing: 10) {
            stat("\(t.walks)", t.walks == 1 ? "rondje" : "rondjes", "figure.walk")
            stat("\(t.idChecks)", L("keer ID gezien"), "person.text.rectangle")
            stat("\(t.memberSinceYear)", L("lid sinds"), "calendar")
        }
    }

    private func stat(_ value: String, _ label: String, _ symbol: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: symbol).foregroundStyle(Palette.grass).frame(height: 24)
            Text(value).font(.display(22)).contentTransition(.numericText())
            Text(label).font(.caption).foregroundStyle(Palette.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Palette.surface, in: .rect(cornerRadius: 20, style: .continuous))
    }

    private var links: some View {
        VStack(spacing: 0) {
            NavigationLink { QuizView() } label: {
                row("checkmark.seal.fill", L("Veiligheidsquiz"), model.me?.profile?.quizPassed == true ? L("Gehaald") : L("Nodig voor zelfstandige rondjes"))
            }
            Divider().padding(.leading, 56)
            NavigationLink { MyDogsView() } label: { row("pawprint.fill", L("Mijn honden"), L("Voor jezelf, de buren of opa en oma")) }
            Divider().padding(.leading, 56)
            NavigationLink { NotificationsView() } label: {
                row("bell.fill", L("Meldingen"), (model.me?.unread ?? 0) > 0 ? L("\(model.me!.unread) nieuw") : nil)
            }
            Divider().padding(.leading, 56)
            NavigationLink { EditProfileView() } label: { row("pencil", L("Profiel bewerken"), nil) }
            Divider().padding(.leading, 56)
            Button { openURL(Brand.web("/safety")) } label: { row("shield.lefthalf.filled", L("Veiligheid"), nil, external: true) }
            Divider().padding(.leading, 56)
            Button { openURL(Brand.web("/legal/privacy")) } label: { row("hand.raised.fill", L("Privacy en voorwaarden"), nil, external: true) }
            Divider().padding(.leading, 56)
            Button { confirmSignOut = true } label: { row("rectangle.portrait.and.arrow.right", L("Uitloggen"), nil) }
            Divider().padding(.leading, 56)
            Button { deleting = true } label: { row("trash", L("Account verwijderen"), nil, tint: Palette.danger) }
        }
        .buttonStyle(.plain)
        .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
    }

    private func row(_ symbol: String, _ title: String, _ detail: String?, external: Bool = false, tint: Color = Palette.ink) -> some View {
        HStack(spacing: 14) {
            Image(systemName: symbol)
                .frame(width: 28)
                .foregroundStyle(tint == Palette.ink ? Palette.grass : tint)
            VStack(alignment: .leading, spacing: 1) {
                Text(title).foregroundStyle(tint)
                if let detail { Text(detail).font(.caption).foregroundStyle(Palette.muted) }
            }
            Spacer()
            Image(systemName: external ? "arrow.up.right" : "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Palette.muted)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
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
            self.error = error.localizedDescription
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
        case "trust-granted": return L("Je mag nu zelfstandig met \(dog) wandelen.")
        case "group-walk-new": return L("Er is een nieuwe groepswandeling bij een opvang.")
        default: return L("Nieuwe melding")
        }
    }
}
