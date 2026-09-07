# НАТАША | FREE RUS

Единый репозиторий проекта: **n8n-автоматизация контента** + **веб-платформа**
(Replit-приложение с AI-ассистентом). Обе части работают независимо и
разворачиваются по-разному — смотри разделы ниже.

## Состав репозитория

| Путь | Назначение |
|---|---|
| `n8n-workflows/` | 16 боевых workflow EPICSTAR (дистрибьютор, публикация YouTube/TikTok/Instagram/Telegram, RSS-движок, AI-аппрув, error handler, видео-пайплайн) |
| `natasha-workflow.json` | Конвейер автопубликации видео для n8n (31 нода) |
| `docker-compose.yml`, `docker/Dockerfile` | Стек n8n + ffmpeg (PostgreSQL, Redis, Ollama, OpenWebUI) |
| `.env.example` | Шаблон переменных для n8n-стека |
| `ЗАПУСК_NATASHA.md` | Инструкция по запуску n8n-стека и импорту workflow |
| `artifacts/natasha-fri/` | Веб-платформа «Наташа Фри» (React-фронтенд) |
| `artifacts/api-server/` | API-сервер платформы (Express 5) |
| `artifacts/mockup-sandbox/` | Песочница мокапов UI |
| `lib/` | Пакеты воркспейса: `api-spec` (OpenAPI), `api-client-react` (Orval-хуки), `api-zod` (Zod-схемы), `db` (Drizzle) |
| `package.json`, `pnpm-workspace.yaml` | pnpm-воркспейс веб-платформы |
| `replit.md` | Run-док Replit-приложения |

---

## 1. n8n-конвейер автоматизации

Автоматическое создание и публикация коротких вертикальных видео
(Shorts / TikTok / Reels) на базе **n8n + Claude + ElevenLabs + FFmpeg**.

Тема → сценарий → озвучка → склейка видео → публикация на YouTube, TikTok,
Instagram → аналитика → отчёт в Telegram.

### Архитектура

```
Telegram / Webhook (тема) / RSS-новости
  → Claude (сценарий)
  → ElevenLabs (озвучка)
  → FFmpeg (фон + голос → 1080×1920 mp4)
  → YouTube   — resumable upload API
  → TikTok    — Content Posting API (FILE_UPLOAD)
  → Instagram — Graph API (REELS)
  → Analytics webhook → отчёт в Telegram
```

### Workflow (n8n-workflows/)

Боевая система из инстанса n8n (контейнер `ai-evo-n8n`):

- `EPICSTAR_CENTRAL_DISTRIBUTOR` — центральный дистрибьютор: принимает пост
  на вебхук `epicstar-publish` и раздаёт по платформам
- `EPICSTAR_YOUTUBE_UPLOAD`, `EPICSTAR_TIKTOK_PUBLISH`, `EPICSTAR_INSTAGRAM_POST`,
  `EPICSTAR_TELEGRAM_AUTOPOST` — публикация по платформам
- `EPICSTAR_RSS_CONTENT_ENGINE` — часовой RSS-движок (HN frontpage) с
  дедупликацией через static data
- `IBO_VIDEO_PIPELINE` — видео-пайплайн: расписание каждые 3 часа → RSS →
  Claude (виральный сценарий по сценам + текст озвучки) → ElevenLabs (голос)
  → локальный рендер `scripts/render_ibo.py` (карточки 1080×1920, кроссфейды,
  кен-бёрнс, голос единым слоем) → пост в Telegram-канал с описанием,
  хештегами и ссылками «Ещё по теме» из той же рубрики. Бренд и аккаунты —
  `assets/ibo-brand.json`; пример сценария — `scripts/examples/`
- `EPICSTAR_ERROR_HANDLER` — перехват ошибок всех workflow (errorTrigger) +
  уведомление в Telegram
- `EPICSTAR_AI_DRAFT_APPROVAL`, `QUOTA-CMD - Webhook`, `n8n-MCP-Server` и др.

