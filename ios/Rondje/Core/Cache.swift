import Foundation

/// The last profile and appointments, so the app still shows where to meet and who to call
/// without signal. Stored encrypted by iOS (file protection), never backed up, removed on sign-out.
enum Cache {
    private static var folder: URL? {
        guard var url = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?
            .appending(path: "cache", directoryHint: .isDirectory) else { return nil }
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? url.setResourceValues(values)
        return url
    }

    static func save<T: Encodable>(_ value: T, as name: String) {
        guard let url = folder?.appending(path: "\(name).json"), let data = try? JSONEncoder().encode(value) else { return }
        try? data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }

    static func load<T: Decodable>(_ type: T.Type, from name: String) -> T? {
        guard let url = folder?.appending(path: "\(name).json"), let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    static func clear() {
        if let folder { try? FileManager.default.removeItem(at: folder) }
    }
}
