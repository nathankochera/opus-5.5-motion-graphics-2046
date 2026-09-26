"""
2046: A Design Brief — the score.
Synthesised from scratch with numpy. 120 BPM, one bar = 2 s, every cut on a downbeat.
Event times come from the renderer (events.json) so sound and picture share one clock.
"""
import json
import os
import numpy as np
import scipy.signal as sig
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from scipy.io import wavfile

SR = 48000
DUR = 30.0
N = int(SR * DUR)
BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(2046)
EV = json.load(open("events.json"))
os.makedirs("out", exist_ok=True)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


FLATS = {"Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#"}


def m(n):  # "Bb3" -> midi number
    pc = n[:2] if len(n) > 2 and n[1] in "b#" else n[0]
    return NOTE[FLATS.get(pc, pc)] + 12 * (int(n[len(pc):]) + 1)


def ms(names):
    return [m(n) for n in names.split()]


# ---------------------------------------------------------------- buses
class Bus:
    def __init__(self):
        self.x = np.zeros((2, N))

    def add(self, t0, s, gain=1.0, p=0.0):
        s = np.asarray(s, dtype=float)
        if s.ndim == 1:
            a = (p + 1) * np.pi / 4
            s = np.vstack([s * np.cos(a), s * np.sin(a)]) * np.sqrt(2)
        i0 = int(round(t0 * SR))
        if i0 >= N:
            return
        if i0 < 0:
            s = s[:, -i0:]
            i0 = 0
        n = min(s.shape[1], N - i0)
        self.x[:, i0:i0 + n] += gain * s[:, :n]


dry, rev, dly, pump = Bus(), Bus(), Bus(), Bus()  # pump = sidechained bus


def send(t0, s, g=1.0, p=0.0, r=0.0, d=0.0, pumped=False):
    (pump if pumped else dry).add(t0, s, g, p)
    if r:
        rev.add(t0, s, g * r, p)
    if d:
        dly.add(t0, s, g * d, p)


# ---------------------------------------------------------------- dsp
def tt(n):
    return np.arange(n) / SR


def lp(x, fc, order=2):
    sos = sig.butter(order, min(fc, SR * 0.45) / (SR / 2), "low", output="sos")
    return sig.sosfilt(sos, x)


def hp(x, fc, order=2):
    sos = sig.butter(order, fc / (SR / 2), "high", output="sos")
    return sig.sosfilt(sos, x)


def bp(x, lo, hi, order=2):
    sos = sig.butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], "band", output="sos")
    return sig.sosfilt(sos, x)


def sweep_bp(x, fc, bw=0.5, block=256):
    """band-pass with a time-varying centre (fc: per-sample array)"""
    out = np.zeros_like(x)
    zi = np.zeros((1, 2))
    for i in range(0, len(x), block):
        c = float(np.clip(fc[i], 40, SR * 0.42))
        lo, hi = c * (1 - bw / 2), min(c * (1 + bw / 2), SR * 0.45)
        sos = sig.butter(1, [lo / (SR / 2), hi / (SR / 2)], "band", output="sos")
        out[i:i + block], zi = sig.sosfilt(sos, x[i:i + block], zi=zi)
    return out


def sweep_lp(x, fc, block=256):
    out = np.zeros_like(x)
    zi = np.zeros((1, 2))
    for i in range(0, len(x), block):
        c = float(np.clip(fc[i], 40, SR * 0.42))
        sos = sig.butter(2, c / (SR / 2), "low", output="sos")
        out[i:i + block], zi = sig.sosfilt(sos, x[i:i + block], zi=zi)
    return out


