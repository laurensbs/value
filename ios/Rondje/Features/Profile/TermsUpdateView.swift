import SwiftUI

// The calm side of changed terms (Core/Terms.swift): the sheet that shows what changed, the notice
// under Jij, and the step on a dog's page. No countdown, no red, nothing that hurries: the full terms are
// one tap away in Safari, and someone who does not agree can always delete their account (art. 19).

/// One time the sheet comes up: the yes, and what goes ahead after it (the action the server held back).
@MainActor
final class TermsRequest: Identifiable {
    let id = UUID()
    let agreement: TermsAgreement

    init(model: AppModel, retry: (@MainActor () async -> Void)? = nil) {
        agreement = TermsAgreement(reload: { [weak model] in await model?.refreshMe() }, retry: retry)
    }
}

extension View {
    /// Shows the "terms updated" sheet while `request` is set. After "Akkoord" the sheet closes and the
    /// request's retry runs: what the person was doing when the server answered "needs-terms".
    func termsSheet(_ request: Binding<TermsRequest?>) -> some View {
        modifier(TermsSheetModifier(request: request))
    }
}

private struct TermsSheetModifier: ViewModifier {
    @Binding var request: TermsRequest?
    /// The request on screen, kept until the sheet has fully closed: only then does the retry run, so
    /// whatever it opens (a walk, for example) is never blocked by this sheet.
    @State private var closing: TermsRequest?

    func body(content: Content) -> some View {
        content.sheet(item: $request, onDismiss: {
            guard let done = closing else { return }
            closing = nil
            Task { await done.agreement.finish() }
        }) { shown in
            TermsUpdateSheet(agreement: shown.agreement)
                .presentationDetents([.large])
                .presentationCornerRadius(32)
                .onAppear { closing = shown }
        }
    }
}

/// What changed in the terms, a link to all of them, and one "Akkoord", which is only there while the
/// list of changes is on screen (Me.termsToAgree).
struct TermsUpdateSheet: View {
    let agreement: TermsAgreement

    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var loaded = false

    private var state: TermsState { model.me?.termsState ?? .agreed }
    private var changes: TermsChanges? { model.me?.termsChanges }
    /// Loaded and agreed already, for example on the website (not by a yes in this sheet: that one just closes).
    private var upToDate: Bool { loaded && !agreement.agreed && model.me?.termsAccepted == true && !state.needsYes }
    /// The version of the list on screen; nil while there is no list to read, and then no "Akkoord".
    private var shownVersion: String? { model.me?.termsToAgree }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 34))
                        .foregroundStyle(Palette.calm)
                        .accessibilityHidden(true)
                    Text("De voorwaarden zijn bijgewerkt")
                        .font(.display(26))
                        .foregroundStyle(Palette.ink)
                        .accessibilityAddTraits(.isHeader)
                    if upToDate {
                        Text("Je hebt de nieuwste voorwaarden al geaccepteerd.")
                            .foregroundStyle(Palette.muted)
                    } else {
                        Text(TermsText.lede(state))
                            .foregroundStyle(Palette.muted)
                        if let changes, !changes.items.isEmpty {
                            changeList(changes)
                        } else if !loaded {
                            ProgressView().frame(maxWidth: .infinity).padding(.vertical, 8)
                        } else {
                            // Without the list there is nothing to agree to here: no "Akkoord" below.
                            Text("We konden de wijzigingen nu niet laden. Probeer het later nog eens.")
                                .font(.subheadline)
                                .foregroundStyle(Palette.ink)
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Palette.calmSoft, in: .rect(cornerRadius: 14, style: .continuous))
                        }
                    }
                    Button {
                        openURL(changes?.fullTerms ?? TermsChanges.fullTerms("/legal/terms"))
                    } label: {
                        Label("Lees de volledige voorwaarden", systemImage: "arrow.up.right")
                            .font(.subheadline.weight(.semibold))
                    }
                    .tint(Palette.grass)
                    .accessibilityHint(L("Opent de website in je browser"))
                    if !upToDate {
                        Text("Niet akkoord? Je kunt je account altijd verwijderen onder Jij (artikel 19 van de voorwaarden).")
                            .font(.footnote)
                            .foregroundStyle(Palette.muted)
                    }
                }
                .padding(24)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .scrollBounceBehavior(.basedOnSize)
            .safeAreaInset(edge: .bottom) {
                if upToDate || agreement.agreed || shownVersion != nil || agreement.error != nil { footer }
            }
            .screenBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Later") { dismiss() } }
            }
            // The newest changes, also when the app had an older answer saved.
            .task {
                await model.refreshMe()
                loaded = true
            }
        }
    }

    private func changeList(_ changes: TermsChanges) -> some View {
        Card {
            if !changes.intro.isEmpty {
                Text(changes.intro).font(.subheadline.weight(.semibold))
            }
            ForEach(Array(changes.items.enumerated()), id: \.offset) { _, item in
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Image(systemName: "circle.fill")
                        .font(.system(size: 6))
                        .foregroundStyle(Palette.grass)
                        .accessibilityHidden(true)
                    Text(item).font(.subheadline)
                }
            }
        }
    }

    private var footer: some View {
        VStack(spacing: 10) {
            if let message = agreement.error {
                Label(message, systemImage: "info.circle")
                    .font(.subheadline)
                    .foregroundStyle(Palette.ink)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Palette.calmSoft, in: .rect(cornerRadius: 14, style: .continuous))
            }
            if upToDate || agreement.agreed {
                // Also after a yes here, should the sheet still be up: it only closes, nothing is sent again.
                Button("Verder") {
                    agreement.alreadyAgreed()
                    dismiss()
                }
                .buttonStyle(.primary)
            } else if shownVersion != nil {
                Button {
                    Task { await agree() }
                } label: {
                    if agreement.busy { ProgressView().tint(Palette.onGrass) } else { Text("Akkoord") }
                }
                .buttonStyle(.primary)
                .disabled(agreement.busy)
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .background(.bar)
    }

    private func agree() async {
        // The version of the list on screen, never a version without its list.
        guard let version = shownVersion else { return }
        guard await agreement.agree(version: version) else {
            Haptics.soft()
            return
        }
        Haptics.success()
        model.show(L("Dank je. Je akkoord is opgeslagen."))
        dismiss()
    }
}

/// The quiet notice under Jij while the yes is still open: the same sheet, without anything to retry.
struct TermsNoticeCard: View {
    let state: TermsState
    var open: () -> Void

    var body: some View {
        Button(action: open) {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: "doc.text.fill")
                    .font(.title3)
                    .foregroundStyle(Palette.calm)
                    .frame(width: 28)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text("De voorwaarden zijn bijgewerkt")
                        .font(.headline)
                        .foregroundStyle(Palette.ink)
                    Text(TermsText.notice(state))
                        .font(.subheadline)
                        .foregroundStyle(Palette.muted)
                    Text("Lees wat er verandert")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Palette.calm)
                        .padding(.top, 2)
                }
                .multilineTextAlignment(.leading)
                Spacer(minLength: 0)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.calmSoft, in: .rect(cornerRadius: 20, style: .continuous))
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }
}

/// On a dog's page, once the new terms apply: one friendly step instead of the request buttons.
struct TermsGate: View {
    var open: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            Text("Eerst graag je akkoord met de bijgewerkte voorwaarden.")
                .font(.footnote)
                .foregroundStyle(Palette.muted)
                .multilineTextAlignment(.center)
            Button(action: open) {
                Label("Lees wat er verandert", systemImage: "doc.text.fill")
            }
            .buttonStyle(.primary)
        }
    }
}
