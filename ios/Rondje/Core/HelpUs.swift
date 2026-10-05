import Foundation

// "Help ons": one quiet row low under Jij that opens the crowdfunding page (Whydonate) in Safari,
// in one tap. Giving never happens inside the app: no checkout, no web view, no sheet in between.
// The server decides whether the row shows at all. GET /api/v1/config sends `support` with `inApp`
// (SUPPORT_IN_APP on the server; "0" turns every entry in the apps off, for example during App
// Review). Older servers send no `support`, and then there is no row.

/// `support` in GET /api/v1/config. Every field is optional and read leniently, so whatever the
/// server sends here can only hide the row, never break the rest of the config (the sign-in buttons).
struct SupportOptions: Decodable, Equatable, Sendable {
    /// The server allows an entry in the app (SUPPORT_IN_APP). Missing counts as no.
    var inApp = false
    /// The campaign page, for example https://whydonate.com/nl/fundraising/rondjemee.
    var crowdfundingUrl: String?
    /// The goal and the amount raised so far, in whole euros.
    var goal: Int?
    var raised: Int?

    init(inApp: Bool = false, crowdfundingUrl: String? = nil, goal: Int? = nil, raised: Int? = nil) {
        self.inApp = inApp
        self.crowdfundingUrl = crowdfundingUrl
        self.goal = goal
        self.raised = raised
    }

    private enum Keys: String, CodingKey { case inApp, crowdfundingUrl, goal, raised, progress }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        inApp = Self.flag(c, .inApp)
        crowdfundingUrl = try? c.decodeIfPresent(String.self, forKey: .crowdfundingUrl)
        // The numbers may come flat or as `progress: { goal, raised }` (campaign() on the website).
        let progress = try? c.nestedContainer(keyedBy: Keys.self, forKey: .progress)
        goal = Self.euros(c, .goal) ?? progress.flatMap { Self.euros($0, .goal) }
        raised = Self.euros(c, .raised) ?? progress.flatMap { Self.euros($0, .raised) }
    }

    /// true, 1 or "1" (how SUPPORT_IN_APP is written) mean on; anything else means off.
    private static func flag(_ c: KeyedDecodingContainer<Keys>, _ key: Keys) -> Bool {
        if let value = try? c.decodeIfPresent(Bool.self, forKey: key) { return value }
        if let value = try? c.decodeIfPresent(Int.self, forKey: key) { return value == 1 }
        if let value = try? c.decodeIfPresent(String.self, forKey: key) {
            return ["1", "true", "yes"].contains(value.trimmingCharacters(in: .whitespaces).lowercased())
        }
        return false
    }

    /// A whole, non-negative amount of euros, or nothing.
    private static func euros(_ c: KeyedDecodingContainer<Keys>, _ key: Keys) -> Int? {
        guard let value = try? c.decodeIfPresent(Double.self, forKey: key), value.isFinite, value >= 0, value < 1_000_000_000 else { return nil }
        return Int(value.rounded())
    }
}

/// The "Help ons" row: only when the server allows it and the link goes over https to a known
/// crowdfunding platform, so the row always says truthfully where you end up.
struct HelpUsLink: Equatable, Sendable {
    let url: URL
    /// The platform's name, taken from the address (never from free text): "Whydonate".
    let platform: String
    /// Goal and amount raised, both or neither.
    let progress: (goal: Int, raised: Int)?

    /// The smallest gift on the campaign page: "Geef een rondje" is €5.
    static let smallestGift = 5

    /// The same platforms the website accepts for CROWDFUNDING_URL (web/src/lib/support.ts).
    static let platforms: [String: String] = [
        "whydonate.com": "Whydonate",
        "whydonate.nl": "Whydonate",
        "gofundme.com": "GoFundMe",
        "doneeractie.nl": "Doneeractie",
        "kickstarter.com": "Kickstarter",
        "ulule.com": "Ulule",
        "goteo.org": "Goteo",
        "verkami.com": "Verkami",
    ]

    init?(_ support: SupportOptions?) {
        guard let support, support.inApp,
              let raw = support.crowdfundingUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
              let url = URL(string: raw), let platform = Self.platform(of: url)
        else { return nil }
        self.url = url
        self.platform = platform
        if let goal = support.goal, goal > 0, let raised = support.raised {
            progress = (goal, raised)
        } else {
            progress = nil
        }
    }

    /// The platform's name for an https address on one of the known platforms (or a subdomain).
    static func platform(of url: URL) -> String? {
        guard url.scheme?.lowercased() == "https", url.user() == nil, url.password() == nil,
              var host = url.host()?.lowercased(), !host.isEmpty
        else { return nil }
        if host.hasPrefix("www.") { host.removeFirst(4) }
        return platforms.first { host == $0.key || host.hasSuffix(".\($0.key)") }?.value
    }

    /// "Help ons via Whydonate".
    var title: String { L("Help ons via \(platform)") }

    /// For VoiceOver: the tap leaves the app.
    var hint: String { L("Opent \(platform) in je browser") }

    /// "Geef een rondje vanaf €5", plus "· €120 van €3.000 opgehaald" when the server sends the numbers.
    func subtitle(locale: Locale = .current) -> String {
        let from = Self.euros(Self.smallestGift, locale: locale)
        guard let progress else { return L("Geef een rondje vanaf \(from)") }
        let raised = Self.euros(progress.raised, locale: locale), goal = Self.euros(progress.goal, locale: locale)
        return L("Geef een rondje vanaf \(from) · \(raised) van \(goal) opgehaald")
    }

    /// Whole euros in the reader's own notation: "€ 3.000", "€3,000", "3 000 €".
    static func euros(_ amount: Int, locale: Locale) -> String {
        amount.formatted(.currency(code: "EUR").precision(.fractionLength(0)).locale(locale))
    }

    static func == (a: HelpUsLink, b: HelpUsLink) -> Bool {
        a.url == b.url && a.platform == b.platform && a.progress?.goal == b.progress?.goal && a.progress?.raised == b.progress?.raised
    }
}

/// Whether to show the row, from the server's config. Loaded when Jij opens and on pull to refresh,
/// at most every few minutes, so switching SUPPORT_IN_APP off reaches the app quickly.
@MainActor
@Observable
final class HelpUs {
    static let shared = HelpUs()

    private(set) var link: HelpUsLink?
    private var loadedAt: Date?

    func load(force: Bool = false) async {
        #if DEBUG
        // For screenshots without a server that has the campaign: `-RondjeStubSupport YES` as launch argument.
        if UserDefaults.standard.bool(forKey: "RondjeStubSupport") {
            link = HelpUsLink(SupportOptions(inApp: true, crowdfundingUrl: "https://whydonate.com/nl/fundraising/rondjemee", goal: 3000, raised: 0))
            return
        }
        #endif
        if !force, let loadedAt, loadedAt.timeIntervalSinceNow > -5 * 60 { return }
        // No connection: keep what we had (nothing, the first time).
        guard let config = try? await APIClient.shared.config() else { return }
        link = HelpUsLink(config.support)
        loadedAt = .now
    }
}