def saw(freq, n, ph0=None):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,)).copy()
    dt = f / SR
    ph = ((rng.random() if ph0 is None else ph0) + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    a = ph < dt
    x = ph[a] / dt[a]
    y[a] -= x + x - x * x - 1
    b = ph > 1 - dt
    x = (ph[b] - 1) / dt[b]
    y[b] -= x * x + x + x + 1
    return y


def sine(freq, n, ph0=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    return np.sin(2 * np.pi * (ph0 + np.cumsum(f) / SR))


def noise(n):
    return rng.standard_normal(n)


def fade(y, a=0.002, r=0.01):
    n = len(y)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        y[:na] *= np.linspace(0, 1, na)
    if nr:
        y[-nr:] *= np.linspace(1, 0, nr)
    return y


# ---------------------------------------------------------------- instruments
def kick(level=1.0, f0=170, f1=56, decay=0.16, n=0.4):
    k = int(n * SR); t = tt(k)
    f = f1 + (f0 - f1) * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    click = hp(noise(k), 1800) * np.exp(-t / 0.003) * 0.75
    knock = bp(noise(k), 120, 400) * np.exp(-t / 0.018) * 0.5
    body = body + knock
    y = np.tanh(1.8 * (body + click))
    return fade(y, 0.0005, 0.02) * level


def hat(open_=False):
    k = int((0.28 if open_ else 0.07) * SR); t = tt(k)
    y = hp(noise(k), 7200, 3) * np.exp(-t / (0.09 if open_ else 0.016))
    return fade(y, 0.0003, 0.01)


def clap():
    k = int(0.4 * SR); t = tt(k)
    nz = bp(noise(k), 900, 6000)
    env = np.zeros(k)
    for off in (0.0, 0.010, 0.021):
        i = int(off * SR)
        env[i:] += np.exp(-t[: k - i] / 0.005)
    i = int(0.021 * SR)
    env[i:] += 0.7 * np.exp(-t[: k - i] / 0.085)
    return fade(nz * env, 0.0003, 0.02)


def pluck(freq, dur=0.24, bright=4200, dec=0.13):
    k = int(dur * SR); t = tt(k)
    s = saw(freq, k) * 0.55 + saw(freq * 1.006, k) * 0.45
    dark, brt = lp(s, 650), lp(s, bright)
    y = dark + (brt - dark) * np.exp(-t / 0.045)
    return fade(y * np.exp(-t / dec), 0.002, 0.02)


def bell(freq, dur=2.5, ratio=1.4, index=2.5, dec=0.9):
    k = int(dur * SR); t = tt(k)
    I = index * np.exp(-t / 0.35)
    y = np.sin(2 * np.pi * freq * t + I * np.sin(2 * np.pi * freq * ratio * t)) * np.exp(-t / dec)
    y += 0.25 * np.sin(2 * np.pi * freq * 2.01 * t) * np.exp(-t / (dec * 0.4))
    return fade(y, 0.001, 0.05)


def tick(freq=2600, dur=0.03):
    k = int(dur * SR); t = tt(k)
    y = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.004) + hp(noise(k), 3000) * np.exp(-t / 0.0015) * 0.35
    return fade(y, 0.0002, 0.005)


def blip(freq, dur=0.02):
    k = int(dur * SR); t = tt(k)
    return fade(np.sign(np.sin(2 * np.pi * freq * t)) * 0.5 * np.exp(-t / 0.006), 0.0005, 0.004)


def clank(f=190, dur=0.6):
    k = int(dur * SR); t = tt(k)
    y = np.zeros(k)
    for r, a, d in [(1, 1.0, 0.16), (2.76, 0.55, 0.11), (5.4, 0.35, 0.07), (8.93, 0.22, 0.045), (13.34, 0.12, 0.03)]:
        y += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
    tr = hp(noise(k), 2500) * np.exp(-t / 0.0035) * 0.9
    thump = np.sin(2 * np.pi * (60 + 50 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.05) * 0.9
    return fade(np.tanh(0.5 * y + tr + thump), 0.0003, 0.03)


def servo(dur, f0=420, f1=820):
    k = int(dur * SR); t = tt(k); u = t / dur
    f = f0 + (f1 - f0) * np.sin(np.pi * u) ** 0.8
    y = 0.4 * np.sign(sine(f, k)) + 0.5 * sine(f * 2.0, k)
    y = bp(y, 350, 3000)
    return fade(y * np.sin(np.pi * u) ** 0.6, 0.003, 0.02)


def whoosh(dur=0.5, f0=300, f1=5000, up=True):
    k = int(dur * SR); u = np.arange(k) / k
    fc = f0 * (f1 / f0) ** (u if up else 1 - u)
    y = sweep_bp(noise(k), fc, 0.9)
    env = np.sin(np.pi * u) ** 1.6
    return fade(y * env, 0.002, 0.02)


def riser(dur, f0=180, f1=7000, tone=None, curve=1.6):
    k = int(dur * SR); u = np.arange(k) / k
    fc = f0 * (f1 / f0) ** (u ** curve)
    y = sweep_bp(noise(k), fc, 0.7) * 0.9
    if tone is not None:
        f = tone * 2 ** (u * 1.0)
        tn = sum(saw(f * 2 ** (d / 1200), k) for d in (-12, 0, 12)) / 3
        y += lp(tn, 2600) * 0.35
    return fade(y * u ** 2.3, 0.01, 0.004)


def rev_swell(dur=0.7):
    k = int(dur * SR); u = np.arange(k) / k
    y = hp(noise(k), 3500) * u ** 3
    return fade(y, 0.01, 0.003)


def impact(size=1.0, tail=1.6):
    k = int((tail + 0.5) * SR); t = tt(k)
    f = 48 + 60 * np.exp(-t / 0.1)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.32 * tail))
    body = lp(noise(k), 2200) * np.exp(-t / 0.2) * 0.55
    crash = hp(noise(k), 4200) * np.exp(-t / (0.55 * tail)) * 0.28
    return fade(np.tanh(1.4 * (sub + body)) * size + crash * size, 0.0005, 0.2)


