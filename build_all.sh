#!/usr/bin/env bash
# Rebuild everything from source:
# renderer bundle -> timeline events -> score -> master -> frames -> MP4 -> web player
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
python3 build.py
python3 export_events.py
python3 synth.py
./master_audio.sh
rm -rf frames
HASH="#nograin" Q=0.97 python3 render_frames.py   # the MP4 is rendered without film grain (see README)
./encode.sh
python3 build_player.py
echo "Done."
