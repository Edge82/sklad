# Инструкция по деплою и запуску (GitHub)

Это приложение использует **1C:УНФ (Fresh)** через OData API. Для корректной работы на GitHub или любом другом хостинге необходимо настроить переменные окружения.

### 1. Локальный запуск
1. Склонируйте репозиторий.
2. Скопируйте файл `.env.example` в новый файл `.env`.
3. Заполните данные в `.env` (логин, пароль, URL базы).
4. Запустите `npm install` и `npm run dev`.

### 1.1. Что важно для передачи заказчику
1. Backend слушает `0.0.0.0`, поэтому к нему можно подключаться с других ПК по IP сервера.
2. Frontend по умолчанию ходит в API через относительный путь `/sklad/api`, поэтому при публикации под тем же доменом ничего менять не нужно.
3. Если frontend и backend будут на разных доменах, укажите полный адрес backend в `VITE_API_BASE_URL`.
4. Для dev-прокси можно задать `VITE_BACKEND_PROXY_TARGET`, если backend доступен не на `127.0.0.1:8000`.

### 1.2. Рекомендуемая схема передачи
1. На сервере у заказчика запускается `server.js` как отдельный сервис Node.js.
2. Frontend собирается командой `npm run build-only` и раздается nginx-ом из папки `dist`.
3. Nginx проксирует `/sklad/api` на backend и, при необходимости, `/api-1c` на 1C.
4. Пользователи открывают приложение по IP сервера или по доменному имени, а не по `localhost`.

### 1.2.1. Что это значит на практике
Если приложение работает в проде через nginx, то у заказчика будет один адрес для входа, например `http://192.168.1.50/` или `https://sklad.company.ru/`.

В этом режиме:
1. nginx отдаёт готовый фронтенд из папки `dist`.
2. nginx пересылает запросы на `/sklad/api` в backend Node.js.
3. backend уже сам ходит в 1C по адресу из `.env`.
4. Другие ПК в сети открывают только адрес сервера, а не `localhost` и не отдельные порты.

Если же запускаете через `run.bat` в разработке, тогда доступны два адреса:
1. Frontend: `http://IP_СЕРВЕРА:3000/sklad/`
2. Backend: `http://IP_СЕРВЕРА:8000/sklad/api`

Для dev-режима порты `3000` и `8000` должны быть доступны в сети и не блокироваться firewall.

### 1.2.2. Windows one-click запуск
Если заказчик работает на Windows, можно запускать `run.bat` из корня проекта.

Этот сценарий:
1. Ставит зависимости, если их нет.
2. Собирает фронтенд в production-режиме.
3. Автоматически скачивает portable nginx, если он ещё не установлен.
4. Запускает backend Node.js и nginx.
5. Открывает приложение через nginx на `http://localhost:8080/`.

Другие ПК в сети подключаются по `http://IP_СЕРВЕРА:8080/`.

### 1.2.3. Короткая инструкция для заказчика
1. Скопировать папку проекта на серверный ПК.
2. Открыть `run.bat` двойным кликом.
3. Дождаться окончания установки и сборки.
4. Открыть приложение на этом же ПК по `http://localhost:8080/`.
5. С других ПК открыть `http://IP_СЕРВЕРА:8080/`.
6. Если страница не открывается с другого ПК, проверить Windows Firewall и доступность порта `8080`.

### 1.3. Переменные окружения для production

**Для Windows сервера (run.bat):**

```env
BACKEND_PORT=8000
JWT_SECRET=сгенерируйте-сильный-секрет-32+символов
ONEC_BASE_URL=https://msk1.1cfresh.com/a/sbm/3784912/odata/standard.odata
ONEC_LOGIN=odata.user
ONEC_PASSWORD=ваш-пароль
WAREHOUSE_GUID=344cfb30-e233-11f0-862e-fa163e5c9fa8

# PRODUCTION: полный URL к бэкенду (IP сервера)
VITE_API_BASE_URL=http://192.168.10.100:8000/sklad/api

VITE_1C_BASE_URL=https://msk1.1cfresh.com/a/sbm/3784912/odata/standard.odata
VITE_1C_USERNAME=odata.user
VITE_1C_PASSWORD=ваш-пароль
VITE_1C_WAREHOUSE_GUID=344cfb30-e233-11f0-862e-fa163e5c9fa8

NODE_ENV=production
```

