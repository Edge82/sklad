# Диагностика проблем подключения к 1C

## Проблема: Приложение показывает mock данные вместо реальных

### 1️⃣ Проверить переменные окружения

```bash
# Убедитесь что переменные окружения загружены из .env
cat .env

# Должны быть заполнены:
ONEC_BASE_URL=https://мск1.1cfresh.com/api-1c/a/sbm/3784912
ONEC_LOGIN=odata.user
ONEC_PASSWORD=HoroshkoUserSklad
```

### 2️⃣ Проверить логи бэкенда

```bash
# Если бэк запущен в фоне, посмотрите логи
tail -100 /tmp/backend.log

# Должны увидеть одно из двух:
# ✓ Got N items from 1C   ← Данные получены от 1C
# ⚠️ 1C unavailable         ← 1C недоступна, используется fallback
```

### 3️⃣ Проверить API статус

```bash
curl http://localhost:8000/sklad/api/1c/status
```

Возможные статусы:
- `"baseUrl": "https://..."` - значит конфиг загружен
- `"configured": true` - параметры установлены
- `"username": "odata.user"` - логин загружен из .env

### 4️⃣ Проверить доступность 1C

```bash
# Проверить доступность сервера 1C
curl -I https://msk1.1cfresh.com/api-1c/a/sbm/3784912

# Должно вернуть:
# HTTP/2 401 Unauthorized  ← OK (нужна аутентификация)
# HTTP/2 404 Not Found      ← OK (сервер доступен)
# Connection refused        ← ОШИБКА (сервер недоступен)
```

### 5️⃣ Проверить аутентификацию 1C

```bash
# Тестовый запрос с Basic Auth
ONEC_LOGIN="odata.user"
ONEC_PASSWORD="HoroshkoUserSklad"

# Создаём Base64 encoded credentials
AUTH=$(echo -n "$ONEC_LOGIN:$ONEC_PASSWORD" | base64)

# Делаем запрос
curl -i -H "Authorization: Basic $AUTH" \
  "https://мск1.1cfresh.com/api-1c/a/sbm/3784912/Catalog_КлассификаторЕдиницИзмерения"

# Возможные ответы:
# 200 OK - аутентификация работает
# 401 Unauthorized - неправильные учетные данные
# 404 Not Found - неправильный URL эндпоинта
```

## Частые ошибки и решения

| Ошибка | Причина | Решение |
|--------|---------|--------|
| `⚠️ 1C Connection Error: fetch failed` | Сервер 1C недоступен | Проверить ONEC_BASE_URL и доступность сервера |
| `⚠️ 1C API Error [401]` | Неправильные учетные данные | Проверить ONEC_LOGIN и ONEC_PASSWORD |
| `⚠️ 1C API Error [404]` | Неправильный URL эндпоинта | Проверить корректность каталогов в 1C |
| `⚠️ 1C Timeout` | Запрос длится больше 30 сек | Увеличить API_TIMEOUT или проверить сеть |
| `Error: listen EADDRINUSE` | Порт уже занят | Изменить BACKEND_PORT в .env или убить процесс |

## Логирование бэкенда

Бэк выводит подробные логи процесса синхронизации:

```
📡 Fetching 1C: Catalog_КлассификаторЕдиницИзмерения
✓ Got 3 items from 1C                    ← Успешно получено 3 элемента
⚠️ 1C Connection Error: fetch failed     ← Ошибка подключения
⚠️ 1C API Error [404]: Endpoint          ← HTTP ошибка от 1C
⚠️ 1C Timeout: request took longer...    ← Запрос занял слишком долго
ℹ️  1C unavailable, using fallback       ← Переключение на mock
✓ Sync completed                         ← Синхронизация завершена
```

## Перезагрузка приложения

Если вы изменили параметры 1C в `.env`:

```bash
# 1. Остановить бэк
pkill -f "node server.js"

# 2. (Опционально) Удалить кэш БД чтобы пересинхронизировать
rm -f .data/app.db

# 3. Запустить бэк заново
node server.js &

# 4. Проверить синхронизацию
sleep 5 && tail /tmp/backend.log
```

## Логи для отправки в поддержку

Если вам нужна помощь, предоставьте:

1. Логи бэкенда при старте
2. Результат `curl http://localhost:8000/sklad/api/1c/status`
3. Результат проверки доступности 1C
4. Используемые параметры в `.env` (без паролей)

```bash
# Собрать всю нужную информацию в один файл
{
  echo "=== Backend Config ==="
  curl -s http://localhost:8000/sklad/api/1c/status
  echo -e "\n=== Backend Logs (last 50 lines) ==="
  tail -50 /tmp/backend.log
  echo -e "\n=== Environment (без паролей) ==="
  grep -E "ONEC_BASE_URL|ONEC_LOGIN|BACKEND_PORT" .env
} > diagnostics.log

# Отправить файл в поддержку
cat diagnostics.log
```
