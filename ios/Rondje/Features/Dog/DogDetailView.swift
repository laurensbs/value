import SwiftUI

struct DogDetailView: View {
    let dogId: String
    let preview: DogCard?

    @Environment(AppModel.self) private var model
    @State private var detail: DogDetail?
    @State private var error: String?
    @State private var requestKind: RequestFlow.Kind?
    @State private var reporting = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                hero
                if let detail {
                    content(detail)
                } else if let error {
                    EmptyState(
                        symbol: "exclamationmark.triangle", title: L("Niet gelukt"), text: error,
                        actionTitle: L("Probeer opnieuw"), action: { Task { await load(retry: true) } }
                    )
                } else {
                    ProgressView().frame(maxWidth: .infinity).padding(40)
                }
            }
            .padding(.bottom, 120)
        }
        .ignoresSafeArea(edges: .top)
        .screenBackground()
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: Brand.share("/dogs/\(dogId)"), message: Text("Wie wil er met \(name) wandelen?")) {
                    Image(systemName: "square.and.arrow.up")
                }
                .accessibilityLabel("Deel")
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("Meld deze hond of eigenaar", systemImage: "exclamationmark.bubble") { reporting = true }
                } label: {
                    Image(systemName: "ellipsis")
                }
                .accessibilityLabel("Meer")
            }
        }
        .safeAreaInset(edge: .bottom) { actionBar }
        .task { await load() }
        .sheet(item: $requestKind) { kind in
            if let detail {
                RequestFlow(dog: detail.dog, slots: detail.slots, kind: kind, host: detail.host) { await load() }
                    .presentationDetents([.large])
                    .presentationCornerRadius(32)
            }
        }
        .sheet(isPresented: $reporting) {
            ReportSheet(dogId: dogId, subjectUserId: detail?.host.kind == "owner" ? detail?.host.id : nil)
                .presentationDetents([.medium, .large])
        }
    }

    private var look: DogLook { detail?.dog.look ?? preview?.look ?? .sample }
    private var name: String { detail?.dog.name ?? preview?.name ?? "" }
    private var photo: URL? { (detail?.dog.photos.first ?? preview?.photos.first).flatMap(URL.init(string:)) }

    private var hero: some View {
        DogPortrait(look: look, photoURL: photo, cornerRadius: 0, inset: 0.2)
            .frame(height: 400)
            .overlay(alignment: .bottomLeading) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(name).font(.display(40, weight: .heavy))
                    if let d = detail?.dog {
                        Text([d.breed, d.ageYears.map { L("\($0) jaar") }, Labels.sex(d.sex)].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                            .font(.headline)
                    } else if let p = preview {
                        Text(p.breed).font(.headline)
                    }
                }
                .foregroundStyle(Palette.ink)
                .padding(.horizontal, 18).padding(.vertical, 14)
                .glassy(cornerRadius: 24)
                .padding(16)
            }
    }

    @ViewBuilder
    private func content(_ d: DogDetail) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            if !d.isMine && !d.host.isShelter && d.canRequest.solo != nil {
                GuusHint(id: "dog", text: L("Eerst maak je kennis. De eigenaar loopt mee en bekijkt je ID."))
            }
            if d.dog.isDemo {
                Label("Dit is een voorbeeldhond. Echte honden uit je buurt komen hier vanzelf bij.", systemImage: "info.circle.fill")
                    .font(.subheadline).foregroundStyle(Palette.warn)
                    .padding(14).background(Palette.warnSoft, in: .rect(cornerRadius: 16, style: .continuous))
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                fact("bolt.fill", L("Energie"), Labels.energy(d.dog.energy))
                fact("ruler", L("Formaat"), Labels.size(d.dog.size))
                fact("timer", L("Rondje"), L("\(d.dog.walkMinutes) minuten"))
                fact("star.fill", L("Niveau"), Labels.level(d.dog.level))
            }

            if !d.dog.story.isEmpty {
                Card {
                    Text("Over \(d.dog.name)").font(.headline)
                    Text(d.dog.story).foregroundStyle(Palette.ink)
                }
            }

            if !d.dog.traits.isEmpty {
                FlowLayout(spacing: 8) {
                    ForEach(d.dog.traits, id: \.self) { Chip(text: $0) }
                }
            }

            Card {
                Text("Goed om te weten").font(.headline)
                info("fork.knife", Labels.treats(d.dog.treats) + (d.dog.treatsNote.isEmpty ? "" : L(". \(d.dog.treatsNote)")))
                info("link", d.dog.offLeash ? L("Mag los waar het mag, als de eigenaar dat zegt") : L("Altijd aan de lijn"))
                if !d.dog.provides.isEmpty {
                    info("bag.fill", L("De eigenaar zorgt voor \(d.dog.provides.map { Labels.provides($0).lowercased() }.joined(separator: ", "))"))
                }
                if !d.dog.needs.isEmpty { info("heart.text.square", d.dog.needs) }
                if d.dog.biteHistory {
                    info("exclamationmark.triangle.fill", L("Heeft ooit gebeten. \(d.dog.biteNote)"), tint: Palette.warn)
                }
                if d.dog.ppp && d.dog.country == "ES" {
                    info("doc.text.fill", L("PPP-hond: in Spanje alleen met licentie"), tint: Palette.warn)
                }
            }

            hostCard(d)

            if !d.slots.isEmpty {
                Card {
                    Text("Vaste momenten").font(.headline)
                    ForEach(d.slots, id: \.self) { slot in
                        info("clock", L("\(Labels.weekday(slot.weekday).capitalized) om \(slot.time)"))
                    }
                }
            }

            if d.canSeePrivate && (!d.dog.meetingInfo.isEmpty || !d.dog.vetInfo.isEmpty) {
                Card {
                    Label("Alleen voor jou zichtbaar", systemImage: "lock.fill").font(.footnote.weight(.semibold)).foregroundStyle(Palette.grass)
                    if !d.dog.meetingInfo.isEmpty { info("mappin.and.ellipse", d.dog.meetingInfo) }
                    if !d.dog.vetInfo.isEmpty { info("cross.case.fill", d.dog.vetInfo) }
                }
            }

            if !d.groupWalks.isEmpty {
                SectionTitle(title: L("Groepswandelingen"), subtitle: L("Honden van de opvang loop je in een begeleide groep."))
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(d.groupWalks) { walk in GroupWalkCard(walk: walk) { await load() } }
                    }
                }
                .scrollClipDisabled()
            }
        }
        .padding(.horizontal, 20)
    }

    private func hostCard(_ d: DogDetail) -> some View {
        Card {
            HStack(spacing: 12) {
                Image(systemName: d.host.isShelter ? "building.2.crop.circle.fill" : "person.crop.circle.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Palette.grass)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Text(d.host.name).font(.headline)
                        if d.host.verified { Image(systemName: "checkmark.seal.fill").foregroundStyle(Palette.calm).accessibilityLabel("Geverifieerd") }
                    }
                    Text(d.host.isShelter ? L("Opvang in \(d.host.city)") : L("Eigenaar in \(d.host.city)"))
                        .font(.subheadline).foregroundStyle(Palette.muted)
                }
            }
            if let bio = d.host.bio, !bio.isEmpty { Text(bio).font(.subheadline).lineLimit(4) }
            if !d.canSeePrivate {
                Label("Contactgegevens en afspreekplek zie je pas als je afspraak is geaccepteerd.", systemImage: "lock")
                    .font(.footnote).foregroundStyle(Palette.muted)
            }
        }
    }

    @ViewBuilder
    private var actionBar: some View {
        if let d = detail, !d.isMine, !d.host.isShelter {
            VStack(spacing: 8) {
                if let reason = d.canRequest.meet {
                    Text(reasonText(reason)).font(.footnote).foregroundStyle(Palette.muted).multilineTextAlignment(.center)
                }
                HStack(spacing: 10) {
                    if d.canRequest.solo == nil {
                        Button("Zelfstandig rondje") { requestKind = .solo }.buttonStyle(.ball)
                    }
                    Button(d.canRequest.solo == nil ? L("Kennismaken") : L("Plan een kennismaking")) { requestKind = .meet }
                        .buttonStyle(.primary)
                        .disabled(d.canRequest.meet != nil)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(.bar)
        }
    }

    private func reasonText(_ code: String) -> String {
        switch code {
        case "demo-dog": L("Dit is een voorbeeld; hiervoor kun je geen afspraak maken.")
        case "too-many-pending": L("Je hebt al 5 open aanvragen. Wacht op antwoord of trek er een in.")
        case "own-dog": L("Dit is je eigen hond.")
        case "blocked": L("Je kunt geen afspraak maken met deze persoon.")
        case "ppp-licence": L("In Spanje mag je een PPP-hond alleen uitlaten met een geldige licentie.")
        default: L("Je kunt nu geen afspraak maken met deze hond.")
        }
    }

    private func fact(_ symbol: String, _ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: symbol).foregroundStyle(Palette.grass).frame(height: 24)
            Text(title).font(.caption).foregroundStyle(Palette.muted)
            Text(value).font(.subheadline.weight(.semibold))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Palette.surface, in: .rect(cornerRadius: 18, style: .continuous))
    }

    private func info(_ symbol: String, _ text: String, tint: Color = Palette.grass) -> some View {
        Label { Text(text).font(.subheadline) } icon: { Image(systemName: symbol).foregroundStyle(tint) }
    }

    /// `retry`: the person tapped "Probeer opnieuw", so a new failure is felt once.
    private func load(retry: Bool = false) async {
        do {
            let d: DogDetail = try await APIClient.shared.get("/api/v1/dogs/\(dogId)")
            withAnimation(Motion.scherm) {
                detail = d
                error = nil
            }
        } catch {
            self.error = error.plainText
            if retry { Haptics.error() }
        }
    }
}

/// Wraps chips onto as many lines as needed.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, row: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 { x = 0; y += row + spacing; row = 0 }
            x += size.width + spacing
            row = max(row, size.height)
        }
        return CGSize(width: width == .infinity ? x : width, height: y + row)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, row: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += row + spacing; row = 0 }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            row = max(row, size.height)
        }
    }
}
