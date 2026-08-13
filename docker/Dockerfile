# n8n + ffmpeg + curl
#
# Официальный образ n8n построен на «Docker Hardened Images (Alpine 3.23)»,
# в котором НЕТ apk и curl, а ffmpeg не установлен. Поэтому бинарники и
# библиотеки ffmpeg/curl берём из обычного alpine:3.23 (тот же musl 1.2.x,
# версии совместимы) и кладём в финальный образ.

FROM alpine:3.23 AS builder
RUN apk add --no-cache ffmpeg curl python3 py3-pillow font-dejavu

FROM docker.n8n.io/n8nio/n8n:latest

USER root
# Бинарники + все разделяемые библиотеки (libav*, libcurl, libssl, libstdc++ и т.д.)
# python3 + Pillow (stdlib и site-packages лежат в /usr/lib) — для локального
# рендерера роликов; font-dejavu — кириллический шрифт для слайдов
COPY --from=builder /usr/bin/ffmpeg /usr/bin/ffprobe /usr/bin/curl /usr/bin/
COPY --from=builder /usr/bin/python3* /usr/bin/
COPY --from=builder /usr/lib/ /usr/lib/
COPY --from=builder /usr/share/fonts/ /usr/share/fonts/

# Локальный рендерер IBO-роликов (вызывается нодой Render Local
# в IBO_VIDEO_PIPELINE вместо внешнего сервиса renderer:8080)
COPY scripts/render_ibo.py /usr/local/bin/render_ibo.py

# Фоновое изображение НАТАШИ, которое workflow подставляет под озвучку
# (путь можно переопределить переменной NATASHA_BG_IMAGE)
COPY assets/bg.jpg /home/node/assets/bg.jpg

# Бутстрап telegramApi-credential из $TELEGRAM_BOT_TOKEN при старте
# (см. docker/entrypoint.sh — идемпотентный импорт, секрет не в образе).
# Перед импортом токен проверяется docker/validate-telegram.sh (getMe),
# чтобы публикации не падали с непонятным 401 Unauthorized.
COPY docker/entrypoint.sh /docker-entrypoint-bootstrap.sh
COPY docker/validate-telegram.sh /docker/validate-telegram.sh
COPY docker/validate-platforms.sh /docker/validate-platforms.sh
RUN chmod +x /docker-entrypoint-bootstrap.sh /docker/validate-telegram.sh /docker/validate-platforms.sh
ENTRYPOINT ["tini", "--", "/docker-entrypoint-bootstrap.sh"]

USER node
