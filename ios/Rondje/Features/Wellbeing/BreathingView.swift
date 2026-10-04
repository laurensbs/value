import SwiftUI

/// One calm minute before a walk: breathe in for 4 seconds, out for 6, with a circle that grows and shrinks
/// and a soft haptic and sound at each turn. Optional and skippable. Nothing is stored, unless the walker
/// switched on Apple Health: then the minute is saved there as a mindful session, on this iPhone only.
struct BreathingView: View {
    /// When set, a 'Niet meer tonen' button sits under the main button.
    var stopOffering: (() -> Void)? = nil
    var done: () -> Void
    @State private var expanded = false
    @State private var secondsLeft = 60
    @State private var inhale = true
    @State private var startedAt = Date.now
    @Environment(\.accessibilityReduceMotion) private var reduceMotion


    var body: some View {
        VStack(spacing: 28) {
            HStack {
                Spacer()
                Button("Overslaan") { done() }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Palette.onWalk.opacity(0.8))
            }
            Spacer()
            Text("Even landen").font(.display(30)).foregroundStyle(Palette.onWalk)
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
                .foregroundStyle(Palette.onWalk)
                .contentTransition(.opacity)
                .accessibilityAddTraits(.updatesFrequently)
            Text(L("Nog \(secondsLeft) seconden"))
                .contentTransition(.numericText(countsDown: true))
                .animation(.snappy, value: secondsLeft)
                .font(.subheadline.monospacedDigit())
                .foregroundStyle(Palette.onWalk.opacity(0.75))
            Spacer()
            Button(secondsLeft == 0 ? L("Klaar, op pad") : L("Nu al op pad")) { done() }
                .buttonStyle(.ball)
            if let stopOffering {
                Button { stopOffering() } label: {
                    Text("Niet meer tonen")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Palette.onWalk.opacity(0.85))
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .contentShape(.rect)
                }
                .buttonStyle(.plain)
                .padding(.top, -16)
            }
        }
        .padding(24)
        .background(Palette.walkBackground.ignoresSafeArea())
        .task { await run() }
        .onDisappear { HealthService.shared.saveMindfulMinute(start: startedAt, end: .now) }
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
            Haptics.soft(.breatheIn)
            withAnimation(Motion.adem(in: true)) { expanded = true }
            try? await Task.sleep(for: .seconds(Motion.ademDuur(in: true)))
            inhale = false
            Haptics.soft(.breatheOut)
            withAnimation(Motion.adem(in: false)) { expanded = false }
            try? await Task.sleep(for: .seconds(Motion.ademDuur(in: false)))
        }
        Haptics.success()
    }
}