**Для Linux сервера (nginx + systemd):**

```env
BACKEND_PORT=8000
JWT_SECRET=сгенерируйте-сильный-секрет-32+символов
ONEC_BASE_URL=https://msk1.1cfresh.com/a/sbm/3784912/odata/standard.odata
ONEC_LOGIN=odata.user
ONEC_PASSWORD=ваш-пароль
WAREHOUSE_GUID=344cfb30-e233-11f0-862e-fa163e5c9fa8

# Relative path для nginx proxy
VITE_API_BASE_URL=/sklad/api

NODE_ENV=production
```

**Важно:**
- `VITE_API_BASE_URL` для Windows = полный URL (`http://IP:8000/sklad/api`)
- `VITE_API_BASE_URL` для Linux с nginx = относительный путь (`/sklad/api`)
- `JWT_SECRET` обязательно смените на сильный уникальный ключ

### 1.4. Пример запуска backend как systemd-сервиса

```ini
[Unit]
Description=Sklad backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/sklad
ExecStart=/usr/bin/node /opt/sklad/server.js
Restart=always
RestartSec=5
EnvironmentFile=/opt/sklad/.env

[Install]
WantedBy=multi-user.target
```

После сохранения:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sklad-backend
```

### 1.5. Пример nginx-конфига

```nginx
server {
	listen 80;
	server_name your-domain-or-ip;

	root /opt/sklad/dist;
	index index.html;

	location /sklad/api/ {
		proxy_pass http://127.0.0.1:8000/sklad/api/;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}

	location /api-1c/ {
		proxy_pass https://your-1c-host/;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto $scheme;
	}

	location / {
		try_files $uri $uri/ /index.html;
	}
}
```

### 1.6. Проверка перед сдачей
1. Открыть сайт с другого ПК в той же сети.
2. Проверить логин, просмотр складов и отчётов.
3. Проверить, что 1C-операции читаются через заданный `ONEC_BASE_URL`.
4. Убедиться, что `server.js` отвечает по сети, а не только локально.

### 2. Деплой на GitHub Pages (или Vercel/Netlify)
Поскольку приложение использует **прокси (Vite Proxy)** для обхода CORS в разработке, при деплое статического сайта в GitHub Pages прокси работать **не будет** (так как там нет Node.js сервера).

**Варианты решения для GitHub:**

#### Вариант А: Использование CORS-прокси (самый простой)
Если 1С Fresh не разрешает запросы с вашего домена GitHub Pages напрямую:
1. В настройках (Secrets) вашего репозитория на GitHub добавьте все переменные из `.env`.
2. Установите `VITE_1C_PROXY_TARGET` как пустую строку или используйте внешний cors-anywhere прокси.

#### Вариант Б: Прямое обращение (если 1С настроен)
1. В `.env` укажите полный URL в `VITE_1C_BASE_URL` (например, `https://msk1.1cfresh.com/a/sbm/3784912`).
2. Убедитесь, что в 1С разрешены CORS-запросы с вашего домена.

### Список необходимых Secret-переменных (GitHub Actions / Vercel):
- `VITE_1C_PROXY_TARGET` (Напр: `https://msk1.1cfresh.com`)
- `VITE_BACKEND_PROXY_TARGET` (Напр: `http://127.0.0.1:8000`)
- `VITE_API_BASE_URL` (Напр: `/sklad/api` для same-origin или `https://your-host/sklad/api` для отдельного backend)
- `VITE_1C_BASE_URL` (Напр: `/api-1c/a/sbm/3784912` для dev или полный URL для prod)
- `VITE_1C_USERNAME` (Ваш логин в 1С)
- `VITE_1C_PASSWORD` (Ваш пароль)
- `VITE_1C_WAREHOUSE_GUID` (GUID склада)
