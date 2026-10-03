import SwiftUI

/// The home screen for owners: who wants to walk your dog, walks happening now,
/// your dogs, and the first steps. Owners who only have a dog never see a list of other dogs first.
struct OwnerHomeView: View {
    @Environment(AppModel.self) private var model
    @State private var dogs: [MyDog] = []
    @State private var loaded = false
    @State private var adding = false
    @State private var following: Appointment?

    private var pending: [Appointment] { model.appointments.incoming.filter { $0.status == "pending" } }
    private var live: [Appointment] { model.appointments.incoming.filter { $0.walkStatus == "active" } }
    private var upcoming: [Appointment] {
        model.appointments.incoming.filter { $0.status == "accepted" && $0.walkStatus != "active" && $0.startsAt > .now.addingTimeInterval(-3600) }
            .sorted { $0.startsAt < $1.startsAt }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(greeting).font(.title3.weight(.semibold)).foregroundStyle(Palette.muted)
                        Text(headline).font(.display(28))
                    }

                    ForEach(live) { item in liveCard(item) }

                    OwnerSteps(hasDog: !dogs.isEmpty, loaded: loaded) { adding = true }

                    if !pending.isEmpty {
                        SectionTitle(title: L("Aanvragen"), subtitle: L("Kijk wie het is en kies een moment om kennis te maken."))
                        ForEach(pending) { AppointmentCard(item: $0, asOwner: true) }
                    }

                    if let next = upcoming.first {
                        SectionTitle(title: L("Volgende rondje"))
                        AppointmentCard(item: next, asOwner: true)
                    }

