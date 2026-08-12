#!/bin/sh
# ============================================================================
# docker/validate-platforms.sh — проверка токенов платформ ПЕРЕД публикацией
# (TikTok / Instagram / YouTube). Аналог validate-telegram.sh: понятные
# ошибки вместо молчаливых 401/403.
#
# Использование:
#   docker/validate-platforms.sh            # значения из .env в корне репозитория
#   TIKTOK_ACCESS_TOKEN=... INSTAGRAM_ACCESS_TOKEN=... docker/validate-platforms.sh
#
# Exit codes (суммируются по платформам):
#   0 — всё в порядке
#   1 — не задан токен/аккаунт (пусто или плейсхолдер)
#   2 — токен недействителен (401/OAuthException)
#   4 — недостаточно прав/scope (403)
#
# Требует: curl, grep, sed
# ============================================================================

set -u

# --- чтение .env из корня репозитория, если переменные не переданы ---
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
read_env() {
  if [ -n "${2:-}" ]; then
    printf '%s' "$2"
  elif [ -f "$ENV_FILE" ]; then
    grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r'
  fi
}

RESULT=0

echo "== validate-platforms: TikTok / Instagram / YouTube =="

# ---------------------------------------------------------------------------
# TikTok (Content Posting API)
# ---------------------------------------------------------------------------
TIKTOK_TOKEN=$(read_env TIKTOK_ACCESS_TOKEN "${TIKTOK_ACCESS_TOKEN:-}")
if [ -z "$TIKTOK_TOKEN" ]; then
  echo "  [1] TikTok: TIKTOK_ACCESS_TOKEN не задан (пустой)." >&2
  echo "      Публикация вернёт 401 Unauthorized. Токен: developers.tiktok.com" >&2
  echo "      → Content Posting API (скоупы video.upload, video.publish)." >&2
  RESULT=$((RESULT + 1))
elif echo "$TIKTOK_TOKEN" | grep -qiE "your-|YOUR_KEY"; then
  echo "  [1] TikTok: TIKTOK_ACCESS_TOKEN — плейсхолдер, замените на реальный." >&2
  RESULT=$((RESULT + 1))
else
  HTTP=$(curl -s -o /tmp/tiktok-check.json -w '%{http_code}' \
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id" \
    -H "Authorization: Bearer $TIKTOK_TOKEN")
  if [ "$HTTP" = "200" ]; then
    echo "  [ok] TikTok: токен валиден"
  elif [ "$HTTP" = "401" ]; then
    echo "  [2] TikTok: токен недействителен (401) — перевыпустите." >&2
    RESULT=$((RESULT + 2))
  elif [ "$HTTP" = "403" ]; then
    echo "  [4] TikTok: токен валиден, но нет нужного scope (403)." >&2
    echo "      Нужны video.upload + video.publish (одобрение приложения!)." >&2
    RESULT=$((RESULT + 4))
  else
    echo "  [3] TikTok: API недоступен (HTTP $HTTP) — повторите позже." >&2
    RESULT=$((RESULT + 3))
  fi
  rm -f /tmp/tiktok-check.json
fi

# ---------------------------------------------------------------------------
# Instagram (Graph API, Reels)
# ---------------------------------------------------------------------------
IG_TOKEN=$(read_env INSTAGRAM_ACCESS_TOKEN "${INSTAGRAM_ACCESS_TOKEN:-}")
IG_ACCOUNT=$(read_env INSTAGRAM_BUSINESS_ACCOUNT_ID "${INSTAGRAM_BUSINESS_ACCOUNT_ID:-}")
if [ -z "$IG_TOKEN" ] || [ -z "$IG_ACCOUNT" ]; then
  echo "  [1] Instagram: INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_BUSINESS_ACCOUNT_ID не заданы." >&2
  echo "      Публикация вернёт OAuthException. Токен: business.facebook.com →" >&2
  echo "      Instagram → API (long-lived Graph API token), id бизнес-аккаунта — там же." >&2
  RESULT=$((RESULT + 1))
elif echo "$IG_TOKEN" | grep -qiE "your-|YOUR_KEY"; then
  echo "  [1] Instagram: INSTAGRAM_ACCESS_TOKEN — плейсхолдер." >&2
  RESULT=$((RESULT + 1))
else
  HTTP=$(curl -s -o /tmp/ig-check.json -w '%{http_code}' \
    "https://graph.facebook.com/v21.0/$IG_ACCOUNT?fields=username&access_token=$IG_TOKEN")
  if [ "$HTTP" = "200" ]; then
    echo "  [ok] Instagram: токен и бизнес-аккаунт валидны"
  else
    ERR_CODE=$(grep -oE '"code": *[0-9]+' /tmp/ig-check.json | head -1 | grep -oE '[0-9]+')
    if [ "$ERR_CODE" = "190" ] || [ "$HTTP" = "401" ]; then
      echo "  [2] Instagram: токен недействителен/истёк (OAuthException 190)." >&2
      echo "      Перевыпустите long-lived токен (Graph API Explorer / business.facebook.com)." >&2
      RESULT=$((RESULT + 2))
    elif [ "$ERR_CODE" = "10" ]; then
      echo "  [4] Instagram: токен валиден, но нет доступа к аккаунту $IG_ACCOUNT (код 10)." >&2
      echo "      Проверьте связку бизнес-аккаунта со страницей Facebook." >&2
      RESULT=$((RESULT + 4))
    else
      echo "  [3] Instagram: Graph API ошибка (HTTP $HTTP, code ${ERR_CODE:-?}) — см. /tmp/ig-check.json" >&2
      RESULT=$((RESULT + 3))
    fi
  fi
  rm -f /tmp/ig-check.json
fi

# ---------------------------------------------------------------------------
# YouTube (OAuth2 credential в n8n — env-токена нет)
# ---------------------------------------------------------------------------
if command -v n8n >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
  # Работаем внутри n8n-контейнера: проверяем, что credential существует
  CREDS_FILE=$(mktemp) || CREDS_FILE=/tmp/n8n-creds-export.json
  if n8n export:credentials --output="$CREDS_FILE" >/dev/null 2>&1; then
    if grep -qE '"type": *"youTubeOAuth2Api"' "$CREDS_FILE" 2>/dev/null; then
      echo "  [ok] YouTube: OAuth2 credential (youTubeOAuth2Api) настроен в n8n"
    else
      echo "  [1] YouTube: OAuth2 credential (youTubeOAuth2Api) НЕ настроен в n8n." >&2
      echo "      Google OAuth настраивается в UI (credential со скоупом youtube.upload)." >&2
      RESULT=$((RESULT + 1))
    fi
    rm -f "$CREDS_FILE"
  else
    echo "  [3] YouTube: не удалось прочитать credentials n8n (свежий инстанс?)." >&2
    RESULT=$((RESULT + 3))
  fi
else
  # Вне контейнера (хост): проверить нечего — OAuth2 живёт в n8n
  echo "  [ok] YouTube: OAuth2 настраивается в n8n (UI) — на хосте не проверяется"
fi

if [ "$RESULT" -eq 0 ]; then
  echo "== validate-platforms: все платформы готовы =="
else
  echo "== validate-platforms: найдены проблемы (код $RESULT) — публикации могут падать ==" >&2
fi
exit "$RESULT"
