# 🚀 НАТАSHA | FREE RUS — ЗАПУСК КОНВЕЙЕРА ПУБЛИКАЦИЙ

Рабочий конвейер: **тема → сценарий (OpenAI) → озвучка (ElevenLabs) → видео (FFmpeg) → публикация (YouTube / TikTok / Instagram) → аналитика (вебхук) → отчёт в Telegram**.

## 📦 Что в папке `CODE/`

| Файл | Назначение |
|---|---|
| `natasha-workflow.json` | Готовый workflow для n8n (31 нода) |
| `docker/Dockerfile` | Образ n8n + ffmpeg + curl (multi-stage: официальный образ n8n — «hardened Alpine» без apk, поэтому ffmpeg берётся из alpine:3.23) |
| `docker-compose.yml` | Стек: n8n + PostgreSQL + Redis + Ollama + OpenWebUI (порты 5680/5434/6382/11436/3003 — все штатные порты заняты другими проектами) |
| `.env.example` | Все переменные конвейера |
| `assets/bg.jpg` | Фон видео (Grok-арт НАТАШИ) |

---

## 🐳 ШАГ 1: Запуск стека

```bash
cd CODE
cp .env.example .env
# заполни .env: OPENAI_API_KEY, ELEVENLABS_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID —
# это минимум для теста. Остальное добавляй по мере подключения платформ (см. ШАГ 4).
docker compose up -d --build
```

n8n будет на **http://localhost:5680** (5678/5679 заняты другими n8n на этой машине).
OpenWebUI — http://localhost:3003, Ollama — http://localhost:11436, PostgreSQL — 5434, Redis — 6382.
Создай аккаунт администратора при первом входе.

---

## 🔄 ШАГ 2: Импорт workflow

1. n8n → **Workflows** → **Import from File** → выбери `CODE/natasha-workflow.json`
2. Открой workflow и **настрой credentials** (значки с ключиком):
   - **Telegram account** (`telegramApi`) — токен бота `TELEGRAM_BOT_TOKEN`
   - **Google account** (`googleApi`) — OAuth2, со скоупом `https://www.googleapis.com/auth/youtube.upload` (обязательно!)
3. Нажми **Save** и **Activate** (переключатель вверху).

После активации webhook'и начинают слушать:
- `POST http://localhost:5680/webhook/natasha/publish` — ручной запуск (тест)
- `POST http://localhost:5680/webhook/analytics` — приём аналитики (шлёт сам конвейер)
- Telegram Trigger — регистрирует webhook бота (нужен публичный URL, см. ШАГ 6)

---

## 🧪 ШАГ 3: Тест без бота (curl)

```bash
curl -X POST http://localhost:5680/webhook/natasha/publish \
  -H "Content-Type: application/json" \
  -d '{"topic": "новый ресторан фастфуда открылся в Москве"}'
```

Пайплайн: сценарий → голос → склейка видео → **видео приходит тебе в Telegram на проверку** → публикация → отчёт.

---

## 🔑 ШАГ 4: Подключение платформ (по одной)

### YouTube
1. В n8n: Credentials → **Google account** (OAuth2), скоуп `youtube.upload`.
2. Выбери этот credential в нодах `YouTube Init` и `YouTube Upload`.
3. Видимость: `YOUTUBE_PRIVACY=private` (тест) → потом `unlisted`/`public`.

### TikTok (Content Posting API)
1. https://developers.tiktok.com → создай приложение и **подай заявку на Content Posting API** (одобрение занимает время — без него загрузка не работает).
2. Скоупы токена: `video.upload`, `video.publish`.
3. В `.env`: `TIKTOK_ACCESS_TOKEN`, `TIKTOK_PRIVACY_LEVEL=SELF_ONLY` (тест) → `PUBLIC_TO_EVERYONE`.

### Instagram (Graph API)
1. Бизнес-аккаунт Instagram, связанный со страницей Facebook.
2. В `.env`: `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `INSTAGRAM_ACCESS_TOKEN`.
3. **Обязательно**: Instagram сам скачивает видео по публичному https-URL. Положи файл на VPS/nginx и укажи `INSTAGRAM_VIDEO_URL=https://ваш-сервер/media/final.mp4`. Без публичного URL ветка Instagram будет помечена «ошибка», остальные платформы продолжат работу.

