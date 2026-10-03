import Foundation
import Testing
@testable import Rondje

@Suite("Signing in with Apple and Google")
struct SocialAuthTests {
    @Test func nonceIsRandomAndUrlSafe() {
        let a = Nonce.random(), b = Nonce.random()
        #expect(a.count == 32)
        #expect(a != b)
        #expect(a.allSatisfy { $0.isLetter || $0.isNumber || $0 == "-" || $0 == "_" })
        #expect(Nonce.random(length: 64).count == 64)
    }

    @Test func nonceHashIsLowercaseHexSha256() {
        // Known value: SHA-256 of "abc".
        #expect(Nonce.sha256("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
        #expect(Nonce.sha256("").count == 64)
    }

    @Test func readsTheCodeFromTheCallback() throws {
        let url = try #require(URL(string: "rondje://auth/callback?code=abc123"))
        #expect(NativeAuthCallback.parse(url) == .code("abc123"))
    }

    @Test func readsAnErrorFromTheCallback() throws {
        let url = try #require(URL(string: "rondje://auth/callback?error=account-not-linked"))
        #expect(NativeAuthCallback.parse(url) == .failure("account-not-linked"))
        // An error wins over a code.
        let both = try #require(URL(string: "rondje://auth/callback?code=x&error=cancelled"))
        #expect(NativeAuthCallback.parse(both) == .failure("cancelled"))
        #expect(NativeAuthCallback.isCancel("cancelled"))
        #expect(!NativeAuthCallback.isCancel("account-not-linked"))
        #expect(!NativeAuthCallback.isCancel("expired"))
    }

    @Test func ignoresOtherAddresses() throws {
        for raw in ["https://evil.example/auth/callback?code=x", "rondje://other/callback?code=x", "rondje://auth/elsewhere?code=x", "rondje://auth/callback", "rondje://auth/callback?code="] {
            let url = try #require(URL(string: raw))
            #expect(NativeAuthCallback.parse(url) == .failure("invalid_callback"), "\(raw)")
        }
    }

    @Test func startsTheWebFlowOnTheServer() throws {
        let base = try #require(URL(string: "http://localhost:3301"))
        #expect(NativeAuthCallback.startURL(base: base, provider: .google, codeChallenge: "abc")?.absoluteString
            == "http://localhost:3301/api/auth/native/start?provider=google&codeChallenge=abc")
        #expect(NativeAuthCallback.startURL(base: base, provider: .apple, codeChallenge: "abc")?.absoluteString
            == "http://localhost:3301/api/auth/native/start?provider=apple&codeChallenge=abc")
    }

    @Test func pkceFollowsRFC7636() {
        // The example from RFC 7636, appendix B.
        #expect(PKCE.challenge(for: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk") == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
        let verifier = PKCE.verifier()
        #expect(verifier.count == 43)
        #expect(PKCE.challenge(for: verifier).count == 43)
        #expect(PKCE.verifier() != verifier)
    }

    @Test func showsOnlyWhatTheServerOffers() throws {
        let old = try JSONDecoder().decode(AppConfig.self, from: Data(#"{"apiVersion":1,"emergencyNumber":"112"}"#.utf8))
        #expect(!SocialOptions(old.auth, nativeAppleAllowed: true).any)

        let both = try JSONDecoder().decode(AppConfig.self, from: Data(#"{"auth":{"providers":["apple","google"],"appleNative":true}}"#.utf8))
        let native = SocialOptions(both.auth, nativeAppleAllowed: true)
        #expect(native.nativeApple && !native.webApple && native.google)

        // A build without the capability, or a server without the app's bundle id: Apple through the website.
        #expect(SocialOptions(both.auth, nativeAppleAllowed: false).webApple)
        let webOnly = try JSONDecoder().decode(AppConfig.self, from: Data(#"{"auth":{"providers":["apple"],"appleNative":false}}"#.utf8))
        let web = SocialOptions(webOnly.auth, nativeAppleAllowed: true)
        #expect(web.webApple && !web.nativeApple && !web.google)

        let googleOnly = try JSONDecoder().decode(AppConfig.self, from: Data(#"{"auth":{"providers":["google"]}}"#.utf8))
        let google = SocialOptions(googleOnly.auth, nativeAppleAllowed: true)
        #expect(google.google && !google.nativeApple && !google.webApple)
    }

    @Test func socialLoginIsOffUnlessTheBuildSwitchIsOn() {
        #expect(!SocialSignInFeature.flag(nil))
        #expect(!SocialSignInFeature.flag("NO"))
        #expect(!SocialSignInFeature.flag(""))
        #expect(!SocialSignInFeature.flag("$(RONDJE_FEATURE_SOCIAL_LOGIN)"))
        #expect(SocialSignInFeature.flag("YES"))
        #expect(SocialSignInFeature.flag(true))
        // The default build has it off.
        #expect(!SocialSignInFeature.isOn)
    }

    @Test func readsTheCapabilityFromTheProvisioningProfile() {
        func profile(_ entitlements: String) -> Data {
            Data("garbage-before\u{0}<?xml version=\"1.0\" encoding=\"UTF-8\"?><plist version=\"1.0\"><dict><key>Entitlements</key><dict>\(entitlements)</dict></dict></plist>garbage-after".utf8)
        }
        #expect(AppleSignInSupport.allows(profile: nil))
        #expect(AppleSignInSupport.allows(profile: profile("<key>com.apple.developer.applesignin</key><array><string>Default</string></array>")))
        #expect(!AppleSignInSupport.allows(profile: profile("<key>application-identifier</key><string>TEAM.app.rondje.mobile</string>")))
    }

    @Test func socialErrorsReadNaturally() {
        #expect(APIClient.socialAuthError(code: "OAUTH_LINK_ERROR", status: 401, provider: .apple).code == "link")
        #expect(APIClient.socialAuthError(code: "account-not-linked", status: 400, provider: .google).code == "exists")
        #expect(APIClient.socialAuthError(code: "invalid-code", status: 400, provider: nil).code == "expired")
        #expect(APIClient.socialAuthError(code: "expired", status: 400, provider: .google).code == "expired")
        #expect(APIClient.socialAuthError(code: "provider-unavailable", status: 400, provider: .google).localizedDescription.contains("Google"))
        #expect(APIClient.socialAuthError(code: "sign-in-failed", status: 400, provider: .google).code == "auth")
        #expect(APIClient.socialAuthError(code: nil, status: 429, provider: .apple).code == "rate")
        #expect(APIClient.socialAuthError(code: "INVALID_TOKEN", status: 401, provider: .apple).localizedDescription.contains("Apple"))
    }
}
