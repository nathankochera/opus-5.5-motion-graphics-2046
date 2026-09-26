#!/usr/bin/env bash
# frames/*.jpg + out/score.wav -> out/2046_showreel.mp4 (H.264 High, BT.709, AAC 256k, 1080p60)
set -euo pipefail
cd "$(dirname "$0")"
ffmpeg -hide_banner -loglevel error -y -framerate 60 -i frames/f_%05d.jpg -i out/score.wav -map 0:v -map 1:a \
  -vf "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p" \
  -c:v libx264 -preset slow -crf 17 -profile:v high -level 4.2 -x264-params "aq-mode=3:aq-strength=0.9" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest out/2046_showreel.mp4
echo "out/2046_showreel.mp4"
