# IBO Deployment — Пошаговая инструкция

**Цель:** запустить конвейер на VPS Contabo. Время: ~10 минут.

---

## Шаг 1: Подключиться к VPS по SSH

```bash
ssh root@<VPS_IP>
# Введи пароль
```

**Если не знаешь IP:**
- Контрольная панель Contabo → Manage Cloud → VPS → IPv4 адрес

---

## Шаг 2: Клонировать репо

```bash
cd /root
git clone https://github.com/EpicStarAi/natasha-fri-studio.git
cd natasha-fri-studio
git checkout claude/news-creative-video-guide-b2iaop
```

Если не установлен git:
```bash
apt update && apt install -y git
```

---

## Шаг 3: Создать файл `.env`

```bash
cp .env.example .env
nano .env
```

**Найти и заполнить 4 строки (остальное можешь оставить как есть):**

```env
# === Anthropic / Claude ===
ANTHROPIC_API_KEY=sk-ant-v4-YOUR_KEY_HERE
# Получить: https://console.anthropic.com/account/keys

# === ElevenLabs ===
ELEVENLABS_API_KEY=your-elevenlabs-key
# Получить: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL_ID=eleven_multilingual_v2

# === Telegram ===
TELEGRAM_BOT_TOKEN=5123456789:ABCDefGHIjklmnOPqrSTUVwxyz
# Получить у @BotFather в Telegram

TELEGRAM_CHAT_ID=-1004457068141
# Получить: напиши боту /start, потом скопируй chat_id из логов
```

**Как выходить из nano:**
- `Ctrl+X` → `Y` → `Enter`

**Проверить, что заполнено:**
```bash
grep -E "ANTHROPIC_API_KEY|ELEVENLABS_API_KEY|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID" .env
```

Должны показать ключи (не `YOUR_KEY_HERE` и не `your-`).

---

## Шаг 4: Запустить деплой

```bash
./scripts/deploy.sh
```

**Что произойдёт:**
1. Проверка ключей (если что-то не заполнено — скрипт остановится)
2. Сборка Docker-образа (может занять 3–5 минут)
3. Запуск контейнеров: postgres, redis, n8n
4. Импорт workflow'ов
5. Активация IBO_VIDEO_PIPELINE

**Если видишь `✅ Готово` — всё прошло успешно!**

---

## Шаг 5: Проверить, что работает

### 5.1 Статус контейнеров

```bash
docker compose ps
```

**Должны быть в статусе `Up`:**
- postgres
- n8n
- redis

### 5.2 Логи n8n

```bash
docker compose logs -f n8n
```

**Ищи строку:** `INFO: n8n server started`

### 5.3 Доступ к UI n8n

В браузере открыть:
```
http://<VPS_IP>:5680
```

**При первом входе:**
- Создай пароль для owner-аккаунта
- n8n загрузит ключи из .env
- Всё готово

### 5.4 Проверить IBO_VIDEO_PIPELINE

В n8n UI:
- Левое меню → **Workflows**
- Найти `IBO_VIDEO_PIPELINE`
- Клик → откроется workflow
- Вверху должна быть зелёная галочка (active)

---

## Шаг 6: Первый запуск (тест без ключей)

Можешь сразу отправить тестовую новость через вебхук:

```bash
# На VPS или с локальной машины
curl -X POST http://<VPS_IP>:5680/webhook/ibo/publish \
  -H "Content-Type: application/json" \
  -d '{"topic": "новый спутник запущен в космос"}'
```

**Что произойдёт:**
- Workflow запустится
- RSS → Claude → ElevenLabs → локальный рендер → Telegram
- Видео придёт в чат TELEGRAM_CHAT_ID через ~2–3 минуты

**Если видишь видео в Telegram — работает! ✅**

---

## Шаг 7: Автоматический запуск (каждые 3 часа)

IBO_VIDEO_PIPELINE автоматически:
- Опрашивает RSS каждые 3 часа
- Выбирает топовую новость
- Генерирует видео
- Постит в Telegram-канал @INTERNET_BEZ_GRANIC_RUS

**Проверить расписание:**
1. n8n UI → IBO_VIDEO_PIPELINE
2. Нажми **Edit** (карандашик)
3. Найди узел **Schedule** (слева сверху)
4. Должно быть: `Every 3 hours`

---

## Troubleshooting

### Ошибка: `docker compose not found`

```bash
apt install -y docker-compose
# или
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Ошибка: `ANTHROPIC_API_KEY not filled`

- Отредактировать `.env`
- Проверить, что ключ не пустой: `grep ANTHROPIC_API_KEY .env`
- Перезапустить: `./scripts/deploy.sh`

### Ошибка: `Port 5680 already in use`

```bash
# Другой процесс занял порт
lsof -i :5680
# Убить процесс
kill -9 <PID>
# Попробовать заново
docker compose up -d --build
```

### Видео не приходит в Telegram

```bash
# Проверить логи
docker compose logs n8n | grep -i error | tail -20

# Проверить, что токен действительный
curl -X POST https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe
```

### n8n не поднялся за 2 минуты

```bash
# Перезапустить вручную
docker compose restart n8n
# Ждать:
docker compose logs -f n8n | grep "Server listening on"
```

---

## Что дальше?

**После 11 ноября:**
1. NATASHA формат (с ведущей)
2. Replicate Wav2Lip
3. Красивые кадры через Flux
4. Блокирующий аппрув в Telegram

**Но пока:**
- ✅ IBO работает автоматом
- ✅ Видео генерируются каждые 3 часа
- ✅ Публикуются в Telegram
- ✅ Готово к Nov 11 дедлайну

---

## Быстрая проверка всего (одна команда)

После deploy.sh, если хочешь убедиться, что всё работает:

```bash
docker compose ps && \
docker compose logs n8n | grep "Server listening" && \
curl -s http://localhost:5680/healthz && \
echo "✅ All systems operational"
```

---

**Вопросы?** Проверь логи:
```bash
docker compose logs --tail=50 n8n
```

Удачи! 🚀
