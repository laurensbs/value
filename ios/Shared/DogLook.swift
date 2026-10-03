import Foundation

/// The illustrated portrait of a dog, drawn from a few traits (same model as the website's DogFace).
struct DogLook: Codable, Hashable, Sendable {
    var fur: String
    var ears: String
    var muzzle: String
    var earStyle: String = "floppy"
    var head: String?
    var blaze: String?
    var patch: String?
    var brows: String?
    var tongue: Bool?
    var collar: String = "#1f5a3d"
    var tile: String?

    init(fur: String, ears: String, muzzle: String, earStyle: String = "floppy", head: String? = nil, blaze: String? = nil,
         patch: String? = nil, brows: String? = nil, tongue: Bool? = nil, collar: String = "#1f5a3d", tile: String? = nil) {
        self.fur = fur; self.ears = ears; self.muzzle = muzzle; self.earStyle = earStyle; self.head = head; self.blaze = blaze
        self.patch = patch; self.brows = brows; self.tongue = tongue; self.collar = collar; self.tile = tile
    }

    /// Tolerant: a stored portrait may miss fields, and the app should still draw a dog.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        fur = try c.decodeIfPresent(String.self, forKey: .fur) ?? "#e2b45c"
        ears = try c.decodeIfPresent(String.self, forKey: .ears) ?? "#c99540"
        muzzle = try c.decodeIfPresent(String.self, forKey: .muzzle) ?? "#f2d79b"
        earStyle = try c.decodeIfPresent(String.self, forKey: .earStyle) ?? "floppy"
        head = try c.decodeIfPresent(String.self, forKey: .head)
        blaze = try c.decodeIfPresent(String.self, forKey: .blaze)
        patch = try c.decodeIfPresent(String.self, forKey: .patch)
        brows = try c.decodeIfPresent(String.self, forKey: .brows)
        tongue = try c.decodeIfPresent(Bool.self, forKey: .tongue)
        collar = try c.decodeIfPresent(String.self, forKey: .collar) ?? "#1f5a3d"
        tile = try c.decodeIfPresent(String.self, forKey: .tile)
    }

    static let sample = DogLook(
        fur: "#e2b45c", ears: "#c99540", muzzle: "#f2d79b", earStyle: "floppy",
        head: "round", blaze: nil, patch: nil, brows: nil, tongue: true, collar: "#1f5a3d", tile: "#f6ebcf"
    )
}
