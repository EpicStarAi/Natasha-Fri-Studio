"""Scene-relative editorial windows. Source media is muted; host stays intact."""
import math
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlsplit


def validate_windows(scene, root, duration, asset, probe, images, videos):
    windows = scene.get('windows', [])
    if not isinstance(windows, list) or len(windows) > 12:
        raise ValueError('Нужно не больше 12 сопровождающих окон')
    if windows and scene.get('brollAsset'):
        raise ValueError('Выберите окна или прежний b-roll, а не оба режима')
    planned, ids = [], set()
    for item in windows:
        if not isinstance(item, dict):
            raise ValueError('Некорректное окно')
        identifier = item.get('id')
        if not isinstance(identifier, str) or not identifier or identifier in ids:
            raise ValueError('У каждого окна должен быть уникальный id')
        ids.add(identifier)
        for key, limit in [('headline', 60), ('label', 28), ('credit', 42)]:
            if not isinstance(item.get(key), str) or not 1 <= len(item[key].strip()) <= limit:
                raise ValueError(f'Окно: проверьте {key}, максимум {limit} символов')
        url = item.get('sourceUrl', '')
        if not isinstance(url, str):
            raise ValueError('Нужен HTTPS-источник материала')
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or not parsed.netloc or parsed.username or parsed.password:
            raise ValueError('Нужен HTTPS-источник материала без пароля')
        numbers = [item.get('startSeconds'), item.get('endSeconds'), item.get('mediaStartSeconds', 0)]
        if any(type(x) not in (int, float) or not math.isfinite(x) for x in numbers):
            raise ValueError('Таймкоды окон должны быть конечными числами')
        start, end, media_start = numbers
        if start < 0 or end - start < 0.5 or end > duration + 1 / 30 or not 0 <= media_start <= 3600:
            raise ValueError('Окно выходит за фактическую длину сцены или короче 0.5 сек.')
        path = asset(root, item.get('asset'), images | videos)
        if path.suffix.lower() in videos:
            info = probe(path)
            video = next((s for s in info['streams'] if s['codec_type'] == 'video'), None)
            if not video:
                raise ValueError('В материале окна нет видео')
            available = float(video.get('duration', info['format'].get('duration', 0)))
            if not math.isfinite(available) or available + 1/30 < media_start + end - start:
                raise ValueError('Видео окна короче выбранного интервала; измените таймкоды')
        elif media_start:
            raise ValueError('У фотографии mediaStartSeconds должен быть 0')
        planned.append({**item, 'path': path, 'startSeconds': start, 'endSeconds': end, 'mediaStartSeconds': media_start})
    planned.sort(key=lambda item: item['startSeconds'])
    if any(b['startSeconds'] < a['endSeconds'] for a, b in zip(planned, planned[1:])):
        raise ValueError('Окна перекрывают друг друга по времени')
    return planned


def draw_graphics(folder, windows, language="uk-UA"):
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError as error:
        raise ValueError('Для окон установите Pillow в Python-окружение монтажника') from error
    def font(size, bold=False):
        for directory in [Path('/usr/share/fonts/truetype/dejavu'), Path('C:/Windows/Fonts')]:
            for name in (['DejaVuSans-Bold.ttf', 'arialbd.ttf'] if bold else ['DejaVuSans.ttf', 'arial.ttf']):
                if (directory/name).exists():
                    return ImageFont.truetype(str(directory/name), size)
        raise ValueError('Установите DejaVu Sans или Arial с кириллицей')
    def fit(draw, text, size, minimum, bold=False):
        for n in range(size, minimum-1, -1):
            face = font(n, bold)
            if draw.textlength(text, font=face) <= 350:
                return face
        raise ValueError('Слишком длинная подпись окна; сократите текст')
    brand = Image.new('RGBA', (1080, 1920)); d = ImageDraw.Draw(brand)
    d.rounded_rectangle((32, 78, 412, 142), radius=13, fill='#070b17', outline='#00ffff', width=2)
    d.polygon([(32, 91), (43, 78), (193, 78), (176, 142), (32, 142)], fill='#d20a41')
    d.text((48, 86), 'NEW', font=font(38, True), fill='white')
    d.ellipse((178, 91, 216, 129), outline='white', width=2)
    d.ellipse((188, 91, 206, 129), outline='white', width=1)
    d.line((178, 110, 216, 110), fill='white', width=1)
    d.text((228, 86), 'NEWS', font=font(38, True), fill='white')
    badge = {'uk': 'UKR', 'ru': 'RUS', 'en': 'ENG'}.get(language.split('-')[0], '')
    d.text((425, 98), badge, font=font(23, True), fill='#00ffff')
    brand_path = folder/'brand.png'; brand.save(brand_path)
    paths = []
    for index, item in enumerate(windows):
        chrome = Image.new('RGBA', (380, 450)); d = ImageDraw.Draw(chrome)
        d.rounded_rectangle((1, 1, 378, 281), radius=20, fill='#090f1f', outline='#00ffff', width=3)
        d.line((2, 26, 2, 255), fill='#ff0055', width=5)
        d.rectangle((12, 40, 367, 239), fill=(0, 0, 0, 0))
        label = item['label'].upper()
        d.text((14, 10), label, font=fit(d, label, 20, 16, True), fill='#f0f4f8')
        d.text((14, 251), item['credit'], font=fit(d, item['credit'], 22, 18), fill='#cbd4e6')
        face = font(30, True); lines = ['']
        for word in item['headline'].upper().split():
            candidate = (lines[-1]+' '+word).strip()
            if d.textlength(candidate, font=face) > 338 and lines[-1]:
                lines.append(word)
            else:
                lines[-1] = candidate
        if len(lines) > 4 or any(d.textlength(line, font=face) > 338 for line in lines):
            raise ValueError('Заголовок окна слишком длинный; сократите до 4 коротких строк')
        d.rounded_rectangle((0, 294, 379, 304+len(lines)*36), radius=10, fill=(3, 3, 5, 205))
        d.line((5, 304, 5, 294+len(lines)*36), fill='#ff0055', width=5)
        for line, y in zip(lines, range(300, 450, 36)):
            d.text((20, y), line, font=face, fill='white')
        path = folder/f'window-{index}.png'; chrome.save(path); paths.append(path)
    return brand_path, paths