def pad(notes, dur, cutoff, attack=0.6, release=1.2, detune=9, level=1.0):
    k = int((dur + release) * SR); t = tt(k)
    Lc, Rc = np.zeros(k), np.zeros(k)
    for nn in notes:
        f = mtof(nn)
        for d, p in ((-detune, -0.7), (0, 0.0), (detune, 0.7)):
            v = saw(f * 2 ** (d / 1200), k)
            a = (p + 1) * np.pi / 4
            Lc += v * np.cos(a); Rc += v * np.sin(a)
    if callable(cutoff):
        fc = cutoff(t)
        Lc, Rc = sweep_lp(Lc, fc), sweep_lp(Rc, fc)
    else:
        Lc, Rc = lp(Lc, cutoff), lp(Rc, cutoff)
    env = np.minimum(1, t / attack)
    rel = t > dur
    env[rel] *= np.exp(-(t[rel] - dur) / (release / 4))
    y = np.vstack([Lc, Rc]) * env / (len(notes) * 1.8) * level
    y[:, -int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return y


def sub(freq, dur, dec=None, att=0.005):
    k = int(dur * SR); t = tt(k)
    y = np.sin(2 * np.pi * freq * t) + 0.18 * np.sin(4 * np.pi * freq * t)
    env = np.minimum(1, t / att)
    if dec:
        env *= np.exp(-t / dec)
    return fade(y * env, att, 0.03)


# ---------------------------------------------------------------- arrangement
beats = lambda a, b, step=BEAT: np.arange(a, b - 1e-9, step)
KICKS = []


def groove(a, b, claps=True, hats=True, kick_lvl=0.9):
    for x in beats(a, b):
        send(x, kick(kick_lvl), 0.85)
        KICKS.append(x)
    if hats:
        vel = [0.35, 0.18, 0.7, 0.2]
        for i, x in enumerate(beats(a, b, BEAT / 4)):
            send(x, hat(open_=(i % 8 == 6)), 0.24 * vel[i % 4] * (1.4 if i % 8 == 6 else 1), p=0.25 if i % 2 else -0.15, r=0.05)
    if claps:
        for x in beats(a + BEAT, b, 2 * BEAT):
            send(x, clap(), 0.36, r=0.35)


# --- 00 cold open (0–4): D minor drone, spark, the line, the counter
k = int(4.6 * SR); t = tt(k)
drone = (sine(mtof(38), k) * 0.3 + sine(mtof(50), k) * 0.25 + sine(mtof(57), k) * 0.15 + lp(saw(mtof(38), k), 420) * 0.35)
drone *= np.minimum(1, t / 2.2) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.35 * t))
drone[int(4.1 * SR):] *= np.linspace(1, 0, k - int(4.1 * SR))
send(0.0, drone, 0.5, pumped=False)
send(0.0, pad(ms("D3 A3 D4 F4"), 3.95, lambda tt_: 280 + 1400 * (tt_ / 4.0) ** 2, attack=2.2, release=0.4), 0.55, r=0.3)
send(0.14, bell(mtof(86), 3.0, 2.0, 1.6, 1.1), 0.22, r=0.6, d=0.25)          # the spark
send(0.36, whoosh(0.95, 200, 3200), 0.2, r=0.4)                               # the line
for i, x in enumerate(EV["ticks"]):                                           # the odometer
    send(x, tick(2200 + i * 55), 0.3, p=(-0.25 if i % 2 else 0.25), r=0.12)
