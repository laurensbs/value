import Foundation

/// The illustrated portrait of a dog, drawn from a few traits (same model as the website's DogFace).
struct DogLook: Codable, Hashable, Sendable {
    var fur: String
    var ears: String
    var muzzle: String
    var earStyle: String
    var head: String?
    var blaze: String?
    var patch: String?
    var brows: String?
    var tongue: Bool?
    var collar: String
    var tile: String?

    static let sample = DogLook(
        fur: "#e2b45c", ears: "#c99540", muzzle: "#f2d79b", earStyle: "floppy",
        head: "round", blaze: nil, patch: nil, brows: nil, tongue: true, collar: "#1f5a3d", tile: "#f6ebcf"
    )
}
