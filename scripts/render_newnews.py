#!/usr/bin/env python3
"""Assemble NEW NEWS from approved, already lip-synced presenter clips.

No model/API calls, network downloads, generated identities or publishing.
Python 3.10+, ffmpeg and ffprobe on PATH. See docs/NEWNEWS_RUS.md.
"""
import argparse
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import sys
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
from news_windows import validate_windows, render_scene, normalize_news_audio

IMAGES = {'.jpg', '.jpeg', '.png', '.webp'}
VIDEOS = {'.mp4', '.mov', '.webm', '.mkv'}
FORMAT = {'width': 1080, 'height': 1920, 'fps': 30, 'introSeconds': 1, 'subtitles': False}


def run(args):
    result = subprocess.run(args, capture_output=True, text=True, timeout=600, check=False)
    if result.returncode:
        raise ValueError(f'{Path(args[0]).name}: {result.stderr[-1800:]}')
    return result.stdout


def asset(root, name, extensions):
    if not isinstance(name, str) or not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_.-]{0,159}', name):
        raise ValueError('Имя медиафайла должно быть без пути, URL и пробелов')
    resolved = (root / name).resolve()
    if resolved.parent != root or resolved.suffix.lower() not in extensions:
        raise ValueError(f'Недопустимый медиафайл: {name}')
    if not resolved.is_file():
        raise ValueError(f'Не найден материал: {name}')
    return resolved


def probe(filename):
    return json.loads(run(['ffprobe', '-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_streams', '-show_format', '-of', 'json', str(filename)]))


def presenter_duration(filename):
    info = probe(filename)
    videos = [s for s in info['streams'] if s['codec_type'] == 'video']
    audios = [s for s in info['streams'] if s['codec_type'] == 'audio']
    if not videos or not audios:
        raise ValueError(f'{filename.name}: нужен клип ведущей с видео и озвучкой')
    offset = abs(float(videos[0].get('start_time', 0)) - float(audios[0].get('start_time', 0)))
    if not math.isfinite(offset) or offset > 1 / 30:
        raise ValueError(f'{filename.name}: звук и видео начинаются в разное время; сначала выровняйте lip-sync')
    container = info['format'].get('duration', 0)
    video = float(videos[0].get('duration', container))
    audio = float(audios[0].get('duration', container))
    if not math.isfinite(video) or not math.isfinite(audio) or min(video, audio) <= 0:
        raise ValueError(f'{filename.name}: не удалось определить длительность')
    if abs(video - audio) > 0.5:
        raise ValueError(f'{filename.name}: длительности звука и видео расходятся более чем на 0.5 сек.')
    return math.ceil(max(video, audio) * 30) / 30


def validate_manifest(pack):
    if not isinstance(pack, dict) or pack.get('schemaVersion') != 1:
        raise ValueError('Неподдерживаемая версия пакета')
    channel = pack.get('channel', {})
    if channel.get('id') != 'newnews-rus' or channel.get('format') != FORMAT:
        raise ValueError('Нужен пакет NEW NEWS RUS: 1080×1920, 30 fps, заставка 1 сек., без субтитров')
    scenes = pack.get('scenes')
    if not isinstance(scenes, list) or not 1 <= len(scenes) <= 6:
        raise ValueError('Нужно от 1 до 6 тем')
    for scene in scenes:
        if not isinstance(scene, dict) or not isinstance(scene.get('narration'), str) or len(scene['narration'].strip()) < 20:
            raise ValueError('У каждой темы должен быть текст ведущей')
        urls = scene.get('sourceUrls')
        if not isinstance(urls, list) or not 1 <= len(urls) <= 5:
            raise ValueError('Для каждой темы нужны источники')
        for url in urls:
            if not isinstance(url, str):
                raise ValueError('Некорректная ссылка источника')
            parsed = urlsplit(url)
            if parsed.scheme != 'https' or not parsed.netloc or parsed.username or parsed.password:
                raise ValueError('Источники должны быть HTTPS-ссылками без пароля')
    return scenes


def plan_render(pack, root):
    scenes = validate_manifest(pack)
    intro = asset(root, pack.get('introAsset'), IMAGES)
    planned = []
    for scene in scenes:
        host = asset(root, scene.get('presenterAsset'), VIDEOS)
        duration = presenter_duration(host)
        broll = asset(root, scene['brollAsset'], IMAGES | VIDEOS) if scene.get('brollAsset') else None
        if broll and not any(s['codec_type'] == 'video' for s in probe(broll)['streams']):
            raise ValueError(f'{broll.name}: нет изображения')
        validate_windows(scene, root, duration, asset, probe, IMAGES, VIDEOS)
        planned.append((host, broll, duration))
    total = 1 + sum(item[2] for item in planned)
    if total > 60:
        raise ValueError(f'Фактический выпуск {total:.2f} сек. превышает 60 сек. Сократите сценарий и пересоздайте клипы: речь не обрезается автоматически.')
    return intro, planned, total


