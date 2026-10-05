import CryptoKit
import Foundation
import Security

// Signing in with Apple or Google: the same accounts as on the website (Better Auth on the server).
// Apple goes through the native sheet when the server knows the app (identity token + nonce);
// Google, and Apple when the native sheet is not possible, go through the website in a secure
// browser sheet that hands the app a one-time code (rondje://auth/callback?code=…), which only
// this app can exchange: it holds the PKCE verifier behind the challenge it sent at the start.

/// The public settings from GET /api/v1/config. Older servers send no `auth`: then e-mail only.
/// And no `support`: then no "Help ons" row (HelpUs.swift). And no `features`: then live location
/// during walks is on, as it always was (LiveLocation.swift).
struct AppConfig: Decodable, Sendable {
    var auth: AuthOptions?
    var support: SupportOptions?
    var features: ServerSwitches?

    init(auth: AuthOptions? = nil, support: SupportOptions? = nil, features: ServerSwitches? = nil) {
        self.auth = auth
        self.support = support
        self.features = features
    }

    private enum CodingKeys: String, CodingKey { case auth, support, features }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        auth = try c.decodeIfPresent(AuthOptions.self, forKey: .auth)
        // Whatever is wrong with `support` only hides that row; signing in keeps working.
        support = try? c.decodeIfPresent(SupportOptions.self, forKey: .support)
        features = (try? c.decodeIfPresent(ServerSwitches.self, forKey: .features)) ?? nil
    }

    /// Live location during walks: on unless the server says off.
    var liveLocation: Bool { features?.liveLocation ?? true }
}

struct AuthOptions: Decodable, Equatable, Sendable {
    /// Better Auth provider ids the server has keys for, such as "apple" and "google".
    var providers: [String]?
    /// The server accepts an identity token from the native Sign in with Apple sheet.
    var appleNative: Bool?
}

enum SocialProvider: String, Sendable {
    case apple, google

    var name: String { self == .apple ? "Apple" : "Google" }
}

/// Which sign-in buttons to show.
struct SocialOptions: Equatable {
    /// The native Sign in with Apple sheet.
    var nativeApple = false
    /// Apple through the website, when the server or this build cannot do the native sheet.
    var webApple = false
    var google = false

    var any: Bool { nativeApple || webApple || google }

    init(_ auth: AuthOptions?, nativeAppleAllowed: Bool) {
        let providers = Set(auth?.providers ?? [])
        let apple = providers.contains(SocialProvider.apple.rawValue)
        nativeApple = apple && auth?.appleNative == true && nativeAppleAllowed
        webApple = apple && !nativeApple
        google = providers.contains(SocialProvider.google.rawValue)
    }
}

/// The nonce for Sign in with Apple: Apple puts sha256(raw) in the identity token, the server
/// gets the raw value and checks that they match, so a stolen token cannot be replayed.
enum Nonce {
    /// 64 characters, so a random byte maps onto them without bias.
    private static let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_")

