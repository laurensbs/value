import Foundation
import Testing
@testable import Rondje

@Suite("Hondenschool lessons")
@MainActor
struct LessonTests {
    @Test func fiveLessonsInPathOrder() {
        #expect(Lessons.all.map(\.id) == ["hello", "body", "meet", "weather", "help"])
    }

    @Test func eachLessonIsBiteSized() {
        for lesson in Lessons.all {
            #expect((4...6).contains(lesson.cards.count), "\(lesson.id) has \(lesson.cards.count) cards")
        }
    }

    @Test func everyChoiceHasOneRightAnswerAndKindReasons() {
        for lesson in Lessons.all {
            for card in lesson.cards {
                guard case let .choice(question, options, explain) = card else { continue }
                #expect(options.filter(\.correct).count == 1, "\(question)")
                #expect(!explain.isEmpty, "\(question)")
                for option in options where !option.correct {
                    #expect(!(option.why ?? "").isEmpty, "\(option.text) needs a why")
                }
            }
        }
    }

    @Test func everyLineIsKind() {
        for line in Self.strings() {
            #expect(!line.isEmpty)
            #expect(!GuusLine.isBanned(line), "\(line)")
            #expect(!line.contains("\u{2014}"), "\(line)")
        }
    }

    /// Every user-visible string of every lesson.
    private static func strings() -> [String] {
        var all: [String] = []
        for lesson in Lessons.all {
            all.append(lesson.title)
            for card in lesson.cards {
                switch card {
                case .info(let text, _):
                    all.append(text)
                case let .choice(question, options, explain):
                    all += [question, explain]
                    for option in options {
                        all.append(option.text)
                        if let why = option.why { all.append(why) }
                    }
                case let .hold(text, _, after):
                    all += [text, after]
                }
            }
        }
        return all
    }
}