### Быстрый старт

```bash
cd CODE
cp .env.example .env      # заполни ключи (минимум: OPENAI_API_KEY, TELEGRAM_*)
docker compose up -d --build
```

n8n: **http://localhost:5680** — создай админ-аккаунт, импортируй workflow
(файлы из `n8n-workflows/` или `natasha-workflow.json`), назначь credentials
(`telegramApi`, `googleApi` со скоупом `youtube.upload`).

Тест без бота:

```bash
curl -X POST http://localhost:5680/webhook/natasha/publish \
  -H "Content-Type: application/json" \
  -d '{"topic": "новый ресторан фастфуда открылся в Москве"}'
```

### Порты

Штатные порты (5432, 5678, 6379, 3000, 11434) на целевой машине заняты
другими проектами, поэтому стек использует:

| Сервис | Порт |
|---|---|
| n8n | 5680 |
| PostgreSQL | 5434 |
| Redis | 6382 |
| OpenWebUI | 3003 |
| Ollama | 11436 |

### Почему такой Dockerfile

Официальный образ `docker.n8n.io/n8nio/n8n` построен на «Docker Hardened
Images (Alpine)» — в нём удалены `apk` и `curl`, а ffmpeg отсутствует. Поэтому
`docker/Dockerfile` собирает ffmpeg/curl в отдельной стадии на обычном
`alpine:3.23` (тот же musl) и копирует их в финальный образ.

### Предпосылки платформ

- **YouTube** — Google OAuth2 credential в n8n со скоупом
  `https://www.googleapis.com/auth/youtube.upload`
- **TikTok** — приложение должно получить доступ к **Content Posting API**
  (одобрение на developers.tiktok.com), токен со скоупами `video.upload`,
  `video.publish`
- **Instagram** — бизнес-аккаунт + long-lived токен Graph API; видео должно
  быть доступно по **публичному https-URL** (`INSTAGRAM_VIDEO_URL`)
- **Telegram** — бот (`TELEGRAM_BOT_TOKEN`) и чат администратора
  (`TELEGRAM_CHAT_ID`), куда приходит видео на проверку и отчёт

Перед публикацией токен проверяется `docker/validate-telegram.sh` (getMe):
при пустом или недействительном токене скрипт вернёт понятную ошибку
(exit 1/2) вместо 401 Unauthorized. Аналогично для платформ —
`docker/validate-platforms.sh` (TikTok через Content Posting API,
Instagram через Graph API, YouTube через проверку OAuth2-credential в n8n)
с понятными ошибками вместо 401/403/OAuthException. В compose-стеке обе
проверки выполняются автоматически при старте n8n (`docker/entrypoint.sh`);
для standalone-скриптов публикации вызывайте валидатор первым шагом.

По умолчанию публикация приватная (`YOUTUBE_PRIVACY=private`,
`TIKTOK_PRIVACY_LEVEL=SELF_ONLY`) — безопасно для тестирования.

---

## 2. Веб-платформа «Наташа Фри» (artifacts/)

Интерактивный новостной портал в виде «рабочего стола» с плавающими окнами
(новости, документы, чат) и **AI-ассистентом на Claude**. Разрабатывалась в
Replit; сборка и запуск — через pnpm-воркспейс.

### Стек

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Фронтенд: Vite + React 19 + Tailwind 4 + shadcn/ui
- API: Express 5, валидация Zod (`zod/v4`) + `drizzle-zod`
- БД: PostgreSQL + Drizzle ORM
- Кодогенерация API: Orval (из OpenAPI-спеки в `lib/api-spec`)
- Сборка API: esbuild (CJS bundle)

### Фичи

- **Claude AI-чат** — окно чата на фронте, `POST /api/chat` на бэкенде
  (модель `claude-opus-4-5`, системная роль — русскоязычный ассистент
  медиаплатформы; ключ — `ANTHROPIC_API_KEY`)
