#!/bin/sh
# ============================================================================
# docker/validate-telegram.sh — проверка токена Telegram ПЕРЕД публикацией.
#
# Использование (хост или контейнер):
#   docker/validate-telegram.sh                 # токен берётся из .env в корне
#   TELEGRAM_BOT_TOKEN=xxx docker/validate-telegram.sh   # или из env
#
# Exit codes:
#   0 — токен задан и бот отвечает (можно публиковать)
#   1 — токен НЕ задан (пустой)     → ясная ошибка вместо 401 Unauthorized
#   2 — токен недействителен (401)  → перевыпустить у @BotFather
#   3 — Telegram API недоступен     → повторить позже
#
# Требует: curl, grep, sed (есть и в Git Bash, и в образе n8n)
# ============================================================================

set -u

TOKEN="${TELEGRAM_BOT_TOKEN:-}"

# Если токен не передан в env — пробуем .env в корне репозитория
if [ -z "$TOKEN" ]; then
  ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
  if [ -f "$ENV_FILE" ]; then
    TOKEN=$(grep -E '^TELEGRAM_BOT_TOKEN=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r')
  fi
fi

if [ -z "$TOKEN" ]; then
  echo "❌ TELEGRAM_BOT_TOKEN не задан (пустой)." >&2
  echo "   Публикация невозможна: Telegram Bot API вернёт 401 Unauthorized." >&2
  echo "   Решение: впишите токен бота @INTERNET_BEZ_GRANIC_RUS_BOT в .env" >&2
  echo "   (получить/перевыпустить — @BotFather → /token)." >&2
  exit 1
fi

RESP_FILE=$(mktemp) || RESP_FILE=/tmp/tg-getme.json
HTTP=$(curl -s -o "$RESP_FILE" -w '%{http_code}' "https://api.telegram.org/bot${TOKEN}/getMe")

if [ "$HTTP" != "200" ]; then
  rm -f "$RESP_FILE"
  if [ "$HTTP" = "401" ]; then
    echo "❌ Токен недействителен (getMe → 401 Unauthorized)." >&2
    echo "   Бот отозван или перевыпущен — публикация не пройдёт." >&2
    echo "   Решение: перевыпустите токен у @BotFather (/token) и обновите" >&2
    echo "   TELEGRAM_BOT_TOKEN в .env, затем перезапустите стек." >&2
    exit 2
  fi
  echo "❌ Telegram API недоступен (HTTP $HTTP)." >&2
  echo "   Проверьте сеть и повторите попытку позже." >&2
  exit 3
fi

BOT=$(grep -o '"username":"[^"]*"' "$RESP_FILE" | head -1 | cut -d'"' -f4)
rm -f "$RESP_FILE"
echo "✅ Telegram-токен валиден, бот: @${BOT:-?}"
exit 0
