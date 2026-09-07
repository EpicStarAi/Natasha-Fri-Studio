# Replicate API Token — Интеграция с n8n

## 1. Добавить токен в `.env` на VPS

**Получить токен:** https://replicate.com/account/api-tokens

```bash
ssh root@<VPS-IP>
cd Natasha-Fri-Studio

# Отредактировать .env
nano .env

# Найти строку REPLICATE_API_TOKEN и заполнить своим токеном:
# REPLICATE_API_TOKEN=r8_<ваш-токен-здесь>
```

Или через sed:
```bash
sed -i 's/REPLICATE_API_TOKEN=.*/REPLICATE_API_TOKEN=r8_<ваш-токен>/' .env
```

## 2. Перезагрузить n8n

```bash
docker compose restart n8n
```

n8n автоматически подхватит новую переменную при старте (через `docker/entrypoint.sh`).

## 3. Проверить токен

```bash
# На VPS
curl -s -H "Authorization: Token $REPLICATE_API_TOKEN" \
  https://api.replicate.com/v1/account

# Должен вернуть JSON с данными аккаунта (email, username, name)
```

Если видишь данные аккаунта — токен работает ✅

## 4. Использование в n8n-workflow

Токен передаётся в n8n ноде HTTP Request как header:

```json
{
  "method": "POST",
  "url": "https://api.replicate.com/v1/predictions",
  "headers": {
    "Authorization": "Token {{ $env.REPLICATE_API_TOKEN }}",
    "Content-Type": "application/json"
  },
  "body": {
    "version": "model-version-id",
    "input": { "face": "...", "audio": "..." }
  }
}
```

Или через Replicate-specific credential в n8n (если добавишь интеграцию).

---

**Статус:** Токен готов к использованию. Следующий шаг — создание n8n-workflow для NATASHA.
