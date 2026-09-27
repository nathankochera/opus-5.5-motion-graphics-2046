#!/usr/bin/env bash
# Build the 9:16 Instagram Reels cut: a 4-second hook, then the reel letterboxed between black bars.
# Output: out/reels/2046_reels_1080x1920.mp4 and out/reels/2046_reels_cover_1080x1920.jpg
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/reels
python3 build.py
python3 reels/build_hook.py
[ -f out/score.wav ] || { python3 synth.py; ./master_audio.sh; }
python3 reels/hook_synth.py
rm -rf out/reels/frames
python3 reels/render_reels.py
./reels/encode_reels.sh
cp out/reels/frames/f_00090.jpg out/reels/2046_reels_cover_1080x1920.jpg
echo "Done."
