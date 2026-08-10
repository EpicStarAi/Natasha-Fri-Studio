#!/bin/sh
# ============================================================================
# n8n entrypoint wrapper (NATASHA stack)
#
# Перед стартом n8n импортирует credentials из переменных окружения.
# Каждый credential импортируется под ФИКСИРОВАННЫМ id — тем же, на который
# ссылаются workflow (импортированные из ai-evo-n8n или из n8n-workflows/),
# поэтому ноды линкуются автоматически. Импорт идемпотентен (upsert по id):
# повторный старт просто обновляет значения, дубликатов не создаётся.
#
# Секреты не попадают ни в репозиторий, ни в образ — значения живут только
# в .env хоста (gitignored) и в рантайм-переменных контейнера.
#
# На свежем инстансе (пустой volume, ещё нет owner) импорт молча
# пропускается — он отработает после настройки владельца в UI и рестарта.
# ============================================================================

import_credential() {
  CRED_ID="$1"
  CRED_NAME="$2"
  CRED_TYPE="$3"
  CRED_FIELD="$4"
  ENV_VAR="$5"

  VALUE=$(eval "printf '%s' \"\$$ENV_VAR\"")
  if [ -z "$VALUE" ]; then
    echo "   [skip] $CRED_NAME ($CRED_TYPE): $ENV_VAR не задан"
    return 0
  fi

  BOOTSTRAP_JSON=$(mktemp) || BOOTSTRAP_JSON=/tmp/n8n-credential-${CRED_ID}.json
  cat > "$BOOTSTRAP_JSON" <<EOF
[
  {
    "id": "$CRED_ID",
    "name": "$CRED_NAME",
    "type": "$CRED_TYPE",
    "data": { "$CRED_FIELD": "$VALUE" }
  }
]
EOF
  if n8n import:credentials --input="$BOOTSTRAP_JSON" >/dev/null 2>&1; then
    echo "   [ok]   $CRED_NAME ($CRED_TYPE) из $ENV_VAR"
  else
    echo "   [warn] $CRED_NAME: импорт не удался (свежий инстанс без owner?)"
  fi
  rm -f "$BOOTSTRAP_JSON"
}

echo "== n8n bootstrap: credentials из env =="

# Telegram-бот: сначала валидация токена (getMe), чтобы не импортировать
# пустой/битый токен — иначе публикации падают с 401 Unauthorized.
/docker/validate-telegram.sh
VALIDATE_RC=$?
if [ "$VALIDATE_RC" -eq 0 ]; then
  import_credential qrEvH4ZaW6Kfuxj3 "INTERNET_BEZ_GRANIC_BOT" telegramApi accessToken TELEGRAM_BOT_TOKEN
else
  echo "   [warn] Telegram-бот не настроен (см. ошибку выше) — публикации в канал будут падать"
fi

# Claude / Anthropic (используется IBO_VIDEO_PIPELINE и чатом платформы)
import_credential zrqLfRKuk5HbthfB "Anthropic account" anthropicApi apiKey ANTHROPIC_API_KEY

# Bearer-токен MCP-сервера (n8n-MCP-Server)
import_credential 9ItBJick4ya1QLwx "Bearer Auth account" httpBearerAuth token N8N_MCP_AUTH_TOKEN

# OpenAI (Bearer-токен)
import_credential w6kgstKycA9LjEKZ "OpenAI Bearer Token" httpBearerAuth token OPENAI_API_KEY

echo "== bootstrap done =="

exec /docker-entrypoint.sh "$@"
