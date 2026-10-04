import SwiftUI

@main
struct RondjeApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var model = AppModel()
    @State private var walk = WalkTracker.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .environment(walk)
                .tint(Palette.grass)
                .task { await model.bootstrap() }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Keepsakes.shared.recordVisit() }
                    if phase == .active, model.phase == .ready { Task { await model.refreshMe() } }
                }
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("seenIntro") private var seenIntro = false

    var body: some View {
        ZStack(alignment: .top) {
            switch model.phase {
            case .loading: SplashView()
            case .signedOut:
                if seenIntro {
                    WelcomeView()
                } else {
                    IntroView { withAnimation(.smooth) { seenIntro = true } }
                        .transition(.opacity)
                }
            case .onboarding: OnboardingView()
            case .ready:
                if model.needsOnboardingQuiz {
                    OnboardingQuizView()
                        .transition(.opacity)
                } else {
                    MainTabs()
                }
            }
            if let banner = model.banner {
                BannerView(banner: banner)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .task(id: banner.id) {
                        try? await Task.sleep(for: .seconds(2.6))
                        withAnimation(.easeOut) { model.banner = nil }
                    }
                    .zIndex(10)
            }
        }
        .animation(.smooth(duration: 0.45), value: model.phase)
        // Drawn in a window of its own, so it also shows over sheets (see CelebrationWindow).
        .onChange(of: model.celebration) { CelebrationWindow.shared.update(model: model) }
    }
}

struct SplashView: View {
    var body: some View {
        VStack(spacing: 16) {
            DogPortrait(look: .sample, cornerRadius: 40).frame(width: 120, height: 120)
            ProgressView().tint(Palette.grass)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .screenBackground()
    }
}

struct MainTabs: View {
    @Environment(AppModel.self) private var model
    @Environment(WalkTracker.self) private var walk
    @State private var showWalk = false
    @State private var progress = ProgressStore.shared

    var body: some View {
        @Bindable var model = model
        // Never over a Guus sheet (a passed quiz loads progress while that sheet is still up): it comes after.
        let showLevelUp = progress.celebrate != nil && !showWalk && !model.coachSheetOpen
        TabView(selection: $model.selectedTab) {
            if model.role != .owner {
                DiscoverView()
                    .tabItem { Label("Ontdek", systemImage: "pawprint.fill") }
                    .tag(AppModel.Tab.discover)
            }
            if model.role != .walker {
                OwnerHomeView()
                    .tabItem { Label(model.role == .owner ? L("Thuis") : L("Mijn honden"), systemImage: "house.fill") }
                    .badge(model.role == .both ? model.pendingIncoming : 0)
                    .tag(AppModel.Tab.home)
            }
            AppointmentsView()
                .tabItem { Label("Afspraken", systemImage: "calendar") }
                .badge(model.pendingIncoming)
                .tag(AppModel.Tab.appointments)
            ProfileView()
                .tabItem { Label("Jij", systemImage: "person.crop.circle") }
                .badge(model.me?.unread ?? 0)
                .tag(AppModel.Tab.profile)
        }
        .sensoryFeedback(.selection, trigger: model.selectedTab)
        .fullScreenCover(isPresented: Binding(get: { showLevelUp }, set: { if !$0 { Task { await progress.seen() } } })) {
            if let p = progress.celebrate { LevelUpView(progress: p) { Task { await progress.seen() } } }
        }
        .fullScreenCover(isPresented: $showWalk, onDismiss: { Task { await progress.load() } }) {
            ActiveWalkView()
        }
        .onAppear {
            if walk.isActive { showWalk = true }
            fitTab()
        }
        .onChange(of: model.role) { fitTab() }
        .onChange(of: walk.isActive) { _, active in if active { showWalk = true } }
        .coachRoutes(blocked: showWalk || progress.celebrate != nil)
    }

    /// Owners start at home, walkers at Discover; never on a tab that is not there.
    private func fitTab() {
        switch model.role {
        case .owner: if model.selectedTab == .discover { model.selectedTab = .home }
        case .walker: if model.selectedTab == .home { model.selectedTab = .discover }
        case .both: break
        }
    }
}
