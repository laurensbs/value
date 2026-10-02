import SwiftUI

/// "Word lid van Rondje": Rondje stays free and ad-free, and is carried by members who give.
/// Giving never happens inside the app for now: there is no ANBI foundation yet, so the button
/// opens the website in Safari (App Store rule 3.2.2(iv) allows that for fundraising).
struct MembershipCard: View {
    @State private var open = false
    @State private var wag = false

    var body: some View {
        Button { open = true } label: {
            HStack(spacing: 14) {
                Image(systemName: "heart.fill")
                    .font(.title2)
                    .foregroundStyle(Palette.onBall)
                    .frame(width: 52, height: 52)
                    .background(Palette.ball, in: .rect(cornerRadius: 16, style: .continuous))
                    .symbolEffect(.bounce, value: wag)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Word lid van \(Brand.name)").font(.headline).foregroundStyle(Palette.onGrass)
                    Text("Help een rondje: gratis voor iedereen, zonder reclame.")
                        .font(.subheadline).foregroundStyle(Palette.onGrass.opacity(0.85))
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(Palette.onGrass.opacity(0.7))
            }
            .padding(16)
            .background(Palette.walkBackground, in: .rect(cornerRadius: 24, style: .continuous))
        }
        .buttonStyle(.plain)
        .onAppear { wag.toggle() }
        .sheet(isPresented: $open) {
            MembershipView().presentationDetents([.large]).presentationCornerRadius(32)
        }
    }
}

struct MembershipView: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Gratis, en dat blijft zo").font(.subheadline.weight(.semibold)).foregroundStyle(Palette.grass)
                        Text("Word lid van \(Brand.name)").font(.display(32))
                        Text("\(Brand.name) is gratis voor wandelaars, eigenaren en opvangen. Leden houden het veilig en online, en een deel gaat naar goede doelen.")
                            .foregroundStyle(Palette.muted)
                    }

                    Card {
                        Text("Onze belofte").font(.headline)
                        promise(L("Geen abonnement, geen betaalmuur, geen premiumversie."))
                        promise(L("Geen advertenties in \(Brand.name)."))
                        promise(L("We verkopen nooit gegevens."))
                        promise(L("Leden krijgen geen voorrang: iedereen gebruikt \(Brand.name) op dezelfde manier."))
                    }

                    Card {
                        Text("Waar we aan willen bijdragen").font(.headline)
                        ForEach(Brand.causes) { cause in
                            HStack(alignment: .top, spacing: 12) {
                                Image(systemName: cause.symbol)
                                    .font(.title3)
                                    .foregroundStyle(Palette.grass)
                                    .frame(width: 44, height: 44)
                                    .background(Palette.grassSoft, in: .rect(cornerRadius: 14, style: .continuous))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(cause.name).font(.subheadline.weight(.semibold))
                                    Text(cause.line).font(.footnote).foregroundStyle(Palette.muted)
                                }
                            }
                        }
                        Text("We maken hier nog afspraken over. Zodra die rond zijn, zie je hier precies welke organisaties het zijn en waar je bijdrage heen gaat.")
                            .font(.footnote).foregroundStyle(Palette.muted)
                    }

                    Card {
                        Label("Lid worden gaat via de website", systemImage: "safari")
                            .font(.headline)
                        Text("In de app kan dat later, zodra \(Brand.name) een stichting met ANBI-status is. Dan is je gift ook aftrekbaar.")
                            .font(.subheadline).foregroundStyle(Palette.muted)
                    }

                    Button {
                        openURL(Brand.web("/support"))
                    } label: {
                        Label("Help een rondje", systemImage: "arrow.up.right")
                    }
                    .buttonStyle(.ball)
                }
                .padding(22)
            }
            .screenBackground()
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Sluit", systemImage: "xmark") { dismiss() } } }
        }
    }

    private func promise(_ text: String) -> some View {
        Label { Text(text).font(.subheadline) } icon: { Image(systemName: "checkmark.circle.fill").foregroundStyle(Palette.grass) }
    }
}
