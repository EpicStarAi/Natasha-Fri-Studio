# НАТАША | Чек-лист запуска

## Фаза 1: IBO (к 11 ноября — MVP)

### На локальной машине:

```bash
cd Natasha-Fri-Studio
git checkout claude/news-creative-video-guide-b2iaop
git pull origin claude/news-creative-video-guide-b2iaop
```

### На VPS (Contabo):

1. **Клонировать репо:**
   ```bash
   git clone https://github.com/epicstarai/natasha-fri-studio.git
   cd Natasha-Fri-Studio
   git checkout claude/news-creative-video-guide-b2iaop
   ```

2. **Создать `.env` и заполнить ключи:**
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   Минимум для IBO:
   - `ANTHROPIC_API_KEY` (Claude)
   - `ELEVENLABS_API_KEY` (озвучка)
   - `TELEGRAM_BOT_TOKEN` (бот)
   - `TELEGRAM_CHAT_ID` (админ-чат)

3. **Запустить деплой:**
   ```bash
   ./scripts/deploy.sh
   ```
   
   Скрипт:
   - проверит ключи
   - соберёт Docker-образ (postgres, n8n, redis, ollama)
   - поднимет стек
   - импортирует IBO_VIDEO_PIPELINE
   - активирует расписание (каждые 3 часа)

4. **Проверить:**
   ```bash
   docker compose ps
   docker compose logs -f n8n
   ```
   
   n8n доступен: `http://<VPS-IP>:5680`

### Что будет происходить:

- Каждые 3 часа: RSS (Hacker News) → Claude → ElevenLabs → локальный рендер → Telegram-канал
- Видео: вертикальное (1080×1920), text-cards, фоновая музыка, субтитры
- Публикация: Telegram-канал @INTERNET_BEZ_GRANIC_RUS

**Статус:** ✅ Готово, протестировано

---

## Фаза 2: NATASHA (после 11 ноября)

### Шаг 1: Replicate API

1. Зарегистрироваться: https://replicate.com
2. Получить API token: https://replicate.com/account/api-tokens
3. Добавить в `.env` на VPS:
   ```bash
   REPLICATE_API_TOKEN=r8_...
   docker compose restart n8n
   ```

### Шаг 2: Портрет НАТАШИ (один раз)

```bash
# Запустить скрипт (на VPS или локально)
python3 scripts/generate_natasha_portrait.py
```

Или вручную через Replicate:
```bash
curl -X POST https://api.replicate.com/v1/predictions \
  -H "Authorization: Token $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "ce499853944e94ff404a761bc6f134e55b2f1432f44ef6ef580506e2cc62373f",
    "input": {
      "prompt": "professional Russian news anchor woman, 30 years old, studio lighting, neutral expression, high-quality portrait, 9:16 vertical",
      "width": 576,
      "height": 1024
    }
  }'
```

Сохранить файл: `/home/node/assets/natasha-portrait.jpg`

### Шаг 3: Импортировать NATASHA-workflow

```bash
docker compose exec -T n8n n8n import:workflow --input=/import/natasha-news-creative.json
docker compose exec -T n8n n8n publish:workflow --id=<workflow-id>
docker compose restart n8n
```

### Шаг 4: Тестовая новость

Отправить в Telegram-бота:
```
/start
/publish Россия запустила новый спутник для мониторинга климата
```

Ожидать: сценарий → озвучка → видео ведущей → финальный монтаж → аппрув → публикация.

**Статус:** 🔄 В разработке (недель 2–3)

---

## Ключевые файлы

| Файл | Назначение |
|---|---|
| `docs/natasha-replicate-setup.md` | Подробная архитектура NATASHA + Replicate |
| `DEPLOYMENT_CHECKLIST.md` | Этот файл — быстрый старт |
| `.env.example` | Шаблон переменных (обновлён с REPLICATE_API_TOKEN) |
| `natasha-workflow.json` | Текущий workflow (публикация + RSS) |
| `n8n-workflows/IBO_VIDEO_PIPELINE.json` | Боевой конвейер (RSS → видео → публикация) |
| `scripts/render_ibo.py` | Локальный рендер текстовых карточек |
| `scripts/deploy.sh` | Одна команда для развёртывания |

---

## FAQ

### Где я нахожусь в процессе?

- **IBO:** ✅ Готово (deploy.sh)
- **NATASHA:** 🔄 Архитектура спроектирована, ждёт реализации

### Когда включить NATASHA?

После:
1. Запуска IBO на VPS (и проверки, что работает)
2. Получения Replicate API token
3. Создания портрета НАТАШИ

Минимум 2 недели разработки и тестирования.

### Может ли NATASHA работать одновременно с IBO?

Да. Они используют разные триггеры и workflow. IBO работает по расписанию (каждые 3 часа), NATASHA — по вебхуку/Telegram.

### Что если Replicate API слишком дорого?

Fallback-варианты:
1. **Локальное Wav2Lip** на GPU Contabo (~$0.05 в месяц за GPU, бесплатно по видео)
2. **Hedra API** (~$0.05–0.3 за видео, стабильнее)
3. **Статичное видео** (портрет без движения + озвучка)

### Кто одобряет видео?

Админ Telegram-чата. Workflow ждёт клика ✅ перед публикацией.

---

## Контакты & Ссылки

- **Replicate:** https://replicate.com
- **ElevenLabs:** https://elevenlabs.io
- **n8n:** http://<VPS-IP>:5680
- **Telegram канал IBO:** @INTERNET_BEZ_GRANIC_RUS
- **Telegram бот:** (заполнить после деплоя)

---

**Статус:** Фаза 1 готова. Фаза 2 ожидает подтверждения.
