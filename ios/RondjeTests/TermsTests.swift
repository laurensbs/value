import Foundation
import Testing
@testable import Rondje

/// Changed terms (art. 19): reading GET /api/v1/me, the words, and saying yes (Core/Terms.swift).
@Suite("Bijgewerkte voorwaarden")
struct TermsTests {
    /// 00:00 on 9 November 2026 in Amsterdam: TERMS_EFFECTIVE_AT on the website.
    private static let effective = "2026-11-08T23:00:00.000Z"
    private static let effectiveDate = Date(timeIntervalSince1970: 1_794_178_800)

    private static let changes = #"{"version":"0.3","from":"0.2","title":"Wat er verandert in de voorwaarden","intro":"Versie 0.3 van de algemene voorwaarden vervangt versie 0.2. Dit verandert er:","items":["Op een klacht reageren we binnen 14 dagen (artikel 18).","In de regel over onze aansprakelijkheid stond nog een maximumbedrag dat nooit was ingevuld (artikel 15)."],"url":"/legal/terms"}"#

    /// GET /api/v1/me as the website sends it (server/terms.ts termsForApp, branch claude/voorwaarden-opnieuw).
    private static func me(profile: Bool = true, terms: String = "") -> String {
        let p = profile
            ? #"{"firstName":"Sam","birthDate":"1990-01-01","ageBand":"35-44","country":"NL","city":"Utrecht","bio":"","experience":"some","photoUrl":null,"phone":null,"wantsToWalk":true,"hasDogs":false,"quizPassed":true,"referralCode":"SAM1","emailNotifications":true,"banned":false}"#
            : "null"
        return #"{"user":{"id":"u1","email":"sam@example.com","name":"Sam","isAdmin":false},"profile":\#(p),"trust":null,"orgs":[],"unread":0\#(terms)}"#
    }

    private static func terms(accepted: Bool, required: Bool, changes: String?) -> String {
        #","termsVersion":"0.3","termsAccepted":\#(accepted),"termsEffectiveAt":"\#(effective)","termsRequired":\#(required),"termsChanges":\#(changes ?? "null")"#
    }

    private func decode(_ json: String) throws -> Me {
        try APIClient.makeDecoder().decode(Me.self, from: Data(json.utf8))
    }

    // MARK: Decoding /api/v1/me

    @Test func olderServersAskNothing() throws {
        let me = try decode(Self.me())
        #expect(me.termsState == .agreed)
        #expect(me.termsToAgree == nil)
        #expect(me.termsChanges == nil)
    }

    @Test func beforeTheDayOnlyTheQuietNotice() throws {
        let me = try decode(Self.me(terms: Self.terms(accepted: false, required: false, changes: Self.changes)))
        #expect(me.termsState == .upcoming(effectiveAt: Self.effectiveDate))
        #expect(me.termsState.needsYes)
        #expect(me.termsToAgree == "0.3")
        let changes = try #require(me.termsChanges)
        #expect(changes.from == "0.2")
        #expect(changes.items.count == 2)
        #expect(changes.intro.hasPrefix("Versie 0.3"))
    }

    @Test func fromTheDayTheYesComesFirst() throws {
        let me = try decode(Self.me(terms: Self.terms(accepted: false, required: true, changes: Self.changes)))
        #expect(me.termsState == .required(since: Self.effectiveDate))
    }

    @Test func agreedMeansNothingToShow() throws {
        let me = try decode(Self.me(terms: Self.terms(accepted: true, required: false, changes: nil)))
        #expect(me.termsState == .agreed)
        #expect(!me.termsState.needsYes)
        // The version is still known (for a yes from an older screen), but nothing asks for it.
        #expect(me.termsToAgree == "0.3")
    }

    @Test func withoutAProfileTheOnboardingAsks() throws {
        // termsAccepted is false for someone who has not made a profile yet: they agree while making it.
        let me = try decode(Self.me(profile: false, terms: Self.terms(accepted: false, required: false, changes: nil)))
        #expect(me.termsState == .agreed)
    }

