import MapKit
import SwiftUI

/// For the owner or shelter: watch the walk live. Polls every few seconds while open.
struct FollowWalkView: View {
    let walkId: String
    let dogName: String
    @Environment(\.dismiss) private var dismiss
    @State private var live: LiveWalk?
    @State private var points: [LivePoint] = []
    @State private var photos: [WalkPhoto] = []
    @State private var camera: MapCameraPosition = .automatic
    @State private var error: String?

    private var coordinates: [CLLocationCoordinate2D] { points.map { .init(latitude: $0.lat, longitude: $0.lng) } }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                Map(position: $camera) {
                    if coordinates.count > 1 {
                        MapPolyline(coordinates: coordinates)
                            .stroke(Palette.route, style: StrokeStyle(lineWidth: 6, lineCap: .round, lineJoin: .round))
                    }
                    if let last = coordinates.last {
                        Annotation(dogName, coordinate: last) {
                            Image(systemName: "pawprint.circle.fill")
                                .font(.system(size: 34))
                                .foregroundStyle(Palette.onBall, Palette.ball)
                                .symbolEffect(.pulse)
                        }
                    }
                }
                .ignoresSafeArea(edges: .bottom)

                VStack(alignment: .leading, spacing: 8) {
                    if let live {
                        HStack {
                            Chip(text: live.status == "active" ? L("Onderweg") : L("Terug"), symbol: live.status == "active" ? "figure.walk" : "house.fill")
                            Spacer()
                            if let lastAt = live.lastAt {
                                Text("Laatste plek \(lastAt, style: .relative) geleden").font(.caption).foregroundStyle(Palette.muted)
                            }
                        }
                        if let care = live.care { CareSummary(care: care) }
                        if !photos.isEmpty { PhotoStrip(photos: photos) }
                        if live.overdueMin > 0 {
                            Label("\(live.overdueMin) minuten over tijd. Bel even als je je zorgen maakt.", systemImage: "clock.badge.exclamationmark")
                                .font(.subheadline).foregroundStyle(Palette.warn)
                        } else {
                            Label("Terug rond \(live.plannedEndAt.formatted(.dateTime.hour().minute().locale(Format.locale)))", systemImage: "clock")
                                .font(.subheadline)
                        }
                    } else if let error {
                        Text(error).foregroundStyle(Palette.danger)
                    } else {
                        ProgressView()
                    }
                }
                .padding(18)
                .glassy(cornerRadius: 28)
                .padding()
            }
            .navigationTitle("\(dogName) live")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Sluit", systemImage: "xmark") { dismiss() } } }
            .task { await poll() }
        }
    }

    private func poll() async {
        while !Task.isCancelled {
            do {
                let after = points.last?.id ?? 0
                let photosAfter = Int(photos.last?.t ?? 0)
                let update: LiveWalk = try await APIClient.shared.get("/api/walks/\(walkId)/live?after=\(after)&photosAfter=\(photosAfter)")
                live = update
                if let new = update.photos, !new.isEmpty {
                    if !photos.isEmpty { Haptics.soft() }
                    withAnimation { photos.append(contentsOf: new.filter { p in !photos.contains { $0.id == p.id } }) }
                }
                if !update.points.isEmpty {
                    points.append(contentsOf: update.points)
                    if let last = coordinates.last { withAnimation { camera = .camera(MapCamera(centerCoordinate: last, distance: 1200)) } }
                }
                error = nil
                if update.status != "active" { return }
            } catch {
                self.error = error.localizedDescription
            }
            try? await Task.sleep(for: .seconds(5))
        }
    }
}
