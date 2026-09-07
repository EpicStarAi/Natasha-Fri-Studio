# NATASHA с Replicate Wav2Lip — Пошаговая настройка

Формат: AI-ведущая в кадре (news anchor style) с синхронизацией губ под озвучку ElevenLabs.

---

## 1. Предварительные условия

### 1.1 Ключи API

Получить и добавить в `.env` на VPS:

```bash
# Replicate (https://replicate.com/account/api-tokens)
REPLICATE_API_TOKEN=r8_...

# Остальные (уже должны быть из IBO-деплоя)
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### 1.2 Портрет ведущей НАТАШИ (один раз)

Перед первым запуском workflow создать и сохранить портрет:

**Используя Replicate + Flux** (~0.03 USD):

```bash
# Через curl или Python
curl -X POST https://api.replicate.com/v1/predictions \
  -H "Authorization: Token $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "ce499853944e94ff404a761bc6f134e55b2f1432f44ef6ef580506e2cc62373f",
    "input": {
      "prompt": "professional news anchor woman, 30 years old, Russian, studio lighting, looking directly at camera, neutral expression, high-quality photorealistic portrait, 9:16 vertical aspect ratio, studio background",
      "width": 576,
      "height": 1024
    }
  }'
```

Сохранить URL портрета локально:
```
NATASHA_PORTRAIT_URL=https://replicate.delivery/...
```

---

## 2. Архитектура NATASHA-workflow

### 2.1 Структура новости → видео

```
Telegram / RSS (новость)
  ↓
Claude: сценарий по сценам (JSON)
  { title, caption, scenes: [ { voiceover, image_prompt, duration } ] }
  ↓
Split In Batches: 4–6 сцен
  ↓
[Per Scene]
  ├─ Image Gen (Flux, Replicate)
  │  └─ Сцена 1080×1920 в едином стиле
  │
  └─ ffmpeg Ken-Burns zoom (пока без image-to-video)
  ↓
ElevenLabs: озвучка всего текста целиком (один файл mp3)
  ↓
Whisper → SRT (субтитры)
  ↓
Replicate Wav2Lip: НАТАША (портрет) + mp3 → говорящее видео
  ↓
ffmpeg concat: 
  - hook-сцена (ведущая + озвучка)
  - факт-сцены (карточки + озвучка)
  - музыка + duck (подавление под голос)
  - burn-in субтитры
  ↓
Telegram approval (инлайн-кнопки ✅/❌)
  ↓
POST /webhook/epicstar-publish
  ↓
YouTube/TikTok/IG
```

### 2.2 Ключевые ноды n8n

| Нода | Тип | Назначение |
|---|---|---|
| **Trigger** | Webhook / Telegram | Новость приходит |
| **Prepare** | Set | Извлечь topic, сформировать контекст |
| **Generate Script** | HTTP Request (Claude API) | JSON: сцены с озвучкой + промты для картинок |
| **Extract Script** | Function | Распарсить JSON, подготовить batches |
| **Split In Batches** | n8n-базовая | Разбить 4–6 сцен для параллельной генерации |
| **Generate Images** | HTTP Request (Replicate Flux) | Картинка на сцену 1080×1920 |
| **Generate Voice** | HTTP Request (ElevenLabs) | Один mp3-файл — вся озвучка |
| **Generate Subs** | HTTP Request (Whisper OpenAI) | Аудио → SRT |
| **Wav2Lip Video** | HTTP Request (Replicate) | Портрет НАТАШИ + mp3 → видео ведущей |
| **FFmpeg Concat** | Merge Video (executeCommand) | Hook + сцены + музыка + субтитры → финал 1080×1920 |
| **Send Review** | Telegram Send | Админу на аппрув (с кнопками ✅/❌) |
| **Publish Distributor** | HTTP Request | Вебхук → EPICSTAR_CENTRAL_DISTRIBUTOR |
| **Analytics** | HTTP Request / Telegram Send | Отчёт |

---

## 3. Промпт Claude для сценария (NATASHA)

### Системный промпт:

```
Ты — НАТАША, русский AI-блогер и новостной ведущий.
Твоя задача: взять новость и превратить её в энергичный вертикальный видео-сценарий для YouTube Shorts / TikTok.

Правила:
1. Структура: hook (1–2 фразы) → 3–5 фактов → CTA (призыв подписаться).
2. Длительность: 15–30 сек (каждая сцена 3–5 сек, примерно 15–20 слов озвучки на сцену).
3. Стиль: разговорный, энергичный, без формальности. Ты говоришь с зрителем напрямую.
4. Фактчек: используй ТОЛЬКО факты из переданной новости. Спорное — опускай.
5. Ответ — JSON (см. ниже). ТОЛЬКО JSON, без доп. текста.