for i in range(18):                                                           # label decode chirps
    send(1.5 + i * 0.038, blip(2400 + rng.integers(0, 2400)), 0.025, p=rng.uniform(-0.5, 0.5))
send(3.3, bell(mtof(74), 2.5, 1.0, 1.0, 1.0), 0.28, r=0.5)                    # 2046 lands
send(3.3, bell(mtof(81), 2.5, 1.0, 1.0, 1.0), 0.14, r=0.5)
send(3.3, sub(mtof(38), 0.9, 0.3), 0.35)
for i in range(14):
    send(3.3 + i * 0.021, blip(3000 + rng.integers(0, 2000)), 0.022, p=-0.6)
send(3.0, riser(1.0, 250, 8000, tone=mtof(50)), 0.3, r=0.2)
send(3.86, whoosh(0.46, 600, 7000), 0.25)

# --- 01 cities (4–8): Bbmaj7
send(4.0, impact(0.9, 1.4), 0.55, r=0.25)
send(3.4, rev_swell(0.6), 0.16)
send(4.0, pad(ms("Bb2 F3 A3 D4 F4"), 4.0, 2400), 0.62, r=0.25, pumped=True)
groove(4.0, 8.0)
bass_pat = lambda root, a, b, oct_every=4: [(x, root + (12 if (i % 8) in (6, 7) else 0)) for i, x in enumerate(beats(a, b, BEAT / 2))]
for x, nn in bass_pat(m("Bb2"), 4.0, 8.0):
    send(x, lp(saw(mtof(nn), int(0.24 * SR)), 900) * np.exp(-tt(int(0.24 * SR)) / 0.12) + sub(mtof(nn - 12), 0.24, 0.14) * 0.22, 0.3, pumped=True)
arp_c = ms("Bb3 D4 F4 A4 Bb4 D5 F5 A5")
seq = arp_c + arp_c[-2:0:-1]
for i, x in enumerate(beats(4.0, 8.0, BEAT / 4)):
    send(x, pluck(mtof(seq[i % len(seq)]), 0.24, 5200), 0.17 * (1.2 if i % 4 == 0 else 0.85), p=(-0.3 if i % 2 else 0.3), r=0.15, d=0.3)
for i, x in enumerate(EV["parks"]):                                           # lots flip into parks
    send(x + 0.1, bell(mtof(ms("D5 F5 A5 C6 D6 F6 A6")[i]), 1.2, 3.01, 1.2, 0.35), 0.13, p=0.6 - i * 0.18, r=0.4, d=0.3)