                    SectionTitle(title: L("Jouw honden"))
                    if loaded && dogs.isEmpty {
                        EmptyState(symbol: "plus", title: L("Nog geen honden"), text: L("Zet je hond erop, of die van een buurvrouw, opa of oma die zelf niet ver meer kan lopen."))
                    }
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(dogs) { dog in
                                NavigationLink(value: dog.id) {
                                    VStack(alignment: .leading, spacing: 6) {
                                        DogPortrait(look: dog.look, photoURL: dog.photos.first.flatMap(URL.init(string:)), cornerRadius: 24)
                                            .frame(width: 140, height: 140)
                                        Text(dog.name).font(.headline).foregroundStyle(Palette.ink)
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                            Button { adding = true } label: {
                                VStack(spacing: 8) {
                                    Image(systemName: "plus").font(.title.weight(.bold))
                                    Text("Hond toevoegen").font(.subheadline.weight(.semibold))
                                }
                                .foregroundStyle(Palette.grass)
                                .frame(width: 140, height: 140)
                                .background(Palette.grassSoft, in: .rect(cornerRadius: 24, style: .continuous))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .scrollClipDisabled()

                    if let c = ProgressStore.shared.challenges { ChallengeCard(challenges: c) }
                    OwnerTip()
                }
                .padding(20)
                .padding(.bottom, 20)
            }
            .screenBackground()
            .navigationTitle("Thuis")
            .toolbarTitleDisplayMode(.inlineLarge)
            .navigationDestination(for: String.self) { DogDetailView(dogId: $0, preview: nil) }
            .refreshable { await load() }
            .task { await load() }
            .sheet(isPresented: $adding) { AddDogView { await load() }.presentationDetents([.large]) }
            .fullScreenCover(item: $following) { item in
                FollowWalkView(walkId: item.walkId ?? "", dogName: item.dog.name)
            }
        }
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: .now)
        let part = hour < 12 ? L("Goedemorgen") : hour < 18 ? L("Goedemiddag") : L("Goedenavond")
        return model.firstName.isEmpty ? part : L("\(part), \(model.firstName)")
    }

    private var headline: String {
        if let walking = live.first { return L("\(walking.dog.name) is nu op pad") }
        if !pending.isEmpty { return L("Er wil iemand met je hond wandelen") }
        if dogs.isEmpty && loaded { return L("Zet je hond erop") }
        return L("Alles rustig thuis")
    }

    private func liveCard(_ item: Appointment) -> some View {
        Button { following = item } label: {
            HStack(spacing: 14) {
                DogPortrait(look: item.dog.look, photoURL: item.dog.photos.first.flatMap(URL.init(string:)), cornerRadius: 18)
                    .frame(width: 60, height: 60)
                VStack(alignment: .leading, spacing: 2) {
                    Label("Live", systemImage: "dot.radiowaves.left.and.right")
                        .font(.caption.weight(.bold)).foregroundStyle(Palette.onBall)
                        .symbolEffect(.pulse)
                    Text("\(item.dog.name) is op pad met \(item.walker?.firstName ?? L("de wandelaar"))")
                        .font(.headline).foregroundStyle(Palette.onBall)
                    Text("Tik om live mee te kijken").font(.subheadline).foregroundStyle(Palette.onBall.opacity(0.8))
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(Palette.onBall)
            }
            .padding(16)
            .background(Palette.ball, in: .rect(cornerRadius: 24, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func load() async {
        await model.refreshAppointments()
        await ProgressStore.shared.load()
        if let r: MyDogsResponse = try? await APIClient.shared.get("/api/v1/my-dogs") { withAnimation { dogs = r.dogs } }
        loaded = true
    }
}

/// First steps for owners: add a dog, meet a walker, give trust.
private struct OwnerSteps: View {
    @Environment(AppModel.self) private var model
    let hasDog: Bool
    let loaded: Bool
    var addDog: () -> Void

    private struct Step: Identifiable { let id: Int; let title: String; let hint: String; let done: Bool; let symbol: String }

    private var steps: [Step] {
        let incoming = model.appointments.incoming
        let met = incoming.contains { $0.status == "completed" || ($0.status == "accepted" && $0.startsAt < .now) }
        let trusted = incoming.contains { $0.trust?.soloAllowed == true }
        return [
            Step(id: 0, title: L("Zet je hond erop"), hint: L("Een foto en een paar zinnen over wie hij is."), done: hasDog, symbol: "pawprint.fill"),
            Step(id: 1, title: L("Accepteer een kennismaking"), hint: L("Je krijgt een melding als iemand wil wandelen."), done: incoming.contains { $0.status != "pending" && $0.status != "declined" }, symbol: "person.2.fill"),
            Step(id: 2, title: L("Maak kennis, samen op pad"), hint: L("De eerste keer loop je mee en bekijk je het ID."), done: met, symbol: "figure.walk"),
            Step(id: 3, title: L("Geef vertrouwen"), hint: L("Daarna mag de wandelaar zelfstandig met je hond."), done: trusted, symbol: "hand.thumbsup.fill"),
        ]
    }

    var body: some View {
        let all = steps
        let done = all.filter(\.done).count
        if loaded, done < all.count {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Zo werkt het voor eigenaren").font(.headline)
                        Text("\(done) van \(all.count) gedaan").font(.subheadline).foregroundStyle(Palette.muted)
                    }
                    Spacer()
                    ZStack {
                        Circle().stroke(Palette.line, lineWidth: 6)
                        Circle().trim(from: 0, to: CGFloat(done) / CGFloat(all.count))
                            .stroke(Palette.grass, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        Image(systemName: "house.fill").foregroundStyle(Palette.grass)
                    }
                    .frame(width: 46, height: 46)
                }
                ForEach(all) { step in
                    let next = !step.done && all.first(where: { !$0.done })?.id == step.id
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: step.done ? "checkmark" : step.symbol)
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(step.done ? Palette.onGrass : (next ? Palette.onBall : Palette.muted))
                            .frame(width: 34, height: 34)
                            .background(step.done ? Palette.grass : (next ? Palette.ball : Palette.sunken), in: .circle)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(step.title).font(.subheadline.weight(.semibold))
                                .strikethrough(step.done, color: Palette.muted)
                                .foregroundStyle(step.done ? Palette.muted : Palette.ink)
                            if next { Text(step.hint).font(.footnote).foregroundStyle(Palette.muted) }
                        }
                        Spacer()
                        if next && step.id == 0 {
                            Button("Toevoegen") { addDog() }.buttonStyle(.borderedProminent).tint(Palette.grass).font(.footnote.weight(.bold))
                        }
                    }
                }
            }
            .padding(18)
            .background(Palette.surface, in: .rect(cornerRadius: 24, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).strokeBorder(Palette.grass.opacity(0.25), lineWidth: 1))
        }
    }
}

/// Tips for owners: about handing over the dog, not about walking it.
private struct OwnerTip: View {
    private var tips: [(String, String)] { [
        ("bag.fill", L("Leg zakjes, riem en een koekje klaar bij de deur. Dan is de overdracht zo gedaan.")),
        ("text.bubble.fill", L("Vertel de wandelaar waar je hond van schrikt. Dat helpt meer dan een lange lijst regels.")),
        ("clock.fill", L("Vaste momenten werken het best. Je hond gaat er zelfs naar uitkijken.")),
        ("camera.fill", L("Vraag of de wandelaar een foto stuurt. Dan wandel je in gedachten een beetje mee.")),
        ("heart.fill", L("Na een paar rondjes ken je elkaar. Dan kun je zelfstandig wandelen toestaan.")),
    ] }

    var body: some View {
        let day = Calendar.current.ordinality(of: .day, in: .year, for: .now) ?? 0
        let tip = tips[day % tips.count]
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: tip.0)
                .font(.title3).foregroundStyle(Palette.onBall)
                .frame(width: 44, height: 44)
                .background(Palette.ball, in: .rect(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 4) {
                Text("Tip van vandaag").font(.caption.weight(.bold)).foregroundStyle(Palette.onGrass.opacity(0.8))
                Text(tip.1).font(.subheadline).foregroundStyle(Palette.onGrass)
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .background(LinearGradient(colors: [Palette.walkBackground, Palette.grass], startPoint: .topLeading, endPoint: .bottomTrailing), in: .rect(cornerRadius: 24, style: .continuous))
    }
}
