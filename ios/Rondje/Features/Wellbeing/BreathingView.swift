import SwiftUI

/// One calm minute before a walk: breathe in for 4 seconds, out for 6, with a circle that grows and shrinks
/// and a soft haptic at each turn. Optional, skippable, and nothing is stored.
struct BreathingView: View {
    var done: () -> Void
    @State private var expanded = false
    @State private var secondsLeft = 60
    @State private var inhale = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let inSeconds = 4.0
    private let outSeconds = 6.0

    var body: some View {
        VStack(spacing: 28) {
            HStack {
                Spacer()
                Button("Overslaan") { done() }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.onGrass.opacity(0.8))
            }
            Spacer()
            Text("Even landen").font(.display(30)).foregroundStyle(Palette.onGrass)
            ZStack {
                Circle().fill(Palette.ball.opacity(0.18)).frame(width: 280, height: 280)
                Circle()
                    .fill(Palette.ball)
                    .frame(width: 280, height: 280)
                    .scaleEffect(reduceMotion ? 0.7 : (expanded ? 1 : 0.45))
                Guus(mood: inhale ? .calm : .sleepy, size: 110, hop: false)
            }
            Text(inhale ? L("Adem in") : L("Adem uit"))
                .font(.title2.weight(.semibold))
                .foregroundStyle(Palette.onGrass)
                .contentTransition(.opacity)
                .accessibilityAddTraits(.updatesFrequently)
            Text(L("Nog \(secondsLeft) seconden"))
                .contentTransition(.numericText(countsDown: true))
                .animation(.snappy, value: secondsLeft)
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(Palette.onGrass.opacity(0.75))
            Spacer()
            Button(secondsLeft == 0 ? L("Klaar, op pad") : L("Nu al op pad")) { done() }
                .buttonStyle(.ball)
        }
        .padding(24)
        .background(Palette.walkBackground.ignoresSafeArea())
        .task { await run() }
        .task {
            // The countdown ticks every second, independent of the breathing rhythm.
            let start = Date.now
            while !Task.isCancelled && secondsLeft > 0 {
                try? await Task.sleep(for: .seconds(1))
                secondsLeft = max(0, 60 - Int(Date.now.timeIntervalSince(start)))
            }
        }
    }

    private func run() async {
        while !Task.isCancelled && secondsLeft > 0 {
            inhale = true
            Haptics.soft()
            withAnimation(.easeInOut(duration: inSeconds)) { expanded = true }
            try? await Task.sleep(for: .seconds(inSeconds))
            inhale = false
            Haptics.soft()
            withAnimation(.easeInOut(duration: outSeconds)) { expanded = false }
            try? await Task.sleep(for: .seconds(outSeconds))
        }
        Haptics.success()
    }
}
