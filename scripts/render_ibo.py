#!/usr/bin/env python3
"""Рендерер роликов «ИНТЕРНЕТ БЕЗ ОГРАНИЧЕНИЙ» (текстовые карточки 1080x1920).

Локальная замена сервиса http://renderer:8080/render из IBO_VIDEO_PIPELINE:
принимает тот же JSON {hook, blocks[], cta} и собирает вертикальный ролик
в стиле канала — тёмный фон с виньеткой, жёлтая шапка-бренд, счётчик сцен,
крупный белый текст, жёлтый CTA-слайд с плашкой Telegram.

Слайды рисуются Pillow и склеиваются ffmpeg — фильтр drawtext не нужен,
поэтому подходит любая сборка ffmpeg (включая static-сборки без freetype).

Использование:
    python3 scripts/render_ibo.py script.json output.mp4 [voiceover.mp3]

Третий аргумент (опционально) — файл озвучки (например, из ElevenLabs);
голос микшируется поверх тихой эмбиент-подложки.

Зависимости: pillow (pip install pillow), ffmpeg.

Переменные окружения:
    FFMPEG_BIN — путь к ffmpeg (по умолчанию `ffmpeg` из PATH)
    IBO_FONT   — ttf-шрифт с кириллицей
                 (по умолчанию DejaVu Sans Bold из debian/ubuntu)
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
FPS = 30
BG = (13, 13, 21)
YELLOW = (255, 212, 0)
WHITE = (245, 245, 247)
BLACK = (10, 10, 10)
FONT = os.environ.get(
    "IBO_FONT", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
)
FFMPEG = os.environ.get("FFMPEG_BIN", "ffmpeg")

HEADER = "ИНТЕРНЕТ БЕЗ ОГРАНИЧЕНИЙ"
FOOTER = "@INTERNET_BEZ_GRANIC_RUS"

HOOK_SEC = 5.0
BLOCK_SEC = 4.5
AFTERTASTE_SEC = 4.0
CTA_SEC = 5.5

MARGIN = 64


def font(size):
    return ImageFont.truetype(FONT, size)


def make_background():
    """Тёмный фон с мягкой виньеткой (градиент считается в малом размере)."""
    small_w, small_h = 108, 192
    grad = Image.new("L", (small_w, small_h))
    px = grad.load()
    cx, cy = small_w / 2, small_h / 2
    max_d = (cx**2 + cy**2) ** 0.5
    for y in range(small_h):
        for x in range(small_w):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / max_d
            px[x, y] = int(60 * d**2)  # к краям темнее
    grad = grad.resize((W, H), Image.BILINEAR)
    img = Image.new("RGB", (W, H), BG)
    img.paste(Image.new("RGB", (W, H), (0, 0, 0)), mask=grad)
    return img


def wrap_by_width(draw, text, fnt, max_width):
    """Перенос слов по фактической ширине в пикселях."""
    lines, line = [], ""
    for word in text.split():
        cand = f"{line} {word}".strip()
        if draw.textlength(cand, font=fnt) <= max_width:
            line = cand
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw_header(draw, counter=None, telegram_pill=False):
    draw.ellipse((44, 58, 64, 78), fill=YELLOW)
    draw.text((84, 52), HEADER, font=font(30), fill=YELLOW)
    if counter:
        x0, y0, w, h = W - 190, 42, 140, 64
        draw.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=32, fill=YELLOW)
        fnt = font(34)
        tw = draw.textlength(counter, font=fnt)
        draw.text((x0 + (w - tw) / 2, y0 + 12), counter, font=fnt, fill=BLACK)
    if telegram_pill:
        x0, y0, w, h = W - 330, 42, 280, 64
        draw.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=32, fill=YELLOW)
        fnt = font(30)
        label = "→ TELEGRAM"
        tw = draw.textlength(label, font=fnt)
        draw.text((x0 + (w - tw) / 2, y0 + 14), label, font=fnt, fill=BLACK)


def make_slide(path, text, color, counter=None, telegram_pill=False,
               footer=False, text_size=68):
    img = make_background()
    draw = ImageDraw.Draw(img)
    draw_header(draw, counter=counter, telegram_pill=telegram_pill)

    fnt = font(text_size)
    lines = wrap_by_width(draw, text, fnt, W - 2 * MARGIN)
    line_h = text_size + 26
    block_h = len(lines) * line_h
    y = (H - block_h) / 2
    for line in lines:
        draw.text((MARGIN, y), line, font=fnt, fill=color)
        y += line_h

    if footer:
        fnt_f = font(32)
        tw = draw.textlength(FOOTER, font=fnt_f)
        draw.text(((W - tw) / 2, H - 120), FOOTER, font=fnt_f, fill=WHITE)

    img.save(path)


XFADE = 0.5  # длительность перекрёстного растворения между сценами


def media_duration(path):
    """Длительность файла в секундах (парсинг вывода ffmpeg -i)."""
    p = subprocess.run([FFMPEG, "-i", path], capture_output=True, text=True)
    for line in p.stderr.splitlines():
        if "Duration:" in line:
            hms = line.split("Duration:")[1].split(",")[0].strip()
            h, m, s = hms.split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise RuntimeError(f"не удалось определить длительность {path}")


def png_to_segment(png, mp4, seconds):
    """Сегмент из PNG с медленным кен-бёрнс-зумом — кадр «дышит»."""
    frames = int(round(seconds * FPS))
    zoom = f"zoompan=z='1+0.06*on/{frames}':x='(iw-iw/zoom)/2'" \
           f":y='(ih-ih/zoom)/2':d={frames}:s={W}x{H}:fps={FPS}"
    subprocess.run([
        FFMPEG, "-y", "-loop", "1", "-framerate", str(FPS), "-i", png,
        "-vf", f"scale={int(W*1.2)}:{int(H*1.2)},{zoom}",
        "-t", str(seconds), "-c:v", "libx264", "-preset", "veryfast",
        "-pix_fmt", "yuv420p", mp4,
    ], check=True, capture_output=True)


def main():
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    spec = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    voice = sys.argv[3] if len(sys.argv) == 4 else None
    hook, blocks, cta = spec["hook"], spec["blocks"], spec["cta"]
    aftertaste = spec.get("aftertaste")

    tmp = tempfile.mkdtemp(prefix="ibo-render-")
    try:
        n = len(blocks)
        plan = [("s0", hook, WHITE, dict(), HOOK_SEC)]
        for i, block in enumerate(blocks, 1):
            plan.append((f"s{i}", block, WHITE,
                         dict(counter=f"{i}/{n}"), BLOCK_SEC))
        if aftertaste:
            # слайд-послевкусие: финальная мысль без счётчика и плашек
            plan.append(("aftertaste", aftertaste, YELLOW, dict(), AFTERTASTE_SEC))
        plan.append(("cta", cta, YELLOW,
                     dict(telegram_pill=True, footer=True), CTA_SEC))

        # если есть озвучка — тайминги сцен растягиваются под голос,
        # чтобы видео закончилось вместе с ним (плюс короткий хвост)
        durations = [seconds for *_ignored, seconds in plan]
        if voice:
            target = media_duration(voice) + 1.2
            base_final = sum(durations) - XFADE * (len(plan) - 1)
            scale = max(target / base_final, 0.6)
            durations = [max(d * scale, 2.2) for d in durations]

        segments = []
        for (name, text, color, opts, _), seconds in zip(plan, durations):
            png = os.path.join(tmp, f"{name}.png")
            mp4 = os.path.join(tmp, f"{name}.mp4")
            make_slide(png, text, color, **opts)
            png_to_segment(png, mp4, seconds)
            segments.append(mp4)

        # склейка через xfade: сцены перетекают друг в друга
        total = sum(durations) - XFADE * (len(segments) - 1)
        inputs, graph = [], []
        for s in segments:
            inputs += ["-i", s]
        chain_len = durations[0]
        cur = "[0:v]"
        for i in range(1, len(segments)):
            offset = chain_len - XFADE
            nxt = f"[vx{i}]"
            graph.append(
                f"{cur}[{i}:v]xfade=transition=fade:duration={XFADE}"
                f":offset={offset:.3f}{nxt}"
            )
            chain_len = offset + durations[i]
            cur = nxt
        graph.append(f"{cur}fade=t=out:st={total - 0.6:.3f}:d=0.6[vout]")

        # аудио: тихая эмбиент-подложка (Telegram/TikTok глушат видео
        # без звука) + голос единым закадровым слоем поверх
        n_in = len(segments)
        pad = (
            "aevalsrc=0.05*sin(2*PI*110*t)+0.035*sin(2*PI*165*t)"
            f"+0.02*sin(2*PI*220*t):d={total:.3f}"
        )
        inputs += ["-f", "lavfi", "-i", pad]
        if voice:
            inputs += ["-i", voice]
            graph.append(f"[{n_in}:a]lowpass=f=600,volume=0.22[amb]")
            graph.append(f"[{n_in + 1}:a]volume=1.0[vc]")
            graph.append(
                "[amb][vc]amix=inputs=2:duration=first:"
                "dropout_transition=3[aout]"
            )
        else:
            graph.append(f"[{n_in}:a]lowpass=f=600,volume=0.8[aout]")

        subprocess.run([
            FFMPEG, "-y", *inputs,
            "-filter_complex", ";".join(graph),
            "-map", "[vout]", "-map", "[aout]",
            "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart", "-shortest", out,
        ], check=True, capture_output=True)
        print(f"OK {out} ({total:.1f}s, {len(plan)} слайдов)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
