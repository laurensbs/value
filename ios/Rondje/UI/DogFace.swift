import SwiftUI

/// Flat front-facing dog portrait, a direct port of the website's DogFace (web/src/components/DogFace.tsx).
/// Drawn on a 120 × 120 grid and scaled to any size.
struct DogFace: View {
    var look: DogLook
    var blink = false

    var body: some View {
        Canvas { ctx, size in
            let k = min(size.width, size.height) / 120
            ctx.translateBy(x: (size.width - 120 * k) / 2, y: (size.height - 120 * k) / 2)
            ctx.scaleBy(x: k, y: k)
            draw(in: &ctx)
        }
        .accessibilityHidden(true)
    }

    private struct Head { let rx, ry, cy, mcy, mrx, mry: CGFloat }

    private var headShape: Head {
        switch look.head {
        case "wide": Head(rx: 38, ry: 30, cy: 63, mcy: 77, mrx: 20, mry: 13)
        case "narrow": Head(rx: 28, ry: 34, cy: 61, mcy: 80, mrx: 14, mry: 14)
        default: Head(rx: 34, ry: 32, cy: 62, mcy: 76, mrx: 18, mry: 14)
        }
    }

    private func ellipse(_ cx: CGFloat, _ cy: CGFloat, _ rx: CGFloat, _ ry: CGFloat, rotate deg: CGFloat = 0) -> Path {
        let rect = CGRect(x: -rx, y: -ry, width: rx * 2, height: ry * 2)
        let t = CGAffineTransform(translationX: cx, y: cy).rotated(by: deg * .pi / 180)
        return Path(ellipseIn: rect).applying(t)
    }

