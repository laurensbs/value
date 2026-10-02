"""Generates Rondje's small sounds, so they are our own and need no download or licence.

Run from ios/: python3 design/sounds.py
Writes the same WAV files to ios/Rondje/Resources/Sounds/ (the app) and web/public/sounds/ (the website,
which plays /sounds/<name>.wav). The file names are a contract with web/src/lib/sounds.ts.

The palette: warm marimba/kalimba-like tones, built from a few sine partials that each fade on their own,
all in C major pentatonic (C D E G A), so every sound fits with every other one and none can clash.
Soft attacks, short tails, a little room, peaks around -16 dBFS: rewarding, but calm. Nothing loops,
nothing escalates, nothing begs for another tap.
"""
import math
import os
import random
import struct
import wave

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = [
    os.path.normpath(os.path.join(HERE, "..", "Rondje", "Resources", "Sounds")),
    os.path.normpath(os.path.join(HERE, "..", "..", "web", "public", "sounds")),
]
MAX_BYTES = 120_000


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# C major pentatonic, by MIDI number.
G3, C4, D4, E4, G4, A4 = 55, 60, 62, 64, 67, 69
C5, D5, E5, G5, A5 = 72, 74, 76, 79, 81
C6, D6, E6, G6, A6 = 84, 86, 88, 91, 93
C7 = 96

# A mallet on a wooden bar: the fundamental rings longest; the bar's overtones (about 4x and 10x, like a
# marimba) and a soft octave are quieter and fade much faster. That fast fade is what makes it sound warm.
MALLET = [(1.0, 1.0, 1.0), (2.0, 0.08, 0.5), (3.98, 0.20, 0.22), (9.9, 0.045, 0.08)]
# Rounder still, for the gentle "error": almost only the fundamental.
SOFT = [(1.0, 1.0, 1.0), (2.0, 0.05, 0.4), (3.98, 0.06, 0.18)]

rng = random.Random(20261002)


def silence(seconds):
    return [0.0] * int(round(seconds * SR))


def raised_cosine(t, length):
    """0 → 1 without a corner: no click at the start of a note."""
    if t >= length:
        return 1.0
    return 0.5 - 0.5 * math.cos(math.pi * t / length)


def note(buf, at, midi, amp=1.0, decay=0.35, attack=0.006, partials=MALLET, bright=1.0, detune_cents=3.0):
    """A mallet note at `at` seconds. Lower notes ring a little longer, like real bars."""
    f0 = hz(midi)
    tau = decay * (hz(C5) / f0) ** 0.3
    start = int(at * SR)
    length = min(len(buf) - start, int(tau * 7 * SR))
    for ratio, rel, decay_factor in partials:
        f = f0 * ratio
        if f > 15000:
            continue
        a = amp * rel * (bright if ratio > 1 else 1.0)
        t_partial = tau * decay_factor
        # A second voice a few cents off gives a slow, living beat instead of a sterile sine.
        for voice_f, voice_a in ((f, 0.82), (f * 2 ** (detune_cents / 1200), 0.18)):
            w = 2 * math.pi * voice_f / SR
            for i in range(length):
                t = i / SR
                buf[start + i] += a * voice_a * raised_cosine(t, attack) * math.exp(-t / t_partial) * math.sin(w * i)
    # The felt of the mallet: a few milliseconds of soft, low-passed noise.
    knock = int(0.008 * SR)
    lp, alpha = 0.0, 1 - math.exp(-2 * math.pi * min(f0 * 2, 5000) / SR)
    for i in range(min(knock, len(buf) - start)):
        lp += alpha * (rng.uniform(-1, 1) - lp)
        t = i / SR
        buf[start + i] += amp * 0.06 * bright * raised_cosine(t, 0.002) * math.exp(-t / 0.002) * lp


def glide(buf, at, dur, f_from, f_to, amp=1.0, attack=0.04):
    """A sine that slides up (exponentially, so it sounds even), swelling in and fading out."""
    start = int(at * SR)
    n = min(len(buf) - start, int(dur * SR))
    phase = 0.0
    for i in range(n):
        x = i / n
        f = f_from * (f_to / f_from) ** x
        phase += 2 * math.pi * f / SR
        env = raised_cosine(i / SR, attack) * (1 - x) ** 1.6
        buf[start + i] += amp * env * (math.sin(phase) + 0.12 * math.sin(2 * phase))


def swoosh(buf, at, dur, cutoff_from, cutoff_to, amp=1.0):
    """Air: noise through a low-pass whose cutoff rises, shaped like a soft bell."""
    start = int(at * SR)
    n = min(len(buf) - start, int(dur * SR))
    lp1 = lp2 = 0.0
    for i in range(n):
        x = i / n
        fc = cutoff_from * (cutoff_to / cutoff_from) ** x
        alpha = 1 - math.exp(-2 * math.pi * fc / SR)
        lp1 += alpha * (rng.uniform(-1, 1) - lp1)
        lp2 += alpha * (lp1 - lp2)
        buf[start + i] += amp * math.sin(math.pi * x) ** 2 * lp2


