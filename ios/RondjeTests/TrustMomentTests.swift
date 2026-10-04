import Foundation
import Testing
@testable import Rondje

/// The trust moments: what a request promises after sending, and errors in plain words.
@Suite("Trust moments")
@MainActor
struct TrustMomentTests {
    @Test func aRequestAlwaysSaysWhatHappensInThreeTrueSteps() {
        let together = L("De eerste keer lopen jullie samen.")
        let host = "Ans", dog = "Bobbie"
        for via in MeetVia.allCases {
            let steps = RequestFlow.nextSteps(kind: .meet, via: via, hostName: host, dogName: dog)
            #expect(steps.count == 3)
            #expect(steps[0] == L("\(host) leest je bericht."))
            // Only walking together promises walking together; a call still leads to meeting in person.
            #expect((steps[2] == together) == (via == .walk))
        }
        let call = RequestFlow.nextSteps(kind: .meet, via: .video, hostName: host, dogName: dog)
        #expect(call[2] == L("Eerst bellen jullie. Daarna ontmoet je \(dog) in het echt."))
        // A solo walk comes after the meeting: no meeting promised again.
        let solo = RequestFlow.nextSteps(kind: .solo, via: .walk, hostName: host, dogName: dog)
        #expect(solo.count == 3)
        #expect(!solo.contains(together))
        #expect(!solo.contains(L("Jullie spreken een moment af.")))
    }

    @Test func withoutANameTheStepsStartWithACapital() {
        let owner = L("de eigenaar")
        let steps = RequestFlow.nextSteps(kind: .meet, via: .walk, hostName: owner, dogName: "Bobbie")
        #expect(steps[0].first?.isUppercase == true)
    }

    @Test func onlyNewWalkersDoTheQuizBeforeTheApp() {
        #expect(AppModel.onboardingQuiz(marked: true, wantsToWalk: true, inOrg: false))
        // Owners, shelter staff and existing accounts (never marked) go straight in.
        #expect(!AppModel.onboardingQuiz(marked: true, wantsToWalk: false, inOrg: false))
        #expect(!AppModel.onboardingQuiz(marked: true, wantsToWalk: true, inOrg: true))
        #expect(!AppModel.onboardingQuiz(marked: false, wantsToWalk: true, inOrg: false))
    }

    @Test func everyQuizQuestionHasAnExplanation() {
        // The ids of web/src/lib/quiz.ts.
        for id in ["heat", "leash", "treats", "otherDogs", "escaped", "bite", "stress", "overdue"] {
            #expect(QuizExplanation.text(for: id) != nil, "\(id)")
        }
        #expect(QuizExplanation.text(for: "new-question") == nil)
    }

    @Test func errorsAreNeverTheSystemText() {
        let offline = APIError.offline.errorDescription
        let ours = APIError.unexpected.errorDescription
        #expect(URLError(.notConnectedToInternet).plainText == offline)
        #expect(URLError(.timedOut).isOffline)
        #expect(APIError.offline.isOffline)
        #expect(DecodingError.dataCorrupted(.init(codingPath: [], debugDescription: "Bad date")).plainText == ours)
        #expect(CocoaError(.fileReadUnknown).plainText == ours)
        #expect(!APIError.unexpected.isOffline)
        // The server's own messages are written for people already.
        #expect(APIError.server(code: "limit", message: "Je hebt al vijf open aanvragen.").plainText == "Je hebt al vijf open aanvragen.")
    }
}
