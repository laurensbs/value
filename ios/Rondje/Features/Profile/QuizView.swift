import SwiftUI

/// The safety quiz. It is now played as a calm game (QuizGameView); this name keeps every call site working.
struct QuizView: View {
    var body: some View { QuizGameView() }
}