def pad(buf, at, dur, midi, amp=1.0, rise=0.5, fall=0.6, bright_from=0.0, bright_to=0.0):
    """A soft, breathing chord tone: slow swell, slow release, brightness that opens or closes."""
    f0 = hz(midi)
    start = int(at * SR)
    n = min(len(buf) - start, int(dur * SR))
    for i in range(n):
        t = i / SR
        x = i / n
        env = raised_cosine(t, rise) * raised_cosine(dur - t, fall)
        b = bright_from + (bright_to - bright_from) * x
        w = 2 * math.pi * f0 * i / SR
        s = math.sin(w) * 0.8 + math.sin(w * 1.0035) * 0.2 + b * (0.28 * math.sin(2 * w) + 0.1 * math.sin(3 * w))
        buf[start + i] += amp * env * s


def room(buf, wet=0.14, size=0.62, damp=0.35):
    """A small, warm room (Schroeder: four damped combs, two all-passes)."""
    out = [0.0] * len(buf)
    for d in (1557, 1617, 1491, 1422):
        line, idx, filt = [0.0] * d, 0, 0.0
        for i, x in enumerate(buf):
            y = line[idx]
            filt = y * (1 - damp) + filt * damp
            line[idx] = x + filt * size
            idx = (idx + 1) % d
            out[i] += y * 0.25
    for d in (556, 441):
        line, idx = [0.0] * d, 0
        for i in range(len(out)):
            delayed = line[idx]
            x = out[i]
            line[idx] = x + delayed * 0.5
            idx = (idx + 1) % d
            out[i] = delayed - x
    return [x + wet * y for x, y in zip(buf, out)]


def finish(buf, peak_dbfs, fade_out=0.03, fade_in=0.005):
    """Fades both ends to exact silence and sets the peak level."""
    n = len(buf)
    fo, fi = int(fade_out * SR), int(fade_in * SR)
    for i in range(fi):
        buf[i] *= raised_cosine(i / SR, fade_in)
    for i in range(fo):
        buf[n - 1 - i] *= raised_cosine(i / SR, fade_out)
    mean = sum(buf) / n  # remove any DC from the noise
    buf = [x - mean * raised_cosine(min(i, n - 1 - i) / SR, fade_out) for i, x in enumerate(buf)]
    peak = max(abs(x) for x in buf) or 1.0
    gain = 10 ** (peak_dbfs / 20) / peak
    return [x * gain for x in buf]


# --- The sounds -------------------------------------------------------------------------------------


def tap():
    """A very soft wooden click, for primary buttons only."""
    b = silence(0.075)
    note(b, 0, A6, decay=0.018, bright=0.5)
    return finish(room(b, wet=0.05, size=0.3), -21, fade_out=0.02)


def select():
    """A light tick for filters and toggles."""
    b = silence(0.11)
    note(b, 0, E6, decay=0.03, bright=0.6)
    return finish(room(b, wet=0.06, size=0.35), -20, fade_out=0.025)


def send():
    """Something leaves your hands: a little rising breath of air that lands on a soft note."""
    b = silence(0.42)
    swoosh(b, 0, 0.2, 500, 4200, amp=0.5)
    glide(b, 0.01, 0.2, hz(G5), hz(D6), amp=0.35)
    note(b, 0.15, D6, amp=0.9, decay=0.12)
    return finish(room(b, wet=0.12, size=0.5), -16)


def success():
    """Yes! Two notes rising a fourth, landing home on C."""
    b = silence(0.5)
    note(b, 0, G5, amp=0.75, decay=0.09)
    note(b, 0.09, C6, amp=1.0, decay=0.16)
    note(b, 0.09, C5, amp=0.22, decay=0.18, partials=SOFT)
    return finish(room(b), -16, fade_out=0.05)


def start():
    """Off you go: a bright three-note rise (C E G)."""
    b = silence(0.55)
    note(b, 0, C6, amp=0.7, decay=0.08, bright=1.2)
    note(b, 0.07, E6, amp=0.8, decay=0.08, bright=1.2)
    note(b, 0.14, G6, amp=1.0, decay=0.16, bright=1.2)
    note(b, 0.14, G5, amp=0.25, decay=0.18, partials=SOFT)
    return finish(room(b), -16, fade_out=0.05)


