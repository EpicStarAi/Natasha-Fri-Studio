#!/bin/sh
# ============================================================================
# Деплой стека NATASHA / IBO на сервер одной командой.
#
#   ./scripts/deploy.sh
#
# Что делает:
#   1. проверяет docker + compose v2;
#   2. создаёт .env из шаблона (и останавливается, чтобы вписали ключи);
#   3. проверяет, что минимальные ключи для IBO-конвейера заполнены;
#   4. собирает и поднимает postgres + redis + n8n;
#   5. ждёт готовности n8n и импортирует workflow из n8n-workflows/;
#   6. публикует IBO_VIDEO_PIPELINE (расписание каждые 3 часа).
#
# Скрипт идемпотентен: повторный запуск обновляет образ и workflow.
# ============================================================================
set -eu

cd "$(dirname "$0")/.."

fail() { echo "❌ $1" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "docker не найден — установи Docker"
docker compose version >/dev/null 2>&1 || fail "нужен docker compose v2 (плагин compose)"

# --- .env ---
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i '/^\[TEMPLATE\]/d' .env
  echo "📝 Создан .env из шаблона. Впиши ключи и запусти скрипт снова:"
  echo "   ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID"
  exit 1
fi

need_key() {
  VAL=$(grep -E "^$1=" .env | head -1 | cut -d= -f2-)
  case "$VAL" in
    ""|*YOUR_KEY_HERE*|*your-*) fail "в .env не заполнен $1" ;;
  esac
}
need_key ANTHROPIC_API_KEY
need_key ELEVENLABS_API_KEY
need_key TELEGRAM_BOT_TOKEN
need_key TELEGRAM_CHAT_ID

# --- стек ---
echo "🐳 Сборка и запуск (postgres, redis, n8n)…"
docker compose up -d --build postgres redis n8n

echo "⏳ Жду готовности n8n…"
i=0
until docker compose exec -T n8n wget -qO- http://localhost:5678/healthz >/dev/null 2>&1; do
  i=$((i+1)); [ "$i" -gt 60 ] && fail "n8n не поднялся за 2 минуты — смотри: docker compose logs n8n"
  sleep 2
done

# --- workflow ---
echo "📦 Импорт workflow…"
docker compose exec -T n8n sh -c '
  for f in /import/workflows/*.json /import/natasha-workflow.json; do
    [ -f "$f" ] || continue
    n8n import:workflow --input="$f" >/dev/null 2>&1 \
      && echo "   [ok] $(basename "$f")" \
      || echo "   [warn] $(basename "$f") — не импортировался"
  done
'

echo "🚀 Публикация IBO_VIDEO_PIPELINE…"
WFID=$(docker compose exec -T n8n n8n list:workflow 2>/dev/null \
  | grep 'IBO_VIDEO_PIPELINE' | head -1 | cut -d'|' -f1 || true)
if [ -n "$WFID" ]; then
  docker compose exec -T n8n n8n publish:workflow --id="$WFID" >/dev/null 2>&1 || true
  docker compose restart n8n >/dev/null
  echo "   [ok] IBO_VIDEO_PIPELINE активирован (id $WFID), n8n перезапущен"
else
  echo "   [warn] IBO_VIDEO_PIPELINE не найден в списке workflow"
fi

echo ""
echo "✅ Готово. Дальше:"
echo "   • UI:      http://<ip-сервера>:5680 (при первом входе создай владельца,"
echo "     затем: docker compose restart n8n — подтянутся credentials из .env)"
echo "   • Статус:  docker compose ps"
echo "   • Логи:    docker compose logs -f n8n"
echo "   • Первый ролик IBO выйдет по расписанию (каждые 3 часа) или запусти"
echo "     workflow вручную из UI."
