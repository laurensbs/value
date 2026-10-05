import Foundation
import Testing
@testable import Rondje

@Suite("Help ons via Whydonate")
struct HelpUsTests {
    private static let campaign = "https://whydonate.com/nl/fundraising/rondjemee"

    /// GET https://rondjemee.nl/api/v1/config on 5 October 2026, before the server sent `support`.
    private static let liveBeforeSupport = #"{"apiVersion":1,"membership":{"inApp":false,"path":"/support"},"legal":{"terms":"/legal/terms","privacy":"/legal/privacy","conduct":"/legal/conduct","safety":"/safety"},"emergencyNumber":"112","auth":{"providers":[],"appleNative":false}}"#

    private func config(_ json: String) throws -> AppConfig {
        try APIClient.makeDecoder().decode(AppConfig.self, from: Data(json.utf8))
    }

    private func link(_ support: String) throws -> HelpUsLink? {
        HelpUsLink(try config(#"{"support":\#(support)}"#).support)
    }

    // MARK: Decoding

    @Test func olderServersShowNoRow() throws {
        let live = try config(Self.liveBeforeSupport)
        #expect(live.support == nil)
        #expect(HelpUsLink(live.support) == nil)
        // The old `membership` block is ignored, and signing in still reads as before.
        #expect(live.auth?.providers == [])
        #expect(HelpUsLink(try config("{}").support) == nil)
        #expect(HelpUsLink(try config(#"{"support":null}"#).support) == nil)
    }

    /// `support` exactly as the website sends it (appSupport() in web/src/lib/support.ts, branch
    /// claude/help-ons-app): the extra fields (label, platform, operator, rounds, share) are ignored.
    private static func server(inApp: Bool, goal: String = "3000", raised: String = "120") -> String {
        #"{"apiVersion":1,"membership":{"inApp":false,"path":"/support"},"support":{"inApp":\#(inApp),"label":"Help ons via Whydonate","crowdfundingUrl":"\#(campaign)","platform":"Whydonate","operator":"Laurens Bos","goal":\#(goal),"raised":\#(raised),"rounds":{"goal":600,"raised":24},"shareToCausesPercent":10},"auth":{"providers":["apple","google"],"appleNative":true}}"#
    }

    @Test func showsTheCampaignWhenTheServerAllowsIt() throws {
        let both = try config(Self.server(inApp: true))
        let row = try #require(HelpUsLink(both.support))
        #expect(row.url.absoluteString == Self.campaign)
        #expect(row.platform == "Whydonate")
        #expect(row.progress?.goal == 3000)
        #expect(row.progress?.raised == 120)
        #expect(both.auth?.providers == ["apple", "google"])
    }

    @Test func noNumbersYetMeansNoProgress() throws {
        // The website sends null while content/crowdfunding.json has no goal.
        let row = try #require(HelpUsLink(try config(Self.server(inApp: true, goal: "null", raised: "null")).support))
        #expect(row.progress == nil)
    }

    @Test func supportInAppZeroHidesTheRow() throws {
        // SUPPORT_IN_APP_IOS=0 (or SUPPORT_IN_APP=0) on the server: the block is there, the row is not.
        let off = try config(Self.server(inApp: false))
        #expect(off.support != nil)
        #expect(off.support?.inApp == false)
        #expect(HelpUsLink(off.support) == nil)
        #expect(off.auth?.appleNative == true)
    }

    @Test func readsTheNumbersFlatOrNested() throws {
        let nested = try #require(try link(#"{"inApp":true,"crowdfundingUrl":"\#(Self.campaign)","progress":{"goal":3000,"raised":45,"percent":1}}"#))
        #expect(nested.progress?.goal == 3000 && nested.progress?.raised == 45)
        // Euros with cents round to whole euros.
        let cents = try #require(try link(#"{"inApp":true,"crowdfundingUrl":"\#(Self.campaign)","goal":3000.0,"raised":120.6}"#))
        #expect(cents.progress?.raised == 121)
    }

    @Test func theServerSwitchHidesEveryEntry() throws {
        // The switch off on the server, or an inApp the app does not understand: no row.
        for off in ["false", "0", #""0""#, "null", #""nee""#, "{}"] {
            #expect(try link(#"{"inApp":\#(off),"crowdfundingUrl":"\#(Self.campaign)"}"#) == nil, "inApp \(off)")
        }
        #expect(try link(#"{"crowdfundingUrl":"\#(Self.campaign)"}"#) == nil, "inApp missing")
        for on in ["true", "1", #""1""#] {
            #expect(try link(#"{"inApp":\#(on),"crowdfundingUrl":"\#(Self.campaign)"}"#) != nil, "inApp \(on)")
        }
    }

    @Test func aBrokenSupportBlockNeverBreaksSigningIn() throws {
        for support in [#""yes""#, "[]", "42", #"{"inApp":"misschien","crowdfundingUrl":7,"goal":"veel","progress":"x"}"#] {
            let c = try config(#"{"auth":{"providers":["apple"],"appleNative":true},"support":\#(support)}"#)
            #expect(c.auth?.appleNative == true, "\(support)")
            #expect(HelpUsLink(c.support) == nil, "\(support)")
        }
    }

    // MARK: Where the tap goes

    /// CROWDFUNDING_PLATFORMS in web/src/lib/support.ts (branch claude/help-ons-app, 5 October 2026),
    /// copied by hand: the app accepts exactly the platforms the website accepts for CROWDFUNDING_URL,
    /// so the row never names a platform the website would refuse. Change the two together.
    private static let webCrowdfundingPlatforms: [String: String] = [
        "whydonate.com": "Whydonate",
        "whydonate.nl": "Whydonate",
        "gofundme.com": "GoFundMe",
        "doneeractie.nl": "Doneeractie",
        "kickstarter.com": "Kickstarter",
        "ulule.com": "Ulule",
        "goteo.org": "Goteo",
        "verkami.com": "Verkami",
    ]

    @Test func knowsTheSamePlatformsAsTheWebsite() {
        #expect(HelpUsLink.platforms == Self.webCrowdfundingPlatforms)
    }

    @Test func theAppNamesItselfAsTheIPhoneApp() throws {
        // The server picks SUPPORT_IN_APP_IOS by this header (web/src/lib/app-platform.ts), and still
        // recognises the app by "RondjeApp" in the user agent (web/src/server/native.ts).
        #expect(APIClient.identity["X-Rondje-Platform"] == "ios")
        let agent = try #require(APIClient.identity["User-Agent"])
        #expect(agent.range(of: #"\bRondjeApp\b"#, options: .regularExpression) != nil)
        #expect(agent.contains("iOS"))
    }

    @Test func onlyHttpsLinksToKnownPlatforms() throws {
        let allowed = [
            Self.campaign: "Whydonate",
            "https://www.whydonate.com/nl/fundraising/rondjemee": "Whydonate",
            "https://WHYDONATE.nl/fundraising/rondjemee": "Whydonate",
            "https://nl.whydonate.com/fundraising/rondjemee": "Whydonate",
            "https://www.gofundme.com/f/rondjemee": "GoFundMe",
        ]
        for (raw, platform) in allowed {
            let url = try #require(URL(string: raw))
            #expect(HelpUsLink.platform(of: url) == platform, "\(raw)")
        }
        let refused = [
            "http://whydonate.com/nl/fundraising/rondjemee",
            "https://whydonate.com.evil.example/rondjemee",
            "https://evilwhydonate.com/rondjemee",
            "https://user:secret@whydonate.com/rondjemee",
            "https://patreon.com/rondjemee",
            "rondje://whydonate.com/rondjemee",
            "javascript:alert(1)",
        ]
        for raw in refused {
            let url = try #require(URL(string: raw))
            #expect(HelpUsLink.platform(of: url) == nil, "\(raw)")
            #expect(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: raw)) == nil, "\(raw)")
        }
        #expect(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: "")) == nil)
        #expect(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: nil)) == nil)
        #expect(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: "  \(Self.campaign)\n"))?.url.absoluteString == Self.campaign)
    }

    // MARK: The subtitle

    @Test func progressOnlyWithBothNumbers() {
        #expect(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: Self.campaign, goal: 3000))?.progress == nil)
        #expect(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: Self.campaign, raised: 10))?.progress == nil)
        #expect(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: Self.campaign, goal: 0, raised: 0))?.progress == nil)
        #expect(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: Self.campaign, goal: 3000, raised: 0))?.progress?.raised == 0)
    }

    @Test func amountsInTheReadersOwnNotation() {
        // Formatters use (narrow) no-break spaces; compare with plain ones.
        func plain(_ amount: Int, _ locale: String) -> String {
            HelpUsLink.euros(amount, locale: Locale(identifier: locale))
                .replacingOccurrences(of: "\u{00A0}", with: " ")
                .replacingOccurrences(of: "\u{202F}", with: " ")
        }
        #expect(plain(3000, "nl_NL") == "€ 3.000")
        #expect(plain(5, "nl_NL") == "€ 5")
        #expect(plain(3000, "en_GB") == "€3,000")
        #expect(plain(3000, "fr_FR") == "3 000 €")
        #expect(plain(5, "es_ES") == "5 €")
    }

    /// Formatters use (narrow) no-break spaces; compare with plain ones.
    private static func plain(_ text: String) -> String {
        text.replacingOccurrences(of: "\u{00A0}", with: " ").replacingOccurrences(of: "\u{202F}", with: " ")
    }

    @Test func beforeTheFirstEuroInDutchTheGoalInRounds() throws {
        let nl = Locale(identifier: "nl_NL")
        let row = try #require(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: Self.campaign, goal: 3000, raised: 0)))
        // "Geef een rondje vanaf € 5 · Doel: 600 rondjes", never "€ 0 van € 3.000".
        let text = row.subtitle(locale: nl, language: "nl")
        #expect(Self.plain(text) == "Geef een rondje vanaf € 5 · Doel: 600 rondjes", "\(text)")
        #expect(!text.contains(HelpUsLink.euros(0, locale: nl)), "\(text)")
        #expect(!text.contains(HelpUsLink.euros(3000, locale: nl)), "\(text)")
    }

    /// In English, French and Spanish the goal is in euros and the gift "from €5": nothing reads like a
    /// price per walk ("€5 = 1 round", "600 rounds"). Laurens, 5 okt 2026.
    @Test func beforeTheFirstEuroElsewhereTheGoalInEuros() throws {
        let row = try #require(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: Self.campaign, goal: 3000, raised: 0)))
        for (language, identifier) in [("en", "en_GB"), ("fr", "fr_FR"), ("es", "es_ES")] {
            let locale = Locale(identifier: identifier)
            let text = row.subtitle(locale: locale, language: language)
            let plain = try #require(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: Self.campaign))).subtitle(locale: locale, language: language)
            #expect(text.hasPrefix(plain), "\(language): \(text)")
            #expect(text.contains(HelpUsLink.euros(3000, locale: locale)), "\(language): \(text)")
            #expect(!text.contains("600"), "\(language): \(text)")
            // (The words come from the simulator's own language; "rondjes" is the Dutch goal.)
            #expect(text.range(of: #"\b(rondjes|rounds?|balades?|paseos?)\b"#, options: [.regularExpression, .caseInsensitive]) == nil, "\(language): \(text)")
        }
    }

    /// The translations themselves, whatever language this simulator runs in.
    @Test func noPricePerWalkInEnglishFrenchOrSpanish() throws {
        let walks = #"\b(rounds?|walks?|balades?|paseos?|rondjes?)\b|=\s*1\b"#
        for lang in ["en", "fr", "es"] {
            let path = try #require(Bundle.main.path(forResource: lang, ofType: "lproj"), "\(lang).lproj")
            let bundle = try #require(Bundle(path: path))
            for key in Self.rowKeys {
                let value = bundle.localizedString(forKey: key, value: "", table: nil)
                #expect(value.range(of: walks, options: [.regularExpression, .caseInsensitive]) == nil, "\(lang): \(value)")
            }
            let goal = bundle.localizedString(forKey: "Geef een rondje vanaf %@ · Doel: %@", value: "", table: nil)
            #expect(goal.contains("%2$@"), "\(lang): \(goal)")
            // The goal in rondjes is Dutch only and never in the catalog.
            let table = try #require(bundle.path(forResource: "Localizable", ofType: "strings"))
            let strings = try #require(NSDictionary(contentsOfFile: table) as? [String: String])
            #expect(strings["Geef een rondje vanaf %@ · Doel: %@ rondjes"] == nil, "\(lang)")
        }
    }

    @Test func subtitleSaysFromFiveEurosAndThenTheProgress() throws {
        let nl = Locale(identifier: "nl_NL")
        let five = HelpUsLink.euros(5, locale: nl)
        let plainRow = try #require(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: Self.campaign)))
        let without = plainRow.subtitle(locale: nl)
        #expect(without.contains(five))
        #expect(!without.contains("3.000"))

        let withNumbers = try #require(HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: Self.campaign, goal: 3000, raised: 120)))
        let with = withNumbers.subtitle(locale: nl)
        #expect(with.hasPrefix(without), "\(with)")
        #expect(with.contains(HelpUsLink.euros(120, locale: nl)))
        #expect(with.contains(HelpUsLink.euros(3000, locale: nl)))
        #expect(withNumbers.title.contains("Whydonate"))
        #expect(withNumbers.hint.contains("Whydonate"))
    }

    // MARK: The copy

    private static let rowKeys = [
        "Help ons via %@", "Opent %@ in je browser", "Geef een rondje vanaf %@", "Geef een rondje vanaf %@ · %@ van %@",
        "Geef een rondje vanaf %@ · Doel: %@",
    ]

    @Test func theEnglishDoesNotReadLikeBuyingSomething() throws {
        let path = try #require(Bundle.main.path(forResource: "en", ofType: "lproj"))
        let bundle = try #require(Bundle(path: path))
        for key in Self.rowKeys {
            let value = bundle.localizedString(forKey: key, value: "", table: nil)
            #expect(value.range(of: #"\b(buy|purchase|order|price)\b"#, options: [.regularExpression, .caseInsensitive]) == nil, "\(value)")
        }
        #expect(bundle.localizedString(forKey: "Help ons via %@", value: "", table: nil) == "Support us via %@")
    }

    /// No membership, no tax deduction (Rondje has no ANBI status), no pressure, no health claims.
    private static func breaksTheRules(_ text: String) -> Bool {
        let words = #"\b(lid|leden|lidmaatschap|aftrekbaar|members?|membership|tax|membres?|adhésion|déductible|socios?|deducible|nu|now|maintenant|ahora|vandaag|today|gezond|gezondheid|healthy|health|santé|salud)\b"#
        // A few of the countdown patterns from web/src/lib/banned-phrases.json: no "nog maar", no "only 3 left".
        let countdown = #"\bnog (maar )?\d|laatste kans|\bonly \d|\b\d+ more\b|last chance|\bhurry\b|plus que \d|dernière chance|\bquedan? \d|última oportunidad"#
        return GuusLine.isBanned(text)
            || text.range(of: words, options: [.regularExpression, .caseInsensitive]) != nil
            || text.range(of: countdown, options: [.regularExpression, .caseInsensitive]) != nil
    }

    @Test func theRowsCopyIsCalmInEveryLanguage() throws {
        for key in Self.rowKeys { #expect(!Self.breaksTheRules(key), "\(key)") }
        for lang in ["en", "fr", "es"] {
            let path = try #require(Bundle.main.path(forResource: lang, ofType: "lproj"), "\(lang).lproj")
            let bundle = try #require(Bundle(path: path))
            for key in Self.rowKeys {
                let value = bundle.localizedString(forKey: key, value: "", table: nil)
                #expect(!value.isEmpty && value != key, "\(lang): \(key) is not translated")
                #expect(!Self.breaksTheRules(value), "\(lang): \(value)")
                #expect(value.components(separatedBy: "%").count == key.components(separatedBy: "%").count, "\(lang): \(value)")
            }
        }
    }

    @Test func nothingAboutMembershipOrTaxLeftInTheApp() throws {
        let words = #"\b(word lid|lid worden|leden|lidmaatschap|aftrekbaar|ANBI|members?|membership|deductible|membres?|déductible|socios?|deducible)\b"#
        var checked = 0
        for lang in ["nl", "en", "fr", "es"] {
            guard let path = Bundle.main.path(forResource: lang, ofType: "lproj"),
                  let table = Bundle(path: path)?.path(forResource: "Localizable", ofType: "strings"),
                  let strings = NSDictionary(contentsOfFile: table) as? [String: String]
            else { continue }
            for (key, value) in strings {
                #expect(key.range(of: words, options: [.regularExpression, .caseInsensitive]) == nil, "\(lang) key: \(key)")
                #expect(value.range(of: words, options: [.regularExpression, .caseInsensitive]) == nil, "\(lang): \(value)")
            }
            checked += 1
        }
        #expect(checked >= 3)
    }

    // MARK: Live (opt-in)

    /// Against the real server: `TEST_RUNNER_RONDJE_LIVE_CONFIG=1 xcodebuild test …`. The row shows
    /// exactly when production sends `support` with inApp on and a known https campaign link.
    @Test(.enabled(if: ProcessInfo.processInfo.environment["RONDJE_LIVE_CONFIG"] == "1"))
    func liveConfigDecidesTheRow() async throws {
        let url = try #require(URL(string: "https://rondjemee.nl/api/v1/config"))
        let (data, response) = try await URLSession.shared.data(from: url)
        #expect((response as? HTTPURLResponse)?.statusCode == 200)
        let live = try APIClient.makeDecoder().decode(AppConfig.self, from: data)
        let raw = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let row = HelpUsLink(live.support)
        print("live /api/v1/config: support \(raw?["support"] == nil ? "absent" : "present") → row \(row == nil ? "hidden" : "shown: \(row!.title)")")
        if raw?["support"] == nil { #expect(row == nil) }
        if live.support?.inApp != true { #expect(row == nil) }
    }
}