    private func draw(in ctx: inout GraphicsContext) {
        let ink = Color(hex: 0x1D2421)
        let fur = Color(css: look.fur), ears = Color(css: look.ears)
        let h = headShape
        let left = 60 - h.rx, right = 60 + h.rx, top = h.cy - h.ry
        let eyeDx = (h.rx * 0.38).rounded()
        let eyeY = h.cy - 5
        let noseY = h.mcy - 6
        let collarY = h.cy + h.ry - 5

        if look.earStyle == "pointy" {
            var p = Path()
            p.move(to: CGPoint(x: left + 1, y: top + 22)); p.addLine(to: CGPoint(x: left - 1, y: top - 13)); p.addLine(to: CGPoint(x: left + 24, y: top + 6)); p.closeSubpath()
            p.move(to: CGPoint(x: right - 1, y: top + 22)); p.addLine(to: CGPoint(x: right + 1, y: top - 13)); p.addLine(to: CGPoint(x: right - 24, y: top + 6)); p.closeSubpath()
            ctx.fill(p, with: .color(ears))
            ctx.stroke(p, with: .color(ears), style: StrokeStyle(lineWidth: 6, lineJoin: .round))
        }
        if look.earStyle == "bat" {
            let inner = Color(hex: 0xE9B3A6)
            ctx.fill(ellipse(left + 7, top + 2, 13, 19, rotate: -24), with: .color(ears))
            ctx.fill(ellipse(right - 7, top + 2, 13, 19, rotate: 24), with: .color(ears))
            ctx.fill(ellipse(left + 8, top + 3, 6.5, 12, rotate: -24), with: .color(inner))
            ctx.fill(ellipse(right - 8, top + 3, 6.5, 12, rotate: 24), with: .color(inner))
        }

        ctx.fill(ellipse(60, h.cy, h.rx, h.ry), with: .color(fur))

        if let blaze = look.blaze {
            var p = Path()
            p.move(to: CGPoint(x: 54, y: h.mcy - 8))
            p.addCurve(to: CGPoint(x: 60, y: top + 3), control1: CGPoint(x: 55, y: h.cy - 6), control2: CGPoint(x: 58, y: top + 10))
            p.addCurve(to: CGPoint(x: 66, y: h.mcy - 8), control1: CGPoint(x: 62, y: top + 10), control2: CGPoint(x: 65, y: h.cy - 6))
            p.closeSubpath()
            ctx.fill(p, with: .color(Color(css: blaze)))
        }

        if look.earStyle == "floppy" {
            ctx.fill(ellipse(left + 5, h.cy, 11, 24, rotate: 14), with: .color(ears))
            ctx.fill(ellipse(right - 5, h.cy, 11, 24, rotate: -14), with: .color(ears))
        }
        if look.earStyle == "fold" {
            ctx.fill(ellipse(left + 11, top + 7, 13, 9, rotate: -32), with: .color(ears))
            ctx.fill(ellipse(right - 11, top + 7, 13, 9, rotate: 32), with: .color(ears))
        }

        if let patch = look.patch { ctx.fill(ellipse(60 + eyeDx + 1, eyeY - 1, 10, 9.5), with: .color(Color(css: patch))) }
        if let brows = look.brows {
            ctx.fill(ellipse(60 - eyeDx, eyeY - 8, 3.4, 2.3), with: .color(Color(css: brows)))
            ctx.fill(ellipse(60 + eyeDx, eyeY - 8, 3.4, 2.3), with: .color(Color(css: brows)))
        }

        if blink {
            var lids = Path()
            lids.move(to: CGPoint(x: 60 - eyeDx - 4, y: eyeY)); lids.addLine(to: CGPoint(x: 60 - eyeDx + 4, y: eyeY))
            lids.move(to: CGPoint(x: 60 + eyeDx - 4, y: eyeY)); lids.addLine(to: CGPoint(x: 60 + eyeDx + 4, y: eyeY))
            ctx.stroke(lids, with: .color(ink), style: StrokeStyle(lineWidth: 2.4, lineCap: .round))
        } else {
            ctx.fill(ellipse(60 - eyeDx, eyeY, 4.3, 4.3), with: .color(ink))
            ctx.fill(ellipse(60 + eyeDx, eyeY, 4.3, 4.3), with: .color(ink))
            ctx.fill(ellipse(60 - eyeDx + 1.5, eyeY - 1.4, 1.4, 1.4), with: .color(.white))
            ctx.fill(ellipse(60 + eyeDx + 1.5, eyeY - 1.4, 1.4, 1.4), with: .color(.white))
        }

        ctx.fill(ellipse(60, h.mcy, h.mrx, h.mry), with: .color(Color(css: look.muzzle)))
        if look.tongue == true {
            var t = Path()
            t.move(to: CGPoint(x: 55.5, y: h.mcy + 4.5))
            t.addQuadCurve(to: CGPoint(x: 64.5, y: h.mcy + 4.5), control: CGPoint(x: 60, y: h.mcy + 15.5))
            t.closeSubpath()
            ctx.fill(t, with: .color(Color(hex: 0xE8798A)))
        }
        ctx.fill(ellipse(60, noseY, 7, 5), with: .color(ink))
        ctx.fill(ellipse(58, noseY - 1.6, 2.2, 1.2), with: .color(.white.opacity(0.35)))
        var mouth = Path()
        mouth.move(to: CGPoint(x: 60, y: noseY + 5)); mouth.addLine(to: CGPoint(x: 60, y: noseY + 9))
        mouth.addQuadCurve(to: CGPoint(x: 51, y: noseY + 10), control: CGPoint(x: 55, y: noseY + 13))
        mouth.move(to: CGPoint(x: 60, y: noseY + 9))
        mouth.addQuadCurve(to: CGPoint(x: 69, y: noseY + 10), control: CGPoint(x: 65, y: noseY + 13))
        ctx.stroke(mouth, with: .color(ink), style: StrokeStyle(lineWidth: 2, lineCap: .round))

        let collar = Path(roundedRect: CGRect(x: 60 - h.rx * 0.68, y: collarY, width: h.rx * 1.36, height: 7), cornerRadius: 3.5)
        ctx.fill(collar, with: .color(Color(css: look.collar)))
        let tag = ellipse(60, collarY + 12, 5.5, 5.5)
        ctx.fill(tag, with: .color(Color(hex: 0xE9C46A)))
        ctx.stroke(tag, with: .color(ink), lineWidth: 1.5)
    }
}

/// A dog's portrait on its coloured tile, or its photo when it has one. Blinks now and then.
struct DogPortrait: View {
    var look: DogLook
    var photoURL: URL? = nil
    var cornerRadius: CGFloat = 24
    /// Room around the illustrated face, as a share of the tile's shorter side.
    var inset: CGFloat = 0.07
    @State private var blink = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        GeometryReader { geo in
            let pad = min(geo.size.width, geo.size.height) * inset
            content(pad: pad).frame(width: geo.size.width, height: geo.size.height)
        }
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .task {
            // A blink every few seconds makes the illustrations feel alive without being busy.
            guard !reduceMotion else { return }
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(Double.random(in: 3.5...7)))
                withAnimation(.easeInOut(duration: 0.08)) { blink = true }
                try? await Task.sleep(for: .milliseconds(140))
                withAnimation(.easeInOut(duration: 0.08)) { blink = false }
            }
        }
    }

    private func content(pad: CGFloat) -> some View {
        ZStack {
            Color(css: look.tile ?? "#f6ebcf")
            if let photoURL {
                AsyncImage(url: photoURL, transaction: Transaction(animation: .easeOut(duration: 0.25))) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        DogFace(look: look, blink: blink).padding(pad)
                    }
                }
            } else {
                DogFace(look: look, blink: blink).padding(pad)
            }
        }
    }
}

#Preview {
    DogPortrait(look: .sample).frame(width: 160, height: 160).padding()
}