Формат ответа:
{
  "title": "Краткий заголовок видео",
  "caption": "Описание для YouTube (хештеги, контекст)",
  "hook_voiceover": "Первая фраза, цепляющая зрителя (15–20 слов)",
  "hook_image_prompt": "Портрет НАТАШИ в студии, выразительное лицо, интерес",
  "scenes": [
    {
      "voiceover": "Озвучка этой сцены (15–20 слов)",
      "image_prompt": "Картинка для этой сцены (факт: ...). Стиль: инфографика, карточка, фото.",
      "duration": 4
    },
    ...
  ]
}
```

### Переменные окружения стиля:

```bash
NATASHA_STYLE_PROMPT="news anchor, professional, energetic, studio aesthetic"
NATASHA_IMAGE_STYLE="clean infographic card, bright colors, sans-serif typography, news-style, 9:16 vertical"
```

---

## 4. Replicate: Flux Image + Wav2Lip Video

### 4.1 Flux (генерация сцен)

**Model ID:** `black-forest-labs/flux-pro` (или `flux-dev` для экономии)

```json
{
  "version": "091792f02309d50d32202e73dd1a8cbebf4b9e60847b2b558f4283527b891fda",
  "input": {
    "prompt": "news infographic: Россия запустила спутник // clean card design, 9:16 vertical, news style",
    "width": 576,
    "height": 1024,
    "num_inference_steps": 28
  }
}
```

Стоимость: ~0.03 USD/изображение.

### 4.2 Wav2Lip (ведущая + аудио → видео)

**Model ID:** `cjwbw/stable-diffusion-image-to-video` или `anotherjesse/wav2lip` (через replicate)

```json
{
  "version": "8bfa135c6cb53db142c94d889cb63652be270bbd4682ae0dbefd26575df4944",
  "input": {
    "face": "https://.../natasha-portrait.jpg",
    "audio": "https://.../voiceover.wav",
    "still_mode": true,
    "pad": 10,
    "use_float16": true
  }
}
```

Стоимость: ~0.15 USD за видео (480p, 4–30 сек).

**Или локально** на Contabo (GPU):

```bash
# SadTalker или Wav2Lip в Docker
docker run --gpus all wav2lip \
  --face natasha.jpg \
  --audio voiceover.wav \
  -o output.mp4
```

---

## 5. Локальный рендер в n8n (ffmpeg)

### 5.1 FFmpeg-команда (concat + музыка + субтитры)

```bash
ffmpeg -y \
  -i hook.mp4 \
  -i scene1.mp4 \
  -i scene2.mp4 \
  -i scene3.mp4 \
  -i voiceover.mp3 \
  -i background_music.mp3 \
  -filter_complex "[0][1][2][3]concat=n=4:v=1:a=0[v];
                   [v]scale=1080:1920[vs];
                   [voiceover]volume=1[vo];
                   [background_music]volume=0.2[bgm];
                   [vo][bgm]amix=inputs=2[a]" \
  -map "[vs]" \
  -map "[a]" \
  -vf "subtitles=subs.srt" \
  -c:v libx264 -preset ultrafast \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  output.mp4
```

Хранить в n8n как Merge Video ноду (или Function + executeCommand).

---

## 6. Telegram-аппрув (блокирующий)

Нода `Send Review` отправляет видео админу с инлайн-кнопками:
- ✅ Approve (публикует)
- ❌ Reject (удаляет из очереди)

Используется `telegramApi.callApi` с `sendMessage` + `reply_markup`:

```json
{
  "chat_id": "{{ $env.TELEGRAM_CHAT_ID }}",
  "text": "Видео готово к публикации:\n{{ $json.title }}\n\nПроверь и одобри:",
  "reply_markup": {
    "inline_keyboard": [
      [
        { "text": "✅ Опубликовать", "callback_data": "approve_{{ $json.video_id }}" },
        { "text": "❌ Отклонить", "callback_data": "reject_{{ $json.video_id }}" }
      ]
    ]
  }
}
```

После одобрения → `POST /webhook/epicstar-publish` → распределение по платформам (тот же дистрибьютор, что для IBO).

---

## 7. Порядок реализации

**Фаза 1** (неделя 1):
- ✅ .env + Replicate API key
- Claude → сценарий (JSON)
- Flux → генерация сцен (тест на 1–2 сценах)

**Фаза 2** (неделя 2):
- ElevenLabs → озвучка
- Whisper → SRT
- Wav2Lip → ведущая (реальный портрет)
- FFmpeg concat локально

**Фаза 3** (неделя 3):
- Telegram-аппрув (блокирующий)
- Публикация через дистрибьютор
- End-to-end тест (новость → видео → публикация)

---

## 8. Стоимость на видео

| Сервис | Операция | Стоимость | Примечание |
|---|---|---|---|
| Replicate (Flux) | 4–6 изображений | ~0.12 USD | 0.03/изображение |
| ElevenLabs | озвучка 30 сек | ~0.06 USD | 20 тыс. символов/мес free tier |
| Replicate (Wav2Lip) | видео ведущей | ~0.15 USD | один раз на новость |
| OpenAI (Whisper) | транскрипция | ~0.002 USD | ~300 слов |
| **Итого** | **1 видео** | **~0.33 USD** | ~8 видео/день = $2.60 |
| | | | Портрет (Flux) амортизируется |

---

## 9. Файлы для создания

После подтверждения эта рекомендация переходит в:

1. `n8n-workflows/NATASHA_NEWS_CREATIVE.json` — основной workflow
2. `docker/entrypoint.sh` — обновление для import NATASHA-workflow (уже есть)
3. `docs/natasha-deployment.md` — пошаговая инструкция деплоя на VPS

---

## 10. Чек-лист перед запуском

- [ ] `REPLICATE_API_TOKEN` в `.env`
- [ ] Портрет НАТАШИ создан и URL сохранён
- [ ] Claude промпт про сценарий (JSON) тестирован вручную
- [ ] Replicate Flux работает (тест 1 изображения)
- [ ] ElevenLabs озвучка готова
- [ ] FFmpeg concat работает локально
- [ ] Telegram-аппрув готов (кнопки)
- [ ] EPICSTAR_CENTRAL_DISTRIBUTOR доступен (для публикации)
