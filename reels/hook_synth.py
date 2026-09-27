"""
Reels hook score: 4 seconds on the reel's 120 BPM grid. Three stabs (Dm, Bb, C) under the
three "No ..." lines, then a drop on A, the dominant, so the hook resolves into the reel's
opening D drone at 4.0 s. The reel's mastered score is laid in at 4.0 s and the whole
program is mastered for Instagram (-14 LUFS, -1.5 dBTP).
"""
import os, re, subprocess, tempfile
import numpy as np
import scipy.signal as sig
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d, uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
# Reuse the reel's instruments: run only the definitions half of synth.py.
defs = open("synth.py").read().split("# ---------------------------------------------------------------- arrangement")[0]
S = {}
exec(compile(defs, "synth.py", "exec"), S)
for k in ("SR", "tt", "lp", "hp", "bp", "saw", "sine", "noise", "fade", "kick", "hat", "clap", "pluck", "bell", "blip",
          "whoosh", "riser", "rev_swell", "impact", "pad", "sub", "mtof", "m", "ms", "sweep_bp", "rng"):
    globals()[k] = S[k]

HOOK, TAIL, BEAT = 4.0, 3.0, 0.5
N = int(SR * (HOOK + TAIL))


class Bus:
    def __init__(self):
        self.x = np.zeros((2, N))

    def add(self, t0, y, g=1.0, p=0.0):
        y = np.asarray(y, float)
        if y.ndim == 1:
            a = (p + 1) * np.pi / 4
            y = np.vstack([y * np.cos(a), y * np.sin(a)]) * np.sqrt(2)
        i0 = int(round(t0 * SR)); n = min(y.shape[1], N - i0)
        if n > 0:
            self.x[:, i0:i0 + n] += g * y[:, :n]


dry, rev, dly, pump = Bus(), Bus(), Bus(), Bus()
KICKS = []


def send(t0, y, g=1.0, p=0.0, r=0.0, d=0.0, pumped=False):
    (pump if pumped else dry).add(t0, y, g, p)
    if r: rev.add(t0, y, g * r, p)
    if d: dly.add(t0, y, g * d, p)


def stab(notes, dur=0.5, bright=6500, dec=0.18):
    k = int(dur * SR); t = tt(k); y = np.zeros(k)
    for n in notes:
        for c in (-10, 0, 10):
            y += saw(mtof(n) * 2 ** (c / 1200), k)
    y /= len(notes) * 3
    dark, brt = lp(y, 450), lp(y, bright)
    y = dark + (brt - dark) * np.exp(-t / 0.055)
    return fade(np.tanh(1.8 * y) * np.exp(-t / dec), 0.001, 0.03)


def bass(nn, dur=0.24):
    k = int(dur * SR)
    return lp(saw(mtof(nn), k), 950) * np.exp(-tt(k) / 0.12) + sub(mtof(nn - 12), dur, 0.14) * 0.22


# --- setup: "No After Effects." / "No video model." / "No stock music."
for i, (h, chord, root) in enumerate(zip((0.0, 0.5, 1.0), ("D3 F3 A3 D4 F4", "Bb2 D3 F3 Bb3 D4", "C3 E3 G3 C4 E4"), ("D2", "Bb1", "C2"))):
    send(h, kick(1.0), 0.95); KICKS.append(h)
    send(h, sub(mtof(m(root)), 0.46, 0.2), 0.42)
    send(h, stab(ms(chord)), 0.5, p=(-0.15, 0.15, 0.0)[i], r=0.3, d=0.18)
    send(h, clap(), 0.2, r=0.25)
    send(h + 0.25, hat(), 0.08, p=0.3)
for i in range(12):                                                    # the eyebrow decodes
    send(0.04 + i * 0.034, blip(2400 + int(rng.integers(0, 2400))), 0.022, p=float(rng.uniform(-0.5, 0.5)))
# --- build: riser + roll, the horizon draws
send(1.0, riser(0.5, 300, 9000, tone=mtof(57)), 0.34, r=0.2)
for i in range(8):
    send(1.25 + i * 0.03125, clap(), 0.05 + 0.12 * i / 7, r=0.2)
send(1.34, whoosh(0.32, 700, 8000), 0.24)
# --- the drop: "Just code, written by Claude." on A (Asus4 -> A)
send(1.5, impact(1.0, 1.3), 0.6, r=0.4)
send(1.5, pad(ms("A2 E3 A3 D4 E4"), 0.5, 5200, attack=0.01, release=0.25), 0.62, r=0.35, pumped=True)
send(2.0, pad(ms("A2 E3 A3 C#4 E4"), 1.5, lambda x: 5200 - 2200 * np.minimum(1, x / 1.5), attack=0.02, release=0.9), 0.62, r=0.35, pumped=True)
for x in (1.5, 2.0, 2.5, 3.0):
    send(x, kick(0.95), 0.88); KICKS.append(x)
for x, g in ((2.5, 0.36), (3.25, 0.16), (3.375, 0.22)):
    send(x, clap(), g, r=0.35)
vel = [0.35, 0.18, 0.7, 0.2]
arp = ms("A4 C#5 E5 A5 C#6 A5 E5 C#5")
for i, x in enumerate(np.arange(1.5, 3.5 - 1e-9, BEAT / 4)):
    send(x, hat(open_=(i % 8 == 6)), 0.22 * vel[i % 4] * (1.4 if i % 8 == 6 else 1), p=0.25 if i % 2 else -0.15, r=0.05)
    send(x, pluck(mtof(arp[i % 8]), 0.2, 6400), 0.12, p=(-0.35 if i % 2 else 0.35), r=0.15, d=0.3)