    static func random(length: Int = 32) -> String {
        var bytes = [UInt8](repeating: 0, count: length)
        if SecRandomCopyBytes(kSecRandomDefault, length, &bytes) != errSecSuccess {
            var generator = SystemRandomNumberGenerator()
            bytes = bytes.map { _ in UInt8.random(in: .min ... .max, using: &generator) }
        }
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    /// Lowercase hex SHA-256, what Apple expects in `request.nonce`.
    static func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

/// PKCE for the browser sheet: a secret verifier stays in the app, the server only sees its hash.
enum PKCE {
    /// 43 characters from the unreserved set, the minimum RFC 7636 allows.
    static func verifier() -> String { Nonce.random(length: 43) }

    /// base64url (no padding) of the SHA-256 of the verifier: 43 characters.
    static func challenge(for verifier: String) -> String {
        Data(SHA256.hash(data: Data(verifier.utf8))).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

/// The address the website sends the browser sheet back to when signing in is done.
enum NativeAuthCallback: Equatable {
    case code(String)
    /// An error code from the server, for example "cancelled", "account-not-linked" or "expired".
    case failure(String)

    static let scheme = "rondje"

    static func parse(_ url: URL) -> NativeAuthCallback {
        guard url.scheme?.lowercased() == scheme, url.host()?.lowercased() == "auth", url.path() == "/callback",
              let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems
        else { return .failure("invalid_callback") }
        if let error = items.first(where: { $0.name == "error" })?.value, !error.isEmpty { return .failure(error) }
        if let code = items.first(where: { $0.name == "code" })?.value, !code.isEmpty { return .code(code) }
        return .failure("invalid_callback")
    }

    /// Where the browser sheet starts: the website sends the person on to the provider.
    static func startURL(base: URL, provider: SocialProvider, codeChallenge: String) -> URL? {
        var components = URLComponents(url: base.appending(path: "api/auth/native/start"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "provider", value: provider.rawValue),
            URLQueryItem(name: "codeChallenge", value: codeChallenge),
        ]
        return components?.url
    }

    /// The person stopped on purpose; nothing to tell them.
    static func isCancel(_ error: String) -> Bool {
        ["cancelled", "canceled", "access-denied", "access_denied"].contains(error.lowercased())
    }
}

/// The build switch RONDJE_FEATURE_SOCIAL_LOGIN (project.yml, via Info.plist). Off by default:
/// Apple and Google stay hidden until the Apple Developer account and the keys are there.
enum SocialSignInFeature {
    static var isOn: Bool { flag(Bundle.main.object(forInfoDictionaryKey: "RondjeFeatureSocialLogin")) }

    static func flag(_ raw: Any?) -> Bool {
        if let value = raw as? Bool { return value }
        guard let text = raw as? String else { return false }
        return ["yes", "true", "1"].contains(text.trimmingCharacters(in: .whitespaces).lowercased())
    }
}

/// Whether this build may open the native Sign in with Apple sheet. A build for a free Apple ID
/// (device.sh) has a provisioning profile without the capability; App Store, TestFlight and
/// simulator builds carry no profile in the app, so they count as yes (and fall back to the
/// website if the sheet still fails).
enum AppleSignInSupport {
    static let entitlement = "com.apple.developer.applesignin"

    static let allowedByBuild: Bool = {
        let profile = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision").flatMap { try? Data(contentsOf: $0) }
        return allows(profile: profile)
    }()

    /// A .mobileprovision file is a signed envelope around a plain XML property list.
    static func allows(profile: Data?) -> Bool {
        guard let profile else { return true }
        guard let start = profile.range(of: Data("<?xml".utf8)),
              let end = profile.range(of: Data("</plist>".utf8), in: start.lowerBound..<profile.endIndex),
              let plist = try? PropertyListSerialization.propertyList(from: profile[start.lowerBound..<end.upperBound], format: nil) as? [String: Any],
              let entitlements = plist["Entitlements"] as? [String: Any]
        else { return true }
        return entitlements[entitlement] != nil
    }
}

/// The sign-in options from the server, loaded once per run and shared by the welcome and sign-in screens.
@MainActor
@Observable
final class SocialSignIn {
    static let shared = SocialSignIn()

    private(set) var auth: AuthOptions?
    /// The native sheet failed in this run (for example a build without the capability): use the website.
    var nativeAppleFailed = false
    private var loaded = false

    /// An Apple sign-in that met an existing password account with the same e-mail address. Kept in
    /// memory only, for a few minutes: once the person logs in with their password, Apple is linked.
    private var appleToLink: (token: String, nonce: String, until: Date)?

    var options: SocialOptions {
        SocialOptions(auth, nativeAppleAllowed: !nativeAppleFailed && AppleSignInSupport.allowedByBuild)
    }

    func load() async {
        #if DEBUG
        // For screenshots against a local server without keys: `-RondjeForceSocial YES` as launch
        // argument shows both buttons, also with the build switch off.
        if UserDefaults.standard.bool(forKey: "RondjeForceSocial") {
            auth = AuthOptions(providers: [SocialProvider.apple.rawValue, SocialProvider.google.rawValue], appleNative: true)
            return
        }
        #endif
        guard SocialSignInFeature.isOn, !loaded, let config = try? await APIClient.shared.config() else { return }
        auth = config.auth
        loaded = true
    }

    func rememberAppleLink(token: String, nonce: String) {
        // Apple's identity token is valid for ten minutes.
        appleToLink = (token, nonce, .now.addingTimeInterval(9 * 60))
    }

    /// After a password login: links the Apple ID the person just tried, so Apple works next time.
    /// Returns whether that happened; a failure only means Apple is not linked yet.
    func linkRememberedApple() async -> Bool {
        guard let link = appleToLink else { return false }
        appleToLink = nil
        guard link.until > .now else { return false }
        return (try? await APIClient.shared.linkApple(identityToken: link.token, nonce: link.nonce)) != nil
    }
}
