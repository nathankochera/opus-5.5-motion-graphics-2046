#!/usr/bin/env bash
# Two-pass loudness normalisation to -14 LUFS / -1.5 dBTP, then an MP3 for the web player.
set -euo pipefail
cd "$(dirname "$0")"
J=$(ffmpeg -hide_banner -nostats -i out/score_raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
ARGS=$(echo "$J" | python3 -c "import json,sys; d=json.load(sys.stdin); print(':'.join(['measured_I='+d['input_i'], 'measured_TP='+d['input_tp'], 'measured_LRA='+d['input_lra'], 'measured_thresh='+d['input_thresh'], 'offset='+d['target_offset']]))")
ffmpeg -hide_banner -loglevel error -y -i out/score_raw.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:${ARGS}:linear=true,aresample=48000" -ar 48000 -c:a pcm_s16le out/score.wav
ffmpeg -hide_banner -loglevel error -y -i out/score.wav -c:a libmp3lame -b:a 192k out/score.mp3
echo "out/score.wav, out/score.mp3"