for i, x in enumerate(np.arange(1.5, 3.5 - 1e-9, BEAT / 2)):
    send(x, bass(m("A2") + (12 if i % 4 == 3 else 0)), 0.3, pumped=True)
for i, nn in enumerate(ms("A5 B5 C#6 E6 F#6 A6 B6 C#7 E7 F#7")):   # "Just code," writes on, one note per letter
    send(1.5 + i * 0.024, bell(mtof(nn), 0.5, 3.0, 0.8, 0.12), 0.03, p=-0.5 + i / 9, r=0.3)
for nn, g in zip(ms("A5 C#6 E6 A6"), (0.12, 0.09, 0.08, 0.05)):     # "Claude."
    send(1.89, bell(mtof(nn), 2.2, 1.0, 1.1, 0.9), g, r=0.55, d=0.3)
for i in range(16):                                                  # the footer decodes
    send(2.2 + i * 0.034, blip(2600 + int(rng.integers(0, 2600))), 0.018, p=float(rng.uniform(-0.3, 0.3)))
# --- exit: text lifts away, letterbox closes, the horizon collapses to a point
send(3.08, whoosh(0.42, 500, 6500, up=False), 0.2)
k = int(0.42 * SR); u = np.arange(k) / k
send(3.4, sweep_bp(noise(k), 140 * (6 ** u), 0.6) * np.sin(np.pi * u) ** 1.5, 0.22)            # bars slide in
send(3.8, sub(mtof(38), 0.35, 0.09), 0.3)                                                          # ... and lock
k = int(0.36 * SR); u = np.arange(k) / k
send(3.44, sweep_bp(noise(k), 5200 * (0.06 ** u), 0.35) * np.sin(np.pi * u) ** 1.2, 0.14, r=0.3)  # horizon collapses
send(3.44, sine(1800 * (0.12 ** u), k) * np.sin(np.pi * u) * 0.5, 0.05, r=0.3)
send(3.45, rev_swell(0.55), 0.18)

# --- mix (same recipe as the reel: sidechain pump, noise-IR reverb, ping-pong delay)
t_all = np.arange(N) / SR
g = np.ones(N)
for x in KICKS:
    i0 = int(x * SR); i1 = min(N, i0 + int(0.45 * SR))
    g[i0:i1] = np.minimum(g[i0:i1], 1 - 0.55 * np.exp(-(t_all[i0:i1] - x) / 0.11))
g = uniform_filter1d(g, 96)


def make_ir(dur=2.4, pre=0.018):
    k = int(dur * SR); t = tt(k); out = []
    for ch in range(2):
        nz = noise(k)
        ir = lp(nz, 900) * np.exp(-t / (2.2 / 6.9)) * 0.9 + bp(nz, 900, 4500) * np.exp(-t / (1.6 / 6.9)) * 0.6 + hp(nz, 4500) * np.exp(-t / (0.8 / 6.9)) * 0.3
        ir = np.concatenate([np.zeros(int(pre * SR) + ch * 37), ir])
        out.append(ir / np.sqrt(np.sum(ir ** 2)))
    return out


IR = make_ir()
rv = hp(np.vstack([sig.fftconvolve(rev.x[c], IR[c])[:N] for c in range(2)]) * 0.9, 180)
D = int(0.375 * SR); mono = dly.x.mean(axis=0); dl = np.zeros((2, N)); gg = 1.0
for kk in range(1, 7):
    gg *= 0.42
    sh = np.zeros(N); sh[D * kk:] = mono[: N - D * kk]; dl[kk % 2] += gg * sh
dl = lp(hp(dl, 400), 3800)
hook = hp(dry.x + pump.x * g + rv + dl, 40, 4)
hook = np.tanh(hook * 0.9) / 0.9


def lufs(x):
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        wavfile.write(f.name, SR, (np.clip(x, -1, 1).T * 32767).astype(np.int16))
        err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", f.name, "-af", "ebur128=peak=true", "-f", "null", "-"],
                             capture_output=True, text=True).stderr
    summ = err[err.rfind("Summary"):]
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", summ).group(1)), float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ).group(1))


# Match the hook to the reel: about -13 LUFS over the hook itself.
pre = hook / np.max(np.abs(hook)) * 0.5
L, _ = lufs(pre[:, : int(3.6 * SR)])
hook = pre * 10 ** ((-13.0 - L) / 20)

sr2, reel = wavfile.read("out/score.wav")
assert sr2 == SR
reel = reel.astype(float).T / 32768
total = int(SR * HOOK) + reel.shape[1]
prog_ = np.zeros((2, total))
prog_[:, :N] += hook[:, : min(N, total)]
i0 = int(SR * HOOK)
prog_[:, i0:i0 + reel.shape[1]] += reel

# look-ahead limiter at -2 dBFS (leaves room for AAC overshoot), then make sure it starts and ends cleanly
peak = np.max(np.abs(prog_), axis=0)
w = int(0.004 * SR)
gain = np.minimum(1.0, 0.79 / np.maximum(peak, 1e-9))
gain = uniform_filter1d(minimum_filter1d(gain, 2 * w + 1), 2 * w + 1)
prog_ = np.clip(prog_ * gain, -0.9, 0.9)
prog_[:, -int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
wavfile.write("out/reels/reels_audio_raw.wav", SR, (prog_.T * 32767).astype(np.int16))
Lh, Ph = lufs(prog_[:, : int(3.6 * SR)])
Lt, Pt = lufs(prog_)
print(f"hook section {Lh:.1f} LUFS | whole program {Lt:.1f} LUFS, true peak {Pt:.1f} dBTP | {total / SR:.2f} s")
