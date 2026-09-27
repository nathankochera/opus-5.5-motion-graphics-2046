#!/usr/bin/env bash
# frames + audio -> Instagram Reels MP4: 1080x1920, 30 fps, H.264 High (BT.709), AAC 256k 48 kHz.
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -hide_banner -loglevel error -y -framerate 30 -i out/reels/frames/f_%05d.jpg -i out/reels/reels_audio_raw.wav -map 0:v -map 1:a \
  -vf "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p" \
  -c:v libx264 -preset slow -crf 13 -maxrate 14M -bufsize 28M -profile:v high -level 4.2 -g 60 -x264-params "aq-mode=3:aq-strength=0.9" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest out/reels/2046_reels_1080x1920.mp4
echo "out/reels/2046_reels_1080x1920.mp4"
