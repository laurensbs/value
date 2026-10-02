import Foundation

enum APIError: LocalizedError, Equatable {
    case server(code: String, message: String)
    case unauthorized
    case offline
    case unexpected

    var errorDescription: String? {
        switch self {
        case .server(_, let message): message
        case .unauthorized: L("Log opnieuw in om verder te gaan.")
        case .offline: L("Geen verbinding. Controleer je internet en probeer het opnieuw.")
        case .unexpected: L("Er ging iets mis. Probeer het opnieuw.")
        }
    }

    var code: String? {
        if case .server(let code, _) = self { return code }
        return nil
    }
}

/// Talks to the Rondje API over HTTPS with the session token from the Keychain.
/// It only ever talks to Brand.baseURL, and never logs tokens or personal data.
final class APIClient: Sendable {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder = JSONEncoder()

    init() {
        let config = URLSessionConfiguration.ephemeral
        config.httpCookieStorage = nil
        config.httpShouldSetCookies = false
        config.urlCache = nil
        config.timeoutIntervalForRequest = 20
        config.waitsForConnectivity = false
        session = URLSession(configuration: config)

        decoder = Self.makeDecoder()
    }

    /// The server sends ISO 8601 dates, with or without milliseconds.
    static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let raw = try decoder.singleValueContainer().decode(String.self)
            if let date = APIClient.isoFractional.date(from: raw) ?? APIClient.iso.date(from: raw) { return date }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Bad date \(raw)"))
        }
        return decoder
    }

    nonisolated(unsafe) private static let isoFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    nonisolated(unsafe) private static let iso = ISO8601DateFormatter()

    var hasSession: Bool { Keychain.load() != nil }

    // MARK: Auth (Better Auth endpoints; the token comes back in the set-auth-token header)

    func signIn(email: String, password: String) async throws {
        try await authenticate(path: "/api/auth/sign-in/email", body: ["email": email, "password": password])
    }

    func signUp(name: String, email: String, password: String) async throws {
        try await authenticate(path: "/api/auth/sign-up/email", body: ["name": name, "email": email, "password": password])
    }

    func signOut() async {
        _ = try? await raw("POST", "/api/auth/sign-out", body: [String: String]())
        Keychain.clear()
    }

    private func authenticate(path: String, body: [String: String]) async throws {
        let (data, response) = try await raw("POST", path, body: body, authorized: false)
        guard let token = response.value(forHTTPHeaderField: "set-auth-token"), !token.isEmpty else {
            throw authError(data: data, status: response.statusCode)
        }
        Keychain.save(token)
    }

    private func authError(data: Data, status: Int) -> APIError {
        struct BetterAuthError: Decodable { var code: String?; var message: String? }
        let err = try? JSONDecoder().decode(BetterAuthError.self, from: data)
        switch err?.code {
        case "INVALID_EMAIL_OR_PASSWORD": return .server(code: "credentials", message: L("Dit e-mailadres en wachtwoord passen niet bij elkaar."))
        case "USER_ALREADY_EXISTS", "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
            return .server(code: "exists", message: L("Er is al een account met dit e-mailadres. Log in."))
        case "PASSWORD_TOO_SHORT": return .server(code: "password", message: L("Kies een wachtwoord van minstens 8 tekens."))
        case "INVALID_EMAIL": return .server(code: "email", message: L("Dit e-mailadres klopt niet."))
        default:
            if status == 429 { return .server(code: "rate", message: L("Te veel pogingen. Wacht even en probeer het opnieuw.")) }
            return .server(code: err?.code ?? "auth", message: err?.message ?? L("Inloggen lukte niet. Probeer het opnieuw."))
        }
    }

    // MARK: Photos

    /// Uploads a photo the app already shrank and re-encoded (which also drops EXIF and GPS data).
    func uploadPhoto(_ jpeg: Data) async throws -> String {
        let boundary = "rondje-\(UUID().uuidString)"
        var body = Data()
        body.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"file\"; filename=\"photo.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".utf8))
        body.append(jpeg)
        body.append(Data("\r\n--\(boundary)--\r\n".utf8))
        guard let url = URL(string: Brand.baseURL.absoluteString + "/api/upload"), let token = Keychain.load() else { throw APIError.unauthorized }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = body
        struct Uploaded: Decodable { var url: String }
        do {
            let (data, response) = try await session.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            if status == 413 { throw APIError.server(code: "too-large", message: L("Deze foto is te groot.")) }
            guard status == 200, let uploaded = try? decoder.decode(Uploaded.self, from: data) else { throw APIError.unexpected }
            return uploaded.url
        } catch let error as URLError {
            throw error.code == .cancelled ? CancellationError() : APIError.offline
        }
    }

    // MARK: JSON calls

    func get<T: Decodable>(_ path: String, as type: T.Type = T.self) async throws -> T {
        try await call("GET", path, body: Optional<[String: String]>.none)
    }

    func post<T: Decodable, B: Encodable>(_ path: String, _ body: B, as type: T.Type = T.self) async throws -> T {
        try await call("POST", path, body: body)
    }

    func patch<T: Decodable, B: Encodable>(_ path: String, _ body: B, as type: T.Type = T.self) async throws -> T {
        try await call("PATCH", path, body: body)
    }

    func delete<T: Decodable, B: Encodable>(_ path: String, _ body: B, as type: T.Type = T.self) async throws -> T {
        try await call("DELETE", path, body: body)
    }

    private func call<T: Decodable, B: Encodable>(_ method: String, _ path: String, body: B?) async throws -> T {
        let (data, response) = try await raw(method, path, body: body)
        switch response.statusCode {
        case 200..<300:
            do { return try decoder.decode(T.self, from: data) } catch { throw APIError.unexpected }
        case 401:
            Keychain.clear()
            NotificationCenter.default.post(name: .rondjeSignedOut, object: nil)
            throw APIError.unauthorized
        default:
            if let failure = try? decoder.decode(Failure.self, from: data) {
                throw APIError.server(code: failure.error, message: failure.message ?? APIError.unexpected.localizedDescription)
            }
            throw APIError.unexpected
        }
    }

    private func raw<B: Encodable>(_ method: String, _ path: String, body: B?, authorized: Bool = true) async throws -> (Data, HTTPURLResponse) {
        // Paths are fixed strings from this app (plus percent-encoded query values), never user URLs.
        let base = Brand.baseURL.absoluteString.hasSuffix("/") ? String(Brand.baseURL.absoluteString.dropLast()) : Brand.baseURL.absoluteString
        guard let url = URL(string: base + path) else { throw APIError.unexpected }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(Locale.preferredLanguages.first ?? "nl", forHTTPHeaderField: "Accept-Language")
        request.setValue("RondjeApp/1 iOS", forHTTPHeaderField: "User-Agent")
        if authorized, let token = Keychain.load() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try encoder.encode(body)
        }
        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw APIError.unexpected }
            return (data, http)
        } catch let error as URLError {
            throw error.code == .cancelled ? CancellationError() : APIError.offline
        }
    }
}

private struct Failure: Decodable { var error: String; var message: String? }

extension Notification.Name {
    static let rondjeSignedOut = Notification.Name("rondjeSignedOut")
}
