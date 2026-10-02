import SwiftUI

@main
struct RondjeApp: App {
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
                    if phase == .active, model.phase == .ready { Task { await model.refreshMe() } }
                }
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ZStack(alignment: .top) {
            switch model.phase {
            case .loading: SplashView()
            case .signedOut: WelcomeView()
            case .onboarding: OnboardingView()
            case .ready: MainTabs()
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

    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.selectedTab) {
            DiscoverView()
                .tabItem { Label("Ontdek", systemImage: "pawprint.fill") }
                .tag(AppModel.Tab.discover)
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
        .fullScreenCover(isPresented: $showWalk) {
            ActiveWalkView()
        }
        .onAppear { if walk.isActive { showWalk = true } }
        .onChange(of: walk.isActive) { _, active in if active { showWalk = true } }
    }
}
