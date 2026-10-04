import MapKit
import SwiftUI

/// Dogs near you, as a list or on a map, plus supervised group walks at shelters.
struct DiscoverView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL
    @Namespace private var zoom

    @State private var dogs: [DogCard] = []
    @State private var groupWalks: [GroupWalk] = []
    @State private var loading = true
    @State private var error: String?
    /// The last load failed for lack of a connection (not on the server's side).
    @State private var offline = false
    @State private var showMap = false
    @State private var filter: Filter = .all
    @State private var query = ""
    @State private var path = NavigationPath()
    @State private var progress = ProgressStore.shared

    enum Filter: String, CaseIterable, Identifiable {
        case all, calm, high, owner, shelter
        var title: String {
            switch self {
            case .all: L("Alle honden")
            case .calm: L("Rustig")
            case .high: L("Energiek")
            case .owner: L("Buurt")
            case .shelter: L("Opvang")
            }
        }
        var id: String { rawValue }
        var symbol: String {
            switch self {
            case .all: "pawprint"
            case .calm: "leaf"
            case .high: "bolt"
            case .owner: "house"
            case .shelter: "building.2"
            }
        }
    }

    private var visible: [DogCard] {
        dogs.filter { dog in
            switch filter {
            case .all: true
            case .calm: dog.energy == "calm"
            case .high: dog.energy == "high"
            case .owner: !dog.host.isShelter
            case .shelter: dog.host.isShelter
            }
        }
        .filter { query.isEmpty || $0.name.localizedCaseInsensitiveContains(query) || $0.breed.localizedCaseInsensitiveContains(query) || $0.city.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        header
                        NextStepCard(placement: .discover, nearbyDogs: dogs, nearbyLoaded: !dogs.isEmpty || !loading, nearbyFailed: error != nil)
                        // One Guus at a time: next to the next step, at most the week in review or the seintje offer.
                        if !NextStepCard.introPending {
                            if WeekRecapCard.current(side: .walker) != nil {
                                WeekRecapCard(side: .walker)
                            } else if NudgeOfferCard.isShowing(walks: model.me?.trust?.walks ?? 0) {
                                NudgeOfferCard()
                            }
                        }
                        // The level and "Samen deze maand" live under Jij now; the dogs come first here.
                        FirstSteps { model.perform(Keepsakes.shared.lessonsDone.count < 5 ? .lessons : .quiz) }
                        if !NextStepCard.introPending {
                            GuusHint(id: "discover", text: L("Tik op een hond om zijn verhaal te lezen. Begin gerust met Rustig."))
                        }
                        filters
                            .id("filters")
                        if showMap {
                            DogsMap(dogs: visible) { path.append($0) }
                                .frame(height: 460)
                                .clipShape(.rect(cornerRadius: 28, style: .continuous))
                                .transition(.scale(scale: 0.96).combined(with: .opacity))
                        } else {
                            list
                        }
                        if !groupWalks.isEmpty { groupWalksSection }
                        DailyTip()
                            .padding(.top, 8)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 32)
                }
                .screenBackground()
                .refreshable { await load() }
                .searchable(text: $query, prompt: L("Zoek op naam, ras of plaats"))
                .navigationTitle("Ontdek")
                .toolbarTitleDisplayMode(.inlineLarge)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            withAnimation(.snappy) { showMap.toggle() }
                        } label: {
                            Image(systemName: showMap ? "list.bullet" : "map")
                                .contentTransition(.symbolEffect(.replace))
                        }
                        .accessibilityLabel(showMap ? L("Toon lijst") : L("Toon kaart"))
                    }
                }
                .navigationDestination(for: DogCard.self) { dog in
                    DogDetailView(dogId: dog.id, preview: dog)
                        .navigationTransition(.zoom(sourceID: dog.id, in: zoom))
                }
                .navigationDestination(for: String.self) { id in DogDetailView(dogId: id, preview: nil) }
                .onChange(of: model.pendingAction, initial: true) {
                    // Guus (or a notification) asked for calm dogs, or for one dog.
                    if let calm = model.take({ action -> Bool? in
                        if case .discover(let calm) = action { return calm }
                        return nil
                    }) {
                        path = NavigationPath()
                        withAnimation(.snappy) {
                            showMap = false
                            filter = calm ? .calm : .all
                        }
                        withAnimation(.snappy) { proxy.scrollTo("filters", anchor: .top) }
                    } else if let id = model.take({ action -> String? in
                        if case .dog(let id) = action { return id }
                        return nil
                    }) {
                        path.append(id)
                    }
                }
            }
        }
        .task { await progress.load() }
        .task {
            // Ask once, with the purpose text from Info.plist; without it the list is sorted by your city.
            LocationService.shared.requestPermission()
            if dogs.isEmpty { await load() }
        }
        .onChange(of: LocationService.shared.allowed) { _, allowed in if allowed { Task { await load() } } }
        .sensoryFeedback(.selection, trigger: filter)
        .onChange(of: filter) { SoundFX.play(.select) }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(greeting).font(.title3.weight(.semibold)).foregroundStyle(Palette.muted)
            Text("Wie gaat er vandaag mee?").font(.display(28))
        }
        .padding(.top, 4)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: .now)
        let part = hour < 12 ? L("Goedemorgen") : hour < 18 ? L("Goedemiddag") : L("Goedenavond")
        return model.firstName.isEmpty ? part : L("\(part), \(model.firstName)")
    }

    private var filters: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Filter.allCases) { f in
                    Button {
                        withAnimation(Motion.klein) { filter = f }
                    } label: {
                        Label(f.title, systemImage: f.symbol)
                            .font(.subheadline.weight(.semibold))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .foregroundStyle(filter == f ? Palette.onGrass : Palette.ink)
                            .background(filter == f ? Palette.grass : Palette.surface, in: .capsule)
                            // The chip looks 38 points tall, but the tap area is 44.
                            .frame(minHeight: 44)
                            .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .scrollClipDisabled()
    }

    @ViewBuilder
    private var list: some View {
        if loading && dogs.isEmpty {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(Palette.sunken)
                    .frame(height: 300)
                    .redacted(reason: .placeholder)
            }
        } else if let error, dogs.isEmpty {
            EmptyState(
                symbol: offline ? "wifi.exclamationmark" : "exclamationmark.triangle",
                title: offline ? L("Even geen verbinding") : L("Niet gelukt"), text: error,
                actionTitle: L("Probeer opnieuw"), action: { Task { await load(retry: true) } }
            )
        } else if dogs.isEmpty {
            // Honest: there are few dogs yet. Help bring one in instead of promising more.
            EmptyState(
                symbol: "pawprint", title: L("Nog geen honden hier"),
                text: L("We zijn hier net begonnen. Ken je iemand wiens hond vaker naar buiten wil? Stuur je link, of tip een opvang.")
            ) {
                VStack(spacing: 10) {
                    if let link = ownerInvite {
                        ShareLink(item: link, message: Text("Ken je \(Brand.name)? Iemand uit de buurt loopt gratis een rondje met je hond. De eerste keer lopen jullie samen.")) {
                            Label("Stuur je link", systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(.primary)
                    }
                    Button("Tip een opvang") { openURL(Brand.web("/suggest")) }
                        .buttonStyle(.secondary)
                }
                .padding(.top, 6)
            }
        } else if visible.isEmpty {
            EmptyState(
                symbol: "line.3.horizontal.decrease", title: L("Geen honden gevonden"),
                text: L("Met dit filter of deze zoekterm is er nu geen hond."),
                actionTitle: L("Toon alle honden"), action: {
                    withAnimation(Motion.klein) {
                        filter = .all
                        query = ""
                    }
                }
            )
        } else {
            LazyVStack(spacing: 18) {
                ForEach(Array(visible.enumerated()), id: \.element.id) { index, dog in
                    NavigationLink(value: dog) {
                        DogCardView(dog: dog)
                            .matchedTransitionSource(id: dog.id, in: zoom)
                    }
                    .buttonStyle(.plain)
                    .appear(index)
                }
            }
        }
    }

    private var groupWalksSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionTitle(title: L("Groepswandelingen"), subtitle: L("Begeleid, bij een opvang. Fijn om mee te beginnen."))
                .padding(.top, 10)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(groupWalks) { walk in GroupWalkCard(walk: walk) { await load() } }
                }
            }
            .scrollClipDisabled()
        }
    }

    /// Your invite link for someone with a dog: it opens sign-up as an owner and remembers who sent it.
    private var ownerInvite: URL? {
        guard let code = model.me?.profile?.referralCode, !code.isEmpty else { return nil }
        return Brand.share("/r/\(code)").appending(queryItems: [URLQueryItem(name: "intent", value: "owner")])
    }

    /// `retry`: the person tapped "Probeer opnieuw", so a new failure is felt once.
    private func load(retry: Bool = false) async {
        loading = true
        defer { loading = false }
        var path = "/api/v1/dogs"
        if let p = await LocationService.shared.roughPosition() { path += "?lat=\(p.lat)&lng=\(p.lng)" }
        // Dogs and group walks load independently, so a failing group-walks call never empties the dogs.
        async let d: DogsResponse = APIClient.shared.get(path)
        async let g: GroupWalksResponse = APIClient.shared.get("/api/v1/group-walks")
        do {
            let dr = try await d
            withAnimation(Motion.scherm) {
                dogs = dr.dogs
                error = nil
            }
            Cache.save(Array(dr.dogs.filter { !$0.isDemo && $0.energy == "calm" }.prefix(10)), as: "nearbyDogs")
        } catch {
            self.error = error.plainText
            offline = error.isOffline
            if retry { Haptics.error() }
        }
        if let gr = try? await g {
            withAnimation(.smooth) { groupWalks = gr.groupWalks }
        }
    }
}

