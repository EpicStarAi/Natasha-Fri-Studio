#!/usr/bin/env python3
"""Assemble any avatar/topic: approved intro + generated motion + original WAV.

CPU only. Preserves the whole voice, permits at most 0.5 seconds of video-tail
padding, and refuses an existing output. Uses FFmpeg, FFprobe and Python 3.10+.
"""
import argparse
import json
import math
import os
from pathlib import Path
import tempfile
import wave
from render_newnews import run, probe, normalize, encode_args, input_args


def render(clip, voice, intro, output):
    if output.exists() or output.suffix.lower() != '.mp4':
        raise ValueError('Choose a new .mp4 output')
    with wave.open(str(voice), 'rb') as wav:
        seconds = wav.getnframes() / wav.getframerate()
    if not 0 < seconds <= 60:
        raise ValueError('Use a PCM WAV of 0–60 seconds')
    info = probe(clip)
    video = next((s for s in info['streams'] if s['codec_type'] == 'video'), None)
    if not video:
        raise ValueError('Source clip has no video')
    video_seconds = float(video.get('duration', info['format'].get('duration', 0)))
    if not math.isfinite(video_seconds) or video_seconds <= 0 or seconds - video_seconds > 0.5:
        raise ValueError('Motion video is too short for the voice; regenerate instead of freezing the body')
    if intro.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'} or not intro.is_file():
        raise ValueError('Approved intro image required')
    duration = math.ceil(seconds * 30) / 30
    output.parent.mkdir(parents=True, exist_ok=True)
    base = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
    with tempfile.TemporaryDirectory(prefix='.avatar-render-', dir=output.parent) as tmp:
        tmp = Path(tmp)
        run(base + ['-loop', '1'] + input_args(intro) + ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
            '-map', '0:v:0', '-map', '1:a:0', '-vf', normalize(1080, 1920)] + encode_args(1, tmp / 'intro.mp4'))
        run(base + input_args(clip) + input_args(voice) + ['-map', '0:v:0', '-map', '1:a:0',
            '-vf', 'setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.5,' + normalize(1080, 1920),
            '-af', 'asetpts=PTS-STARTPTS,apad'] + encode_args(duration, tmp / 'body.mp4'))
        listing = tmp / 'concat.txt'
        listing.write_text("file 'intro.mp4'\nfile 'body.mp4'\n")
        final = tmp / 'final.mp4'
        run(base + ['-f', 'concat', '-safe', '1', '-i', str(listing), '-map', '0:v:0', '-map', '0:a:0',
            '-c:v', 'copy', '-af', 'aresample=async=1:first_pts=0', '-c:a', 'aac', '-b:a', '192k',
            '-ar', '48000', '-ac', '2', '-movflags', '+faststart', str(final)])
        result = probe(final)
        actual = float(result['format']['duration'])
        if abs(actual - (duration + 1)) > 0.15:
            raise ValueError('Final duration verification failed')
        os.link(final, output)
    return {'output': str(output), 'voiceSeconds': seconds, 'durationSeconds': actual,
            'size': [1080, 1920], 'fps': 30, 'introSeconds': 1, 'subtitles': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ('clip', 'voice', 'intro', 'output'):
        parser.add_argument('--' + flag, type=Path, required=True)
    a = parser.parse_args()
    try:
        print(json.dumps(render(a.clip, a.voice, a.intro, a.output)))
    except (ValueError, OSError, KeyError, wave.Error) as error:
        parser.exit(1, f'Avatar render: {error}\n')


if __name__ == '__main__':
    main()