def normalize(width, height):
    return f'scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=0x101212,setsar=1,fps=30'


def encode_args(duration, output):
    return ['-t', str(duration), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', str(output)]


def input_args(filename):
    return ['-protocol_whitelist', 'file,pipe', '-i', str(filename)]


def render(manifest, root, output, check_only=False):
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise ValueError('Установите FFmpeg и FFprobe')
    root = root.resolve()
    if not root.is_dir():
        raise ValueError('Папка материалов не найдена')
    pack = json.loads(manifest.read_text(encoding='utf-8'))
    intro, planned, duration = plan_render(pack, root)
    report = {'channel': 'newnews-rus', 'scenes': len(planned), 'durationSeconds': duration, 'format': FORMAT}
    if check_only:
        print(json.dumps({**report, 'state': 'media_checked'}, ensure_ascii=False))
        return report
    output = output.absolute()
    if output.suffix.lower() != '.mp4' or output.exists():
        raise ValueError('Укажите новый выходной файл с расширением .mp4')
    output.parent.mkdir(parents=True, exist_ok=True)
    base = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
    with tempfile.TemporaryDirectory(prefix='.newnews-', dir=output.parent) as working:
        working = Path(working)
        parts = [working / 'part-000.mp4']
        run(base + ['-loop', '1'] + input_args(intro) + ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-map', '0:v:0', '-map', '1:a:0', '-vf', normalize(1080, 1920)] + encode_args(1, parts[0]))
        for index, (host, broll, seconds) in enumerate(planned, 1):
            part = working / f'part-{index:03d}.mp4'
            windows = validate_windows(pack['scenes'][index-1], root, seconds, asset, probe, IMAGES, VIDEOS)
            if windows:
                scene_work = working / f'graphics-{index}'
                scene_work.mkdir()
                render_scene(host, windows, seconds, part, scene_work, run, normalize, encode_args, input_args, IMAGES)
                parts.append(part)
                continue
            args = base + input_args(host)
            if broll:
                args += (['-loop', '1'] if broll.suffix.lower() in IMAGES else ['-stream_loop', '-1']) + input_args(broll)
                filters = f'[0:v:0]setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=1,{normalize(1080, 1200)}[host];[1:v:0]setpts=PTS-STARTPTS,{normalize(1080, 720)}[broll];[broll][host]vstack=inputs=2[v]'
                args += ['-filter_complex', filters, '-map', '[v]', '-map', '0:a:0']
            else:
                args += ['-map', '0:v:0', '-map', '0:a:0', '-vf', f'setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=1,{normalize(1080, 1920)}']
            args += ['-af', 'asetpts=PTS-STARTPTS,apad'] + encode_args(seconds, part)
            run(args)
            parts.append(part)
        listing = working / 'concat.txt'
        listing.write_text(''.join(f"file '{part.name}'\n" for part in parts), encoding='utf-8')
        final = working / 'final.mp4'
        run(base + ['-f', 'concat', '-safe', '1', '-i', str(listing), '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', '-af', 'aresample=async=1:first_pts=0', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '192k', '-movflags', '+faststart', str(final)])
        if any(scene.get('windows') for scene in pack['scenes']):
            normalized = working / 'normalized.mp4'
            report['audio'] = normalize_news_audio(final, normalized)
            final = normalized
        info = probe(final)
        video = next(s for s in info['streams'] if s['codec_type'] == 'video')
        actual = float(info['format']['duration'])
        if (video['width'], video['height']) != (1080, 1920) or abs(actual - duration) > 0.3:
            raise ValueError('Проверка готового файла не пройдена')
        if actual > 60:
            raise ValueError('Готовый MP4 длиннее 60 секунд с учётом кодирования. Немного сократите исходные клипы.')
        # Same filesystem, atomic publish, refuses an existing output even in a race.
        os.link(final, output)
    report.update({'state': 'rendered', 'output': str(output), 'actualDurationSeconds': actual})
    print(json.dumps(report, ensure_ascii=False))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--assets', required=True, type=Path)
    parser.add_argument('--output', type=Path, default=Path('newnews-rus.mp4'))
    parser.add_argument('--check', action='store_true', help='Проверить материалы без рендера')
    args = parser.parse_args()
    try:
        render(args.manifest, args.assets, args.output, args.check)
    except (ValueError, OSError, KeyError, TypeError, subprocess.TimeoutExpired, subprocess.CalledProcessError) as error:
        parser.exit(1, f'NEW NEWS: {error}\n')


if __name__ == '__main__':
    main()
