@echo off
REM ============================================
REM Сборка и запуск приложения "Склад" для Windows
REM Один запуск: зависимости -> build -> nginx -> backend
REM ============================================

setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "ROOT=%~dp0"
set "NGINX_HOME=%ROOT%nginx-1.28.3"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=8080"
set "BACKEND_BASE=http://127.0.0.1:%BACKEND_PORT%/"
set "API_BASE=/sklad/api"
set "APP_BASE=/"

cls
color 0A
echo.
echo ========================================
echo      ПРИЛОЖЕНИЕ "СКЛАД" - WINDOWS
echo ========================================
echo.

REM Проверка Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Node.js не установлен или не добавлен в PATH
    echo Установите Node.js с https://nodejs.org/
    pause
    exit /b 1
)

REM Проверка .env
if not exist ".env" (
    echo [*] Создание файла .env из .env.example...
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
        echo [OK] Создан .env
    ) else (
        echo [ОШИБКА] Не найден .env.example
        pause
        exit /b 1
    )
)

REM Установка зависимостей
if not exist "node_modules" (
    echo [*] Установка зависимостей...
    call npm install
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось установить зависимости
        pause
        exit /b 1
    )
    echo [OK] Зависимости установлены
)

echo.
echo [*] Сборка фронтенда для nginx...
set "VITE_APP_BASE=%APP_BASE%"
set "VITE_API_BASE_URL=%API_BASE%"
call npm run build-only
if errorlevel 1 (
    echo [ОШИБКА] Не удалось собрать фронтенд
    pause
    exit /b 1
)

echo [OK] Фронтенд собран в dist

echo.
echo [*] Подготовка nginx...
call :EnsureNginx || goto :error
call :WriteNginxConf || goto :error

echo [*] Запуск backend и nginx...

taskkill /IM nginx.exe /F >nul 2>&1
start "Sklad Backend" cmd /k "cd /d ""%ROOT%"" && node server/index.js"
start "Sklad Nginx" cmd /k "cd /d ""%NGINX_HOME%"" && nginx.exe -p ""%NGINX_HOME%"" -c conf\nginx.conf"

echo.
echo ========================================
echo Готово.
echo Открывайте приложение в браузере:
echo   http://localhost:%FRONTEND_PORT%/
echo.
echo Для других ПК в сети используйте:
echo   http://IP_ЭТОГО_КОМПЬЮТЕРА:%FRONTEND_PORT%/
echo.
echo Backend работает локально на %BACKEND_BASE%
echo Nginx проксирует /sklad/api на backend

echo ========================================
pause
exit /b 0

:error
echo.
echo [ОШИБКА] Не удалось подготовить nginx
pause
exit /b 1

:EnsureNginx
if not exist "%NGINX_HOME%\nginx.exe" exit /b 1

exit /b 0

:WriteNginxConf
set "ROOT_FWD=%ROOT:\=/%"
set "DIST_DIR=%ROOT_FWD%dist"
set "BACKEND_URL=%BACKEND_BASE%"
set "NGINX_CONF=%NGINX_HOME%\conf\nginx.conf"
set "NGINX_ERROR_LOG=%NGINX_HOME%\logs\error.log"

if not exist "%NGINX_HOME%\logs" md "%NGINX_HOME%\logs" >nul 2>&1
if not exist "%NGINX_HOME%\temp" md "%NGINX_HOME%\temp" >nul 2>&1

(
    echo worker_processes  1;
    echo error_log  logs/error.log info;
    echo pid        logs/nginx.pid;
    echo.
    echo events {
    echo     worker_connections  1024;
    echo }
    echo.
    echo http {
    echo     include       mime.types;
    echo     default_type   application/octet-stream;
    echo     sendfile       on;
    echo     keepalive_timeout  65;
    echo     client_max_body_size 50m;
    echo.
    echo     server {
    echo         listen       %FRONTEND_PORT%;
    echo         server_name  _;
    echo.
    echo         root   "%DIST_DIR%";
    echo         index  index.html;
    echo.
    echo         location /sklad/api/ {
    echo             proxy_pass %BACKEND_URL%;
    echo             proxy_http_version 1.1;
    echo             proxy_set_header Host $host;
    echo             proxy_set_header X-Real-IP $remote_addr;
    echo             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    echo             proxy_set_header X-Forwarded-Proto $scheme;
    echo         }
    echo.
    echo         location /api-1c/ {
    echo             proxy_pass https://msk1.1cfresh.com/;
    echo             proxy_http_version 1.1;
    echo             proxy_set_header Host $host;
    echo             proxy_set_header X-Real-IP $remote_addr;
    echo             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    echo             proxy_set_header X-Forwarded-Proto $scheme;
    echo         }
    echo.
    echo         location / {
    echo             try_files $uri $uri/ /index.html;
    echo         }
    echo     }
    echo }
) > "%NGINX_CONF%"

if errorlevel 1 exit /b 1

exit /b 0
