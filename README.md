# НАТАША | FREE RUS — AI Media Pipeline

Автоматический конвейер создания и публикации коротких вертикальных видео
(Shorts / TikTok / Reels) на базе **n8n + OpenAI + ElevenLabs + FFmpeg**.

Тема → сценарий → озвучка → склейка видео → публикация на YouTube, TikTok,
Instagram → аналитика → отчёт в Telegram.

## Архитектура

```
Telegram / Webhook (тема)
  → OpenAI (сценарий)
  → ElevenLabs (озвучка)
  → FFmpeg (фон + голос → 1080×1920 mp4)
  → YouTube  — resumable upload API
  → TikTok   — Content Posting API (FILE_UPLOAD)
  → Instagram — Graph API (REELS)
  → Analytics webhook → отчёт в Telegram
```

## Структура репозитория

| Путь | Назначение |
|---|---|
| `natasha-workflow.json` | Готовый workflow для n8n (31 нода) |
| `docker/Dockerfile` | Образ n8n + ffmpeg + curl (multi-stage, см. ниже) |
| `docker-compose.yml` | Стек: n8n, PostgreSQL, Redis, Ollama, OpenWebUI |
| `.env.example` | Шаблон переменных окружения |
| `assets/bg.jpg` | Фоновое изображение для видео |
| `ЗАПУСК_NATASHA.md` | Подробная инструкция по запуску и отладке |

## Быстрый старт

```bash
cd CODE
cp .env.example .env      # заполни ключи (минимум: OPENAI_API_KEY, TELEGRAM_*)
docker compose up -d --build
```

n8n: **http://localhost:5680** — создай админ-аккаунт, импортируй
`natasha-workflow.json`, назначь credentials (`telegramApi`, `googleApi` со
скоупом `youtube.upload`).

Тест без бота:

```bash
curl -X POST http://localhost:5680/webhook/natasha/publish \
  -H "Content-Type: application/json" \
  -d '{"topic": "новый ресторан фастфуда открылся в Москве"}'
```

## Порты

Все штатные порты (5432, 5678, 6379, 3000, 11434) на целевой машине заняты
другими проектами, поэтому стек использует:

| Сервис | Порт |
|---|---|
| n8n | 5680 |
| PostgreSQL | 5434 |
| Redis | 6382 |
| OpenWebUI | 3003 |
| Ollama | 11436 |

## Почему такой Dockerfile

Официальный образ `docker.n8n.io/n8nio/n8n` построен на «Docker Hardened
Images (Alpine)» — в нём удалены `apk` и `curl`, а ffmpeg отсутствует. Поэтому
`docker/Dockerfile` собирает ffmpeg/curl в отдельной стадии на обычном
`alpine:3.23` (тот же musl) и копирует их в финальный образ.

## Предпосылки платформ

- **YouTube** — Google OAuth2 credential в n8n со скоупом
  `https://www.googleapis.com/auth/youtube.upload`
- **TikTok** — приложение должно получить доступ к **Content Posting API**
  (одобрение на developers.tiktok.com), токен со скоупами `video.upload`,
  `video.publish`
- **Instagram** — бизнес-аккаунт + long-lived токен Graph API; видео должно
  быть доступно по **публичному https-URL** (`INSTAGRAM_VIDEO_URL`)
- **Telegram** — бот (`TELEGRAM_BOT_TOKEN`) и чат администратора
  (`TELEGRAM_CHAT_ID`), куда приходит видео на проверку и отчёт

По умолчанию публикация приватная (`YOUTUBE_PRIVACY=private`,
`TIKTOK_PRIVACY_LEVEL=SELF_ONLY`) — безопасно для тестирования.

## Лицензия

© EPIC STAR AI — проект НАТАША | FREE RUS
