import UIKit

enum ImageTools {
    /// Shrinks and re-encodes a photo as JPEG: smaller uploads, and no location or other EXIF data in the file.
    static func jpeg(_ image: UIImage, side: CGFloat = 1200, quality: CGFloat = 0.8) -> Data? {
        let scale = min(1, side / max(image.size.width, image.size.height))
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let resized = UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
        return resized.jpegData(compressionQuality: quality)
    }

    /// Uploads a photo: a normal size first, a smaller one if the server says it is too large (like the website).
    static func upload(_ image: UIImage) async throws -> String {
        do {
            return try await APIClient.shared.uploadPhoto(jpeg(image) ?? Data())
        } catch APIError.server(code: "too-large", _) {
            return try await APIClient.shared.uploadPhoto(jpeg(image, side: 800, quality: 0.65) ?? Data())
        }
    }
}