- **Lemlist OAuth** — подключение Lemlist через OAuth2 (CSRF-state, rate-limit,
  refresh-токен, таблица `lemlist_tokens` в БД) и список кампаний
- Оконный UI: `DesktopCanvas` (десктоп), `MobileStack` (мобильный вид)

### Запуск

```bash
pnpm install
pnpm --filter @workspace/api-server run dev   # API, порт 5000
pnpm --filter @workspace/natasha-fri run dev  # фронтенд (Vite)
pnpm run typecheck                            # проверка типов по всему воркспейсу
pnpm run build                                # typecheck + сборка всех пакетов
```

### Переменные окружения (api-server)

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (обязательно) |
| `ANTHROPIC_API_KEY` | Ключ Anthropic для Claude-чата |
| `LEMLIST_CLIENT_ID` / `LEMLIST_CLIENT_SECRET` / `LEMLIST_REDIRECT_URI` | OAuth-приложение Lemlist |
| `FRONTEND_URL` | Базовый URL фронтенда для редиректов OAuth |

### Безопасность воркспейса

`pnpm-workspace.yaml` включает защиту от supply-chain атак:
`minimumReleaseAge: 1440` — пакеты npm принимаются только после суток с
публикации (исключение — доверенные `@replit/*`). Не отключай без нужды.

## 3. Публичный деплой (freerus.site)

Платформа опубликована через **Cloudflare Tunnel** (машина за NAT, без
публичного IP). Домен остаётся на nameserver'ах GoDaddy.

### Архитектура

```
freerus.site / www.freerus.site (GoDaddy DNS)
        │  CNAME www → 93555471-…-d9000a01ca24.cfargotunnel.com
        ▼
Cloudflare edge (SSL) ── туннель cloudflared ──► localhost:5173  (Vite, фронт)
                                    └──────────► localhost:5000  (api-server, /api/*)
```

### Что нужно запущено на машине

| Процесс | Порт | Запуск |
|---|---|---|
| Vite (natasha-fri) | 5173 | `cd artifacts/natasha-fri && PORT=5173 BASE_PATH=/ pnpm dev` |
| api-server | 5000 | `pnpm --filter @workspace/api-server run dev` |
| cloudflared (туннель) | — | `cloudflared tunnel run natasha-fri` (конфиг `~/.cloudflared/config.yml`) |

Туннель создан под аккаунтом Cloudflare (сертификат `~/.cloudflared/cert.pem`),
ID туннеля: `93555471-d664-4978-9caf-d9000a01ca24`. Ingress в
`~/.cloudflared/config.yml`: `freerus.site`/`www.freerus.site` → 5173,
`/api/*` → 5000.

### Записи DNS (GoDaddy, freerus.site)

| Тип | Имя | Дані | Назначение |
|---|---|---|---|
| CNAME | www | `93555471-…cfargotunnel.com` | живой деплой |
| CNAME | _domainconnect | `_domainconnect.gd.domaincontrol.com.` | дефолт GoDaddy |
| TXT | _dmarc | DMARC | дефолт GoDaddy |
| NS | @ | `ns25/ns26.domaincontrol.com` | nameserver'ы GoDaddy (не менять) |

### Статус (2026-08-12)

- ✅ `https://www.freerus.site` — 200, SSL от Cloudflare, «НАТАША ФРИ RUS»
- ✅ `/api/*` через туннель маршрутизируется на api-server (5000)
- ⏳ `freerus.site` (корень) — **NXDOMAIN**: GoDaddy не даёт CNAME на apex,
  редирект через вкладку **«Переадресація» (Forwarding)** ещё не создан.
  Шаг: GoDaddy → freerus.site → Переадресація → `freerus.site →
  https://www.freerus.site` (301). GoDaddy сам создаст нужную A-запись.

---

## Лицензия

© EPIC STAR AI — проект НАТАША | FREE RUS
