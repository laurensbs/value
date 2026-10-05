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

                    // A dog out on a walk right now comes first: that is the moment that matters.
                    ForEach(live) { item in liveCard(item) }

                    NextStepCard(placement: .home, myDogsCount: loaded ? dogs.count : nil, addDog: { adding = true })
                    // One Guus at a time: the week in review waits until Guus has said hello.
                    if !NextStepCard.introPending { WeekRecapCard(side: .owner) }

                    ForEach(model.appointments.incoming.filter { HomecomingCard.shouldShow($0) }) { HomecomingCard(item: $0) }

                    OwnerSteps(hasDog: !dogs.isEmpty, loaded: loaded) { adding = true }
                    if !NextStepCard.introPending {
                        GuusHint(id: "owner", text: L("Hier zie je wie met je hond wil wandelen. Jij beslist altijd zelf."))
                    }

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

                    OwnerTip()
                        .padding(.top, 8)
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
                FollowWalkView(walkId: item.walkId ?? "", dogName: item.dog.name, kind: item.kind)
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
                // "Live" only for a walk that shares where they are: a walk alone with the dog, with live
                // location on (WalkStarter.sharesLocation). Never for a first meeting.
                let live = WalkStarter.sharesLocation(kind: item.kind, liveLocation: ServerFeatures.shared.liveLocation)
                VStack(alignment: .leading, spacing: 2) {
                    Label(live ? L("Live") : L("Onderweg"), systemImage: live ? "dot.radiowaves.left.and.right" : "figure.walk")
                        .font(.caption.weight(.bold)).foregroundStyle(Palette.onBall)
                        .symbolEffect(.pulse)
                    Text("\(item.dog.name) is op pad met \(item.walker?.firstName ?? L("de wandelaar"))")
                        .font(.headline).foregroundStyle(Palette.onBall)
                    Text(live ? L("Tik om live mee te kijken") : L("Tik om het rondje te bekijken"))
                        .font(.subheadline).foregroundStyle(Palette.onBall.opacity(0.8))
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

    private var steps: [ChecklistStep] {
        let incoming = model.appointments.incoming
        let met = incoming.contains { $0.status == "completed" || ($0.status == "accepted" && $0.startsAt < .now) }
        let trusted = incoming.contains { $0.trust?.soloAllowed == true }
        return [
            ChecklistStep(id: 0, title: L("Zet je hond erop"), hint: L("Een foto en een paar zinnen over wie hij is."), done: hasDog, symbol: "pawprint.fill"),
            ChecklistStep(id: 1, title: L("Accepteer een kennismaking"), hint: L("Je krijgt een melding als iemand wil wandelen."), done: incoming.contains { $0.status != "pending" && $0.status != "declined" }, symbol: "person.2.fill"),
            ChecklistStep(id: 2, title: L("Maak kennis, samen op pad"), hint: L("De eerste keer loop je mee en bekijk je het ID."), done: met, symbol: "figure.walk"),
            ChecklistStep(id: 3, title: L("Geef vertrouwen"), hint: L("Daarna mag de wandelaar zelfstandig met je hond."), done: trusted, symbol: "hand.thumbsup.fill"),
        ]
    }

    var body: some View {
        let all = steps
        if loaded, all.contains(where: { !$0.done }) {
            ChecklistCard(title: L("Zo werkt het voor eigenaren"), symbol: "house.fill", steps: all,
                          action: (step: 0, title: L("Toevoegen"), run: addDog))
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