send(7.8, whoosh(0.5, 400, 6000), 0.24, p=-0.2)

# --- 02 discovery (8–12): Gm9
send(8.0, kick(1.0) * 0.9, 0.7)
send(8.0, hat(True), 0.2, r=0.4)
send(8.0, pad(ms("G2 D3 Bb3 F4 A4"), 4.0, 2600), 0.62, r=0.3, pumped=True)
groove(8.0, 12.0)
for x, nn in bass_pat(m("G2"), 8.0, 12.0):
    send(x, lp(saw(mtof(nn), int(0.24 * SR)), 900) * np.exp(-tt(int(0.24 * SR)) / 0.12) + sub(mtof(nn - 12), 0.24, 0.14) * 0.22, 0.3, pumped=True)
arp_d = ms("G3 Bb3 D4 F4 A4 D5")
gate = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1]
for i, x in enumerate(beats(8.0, 12.0, BEAT / 4)):
    if gate[i % 16]:
        send(x, pluck(mtof(arp_d[(i * 2) % len(arp_d)] + (12 if i % 16 > 11 else 0)), 0.22, 5600), 0.16, p=np.sin(i * 0.7) * 0.5, r=0.2, d=0.3)
for k_, w0 in enumerate(EV["waves"]):                                        # scanning gantry
    y = whoosh(EV["wdur"], 900, 5200, up=(k_ % 2 == 0))
    send(w0, y, 0.09, p=(-0.5 if k_ % 2 == 0 else 0.5), r=0.2)
hit_notes = ms("D6 F6 G6 A6 Bb6 D7")
for i, x in enumerate(EV["hits"][::2]):                                        # hits sparkle
    send(x, bell(mtof(hit_notes[i % len(hit_notes)]), 0.9, 3.5, 0.8, 0.22), 0.05, p=rng.uniform(-0.7, 0.7), r=0.3, d=0.25)
kf = int(1.7 * SR); uf = np.arange(kf) / kf                                    # the fold: a rising zip
fold = sweep_bp(noise(kf), 300 * (18 ** uf), 0.25) * np.sin(np.pi * uf) ** 1.2
send(8.3, fold, 0.14, r=0.35)
send(11.8, whoosh(0.46, 500, 6500), 0.24, p=0.2)

# --- 03 robotics (12–16): Dm7, the machine groove
send(12.0, kick(1.0), 0.7)
send(12.0, pad(ms("D3 A3 C4 F4"), 4.0, 2000), 0.55, r=0.25, pumped=True)
groove(12.0, 16.0, claps=False, hats=True, kick_lvl=1.0)
for x, nn in bass_pat(m("D2"), 12.0, 16.0):
    send(x, lp(saw(mtof(nn), int(0.22 * SR)), 1100) * np.exp(-tt(int(0.22 * SR)) / 0.1) + sub(mtof(nn), 0.22, 0.12) * 0.22, 0.32, pumped=True)
for i, x in enumerate(beats(12.0, 16.0, BEAT / 2)):                           # low ostinato
    send(x + BEAT / 4, pluck(mtof(ms("D3 A3 D3 C4")[i % 4]), 0.16, 3600, 0.07), 0.15, p=-0.2, r=0.1)
for i, x in enumerate(EV["locks"]):                                           # every module that locks in
    left = i % 2 == 0
    send(x, clank(230 if left else 270), 0.46, p=(-0.4 if left else 0.4), r=0.22)
    send(x - 0.27, servo(0.25, 420 + (i % 3) * 40, 780 + (i % 3) * 60), 0.08, p=(-0.55 if left else 0.55))
for i in range(12):                                                           # the lights come on
    send(EV["done"] + i * 0.035, pluck(mtof(ms("D5 F5 G5 A5 C6 D6 F6 G6 A6 C7 D7 F7")[i]), 0.3, 6000, 0.18), 0.09, p=-0.5 + i / 11, r=0.3, d=0.3)
