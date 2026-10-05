import Foundation

// Changed terms (terms art. 19). GET /api/v1/me says where someone stands (server/terms.ts termsForApp):
// while their yes is for an older version, the app shows what changed in a calm sheet, with the full
// terms one tap away in Safari, and "Akkoord" records the yes (POST /api/v1/terms/accept). "Akkoord"
// is only there while the server's list of changes is on screen. Before the new terms take effect the
// app asks for nothing: only a quiet notice under Jij. From that day on, asking,
// accepting, starting a walk and joining a group walk answer "needs-terms" until the yes; then the same
// sheet comes up there and, after the yes, does what the person was doing. Declining, cancelling and
// ending a walk never wait. Older servers send none of this, and then the app asks nothing.

/// `termsChanges` in GET /api/v1/me: what changed since the version someone agreed to, in the app's
/// language (Accept-Language), straight from content/legal/<locale>/terms-changes.md on the website.
/// Read leniently: a missing or odd field leaves only that part out.
struct TermsChanges: Codable, Equatable, Sendable {
    /// The version these changes lead to ("0.3") and the one before ("0.2").
    var version: String
    var from: String
    var title: String
    /// The sentence above the list.
    var intro: String
    /// One change per item, in plain text.
    var items: [String]
    /// The full terms on the website, as a path ("/legal/terms").
    var url: String

    init(version: String = "", from: String = "", title: String = "", intro: String = "", items: [String] = [], url: String = "/legal/terms") {
        self.version = version
        self.from = from
        self.title = title
        self.intro = intro
        self.items = items
        self.url = url
    }

    private enum CodingKeys: String, CodingKey { case version, from, title, intro, items, url }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func text(_ key: CodingKeys) -> String {
            ((try? c.decodeIfPresent(String.self, forKey: key)) ?? nil)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        }
        version = text(.version)
        from = text(.from)
        title = text(.title)
        intro = text(.intro)
        items = ((try? c.decodeIfPresent([String].self, forKey: .items)) ?? nil)?
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty } ?? []
        url = text(.url)
    }

    /// The full terms, always on our own website: a path from the server, never an address elsewhere.
    var fullTerms: URL { Self.fullTerms(url) }

    static func fullTerms(_ path: String) -> URL {
        let path = path.trimmingCharacters(in: .whitespacesAndNewlines)
        guard path.hasPrefix("/"), !path.hasPrefix("//"), !path.contains("..") else { return Brand.web("/legal/terms") }
        return Brand.web(path)
    }
}

/// Where someone stands with the terms, from GET /api/v1/me.
enum TermsState: Equatable, Sendable {
    /// Agreed to the current version, or a server from before the re-accept step.
    case agreed
    /// The terms changed, but the new version does not apply to them yet: a quiet notice under Jij.
    case upcoming(effectiveAt: Date?)
    /// The new version applies: new appointments, accepting and starting a walk wait for the yes.
    case required(since: Date?)

    var needsYes: Bool { self != .agreed }
}

extension Me {
    var termsState: TermsState {
        // Someone without a profile agrees when making it (onboarding).
        guard profile != nil, termsAccepted == false || (termsAccepted == nil && termsChanges != nil) else { return .agreed }
        return termsRequired == true ? .required(since: termsEffectiveAt) : .upcoming(effectiveAt: termsEffectiveAt)
    }

    /// The version "Akkoord" agrees to: the version of the list of changes the sheet shows. Without
    /// that list on screen (not loaded, or nothing readable in it) there is nothing to agree to, and so
    /// no "Akkoord": nobody says yes to changes they have not seen.
    var termsToAgree: String? {
        guard let changes = termsChanges, !changes.items.isEmpty else { return nil }
        return [changes.version, termsVersion ?? ""].map { $0.trimmingCharacters(in: .whitespaces) }.first { !$0.isEmpty }
    }
}

extension APIError {
    /// The server waits for the yes to the updated terms ("needs-terms").
    var needsTerms: Bool { code == "needs-terms" }
}

