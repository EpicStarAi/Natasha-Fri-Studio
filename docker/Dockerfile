# n8n + ffmpeg + curl
#
# Официальный образ n8n построен на «Docker Hardened Images (Alpine 3.23)»,
# в котором НЕТ apk и curl, а ffmpeg не установлен. Поэтому бинарники и
# библиотеки ffmpeg/curl берём из обычного alpine:3.23 (тот же musl 1.2.x,
# версии совместимы) и кладём в финальный образ.

FROM alpine:3.23 AS builder
RUN apk add --no-cache ffmpeg curl

FROM docker.n8n.io/n8nio/n8n:latest

USER root
# Бинарники + все разделяемые библиотеки (libav*, libcurl, libssl, libstdc++ и т.д.)
COPY --from=builder /usr/bin/ffmpeg /usr/bin/ffprobe /usr/bin/curl /usr/bin/
COPY --from=builder /usr/lib/ /usr/lib/

# Фоновое изображение НАТАШИ, которое workflow подставляет под озвучку
# (путь можно переопределить переменной NATASHA_BG_IMAGE)
COPY assets/bg.jpg /home/node/assets/bg.jpg

USER node