send(15.8, whoosh(0.5, 300, 5000), 0.24)

# --- 04 energy (16–20): F add9, half time, the sun comes up and the field becomes a planet
send(16.0, impact(0.8, 1.8), 0.45, r=0.35)
send(16.0, pad(ms("F2 C3 A3 C4 G4 A4"), 4.05, lambda tt_: 1200 + 4200 * np.minimum(1, tt_ / 1.6)), 0.7, r=0.4, pumped=True)
for x in (16.0, 16.75, 18.0, 18.75):
    send(x, kick(0.95), 0.8); KICKS.append(x)
for x in (17.0, 19.0):
    send(x, clap(), 0.4, r=0.5)
for i, x in enumerate(beats(16.0, 20.0, BEAT / 2)):
    send(x, hat(), 0.05 * (1.5 if i % 2 else 0.8), p=0.3, r=0.1)
send(16.0, sub(mtof(41), 2.0, 1.0), 0.28, pumped=True)
send(18.0, sub(mtof(41), 2.0, 1.0), 0.28, pumped=True)
sh = ms("F5 A5 C6 G5 A5 C6 F6 C6")
for i, x in enumerate(beats(16.0, 20.0, BEAT / 2)):                            # shimmering 8ths
    send(x, pluck(mtof(sh[i % 8]), 0.5, 7000, 0.3), 0.07, p=np.sin(i) * 0.6, r=0.45, d=0.4)
send(17.1, riser(1.6, 120, 3500, tone=mtof(41), curve=1.2), 0.3, r=0.35)      # the curl
for i in range(10):                                                            # arcs spark across the globe
    x = 18.8 + i * 0.075 + rng.uniform(0, 0.03)
    send(x, bell(mtof(ms("C7 F7 G7 A7")[i % 4]), 0.4, 5.1, 3.0, 0.08), 0.035, p=rng.uniform(-0.6, 0.6), r=0.3)
send(19.2, riser(0.8, 300, 9000, tone=mtof(53)), 0.34)                       # the dive
send(19.35, rev_swell(0.65), 0.2)

# --- 05 access (20–24): Bb add9 -> C, one person, then everyone
send(20.0, impact(0.7, 1.2), 0.5, r=0.4)
send(20.0, pad(ms("Bb2 F3 C4 D4 F4"), 2.05, 2800), 0.62, r=0.3, pumped=True)
send(22.0, pad(ms("C3 G3 C4 F4 G4"), 1.0, 3000, attack=0.3, release=0.3), 0.6, r=0.3, pumped=True)
send(23.0, pad(ms("C3 G3 C4 E4 G4"), 1.05, lambda tt_: 2200 + 5000 * (tt_ / 1.05) ** 2, attack=0.1, release=0.2), 0.62, r=0.3, pumped=True)
for x, nn in zip((20.14, 20.26, 20.38), ms("D5 F5 C6")):                    # tutor, doctor, collaborator
    send(x, bell(mtof(nn), 1.6, 1.0, 1.4, 0.7), 0.2, r=0.5, d=0.35)
send(20.05, blip(4200), 0.03)
groove(21.0, 24.0, kick_lvl=0.95)
for x, nn in bass_pat(m("Bb2"), 21.0, 22.0) + bass_pat(m("C3"), 22.0, 24.0):
    send(x, lp(saw(mtof(nn), int(0.24 * SR)), 1000) * np.exp(-tt(int(0.24 * SR)) / 0.12) + sub(mtof(nn - 12), 0.24, 0.14) * 0.22, 0.3, pumped=True)
