import sys, numpy as np, subprocess, re
from scipy.io import wavfile
import scipy.signal as sig
path = sys.argv[1] if len(sys.argv) > 1 else "out/score_raw.wav"
sr, x = wavfile.read(path); x = x.astype(float) / 32768
mono = x.mean(axis=1)
out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
summ = out[out.rfind("Summary"):]
I = re.search(r"I:\s+(-?[\d.]+) LUFS", summ).group(1); LRA = re.search(r"LRA:\s+([\d.]+) LU", summ).group(1)
TP = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ).group(1)
print(f"integrated {I} LUFS | LRA {LRA} LU | true peak {TP} dBTP | sample peak {20*np.log10(np.max(np.abs(x))):.2f} dBFS | DC {mono.mean():+.5f}")
bands = [(20, 60), (60, 250), (250, 1000), (1000, 4000), (4000, 16000)]
names = ["sub", "bass", "lowmid", "mid", "high"]
secs = [(0, 4, "intro"), (4, 8, "cities"), (8, 12, "discovery"), (12, 16, "robotics"), (16, 20, "energy"), (20, 24, "access"), (24, 30, "finale")]
print(f"{'section':10s} {'rms dB':>7s} " + " ".join(f"{n:>7s}" for n in names))
for a, b, nm in secs:
    seg = mono[int(a * sr): int(b * sr)]
    f, P = sig.welch(seg, sr, nperseg=4096)
    tot = np.sum(P)
    e = [10 * np.log10(np.sum(P[(f >= lo) & (f < hi)]) / tot + 1e-12) for lo, hi in bands]
    print(f"{nm:10s} {20*np.log10(np.sqrt(np.mean(seg**2))+1e-9):7.1f} " + " ".join(f"{v:7.1f}" for v in e))
# overall spectral tilt (dB/oct) between 100 Hz and 10 kHz
f, P = sig.welch(mono, sr, nperseg=8192)
sel = (f > 100) & (f < 10000)
k = np.polyfit(np.log2(f[sel]), 10 * np.log10(P[sel]), 1)[0]
print(f"spectral tilt {k:.2f} dB/oct (pink noise = -3.0; typical mixes -3.5 to -5)")