def render_scene(host, windows, seconds, output, working, run, normalize, encode_args, input_args, images, language="uk-UA"):
    brand, chrome = draw_graphics(working, windows, language)
    args = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-filter_complex_threads', '1'] + input_args(host)
    args += ['-loop', '1'] + input_args(brand)
    filters = [f'[0:v]setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=1,{normalize(1080,1920)}[host]', '[host][1:v]overlay=0:0:format=auto[base]']
    previous = 'base'
    for index, item in enumerate(windows):
        duration = item['endSeconds'] - item['startSeconds']
        args += (['-loop', '1'] if item['path'].suffix.lower() in images else ['-ss', str(item['mediaStartSeconds'])]) + input_args(item['path'])
        args += ['-loop', '1'] + input_args(chrome[index])
        n = 2 + index*2
        filters.append(f'[{n}:v]trim=duration={duration},setpts=PTS-STARTPTS,scale=356:200:force_original_aspect_ratio=decrease,pad=356:200:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30,format=rgba,pad=380:450:12:40:color=black@0[media{index}]')
        filters.append(f'[media{index}][{n+1}:v]overlay=0:0:format=auto,format=rgba,fade=t=in:st=0:d=0.18:alpha=1,fade=t=out:st={duration-0.18}:d=0.18:alpha=1,setpts=PTS+{item["startSeconds"]}/TB[card{index}]')
        x = f'32-18*max(0,1-(t-{item["startSeconds"]})/0.2)'
        filters.append(f'[{previous}][card{index}]overlay=x=\'{x}\':y=168:eof_action=pass:enable=\'gte(t,{item["startSeconds"]})*lt(t,{item["endSeconds"]})\':format=auto[v{index}]')
        previous = f'v{index}'
    args += ['-filter_complex', ';'.join(filters), '-map', f'[{previous}]', '-map', '0:a:0', '-af', 'asetpts=PTS-STARTPTS,apad']
    run(args + encode_args(seconds, output))


def normalize_news_audio(source, destination):
    """Two-pass delivery loudness; original voice and GPU source stay unchanged."""
    base = ['ffmpeg', '-hide_banner', '-nostdin', '-y']
    result = subprocess.run(base + ['-i', str(source), '-map', '0:a:0', '-af',
        'loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True, timeout=600, check=True)
    matches = re.findall(r'\{\s*"input_i".*?\}', result.stderr, re.S)
    if not matches:
        raise ValueError('Не удалось измерить громкость речи')
    measurement = json.loads(matches[-1])
    keys = ['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset']
    if any(not math.isfinite(float(measurement[key])) for key in keys):
        raise ValueError('Речь слишком тихая или отсутствует; проверьте озвучку')
    audio_filter = ('loudnorm=I=-16:TP=-1.5:LRA=7:linear=true:'
        f'measured_I={measurement["input_i"]}:measured_TP={measurement["input_tp"]}:'
        f'measured_LRA={measurement["input_lra"]}:measured_thresh={measurement["input_thresh"]}:'
        f'offset={measurement["target_offset"]}')
    subprocess.run(base + ['-loglevel', 'error', '-i', str(source), '-map', '0:v:0',
        '-map', '0:a:0', '-c:v', 'copy', '-af', audio_filter, '-c:a', 'aac',
        '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', str(destination)],
        capture_output=True, text=True, timeout=600, check=True)
    return {'targetLufs': -16, 'truePeakLimitDbtp': -1.5, 'inputLufs': float(measurement['input_i'])}