/// What the sheet and the notice say. The same words as the website's notice (termsUpdate in web/messages).
/// What changed comes from the server (termsChanges: intro and items, content/legal/<locale>/terms-changes.md);
/// only the sentence with the date is the app's own. It never says that nothing changes until then: some
/// changes only describe how Rondje Mee already works.
enum TermsText {
    /// The day the new terms apply, as the website names it: 00:00 in Amsterdam, so "9 november 2026".
    static func day(_ date: Date, locale: Locale = Format.locale) -> String {
        var style = Date.FormatStyle(date: .long, time: .omitted, locale: locale)
        style.timeZone = TimeZone(identifier: "Europe/Amsterdam") ?? .current
        return date.formatted(style)
    }

    /// The sentence under the title of the sheet.
    static func lede(_ state: TermsState, locale: Locale = Format.locale) -> String {
        switch state {
        case .upcoming(let at?):
            L("Lees in rust wat er verandert. De nieuwe voorwaarden gelden voor jou vanaf \(day(at, locale: locale)). Vanaf dan vragen we eerst je akkoord, voordat je iets nieuws afspreekt of een rondje start.")
        case .required(let since?):
            L("De nieuwe voorwaarden gelden sinds \(day(since, locale: locale)). Lees wat er verandert. Na je akkoord kun je weer afspraken maken en rondjes starten.")
        case .required(nil):
            L("Lees wat er verandert. Na je akkoord kun je weer afspraken maken en rondjes starten.")
        case .upcoming(nil), .agreed:
            L("Lees in rust wat er verandert.")
        }
    }

    /// The short line on the notice under Jij.
    static func notice(_ state: TermsState, locale: Locale = Format.locale) -> String {
        switch state {
        case .upcoming(let at?):
            L("Voor jou gelden ze vanaf \(day(at, locale: locale)). Vanaf dan vragen we eerst je akkoord, voordat je iets nieuws afspreekt of een rondje start.")
        case .required:
            L("Na je akkoord kun je weer afspraken maken en rondjes starten.")
        case .upcoming(nil), .agreed:
            L("Lees in rust wat er verandert.")
        }
    }
}

/// The answer to POST /api/v1/terms/accept.
struct TermsAccepted: Decodable, Equatable, Sendable {
    var ok: Bool
    var termsVersion: String?
    var termsAcceptedAt: Date?
}

/// Saying yes in the sheet: sends it, loads /api/v1/me again so every screen knows, and afterwards runs
/// what the person was doing (`retry`), exactly once and only after a yes the server stored.
@MainActor
@Observable
final class TermsAgreement {
    typealias Send = @MainActor (_ version: String?) async throws -> TermsAccepted

    private(set) var busy = false
    /// A calm sentence when it did not work: no connection, or the terms changed again in the meantime.
    private(set) var error: String?
    private(set) var agreed = false

    private let send: Send
    private let reload: @MainActor () async -> Void
    @ObservationIgnored private var retry: (@MainActor () async -> Void)?

    init(send: @escaping Send = TermsAgreement.post, reload: @escaping @MainActor () async -> Void, retry: (@MainActor () async -> Void)? = nil) {
        self.send = send
        self.reload = reload
        self.retry = retry
    }

    static func post(_ version: String?) async throws -> TermsAccepted {
        struct Body: Encodable { var version: String? }
        return try await APIClient.shared.post("/api/v1/terms/accept", Body(version: version))
    }

    /// Records the yes to `version`, the version the sheet showed. True when the server stored it.
    @discardableResult
    func agree(version: String?) async -> Bool {
        guard !busy, !agreed else { return agreed }
        busy = true
        defer { busy = false }
        do {
            _ = try await send(version)
            error = nil
            agreed = true
            await reload()
            return true
        } catch let failure as APIError where failure.code == "terms-changed" {
            // Changed again while the sheet was open: show the newest changes, never agree to unseen text.
            error = failure.plainText
            await reload()
            return false
        } catch {
            self.error = error.plainText
            return false
        }
    }

    /// The newest terms were agreed to already (on the website, for example): nothing to send, and what
    /// the person was doing can go ahead.
    func alreadyAgreed() {
        error = nil
        agreed = true
    }

    /// After the sheet closed: what the person was doing goes ahead, once, and only after a yes.
    func finish() async {
        guard agreed, let next = retry else { return }
        retry = nil
        await next()
    }
}
