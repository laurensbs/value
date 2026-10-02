import PhotosUI
import SwiftUI

/// The three things owners ask about after a walk, as large tap counters for the walker.
/// A tap adds one; a long press takes one back (mistakes happen with a leash in one hand).
struct CareCounters: View {
    let walkId: String
    @Binding var care: Care
    @State private var error: String?

    static let kinds: [(id: String, label: String, symbol: String)] = [
        ("pee", L("Plas"), "drop.fill"),
        ("poo", L("Poep"), "leaf.fill"),
        ("water", L("Gedronken"), "cup.and.saucer.fill"),
    ]

    var body: some View {
        HStack(spacing: 10) {
            ForEach(Self.kinds, id: \.id) { kind in
                Button {
                    Task { await log(kind.id, 1) }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: kind.symbol).font(.title3)
                        Text("\(care[kind.id])").font(.display(20).monospacedDigit()).contentTransition(.numericText())
                        Text(kind.label).font(.caption2.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity, minHeight: 72)
                    .foregroundStyle(Palette.ink)
                    .background(Palette.surface.opacity(0.85), in: .rect(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
                .simultaneousGesture(LongPressGesture(minimumDuration: 0.6).onEnded { _ in Task { await log(kind.id, -1) } })
                .accessibilityLabel("\(kind.label): \(care[kind.id])")
                .accessibilityHint("Tik om er een bij te tellen")
                .accessibilityAction(named: "Eén eraf") { Task { await log(kind.id, -1) } }
            }
        }
        .animation(.snappy, value: care)
    }

    private struct Payload: Encodable { var kind: String; var delta: Int }

    private func log(_ kind: String, _ delta: Int) async {
        if delta < 0 && care[kind] == 0 { return }
        delta > 0 ? Haptics.tap() : Haptics.soft()
        do {
            care = try await APIClient.shared.post("/api/v1/walks/\(walkId)/care", Payload(kind: kind, delta: delta))
        } catch {
            Haptics.error()
        }
    }
}

/// Read-only: the report as the owner (or the walker afterwards) sees it.
struct CareSummary: View {
    let care: Care

    var body: some View {
        HStack(spacing: 14) {
            ForEach(CareCounters.kinds, id: \.id) { kind in
                Label("\(care[kind.id])× \(kind.label.lowercased())", systemImage: kind.symbol)
                    .font(.subheadline.weight(.semibold))
            }
        }
        .foregroundStyle(Palette.ink)
    }
}

/// A row of photos from the walk.
struct PhotoStrip: View {
    let photos: [WalkPhoto]
    @State private var open: WalkPhoto?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(photos) { photo in
                    AsyncImage(url: URL(string: photo.url)) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Palette.sunken
                    }
                    .frame(width: 72, height: 72)
                    .clipShape(.rect(cornerRadius: 14, style: .continuous))
                    .transition(.scale.combined(with: .opacity))
                    .onTapGesture { open = photo }
                    .accessibilityAddTraits(.isButton)
                    .accessibilityLabel("Foto van het rondje")
                }
            }
        }
        .animation(.spring, value: photos)
        .sheet(item: $open) { photo in
            AsyncImage(url: URL(string: photo.url)) { image in
                image.resizable().scaledToFit()
            } placeholder: {
                ProgressView()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.black)
            .presentationDragIndicator(.visible)
        }
    }
}

/// "Stuur een foto": the camera when there is one, otherwise the photo library.
struct SendPhotoButton: View {
    let walkId: String
    var sent: (WalkPhoto) -> Void

    @State private var camera = false
    @State private var item: PhotosPickerItem?
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        Group {
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                Button { camera = true } label: { label }
            } else {
                PhotosPicker(selection: $item, matching: .images) { label }
            }
        }
        .buttonStyle(.plain)
        .disabled(busy)
        .sheet(isPresented: $camera) {
            CameraPicker { image in Task { await send(image) } }.ignoresSafeArea()
        }
        .onChange(of: item) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) { await send(image) }
                self.item = nil
            }
        }
    }

    private var label: some View {
        Label(busy ? L("Versturen…") : L("Stuur een foto"), systemImage: "camera.fill")
            .font(.subheadline.weight(.semibold))
            .frame(maxWidth: .infinity, minHeight: 44)
            .foregroundStyle(Palette.ink)
            .background(Palette.surface.opacity(0.85), in: .capsule)
    }

    private struct Payload: Encodable { var url: String }
    private struct Added: Decodable { var ok: Bool; var photo: WalkPhoto }

    private func send(_ image: UIImage) async {
        busy = true
        defer { busy = false }
        do {
            let url = try await ImageTools.upload(image)
            let added: Added = try await APIClient.shared.post("/api/v1/walks/\(walkId)/photos", Payload(url: url))
            Haptics.success()
            sent(added.photo)
        } catch {
            Haptics.error()
        }
    }
}

/// The system camera, for a quick photo during the walk.
struct CameraPicker: UIViewControllerRepresentable {
    var picked: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage { parent.picked(image) }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}
