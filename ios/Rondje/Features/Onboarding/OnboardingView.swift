import SwiftUI

/// A few short steps after sign-up. The server checks the same rules (18+, terms accepted).
struct OnboardingView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL

    @State private var step = 0
    @State private var wantsToWalk = true
    @State private var hasDogs = false
    @State private var firstName = ""
    @State private var birthDate = Calendar.current.date(byAdding: .year, value: -22, to: .now) ?? .now
    @State private var country = "NL"
    @State private var city = ""
    @State private var position: (lat: Double, lng: Double)?
    @State private var locating = false
    @State private var experience = "some"
    @State private var termsAccepted = false
    @State private var busy = false
    @State private var error: String?

    private let steps = 4
    private var adultCutoff: Date { Calendar.current.date(byAdding: .year, value: -18, to: .now) ?? .now }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                ForEach(0..<steps, id: \.self) { i in
                    Capsule()
                        .fill(i <= step ? Palette.grass : Palette.line)
                        .frame(height: 5)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 12)
            .animation(.snappy, value: step)

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    switch step {
                    case 0: intent
                    case 1: aboutYou
                    case 2: place
                    default: agreements
                    }
                    ErrorText(message: error)
                }
                .padding(24)
                .id(step)
                .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .move(edge: .leading).combined(with: .opacity)))
            }
            .scrollDismissesKeyboard(.interactively)

            HStack(spacing: 12) {
                if step > 0 {
                    Button("Terug") { withAnimation(.snappy) { step -= 1; error = nil } }
                        .buttonStyle(.secondary)
                        .frame(width: 120)
                }
                Button {
                    next()
                } label: {
                    if busy { ProgressView().tint(Palette.onGrass) } else { Text(step == steps - 1 ? "Klaar, laat me honden zien" : "Verder") }
                }
                .buttonStyle(.primary)
                .disabled(!canContinue || busy)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 12)
        }
        .screenBackground()
        .sensoryFeedback(.selection, trigger: step)
        .onAppear { if firstName.isEmpty { firstName = model.me?.user.name ?? "" } }
    }

    private var canContinue: Bool {
        switch step {
        case 0: wantsToWalk || hasDogs
        case 1: !firstName.trimmingCharacters(in: .whitespaces).isEmpty && birthDate <= adultCutoff
        case 2: !city.trimmingCharacters(in: .whitespaces).isEmpty
        default: termsAccepted
        }
    }

    private var intent: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Wat brengt je hier?").font(.display(30))
            Text("Je kunt allebei aanzetten.").foregroundStyle(Palette.muted)
            choice("Ik wil wandelen", "Met een hond van iemand uit de buurt of uit de opvang.", "figure.walk", isOn: $wantsToWalk)
            choice("Ik heb een hond", "Of ik regel het voor een buurvrouw, opa of oma.", "pawprint.fill", isOn: $hasDogs)
        }
    }

    private var aboutYou: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Over jou").font(.display(30))
            TextField("Voornaam", text: $firstName)
                .textContentType(.givenName)
                .padding(16)
                .background(Palette.surface, in: .rect(cornerRadius: 16, style: .continuous))
            Card {
                DatePicker("Geboortedatum", selection: $birthDate, in: ...Date.now, displayedComponents: .date)
                    .environment(\.locale, Format.dutch)
                Text("Anderen zien alleen je leeftijdsgroep, nooit je geboortedatum.")
                    .font(.footnote).foregroundStyle(Palette.muted)
            }
            if birthDate > adultCutoff {
                ErrorText(message: "\(Brand.name) is voor mensen van 18 jaar en ouder.")
            }
            Text("Hoeveel ervaring heb je met honden?").font(.headline).padding(.top, 4)
            Picker("Ervaring", selection: $experience) {
                Text("Geen").tag("none")
                Text("Wat").tag("some")
                Text("Veel").tag("lots")
            }
            .pickerStyle(.segmented)
        }
    }

    private var place: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Waar woon je?").font(.display(30))
            Text("Zo vinden we honden bij jou in de buurt. Je profiel toont alleen je plaats.")
                .foregroundStyle(Palette.muted)
            Picker("Land", selection: $country) {
                Text("Nederland").tag("NL")
                Text("België").tag("BE")
                Text("Spanje").tag("ES")
            }
            .pickerStyle(.segmented)
            TextField("Plaats", text: $city)
                .textContentType(.addressCity)
                .padding(16)
                .background(Palette.surface, in: .rect(cornerRadius: 16, style: .continuous))
            Button {
                Task { await locate() }
            } label: {
                Label(position == nil ? "Gebruik mijn buurt" : "Buurt opgeslagen (afgerond op 1 km)", systemImage: position == nil ? "location.fill" : "checkmark.circle.fill")
            }
            .buttonStyle(.secondary)
            .disabled(locating)
        }
    }

    private var agreements: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Zo houden we het veilig").font(.display(30))
            Card {
                rule("person.2.fill", "Eerst kennismaken, met de eigenaar of de opvang erbij.")
                rule("person.text.rectangle", "De eigenaar ziet je ID in het echt. \(Brand.name) bewaart geen kopie.")
                rule("link", "Altijd aan de lijn, tenzij de eigenaar het anders zegt.")
                rule("eurosign.circle", "Geen geld: \(Brand.name) is gratis, voor iedereen.")
                rule("exclamationmark.bubble.fill", "Gebeurt er iets? Meld het meteen in de app.")
            }
            Toggle(isOn: $termsAccepted.animation(.snappy)) {
                Text("Ik ga akkoord met de voorwaarden, de privacyverklaring en de gedragscode.")
                    .font(.subheadline)
            }
            .tint(Palette.grass)
            HStack(spacing: 16) {
                Button("Voorwaarden") { openURL(Brand.web("/legal/terms")) }
                Button("Privacy") { openURL(Brand.web("/legal/privacy")) }
                Button("Gedragscode") { openURL(Brand.web("/legal/conduct")) }
            }
            .font(.footnote.weight(.semibold))
        }
    }

    private func choice(_ title: String, _ text: String, _ symbol: String, isOn: Binding<Bool>) -> some View {
        Button {
            isOn.wrappedValue.toggle()
        } label: {
            HStack(spacing: 14) {
                Image(systemName: symbol)
                    .font(.title2)
                    .frame(width: 48, height: 48)
                    .background(isOn.wrappedValue ? Palette.grass : Palette.sunken, in: .rect(cornerRadius: 14, style: .continuous))
                    .foregroundStyle(isOn.wrappedValue ? Palette.onGrass : Palette.ink)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.headline)
                    Text(text).font(.subheadline).foregroundStyle(Palette.muted)
                }
                Spacer()
                Image(systemName: isOn.wrappedValue ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(isOn.wrappedValue ? Palette.grass : Palette.line)
                    .contentTransition(.symbolEffect(.replace))
            }
            .padding(16)
            .background(Palette.surface, in: .rect(cornerRadius: 20, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(isOn.wrappedValue ? Palette.grass : .clear, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.selection, trigger: isOn.wrappedValue)
        .animation(.snappy, value: isOn.wrappedValue)
    }

    private func rule(_ symbol: String, _ text: String) -> some View {
        Label { Text(text).font(.subheadline) } icon: { Image(systemName: symbol).foregroundStyle(Palette.grass) }
    }

    private func locate() async {
        locating = true
        defer { locating = false }
        LocationService.shared.requestPermission()
        for _ in 0..<20 where LocationService.shared.authorization == .notDetermined {
            try? await Task.sleep(for: .milliseconds(300))
        }
        position = await LocationService.shared.roughPosition()
        if position == nil { error = "Je locatie is niet beschikbaar. Vul je plaats in; dat is genoeg." }
    }

    private func next() {
        error = nil
        if step < steps - 1 {
            withAnimation(.snappy) { step += 1 }
        } else {
            Task { await submit() }
        }
    }

    private struct Payload: Encodable {
        var firstName, birthDate, country, city, experience: String
        var lat, lng: Double?
        var wantsToWalk, hasDogs, termsAccepted: Bool
    }

    private func submit() async {
        busy = true
        defer { busy = false }
        let date = birthDate.formatted(.iso8601.year().month().day())
        do {
            let _: OK = try await APIClient.shared.post("/api/v1/profile", Payload(
                firstName: firstName.trimmingCharacters(in: .whitespaces), birthDate: date, country: country,
                city: city.trimmingCharacters(in: .whitespaces), experience: experience,
                lat: position?.lat, lng: position?.lng, wantsToWalk: wantsToWalk, hasDogs: hasDogs, termsAccepted: termsAccepted
            ))
            Haptics.success()
            await model.refreshMe()
        } catch {
            Haptics.error()
            withAnimation { self.error = error.localizedDescription }
        }
    }
}