arp_a = ms("Bb3 D4 F4 C5 D5 F5 C6 D6")
arp_b = ms("C4 E4 G4 C5 E5 G5 C6 E6")
arp_s = ms("C4 F4 G4 C5 F5 G5 C6 F6")
for i, x in enumerate(beats(21.0, 24.0, BEAT / 4)):
    src = arp_a if x < 22.0 else arp_s if x < 23.0 else arp_b
    send(x, pluck(mtof(src[i % 8]), 0.2, 6400), 0.16, p=(-0.35 if i % 2 else 0.35), r=0.15, d=0.3)
for i, x in enumerate(beats(23.0, 24.0, BEAT / 8)):                            # 32nd run into the drop
    send(x + BEAT / 16, pluck(mtof(arp_b[i % 8] + 12), 0.12, 7000, 0.06), 0.06 + 0.06 * (i / 16), p=np.sin(i) * 0.6, r=0.2)
for i, x in enumerate(beats(23.0, 24.0, BEAT / 4)):                            # snare roll
    send(x, clap(), 0.16 + 0.22 * (i / 8), r=0.25)
cnt = [22.2 + 0.95 * (1 - (1 - q) ** (1 / 3)) for q in np.linspace(0.02, 1, 26)]  # the counter
for i, x in enumerate(cnt):
    send(x, tick(3000 + i * 40), 0.12, p=-0.5, r=0.1)
ks = int(1.7 * SR); us = np.arange(ks) / ks                                    # everyone lights up
spark = np.zeros(ks)
for j in range(260):
    pos = int(rng.integers(0, ks - 2400))
    if rng.random() > (pos / ks) ** 0.5 + 0.05:
        continue
    fq = mtof(ms("C6 D6 F6 G6 A6 C7 D7")[rng.integers(0, 7)])
    b = bell(fq, 0.05, 3.3, 0.6, 0.015)
    spark[pos:pos + len(b)] += b[: max(0, min(len(b), ks - pos))]
send(21.35, spark, 0.1, r=0.4, d=0.2)
send(23.0, riser(1.0, 200, 10000, tone=mtof(48)), 0.36, r=0.2)
send(23.35, rev_swell(0.65), 0.28)

# --- finale (24–30): Fmaj9, the colours return to the horizon
send(24.0, impact(1.25, 2.4), 0.8, r=0.5)
send(24.0, kick(1.0, 150, 50, 0.3, 0.6), 0.85)
send(24.0, pad(ms("F2 C3 A3 E4 G4 C5"), 4.6, lambda tt_: 5200 - 3400 * np.minimum(1, tt_ / 5.0), attack=0.03, release=1.3), 0.8, r=0.55)
send(24.0, sub(mtof(41), 4.5, 1.6), 0.3)
send(24.0, bell(mtof(77), 4.0, 1.0, 1.2, 1.6), 0.16, r=0.7, d=0.3)
send(24.0, bell(mtof(84), 4.0, 1.0, 1.2, 1.4), 0.1, r=0.7, d=0.3)
land_notes = ms("F5 G5 A5 C6 D6 F6 G6 A6 C7")
for i, (x, lx) in enumerate(EV["landings"][::5]):                              # colour lands on the line
    send(x, bell(mtof(land_notes[int(lx * 8.99)]), 0.7, 2.0, 0.6, 0.2), 0.045, p=lx * 1.6 - 0.8, r=0.45, d=0.3)
send(25.0, bell(mtof(53), 2.2, 1.0, 0.6, 0.9), 0.14, r=0.6)                   # "2046 isn't a prediction."
send(26.0, kick(0.5, 90, 40, 0.5), 0.35)
send(26.3, bell(mtof(69), 3.0, 1.0, 0.9, 1.3), 0.14, r=0.7, d=0.3)            # "It's a design brief."
send(26.3, bell(mtof(76), 3.0, 1.0, 0.9, 1.3), 0.1, r=0.7, d=0.3)
send(26.3, pad(ms("D3 A3 C4 E4 F4"), 2.0, 2200, attack=0.4, release=1.0), 0.35, r=0.5)
for i in range(22):                                                            # credit decodes
    send(26.95 + i * 0.036, blip(2600 + rng.integers(0, 2600)), 0.018, p=rng.uniform(-0.3, 0.3))
