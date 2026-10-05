import MapKit
import SwiftUI

/// For the owner or shelter: watch the walk live. Polls every few seconds while open.
/// Only a walk alone with the dog, with live location switched on, has a map. At a first meeting they
/// walk together, so there is none; with the switch off neither. The time, the walk report and the
/// photos still come in, and one calm line says why.
struct FollowWalkView: View {
    let walkId: String
    let dogName: String
    /// The appointment's kind ("meet" or "solo"), until /live says it.
    var kind: String? = nil
    @Environment(\.dismiss) private var dismiss
    @State private var live: LiveWalk?
    @State private var points: [LivePoint] = []
    @State private var photos: [WalkPhoto] = []
    @State private var camera: MapCameraPosition = .automatic
    @State private var error: String?

    private var coordinates: [CLLocationCoordinate2D] { points.map { .init(latitude: $0.lat, longitude: $0.lng) } }
    private var walkKind: String? { live?.kind ?? kind }
    private var showsMap: Bool { Self.showsMap(kind: walkKind, live: live?.liveLocation, liveLocation: ServerFeatures.shared.liveLocation) }

    /// A first meeting never has a map. Otherwise the walk's own answer once it is in (/live
    /// `liveLocation`); before that, or from an older server, what the phone last heard of the switch.
    nonisolated static func showsMap(kind: String?, live: Bool?, liveLocation: Bool) -> Bool {
        if kind == "meet" { return false }
        return live ?? liveLocation
    }

    var body: some View {
        NavigationStack {
            // Without a map, the walk's details stand at the top, where the map would have been.
            ZStack(alignment: showsMap ? .bottom : .top) {
                if showsMap {
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
                } else {
                    Palette.paper.ignoresSafeArea()
                }

                VStack(alignment: .leading, spacing: 8) {
                    if let live {
                        if !showsMap, walkKind == "meet" {
                            Label("Jullie lopen samen, dus er is geen kaart nodig.", systemImage: "figure.2")
                                .font(.subheadline)
                                .foregroundStyle(Palette.muted)
                        } else if !showsMap, walkKind == "solo" || !ServerFeatures.shared.liveLocation {
                            Label("Live locatie staat op dit moment uit, dus hier staat geen kaart. Je ziet wel de tijd, het rondje-rapport en de foto's.", systemImage: "location.slash")
                                .font(.subheadline)
                                .foregroundStyle(Palette.muted)
                        } else if showsMap, live.overdueMin == 0 {
                            GuusHint(id: "follow", text: L("Je ziet live waar ze lopen. Foto's en plasjes komen hier vanzelf binnen."))
                        }
                        HStack {
                            Chip(text: live.status == "active" ? L("Onderweg") : L("Terug"), symbol: live.status == "active" ? "figure.walk" : "house.fill")
                            Spacer()
                            if showsMap, let lastAt = live.lastAt {
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
                self.error = error.plainText
            }
            try? await Task.sleep(for: .seconds(5))
        }
    }
}