    @Test func oddTermsFieldsNeverStopSigningIn() throws {
        let odd = #","termsVersion":3,"termsAccepted":"nee","termsEffectiveAt":"morgen","termsRequired":null,"termsChanges":"zie website""#
        let me = try decode(Self.me(terms: odd))
        #expect(me.user.id == "u1")
        #expect(me.profile?.firstName == "Sam")
        #expect(me.termsVersion == nil)
        #expect(me.termsAccepted == nil)
        #expect(me.termsEffectiveAt == nil)
        #expect(me.termsChanges == nil)
        #expect(me.termsState == .agreed)
    }

    @Test func changesAreReadLeniently() throws {
        let sparse = #"{"version":"0.3","items":["  Eerste punt  ","",7],"url":null}"#
        let me = try decode(Self.me(terms: Self.terms(accepted: false, required: false, changes: sparse)))
        // A list with something odd in it is left out as a whole; the rest stays.
        let changes = try #require(me.termsChanges)
        #expect(changes.version == "0.3")
        #expect(changes.intro.isEmpty)
        #expect(changes.items.isEmpty)
        #expect(changes.fullTerms == Brand.web("/legal/terms"))

        let clean = try JSONDecoder().decode(TermsChanges.self, from: Data(#"{"items":["  Eerste punt  ",""]}"#.utf8))
        #expect(clean.items == ["Eerste punt"])
    }

    @Test func aLaterChangedListStillShowsTheNotice() throws {
        // termsAccepted missing but changes sent: there is something to agree to.
        let me = try decode(Self.me(terms: #","termsChanges":\#(Self.changes)"#))
        #expect(me.termsState == .upcoming(effectiveAt: nil))
    }

    @Test func theSavedProfileKeepsWhereSomeoneStands() throws {
        // Cache.swift stores Me with a plain JSONEncoder and reads it back with a plain JSONDecoder.
        let me = try decode(Self.me(terms: Self.terms(accepted: false, required: true, changes: Self.changes)))
        let saved = try JSONDecoder().decode(Me.self, from: JSONEncoder().encode(me))
        #expect(saved.termsState == me.termsState)
        #expect(saved.termsChanges == me.termsChanges)
        #expect(saved.profile?.firstName == "Sam")
    }

    // MARK: Words and links

    @Test func theFullTermsAlwaysOpenOnOurWebsite() {
        #expect(TermsChanges.fullTerms("/legal/terms") == Brand.web("/legal/terms"))
        #expect(TermsChanges.fullTerms("/legal/terms#artikel-19") == Brand.web("/legal/terms#artikel-19"))
        for elsewhere in ["https://example.com/terms", "//example.com/terms", "javascript:alert(1)", "/../../etc", ""] {
            #expect(TermsChanges.fullTerms(elsewhere) == Brand.web("/legal/terms"))
        }
    }

    @Test func theDayIsTheDayInAmsterdam() {
        // 23:00 UTC on 8 November is already 9 November in the Netherlands.
        #expect(TermsText.day(Self.effectiveDate, locale: Locale(identifier: "nl_NL")) == "9 november 2026")
        #expect(TermsText.day(Self.effectiveDate, locale: Locale(identifier: "en_GB")) == "9 November 2026")
        #expect(TermsText.day(Self.effectiveDate, locale: Locale(identifier: "es_ES")) == "9 de noviembre de 2026")
    }

    @Test func theWordsNameTheDay() {
        let nl = Locale(identifier: "nl_NL")
        #expect(TermsText.lede(.upcoming(effectiveAt: Self.effectiveDate), locale: nl).contains("9 november 2026"))
        #expect(TermsText.lede(.required(since: Self.effectiveDate), locale: nl).contains("9 november 2026"))
        #expect(TermsText.notice(.upcoming(effectiveAt: Self.effectiveDate), locale: nl).contains("9 november 2026"))
        #expect(!TermsText.lede(.upcoming(effectiveAt: nil), locale: nl).isEmpty)
    }

    /// Every new sentence (the sheet, the notice, the dog page, and live location off), as the app shows it.
    static let keys = [
        "De voorwaarden zijn bijgewerkt",
        "Lees in rust wat er verandert. Voor jou gelden de nieuwe voorwaarden vanaf %@; tot die tijd blijft alles zoals het was.",
        "De nieuwe voorwaarden gelden sinds %@. Lees wat er verandert. Na je akkoord kun je weer afspraken maken en rondjes starten.",
        "Lees wat er verandert. Na je akkoord kun je weer afspraken maken en rondjes starten.",
        "Lees in rust wat er verandert.",
        "Voor jou gelden ze vanaf %@. Tot die tijd blijft alles zoals het was.",
        "Na je akkoord kun je weer afspraken maken en rondjes starten.",
        "Lees wat er verandert",
        "Lees de volledige voorwaarden",
        "Opent de website in je browser",
        "Niet akkoord? Je kunt je account altijd verwijderen onder Jij (artikel 19 van de voorwaarden).",
        "Akkoord",
        "Dank je. Je akkoord is opgeslagen.",
        "Je hebt de nieuwste voorwaarden al geaccepteerd.",
        "Eerst graag je akkoord met de bijgewerkte voorwaarden.",
        "Live locatie staat uit",
        "Je route wordt niet bijgehouden of gedeeld. De tijd, het rondje-rapport en foto's werken gewoon.",
        "Live locatie staat op dit moment uit, dus hier staat geen kaart. Je ziet wel de tijd, het rondje-rapport en de foto's.",
        "Live locatie staat op dit moment uit, en zonder live locatie start een rondje alleen met de hond niet. Een kennismaking, samen met de eigenaar, kan wel.",
        "Live locatie staat op dit moment uit: je telefoon deelt tijdens dit rondje geen locatie.",
    ]

    /// Calm words only, in every language: nothing that hurries, counts down, blames or promises health
    /// (Guus's rules, and the countdown patterns of web/src/lib/banned-phrases.json).
    static func breaksTheRules(_ text: String) -> Bool {
        let hurry = #"\b(snel|meteen|haast|hurry|quickly|immediately|asap|vite|rapidement|immédiatement|rápido|inmediatamente|deprisa)\b"#
        let countdown = #"\bnog (maar )?\d|laatste kans|\bonly \d|\b\d+ more\b|last chance|plus que \d|dernière chance|\bquedan? \d|última oportunidad"#
        let health = #"\b(gezond|gezondheid|healthy|health|santé|salud)\b"#
        return GuusLine.isBanned(text) || text.contains("!")
            || [hurry, countdown, health].contains { text.range(of: $0, options: [.regularExpression, .caseInsensitive]) != nil }
    }

    @Test func theWordsAreCalmAndTranslatedInEveryLanguage() throws {
        for key in Self.keys { #expect(!Self.breaksTheRules(key), "\(key)") }
        for lang in ["en", "fr", "es"] {
            let path = try #require(Bundle.main.path(forResource: lang, ofType: "lproj"), "\(lang).lproj")
            let bundle = try #require(Bundle(path: path))
            for key in Self.keys {
                let value = bundle.localizedString(forKey: key, value: "", table: nil)
                #expect(!value.isEmpty && value != key, "\(lang): \(key) is not translated")
                #expect(!Self.breaksTheRules(value), "\(lang): \(value)")
                #expect(value.components(separatedBy: "%").count == key.components(separatedBy: "%").count, "\(lang): \(value)")
            }
        }
    }

    // MARK: Errors and answers

    @Test func needsTermsIsRecognised() {
        #expect(APIError.server(code: "needs-terms", message: "Eerst graag je akkoord met de bijgewerkte voorwaarden.").needsTerms)
        #expect(!APIError.server(code: "needs-quiz", message: "").needsTerms)
        #expect(!APIError.offline.needsTerms)
    }

    @Test func theAcceptAnswerDecodes() throws {
        let answer = try APIClient.makeDecoder().decode(TermsAccepted.self, from: Data(#"{"ok":true,"termsVersion":"0.3","termsAcceptedAt":"2026-10-05T10:00:00.000Z"}"#.utf8))
        #expect(answer.ok)
        #expect(answer.termsVersion == "0.3")
        #expect(answer.termsAcceptedAt != nil)
    }
}

/// Saying yes in the sheet, and what happens after: the flow without the screen (TermsAgreement).
@MainActor
@Suite("Akkoord met de voorwaarden")
struct TermsAgreementTests {
    @MainActor
    final class Log {
        var sent: [String?] = []
        var reloads = 0
        var retries = 0
    }

    private func agreement(_ log: Log, answer: @escaping @MainActor () throws -> TermsAccepted = { TermsAccepted(ok: true, termsVersion: "0.3", termsAcceptedAt: .now) }) -> TermsAgreement {
        TermsAgreement(
            send: { version in
                log.sent.append(version)
                return try answer()
            },
            reload: { log.reloads += 1 },
            retry: { log.retries += 1 }
        )
    }

    @Test func aYesSendsTheVersionShownThenWhatWasBeingDoneGoesAheadOnce() async {
        let log = Log()
        let flow = agreement(log)
        #expect(await flow.agree(version: "0.3"))
        #expect(log.sent == ["0.3"])
        #expect(log.reloads == 1)
        #expect(flow.error == nil)
        // Nothing goes ahead while the sheet is still open.
        #expect(log.retries == 0)
        await flow.finish()
        await flow.finish()
        #expect(log.retries == 1)
        // A second tap on "Akkoord" sends nothing more.
        #expect(await flow.agree(version: "0.3"))
        #expect(log.sent.count == 1)
    }

    @Test func changedAgainShowsTheNewestAndAgreesToNothing() async {
        let log = Log()
        let message = "De voorwaarden zijn intussen opnieuw bijgewerkt. Kijk even naar de nieuwste versie."
        let flow = agreement(log) { throw APIError.server(code: "terms-changed", message: message) }
        #expect(await flow.agree(version: "0.3") == false)
        #expect(flow.error == message)
        // The newest changes are loaded, so the sheet shows them.
        #expect(log.reloads == 1)
        await flow.finish()
        #expect(log.retries == 0)
    }

    @Test func withoutConnectionTheSheetStays() async {
        let log = Log()
        let flow = agreement(log) { throw APIError.offline }
        #expect(await flow.agree(version: "0.3") == false)
        #expect(flow.error == APIError.offline.errorDescription)
        #expect(log.reloads == 0)
        await flow.finish()
        #expect(log.retries == 0)
        #expect(flow.busy == false)
    }

    @Test func closingWithoutAYesDoesNothing() async {
        let log = Log()
        let flow = agreement(log)
        await flow.finish()
        #expect(log.sent.isEmpty)
        #expect(log.retries == 0)
    }

    @Test func agreedAlreadyOnTheWebsiteGoesAhead() async {
        let log = Log()
        let flow = agreement(log)
        flow.alreadyAgreed()
        await flow.finish()
        #expect(log.sent.isEmpty)
        #expect(log.retries == 1)
    }

    @Test func aNoticeWithoutAnActionOnlyRecordsTheYes() async {
        let log = Log()
        let flow = TermsAgreement(send: { log.sent.append($0); return TermsAccepted(ok: true) }, reload: { log.reloads += 1 })
        #expect(await flow.agree(version: "0.3"))
        await flow.finish()
        #expect(log.sent == ["0.3"])
        #expect(log.retries == 0)
    }
}
