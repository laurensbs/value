import Foundation
import Security
import Synchronization

/// The session token lives only in the Keychain: encrypted, never in backups to other devices,
/// and only readable after the phone was unlocked once.
enum Keychain {
    private static let service = "app.rondje.session"
    private static let account = "token"

    /// Only for a build that cannot use the Keychain at all, such as an unsigned simulator build
    /// (`CODE_SIGNING_ALLOWED=NO` has no application-identifier, so every SecItem call fails with
    /// errSecMissingEntitlement). The token then lives in memory for this run only, never on disk.
    /// Without it, sign-up "worked" but the next request went out without a token, got a 401,
    /// and the app went back to the welcome screen.
    private static let fallback = Mutex<String?>(nil)

    static func save(_ token: String) {
        let data = Data(token.utf8)
        let query = baseQuery()
        SecItemDelete(query as CFDictionary)
        var attributes = query
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(attributes as CFDictionary, nil)
        fallback.withLock { $0 = status == errSecSuccess ? nil : token }
    }

    static func load() -> String? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else {
            return fallback.withLock { $0 }
        }
        return String(data: data, encoding: .utf8)
    }

    static func clear() {
        SecItemDelete(baseQuery() as CFDictionary)
        fallback.withLock { $0 = nil }
    }

    private static func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}
