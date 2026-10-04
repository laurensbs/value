import AuthenticationServices
import SwiftUI

/// "Ga door met Apple" and "Doorgaan met Google" above the e-mail options, with an "of" line
/// below them. The screen around it loads the options (SocialSignIn.load) and only includes
/// this view when there is something to show.
struct SocialSignInButtons: View {
    /// Shows a failure in the style of the screen around it (error text or banner).
    var onError: (String) -> Void
    /// Signed in and the account is loaded (for example: close the sheet).
    var onSuccess: () -> Void = {}

    @Environment(AppModel.self) private var model
    @Environment(\.webAuthenticationSession) private var webAuthenticationSession
    @Environment(\.colorScheme) private var colorScheme
    @State private var store = SocialSignIn.shared
    @State private var nonce: String?
    @State private var busy: SocialProvider?

    var body: some View {
        let options = store.options
        VStack(spacing: 12) {
            if options.any {
                if options.nativeApple {
                    SignInWithAppleButton(.continue) { request in
                        let raw = Nonce.random()
                        nonce = raw
                        request.requestedScopes = [.fullName, .email]
                        request.nonce = Nonce.sha256(raw)
                    } onCompletion: { result in
                        Task { await completeApple(result) }
                    }
                    .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                    .id(colorScheme)
                    // Apple sizes its title from the button's height: 44 points gives about the same
                    // text size as the other buttons, the capsule around it the same 54-point shape.
                    .frame(height: 44)
                    .padding(.vertical, 5)
                    .background(colorScheme == .dark ? Color.white : Color.black)
                    .clipShape(.capsule)
                    .overlay { if busy == .apple { BusyOverlay(dark: colorScheme != .dark) } }
                } else if options.webApple {
                    Button { Task { await signInOnTheWeb(.apple) } } label: {
                        Label { Text("Ga door met Apple") } icon: { Image(systemName: "apple.logo") }
                            .opacity(busy == .apple ? 0 : 1)
                            .overlay { if busy == .apple { ProgressView() } }
                    }
                    .buttonStyle(AppleWebButtonStyle())
                    .transition(.opacity)
                }
                if options.google {
                    Button { Task { await signInOnTheWeb(.google) } } label: {
                        HStack(spacing: 10) {
                            Image("GoogleG").resizable().frame(width: 20, height: 20).accessibilityHidden(true)
                            Text("Doorgaan met Google")
                        }
                        .opacity(busy == .google ? 0 : 1)
                        .overlay { if busy == .google { ProgressView().tint(GoogleButtonStyle.text) } }
                    }
                    .buttonStyle(GoogleButtonStyle())
                }
                OrDivider().padding(.vertical, 2)
            }
        }
        // Not .disabled: that greys out the spinner. Taps simply wait until the current sign-in is done.
        .allowsHitTesting(busy == nil)
        .animation(.snappy, value: options)
    }

    private func completeApple(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let data = credential.identityToken, let token = String(data: data, encoding: .utf8), let nonce
            else { return fail(L("Inloggen met \(SocialProvider.apple.name) lukte niet. Probeer het opnieuw.")) }
            self.nonce = nil
            await finish(.apple) {
                do {
                    try await APIClient.shared.signInWithApple(identityToken: token, nonce: nonce, name: credential.fullName)
                } catch let error as APIError where error.code == "link" {
                    // A password account with this address exists: after the password login, link Apple to it.
                    store.rememberAppleLink(token: token, nonce: nonce)
                    throw error
                }
            }
        case .failure(let error):
            nonce = nil
            switch (error as? ASAuthorizationError)?.code {
            case .canceled?:
                return
            case .unknown?, .notHandled?:
                // This build cannot open the sheet (no Sign in with Apple capability): use the website instead.
                store.nativeAppleFailed = true
                await signInOnTheWeb(.apple)
            default:
                fail(L("Inloggen met \(SocialProvider.apple.name) lukte niet. Probeer het opnieuw."))
            }
        }
    }

    /// Apple or Google through the website in a secure browser sheet, back with a one-time code.
    private func signInOnTheWeb(_ provider: SocialProvider) async {
        let verifier = PKCE.verifier()
        guard busy == nil,
              let url = NativeAuthCallback.startURL(base: Brand.baseURL, provider: provider, codeChallenge: PKCE.challenge(for: verifier))
        else { return }
        busy = provider
        defer { if busy == provider { busy = nil } }
        let callback: URL
        do {
            callback = try await webAuthenticationSession.authenticate(
                using: url,
                callback: .customScheme(NativeAuthCallback.scheme),
                preferredBrowserSession: .shared,
                additionalHeaderFields: [:]
            )
        } catch {
            if (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin || error is CancellationError { return }
            return fail(L("Inloggen met \(provider.name) lukte niet. Probeer het opnieuw."))
        }
        switch NativeAuthCallback.parse(callback) {
        case .code(let code):
            await finish(provider) { try await APIClient.shared.exchangeNativeCode(code, verifier: verifier) }
        case .failure(let reason):
            if NativeAuthCallback.isCancel(reason) { return }
            fail(APIClient.socialAuthError(code: reason, status: 400, provider: provider).localizedDescription)
        }
    }

    /// Stores the session, loads the account and moves on to onboarding or the app.
    private func finish(_ provider: SocialProvider, _ signIn: () async throws -> Void) async {
        busy = provider
        defer { busy = nil }
        do {
            try await signIn()
            await model.signedIn()
            guard model.phase != .signedOut else { return fail(L("Inloggen lukte niet. Probeer het opnieuw.")) }
            onSuccess()
        } catch is CancellationError {
            return
        } catch {
            fail(error.plainText)
        }
    }

    private func fail(_ message: String) {
        Haptics.error()
        onError(message)
    }
}

/// A thin line with "of" in the middle, between the social buttons and e-mail.
struct OrDivider: View {
    var body: some View {
        HStack(spacing: 12) {
            Capsule().fill(Palette.line).frame(height: 1)
            Text("of")
                .font(.footnote.weight(.medium))
                .foregroundStyle(Palette.muted)
                .fixedSize()
            Capsule().fill(Palette.line).frame(height: 1)
        }
        .accessibilityElement(children: .combine)
    }
}

/// Google's own look: white, a thin grey edge, dark text and the four-colour G.
private struct GoogleButtonStyle: ButtonStyle {
    static let text = Color(hex: 0x1F1F1F)

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(Self.text)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(Color.white, in: .capsule)
            .overlay(Capsule().strokeBorder(Color(hex: 0x747775), lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(duration: 0.25, bounce: 0.4), value: configuration.isPressed)
    }
}

/// Apple through the website looks like Apple's own button: black, or white in dark mode, with
/// Apple's own Dutch title ("Ga door met Apple").
private struct AppleWebButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var colorScheme

    func makeBody(configuration: Configuration) -> some View {
        let dark = colorScheme == .dark
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(dark ? Color.black : Color.white)
            .tint(dark ? Color.black : Color.white)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(dark ? Color.white : Color.black, in: .capsule)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(duration: 0.25, bounce: 0.4), value: configuration.isPressed)
    }
}

/// A spinner over the native Apple button while the server signs the person in.
private struct BusyOverlay: View {
    var dark: Bool

    var body: some View {
        ZStack {
            Capsule().fill(dark ? Color.black : Color.white)
            ProgressView().tint(dark ? .white : .black)
        }
    }
}
