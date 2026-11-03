#!/usr/bin/env python3
"""Compose the approved 864x1536 studio portrait and its animated 640px crop.

The OpenSpline input must be portrait.crop((160, 260, 800, 900)).
This is a technical channel introduction, not an automatically sourced news item.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile


def compose(portrait, clip, output):
    if output.exists() or output.suffix.lower() != '.mp4':
        raise ValueError('Choose a new .mp4 output')
    def probe(file):
        return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(file)]))
    source = probe(portrait)['streams'][0]
    if (source['width'], source['height']) != (864, 1536):
        raise ValueError('Expected the approved 864x1536 studio master')
    info = probe(clip)
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    audio = next(s for s in info['streams'] if s['codec_type'] == 'audio')
    seconds = float(video['duration'])
    if not 1 <= seconds <= 59 or abs(seconds - float(audio['duration'])) > 0.1:
        raise ValueError('Clip duration or audio/video alignment is invalid')
    font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    bold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    text = lambda content, x, y, size, color='white', face=font: f"drawtext=fontfile='{face}':text='{content}':x={x}:y={y}:fontsize={size}:fontcolor={color}"
    brand = text('NEW NEWS', 68, 60, 40, face=bold) + ',' + text('RUS', 867, 67, 27, '#8ee8d3')
    filters = [
        '[0:v]split=2[still_intro][still_main]',
        '[still_intro]scale=1080:1920,drawbox=x=0:y=0:w=iw:h=ih:color=black@0.63:t=fill,'
        + text('NEW NEWS', '(w-tw)/2', 795, 86, face=bold) + ','
        + text('RUS', '(w-tw)/2', 915, 43, '#8ee8d3') + ','
        + text('НОВОСТИ И КОНТЕКСТ', '(w-tw)/2', 1030, 27)
        + ',fps=30,trim=duration=1,setpts=PTS-STARTPTS,setsar=1[intro]',
        "[1:v]scale=640:640,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*clip(min(min(X,W-1-X),min(Y,H-1-Y))/48,0,1)'[animated]",
        f'[still_main][animated]overlay=x=160:y=260:shortest=1,scale=1080:1920,{brand},'
        + 'drawbox=x=68:y=157:w=320:h=150:color=0x111c32@0.92:t=fill,'
        + 'drawbox=x=68:y=157:w=5:h=150:color=0x8ee8d3:t=fill,'
        + text('ЗНАКОМСТВО', 89, 184, 24, '#8ee8d3', bold) + ','
        + text('Скоро первый', 89, 230, 29) + ','
        + text('выпуск', 89, 268, 29)
        + f',tpad=stop_mode=clone:stop_duration=0.2,fps=30,trim=duration={seconds},setpts=PTS-STARTPTS,setsar=1[main]',
        '[2:a]atrim=duration=1,asetpts=PTS-STARTPTS[silence]',
        f'[1:a]aresample=48000,apad,atrim=duration={seconds},asetpts=PTS-STARTPTS[voice]',
        '[intro][silence][main][voice]concat=n=2:v=1:a=1[v][a]',
    ]
    output = output.absolute()
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.pilot-', dir=output.parent) as temp:
        rendered = Path(temp) / 'pilot.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-filter_complex_threads', '1', '-loop', '1', '-i', str(portrait),
            '-i', str(clip), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-filter_complex', ';'.join(filters),
            '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
            '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(rendered)], check=True)
        os.link(rendered, output)
    print(json.dumps({'output': str(output), 'seconds': seconds + 1, 'format': '1080x1920', 'subtitles': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--portrait', type=Path, required=True)
    parser.add_argument('--clip', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    compose(args.portrait, args.clip, args.output)
