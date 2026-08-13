# Портрет НАТАШИ — Инструкция по загрузке

## 1. Загрузка портрета на VPS (Contabo)

### Вариант A: через `scp` (локально)

```bash
# На локальной машине
scp natasha-portrait.jpg root@<VPS-IP>:/root/Natasha-Fri-Studio/assets/natasha-portrait.jpg
```

### Вариант B: через Docker-том (на VPS в контейнере)

```bash
# На VPS в папке проекта
mkdir -p assets
# Скопировать файл в assets/natasha-portrait.jpg
ls -la assets/natasha-portrait.jpg
```

### Вариант C: через base64 (если нет ssh)

```bash
# На локальной машине — конвертировать в base64
base64 natasha-portrait.jpg > portrait.b64

# На VPS — восстановить из base64
cat portrait.b64 | base64 -d > /home/node/assets/natasha-portrait.jpg

# Проверить
file /home/node/assets/natasha-portrait.jpg
```

---

## 2. Проверка портрета в контейнере

```bash
# На VPS
docker compose exec n8n ls -lah /home/node/assets/natasha-portrait.jpg

# Если файл не виден в контейнере, проверить volume-маунт
docker compose exec n8n file /home/node/assets/natasha-portrait.jpg
```

---

## 3. Использование в Replicate Wav2Lip

Портрет передаётся как URL в n8n-workflow:

```json
{
  "version": "8bfa135c6cb53db142c94d889cb63652be270bbd4682ae0dbefd26575df4944",
  "input": {
    "face": "{{ $json.portrait_url }}",
    "audio": "{{ $json.voiceover_url }}",
    "still_mode": true,
    "pad": 10
  }
}
```

**Варианты передачи портрета:**

1. **Локальный файл в контейнере:**
   ```
   file:///home/node/assets/natasha-portrait.jpg
   ```
   (Replicate может не поддерживать file:// — нужен http-доступ)

2. **HTTPS-URL (рекомендуется):**
   ```
   https://<VPS-IP>/media/natasha-portrait.jpg
   ```
   Выложить в nginx или любой веб-сервер на VPS.

3. **Replicate Assets (если загружать портрет через их API):**
   ```
   Использовать Replicate File API для загрузки портрета один раз,
   затем получить постоянный URL для Wav2Lip.
   ```

---

## 4. Размер портрета

**Для Wav2Lip (Replicate):**
- Рекомендуемый размер: **576×1024 px** (9:16 вертикальный)
- Формат: JPG или PNG
- Максимум: ~10 MB

**Если портрет другого размера:**
```bash
# Масштабировать (на VPS в контейнере или локально)
convert natasha-portrait.jpg -resize 576x1024 natasha-portrait-resized.jpg
```

---

## 5. Тестирование портрета

После загрузки запустить тестовый Wav2Lip с коротким аудио:

```bash
# На VPS в контейнере
# 1. Скопировать портрет
docker compose cp assets/natasha-portrait.jpg n8n:/home/node/assets/

# 2. Запустить n8n-workflow с этапом Wav2Lip
# (тестовая озвучка ElevenLabs + портрет)

# 3. Проверить результат в Telegram
```

---

## 6. Параметры Replicate Wav2Lip

```json
{
  "face": "https://...natasha-portrait.jpg",
  "audio": "https://...voiceover.wav",
  "still_mode": true,              // Ведущая глаза движут, но телом не крутит
  "pad": 10,                       // Padding вокруг лица (пиксели)
  "use_float16": true,             // Ускорение (меньше памяти)
  "video_fps": 25,                 // Кадров в секунду (25 для Shorts/TikTok)
  "mel_chunks": 16                 // Длина audio-chunks для синхро
}
```

---

## 7. Стоимость использования

- **Первая загрузка портрета:** бесплатно
- **Каждый Wav2Lip (портрет + озвучка):** ~0.15 USD (480p, 4–30 сек)
- **8 видео в день:** ~$1.20

**Оптимизация:**
- Генерировать портрет один раз (Flux ~$0.03)
- Переиспользовать на все видео (Wav2Lip не переделывает портрет, только озвучивает)

---

## 8. Чек-лист перед запуском NATASHA

- [ ] Портрет загружен в `/home/node/assets/natasha-portrait.jpg`
- [ ] Файл доступен в контейнере n8n
- [ ] HTTPS-URL портрета работает (если не локальный путь)
- [ ] Replicate API token в `.env`
- [ ] Тестовая озвучка ElevenLabs готова
- [ ] Тестовый Wav2Lip запущен и видео сгенерировано

---

## 9. Troubleshooting

### Replicate отклонил портрет (NSFW filter)

```
Error: face image violates content policy
```

**Решение:**
1. Попробовать другой промпт для генерации портрета (через Flux)
2. Или загрузить другой портрет (более офисный, нейтральный)
3. Контакт Replicate support: https://replicate.com/support

### Wav2Lip видео чёрное / без синхро

```
Проверить:
- Размер портрета (должен быть 576×1024)
- Длина аудио (минимум 1 сек, максимум 30 сек)
- Качество портрета (резкий, хорошее освещение)
- Язык озвучки (ElevenLabs русский)
```

---

**Статус:** Портрет готов к использованию. Можно запускать NATASHA-workflow.
