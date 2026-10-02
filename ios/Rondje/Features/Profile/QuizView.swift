import SwiftUI

/// The safety quiz, one question at a time. The answers are checked on the server.
struct QuizView: View {
    @Environment(AppModel.self) private var model
    @State private var quiz: Quiz?
    @State private var answers: [String: Int] = [:]
    @State private var index = 0
    @State private var wrong: [String] = []
    @State private var passed = false
    @State private var busy = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if passed || quiz?.passed == true {
                    EmptyState(symbol: "checkmark.seal.fill", title: L("Gehaald!"), text: L("Je kunt nu zelfstandige rondjes aanvragen bij eigenaren die dat toestaan."))
                } else if let quiz {
                    Text(quiz.lede).foregroundStyle(Palette.muted)
                    ProgressView(value: Double(index + 1), total: Double(quiz.questions.count)).tint(Palette.grass)
                    let q = quiz.questions[index]
                    Text(q.question).font(.display(24))
                        .id(q.id)
                        .transition(.push(from: .trailing))
                    if wrong.contains(q.id) {
                        Label("Kijk deze nog eens na.", systemImage: "arrow.uturn.backward").font(.footnote).foregroundStyle(Palette.danger)
                    }
                    ForEach(Array(q.options.enumerated()), id: \.offset) { i, option in
                        Button {
                            answers[q.id] = i
                            Haptics.tap()
                        } label: {
                            HStack {
                                Text(option).multilineTextAlignment(.leading)
                                Spacer()
                                Image(systemName: answers[q.id] == i ? "largecircle.fill.circle" : "circle")
                                    .foregroundStyle(Palette.grass)
                            }
                            .padding(16)
                            .background(answers[q.id] == i ? Palette.grassSoft : Palette.surface, in: .rect(cornerRadius: 18, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                    HStack {
                        if index > 0 { Button("Vorige") { withAnimation(.snappy) { index -= 1 } }.buttonStyle(.secondary) }
                        if index < quiz.questions.count - 1 {
                            Button("Volgende") { withAnimation(.snappy) { index += 1 } }
                                .buttonStyle(.primary).disabled(answers[q.id] == nil)
                        } else {
                            Button("Nakijken") { Task { await submit() } }
                                .buttonStyle(.primary).disabled(answers.count < quiz.questions.count || busy)
                        }
                    }
                    .padding(.top, 6)
                } else {
                    ProgressView().frame(maxWidth: .infinity)
                }
            }
            .padding(20)
        }
        .screenBackground()
        .navigationTitle(quiz?.title ?? L("Veiligheidsquiz"))
        .task { quiz = try? await APIClient.shared.get("/api/v1/quiz") }
    }

    private func submit() async {
        busy = true
        defer { busy = false }
        guard let result: QuizResult = try? await APIClient.shared.post("/api/v1/quiz", ["answers": answers]) else { return }
        if result.passed {
            Haptics.success()
            withAnimation(.spring) { passed = true }
            await model.refreshMe()
        } else {
            Haptics.warning()
            wrong = result.wrong
            if let first = quiz?.questions.firstIndex(where: { result.wrong.contains($0.id) }) {
                withAnimation(.snappy) { index = first }
            }
        }
    }
}