struct DogCardView: View {
    let dog: DogCard

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topLeading) {
                DogPortrait(look: dog.look, photoURL: dog.photos.first.flatMap(URL.init(string:)), cornerRadius: 0)
                    .frame(height: 220)
                HStack {
                    if dog.isDemo { Chip(text: L("Voorbeeld"), tint: Palette.warn, soft: Palette.warnSoft) }
                    Spacer()
                    if let d = Format.distance(dog.distanceM) {
                        Label(d, systemImage: "location.fill")
                            .font(.footnote.weight(.semibold))
                            .padding(.horizontal, 10).padding(.vertical, 6)
                            .glassy(cornerRadius: 14)
                    }
                }
                .padding(12)
            }
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline) {
                    Text(dog.name).font(.display(24))
                    Text(dog.breed).font(.subheadline).foregroundStyle(Palette.muted).lineLimit(1)
                    Spacer()
                    Image(systemName: dog.host.isShelter ? "building.2.fill" : "house.fill")
                        .foregroundStyle(Palette.muted)
                        .accessibilityLabel(dog.host.isShelter ? L("Opvang") : L("Eigenaar uit de buurt"))
                }
                if !dog.story.isEmpty {
                    Text(dog.story).font(.subheadline).foregroundStyle(Palette.muted).lineLimit(2)
                }
                HStack(spacing: 6) {
                    Chip(text: Labels.energy(dog.energy), symbol: "bolt.fill")
                    Chip(text: L("\(dog.walkMinutes) min"), symbol: "timer", tint: Palette.calm, soft: Palette.calmSoft)
                    if dog.level == "experienced" { Chip(text: L("Ervaring"), symbol: "star.fill", tint: Palette.warn, soft: Palette.warnSoft) }
                }
            }
            .padding(16)
        }
        .background(Palette.surface)
        .clipShape(.rect(cornerRadius: 28, style: .continuous))
        .shadow(color: .black.opacity(0.06), radius: 14, y: 8)
        .accessibilityElement(children: .combine)
    }
}

