#!/bin/sh
# ============================================================================
# n8n entrypoint wrapper (NATASHA stack)
#
# Перед стартом n8n импортирует telegramApi-credential из переменной
# окружения TELEGRAM_BOT_TOKEN. Это делает стек «рабочим из коробки»:
# ноды Telegram в workflow ссылаются на credential qrEvH4ZaW6Kfuxj3,
# поэтому импорт идёт под этим же id (upsert — повторный запуск безопасен,
# токен просто обновляется, дубликатов не создаётся).
#
# Секрет не попадает ни в репозиторий, ни в образ — токен живёт только в
# .env хоста (gitignored) и в рантайм-переменной контейнера.
#
# Примечание: на полностью свежем инстансе (пустой volume, ещё нет owner)
# импорт молча пропускается — он отработает после настройки владельца в UI
# и перезапуска контейнера.
# ============================================================================

# Проверяем токен ПЕРЕД импортом: пустой/недействительный токен не импортируем
# (иначе публикации будут падать с непонятным 401 Unauthorized).
/docker/validate-telegram.sh
VALIDATE_RC=$?

if [ "$VALIDATE_RC" -eq 0 ]; then
  BOOTSTRAP_JSON=$(mktemp) || BOOTSTRAP_JSON=/tmp/telegram-credential.json
  cat > "$BOOTSTRAP_JSON" <<EOF
[
  {
    "id": "qrEvH4ZaW6Kfuxj3",
    "name": "INTERNET_BEZ_GRANIC_BOT",
    "type": "telegramApi",
    "data": { "accessToken": "$TELEGRAM_BOT_TOKEN" }
  }
]
EOF
  n8n import:credentials --input="$BOOTSTRAP_JSON" >/dev/null 2>&1 || true
  rm -f "$BOOTSTRAP_JSON"
else
  echo "⚠️  Telegram-бот не настроен (см. ошибку выше) — публикации в канал будут падать." >&2
  echo "    n8n продолжит работу; исправьте токен и перезапустите контейнер." >&2
fi

exec /docker-entrypoint.sh "$@"