send(28.0, kick(0.45, 90, 40, 0.5), 0.3)
send(28.0, pad(ms("Bb2 F3 A3 C4 E4 F4"), 1.4, 2000, attack=0.5, release=1.2), 0.4, r=0.6)
for x, nn, p_ in zip(EV["questions"], ms("C5 A4 F4"), (-0.5, 0.0, 0.5)):   # who benefits / decides / stays human
    send(x, bell(mtof(nn), 1.8, 1.0, 0.5, 0.8), 0.16, p=p_, r=0.6, d=0.3)
send(29.2, rev_swell(0.64), 0.12)
send(29.84, bell(mtof(86), 1.4, 2.0, 1.6, 0.35), 0.2, r=0.4)                 # the point, one last time

# ---------------------------------------------------------------- mix
# sidechain pump from every kick
t_all = np.arange(N) / SR
g = np.ones(N)
for x in KICKS:
    i0 = int(x * SR); i1 = min(N, i0 + int(0.45 * SR))
    seg = 1 - 0.55 * np.exp(-(t_all[i0:i1] - x) / 0.11)
    g[i0:i1] = np.minimum(g[i0:i1], seg)
g = uniform_filter1d(g, 96)
mixbus = dry.x + pump.x * g


def make_ir(dur=2.8, pre=0.018):
    k = int(dur * SR); t = tt(k)
    irs = []
    for ch in range(2):
        nz = noise(k)
        ir = lp(nz, 900) * np.exp(-t / (2.6 / 6.9)) * 0.9 + bp(nz, 900, 4500) * np.exp(-t / (1.9 / 6.9)) * 0.6 + hp(nz, 4500) * np.exp(-t / (0.9 / 6.9)) * 0.3
        ir = np.concatenate([np.zeros(int(pre * SR) + ch * 37), ir])
        irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    return irs


IR = make_ir()
rv = np.vstack([sig.fftconvolve(rev.x[c], IR[c])[:N] for c in range(2)]) * 0.9
rv = hp(rv, 180)

D = int(0.375 * SR)
mono = dly.x.mean(axis=0)
dl = np.zeros((2, N))
gg = 1.0
for kk in range(1, 7):
    gg *= 0.42
    sh = np.zeros(N); sh[D * kk:] = mono[: N - D * kk]
    dl[kk % 2] += gg * sh
dl = lp(hp(dl, 400), 3800)

mix = mixbus + rv + dl
mix = hp(mix, 40, 4)
for name, bus in (("dry", dry.x), ("pump", pump.x * g), ("reverb", rv), ("delay", dl)):
    print(f"{name:7s} peak {np.max(np.abs(bus)):6.2f}  rms {np.sqrt(np.mean(bus ** 2)):6.3f}")
# trim so only transients touch the limiter
pre = np.percentile(np.abs(mix), 99.9)
mix *= 0.8 / pre
print("pre-master 99.9th pct", pre)
# gentle glue: soft saturation, then a look-ahead limiter
mix = np.tanh(mix * 0.9) / 0.9
peak = np.max(np.abs(mix), axis=0)
w = int(0.004 * SR)
gain = np.minimum(1.0, 0.89 / np.maximum(peak, 1e-9))
gain = minimum_filter1d(gain, 2 * w + 1)
gain = uniform_filter1d(gain, 2 * w + 1)
mix = mix * gain
mix = np.clip(mix, -0.95, 0.95)
# make sure it ends in silence
mix[:, -int(0.06 * SR):] *= np.linspace(1, 0, int(0.06 * SR))
wavfile.write("out/score_raw.wav", SR, (mix.T * 32767).astype(np.int16))
print("peak", np.max(np.abs(mix)), "rms", np.sqrt(np.mean(mix ** 2)))