struct DogsMap: View {
    let dogs: [DogCard]
    var onSelect: (DogCard) -> Void
    @State private var camera: MapCameraPosition = .automatic

    var body: some View {
        Map(position: $camera) {
            UserAnnotation()
            ForEach(dogs.filter { $0.coordinate != nil }) { dog in
                Annotation(dog.name, coordinate: dog.coordinate!, anchor: .bottom) {
                    Button { onSelect(dog) } label: {
                        VStack(spacing: 2) {
                            DogPortrait(look: dog.look, photoURL: dog.photos.first.flatMap(URL.init(string:)), cornerRadius: 16)
                                .frame(width: 52, height: 52)
                                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(.white, lineWidth: 3))
                                .shadow(radius: 4, y: 2)
                            Image(systemName: "triangle.fill").font(.system(size: 9)).foregroundStyle(.white).rotationEffect(.degrees(180)).offset(y: -4)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .mapStyle(.standard(pointsOfInterest: .including([.park])))
        .mapControls { MapUserLocationButton(); MapCompass() }
        .overlay(alignment: .bottom) {
            Text("Honden staan op hun buurt, nooit op een adres.")
                .font(.caption.weight(.medium))
                .padding(.horizontal, 12).padding(.vertical, 8)
                .glassy(cornerRadius: 14)
                .padding(12)
        }
    }
}

struct GroupWalkCard: View {
    let walk: GroupWalk
    var changed: () async -> Void
    @Environment(AppModel.self) private var model
    @State private var busy = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "figure.2.and.child.holdinghands").foregroundStyle(Palette.grass)
                Text(walk.orgName ?? L("Opvang")).font(.headline).lineLimit(1)
            }
            Text(Format.when(walk.startsAt)).font(.subheadline.weight(.semibold))
            Text(walk.meetingPoint).font(.footnote).foregroundStyle(Palette.muted).lineLimit(2)
            Spacer(minLength: 0)
            HStack {
                Chip(text: walk.spotsLeft == 0 ? L("Vol") : L("\(walk.spotsLeft) plekken"), tint: walk.spotsLeft == 0 ? Palette.danger : Palette.grass, soft: walk.spotsLeft == 0 ? Palette.dangerSoft : Palette.grassSoft)
                Spacer()
                if walk.isDemo == true {
                    Chip(text: L("Voorbeeld"), tint: Palette.warn, soft: Palette.warnSoft)
                } else {
                    Button(walk.mine == true ? L("Afmelden") : L("Doe mee")) { Task { await toggle() } }
                        .font(.subheadline.weight(.bold))
                        .buttonStyle(.borderedProminent)
                        .tint(walk.mine == true ? Palette.muted : Palette.grass)
                        .disabled(busy || (walk.mine != true && walk.spotsLeft == 0))
                }
            }
        }
        .padding(16)
        .frame(width: 260, height: 170, alignment: .topLeading)
        .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
    }

    private func toggle() async {
        busy = true
        defer { busy = false }
        do {
            if walk.mine == true {
                let _: OK = try await APIClient.shared.delete("/api/v1/group-walks/\(walk.id)", [String: String]())
                model.show(L("Je bent afgemeld"))
            } else {
                let _: OK = try await APIClient.shared.post("/api/v1/group-walks/\(walk.id)", [String: String]())
                model.celebrate(.wag(L("Je doet mee! Neem je ID mee.")))
            }
            await changed()
        } catch {
            Haptics.error()
            model.show(error.plainText, symbol: "exclamationmark.circle.fill", tint: Palette.danger)
        }
    }
}
