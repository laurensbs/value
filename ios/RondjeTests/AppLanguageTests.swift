import Testing
@testable import Rondje

@Suite("The app's language")
struct AppLanguageTests {
    @Test func picksTheFirstOfOurLanguages() {
        #expect(AppLanguage.code(from: ["en"]) == "en")
        #expect(AppLanguage.code(from: ["en-GB", "nl"]) == "en")
        #expect(AppLanguage.code(from: ["fr_BE"]) == "fr")
        #expect(AppLanguage.code(from: ["de", "es"]) == "es")
    }

    @Test func fallsBackToDutch() {
        #expect(AppLanguage.code(from: []) == "nl")
        #expect(AppLanguage.code(from: ["Base"]) == "nl")
        #expect(AppLanguage.code(from: ["de-DE"]) == "nl")
    }

    @Test func namesEachLanguageInItself() {
        #expect(AppLanguage.name(of: "nl") == "Nederlands")
        #expect(AppLanguage.name(of: "en") == "English")
        #expect(AppLanguage.name(of: "fr") == "Français")
        #expect(AppLanguage.name(of: "es") == "Español")
    }

    @Test func theAppSpeaksOneOfThem() {
        #expect(AppLanguage.supported.contains(AppLanguage.code))
    }
}