---

## 🔎 Как устроен конвейер (по нодам)

```
Telegram Trigger / Webhook (natasha/publish)
  → Prepare            — тема из сообщения
  → Generate Script    — OpenAI chat/completions (HTTP)
  → Extract Script     — title/description/caption/hashtags
  → Generate Voice     — ElevenLabs TTS → binary audio (HTTP)
  → Write Voice        — /tmp/voice.mp3
  → Merge Video        — FFmpeg: фон + голос → /tmp/natasha/final.mp4 (1080x1920)
  → Get Video Size     — stat
  → Video Info + Payload-ноды
  → Read Video / Send Review (видео в Telegram на проверку)
  → YouTube Init (resumable) → Read Video YT → YouTube Upload (PUT бинарника)
  → TikTok Init (FILE_UPLOAD) → Read Video TK → TikTok Upload → Wait → TikTok Status
  → IG Create (REELS) → Wait → IG Check → IG Publish
  → Log Analytics (POST на /webhook/analytics)
  → Send Completion (отчёт в Telegram)
```

Особенности:
- **YouTube** — честный resumable upload: `POST .../upload/youtube/v3/videos?uploadType=resumable` → берём `Location` из заголовков → `PUT` видео. OAuth2-токен прикладывает сам n8n через credential `googleApi`.
- **TikTok** — актуальный API `open.tiktokapis.com/v2/post/publish/video/init/` → `PUT upload_url` → опрос `/status/fetch/`.
- **FFmpeg** — фон `assets/bg.jpg` (или `NATASHA_BG_IMAGE`), обрезка под 1080×1920, h264+aac. Если файла фона нет — заливка цветом, конвейер не падает.
- **Аналитика** — нода `Analytics Webhook` (путь `analytics`) принимает JSON-события; `Log Analytics` шлёт `{timestamp, topic, script, video_size, platforms:{youtube,tiktok,instagram}, status}`.
- Публикация каждой платформы не роняет остальные (`continue on fail`) — отчёт покажет, что вышло, а что нет.

---

## 🎛 Полезные команды

```bash
cd CODE
docker compose logs -f n8n        # логи
docker compose restart n8n        # перезапуск
docker compose down               # остановить
docker compose up -d --build      # пересобрать (после правок Dockerfile)
docker compose ps                 # статус
```

---

## 🚨 Если что-то не так

- **Workflow падает на «Generate Voice»** — проверь `ELEVENLABS_API_KEY` и `ELEVENLABS_VOICE_ID`.
- **Падает «Merge Video»** — смотри stdout ноды: обычно не хватает ffmpeg в образе (нужен наш Dockerfile, а не стоковый n8n).
- **YouTube: «Credential not found»** — не назначен `googleApi` на ноды `YouTube Init`/`YouTube Upload`, или у credential нет скоупа `youtube.upload`.
- **TikTok: 401/403** — приложение не одобрено для Content Posting API или не хватает скоупов.
- **Аналитика не приходит** — workflow должен быть **Activated** (иначе webhook `/analytics` не слушает). Проверь: `curl -X POST http://localhost:5680/webhook/analytics -H "Content-Type: application/json" -d '{"ping":true}'` → должен ответить 200.

### Telegram Trigger из-за NAT / локальной сети
Telegram должен достучаться до n8n. Варианты:
- VPS с публичным IP и nginx (рекомендуется), `N8N_WEBHOOK_TUNNEL_URL` не нужен;
- локально — ngrok/cloudflared, либо просто тестируй через webhook `natasha/publish` (ШАГ 3).

---

## 📈 Следующие шаги

1. Параллельная публикация (сейчас ветки идут последовательно — надёжнее для первой версии)
2. Цикл проверки статуса TikTok до `PUBLISH_COMPLETE` (сейчас одна проверка после 30 сек)
3. Сборка новостей по расписанию (Schedule Trigger) → автозапуск конвейера
4. Хранение аналитики в PostgreSQL вместо вебхука
5. Текст на видео (drawtext) — нужен шрифт в образе