def finish_walk():
    """"Goed rondje!": a warm, unhurried arpeggio over a low C that rings out."""
    b = silence(0.9)
    note(b, 0, C4, amp=0.4, decay=0.35, partials=SOFT)
    for i, m in enumerate((C5, E5, G5, C6)):
        note(b, i * 0.06, m, amp=0.6 + 0.12 * i, decay=0.24)
    note(b, 0.26, E6, amp=0.28, decay=0.18, bright=0.7)
    return finish(room(b, wet=0.18, size=0.68), -16, fade_out=0.12)


def levelup():
    """A small sparkle for a new level or badge: a quick pentatonic run that settles on a chord."""
    b = silence(0.8)
    run = (G5, A5, C6, D6, E6, G6)
    for i, m in enumerate(run):
        note(b, i * 0.045, m, amp=0.55 + 0.06 * i, decay=0.07, bright=1.3)
    end = len(run) * 0.045
    note(b, end, C6, amp=0.7, decay=0.2)
    note(b, end, G6, amp=0.55, decay=0.2, bright=1.2)
    note(b, end + 0.03, C7, amp=0.22, decay=0.14, bright=0.8)
    return finish(room(b, wet=0.18, size=0.66), -16, fade_out=0.1)


def breathe_in():
    """The start of an in-breath: a soft chord that swells and opens, voices entering from low to high."""
    b = silence(1.3)
    for at, m, amp in ((0.0, C4, 0.55), (0.12, G4, 0.42), (0.26, E5, 0.26)):
        pad(b, at, 1.3 - at, m, amp=amp, rise=0.75 - at, fall=0.45, bright_from=0.0, bright_to=0.8)
    return finish(room(b, wet=0.16, size=0.6), -17, fade_out=0.08, fade_in=0.02)


def breathe_out():
    """The start of an out-breath: a lower open fifth that settles and closes, voices leaving from high to low."""
    b = silence(1.3)
    for at, m, amp, dur in ((0.0, G4, 0.32, 1.0), (0.05, D4, 0.45, 1.15), (0.1, G3, 0.6, 1.2)):
        pad(b, at, dur, m, amp=amp, rise=0.22, fall=dur - 0.3, bright_from=0.7, bright_to=0.0)
    return finish(room(b, wet=0.16, size=0.6), -17, fade_out=0.08, fade_in=0.02)


def error():
    """Something did not work: two round notes stepping down a major third. A shrug, not an alarm."""
    b = silence(0.42)
    note(b, 0, E5, amp=0.8, decay=0.08, partials=SOFT)
    note(b, 0.12, C5, amp=1.0, decay=0.14, partials=SOFT)
    return finish(room(b, wet=0.1, size=0.5), -18, fade_out=0.05)


SOUNDS = {
    "tap": tap,
    "select": select,
    "send": send,
    "success": success,
    "start": start,
    "finish": finish_walk,
    "levelup": levelup,
    "breathe-in": breathe_in,
    "breathe-out": breathe_out,
    "error": error,
}


def write(path, samples):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", max(-32767, min(32767, round(x * 32767)))) for x in samples))


def check(name, samples, size):
    """The listening test, in numbers: length, loudness, and no clicks at either end."""
    n = len(samples)
    peak = max(abs(x) for x in samples)
    rms = math.sqrt(sum(x * x for x in samples) / n)
    head = max(abs(x) for x in samples[: int(0.001 * SR)]) / peak  # the first millisecond: should be near 0
    tail = max(abs(x) for x in samples[-int(0.005 * SR):]) / peak  # the last 5 ms: should be near 0
    jump = max(abs(samples[i] - samples[i - 1]) for i in range(1, n)) / peak
    problems = []
    if peak >= 1.0:
        problems.append("clips")
    if abs(samples[0]) > 1e-4 or abs(samples[-1]) > 1e-4:
        problems.append("does not start/end at silence")
    if jump > 0.8 or head > 0.2 or tail > 0.1:
        problems.append("possible click")
    if size >= MAX_BYTES:
        problems.append("too big")
    if not 0.06 <= n / SR <= 1.5:
        problems.append("length")
    print(f"{name:12} {n / SR * 1000:5.0f} ms  peak {20 * math.log10(peak):6.1f} dBFS  rms {20 * math.log10(rms):6.1f} dBFS"
          f"  head {head:.2f}  tail {tail:.2f}  max step {jump:.2f}  {size / 1000:5.1f} kB  {'OK' if not problems else ', '.join(problems)}")
    return not problems


def main():
    for folder in OUT:
        os.makedirs(folder, exist_ok=True)
    ok = True
    for name, make in SOUNDS.items():
        samples = make()
        for folder in OUT:
            write(os.path.join(folder, f"{name}.wav"), samples)
        ok &= check(name, samples, os.path.getsize(os.path.join(OUT[0], f"{name}.wav")))
    print("Written to:", *OUT, sep="\n  ")
    if not ok:
        raise SystemExit("Some sounds need another look (see above).")


if __name__ == "__main__":
    main()
