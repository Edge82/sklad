@echo off
REM ============================================
REM SKLAD APP - DEV MODE (Windows)
REM ============================================

setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "ROOT=%~dp0"
set "NGINX_HOME=%ROOT%nginx-1.28.3"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=8080"
set "BACKEND_BASE=http://127.0.0.1:%BACKEND_PORT%"
set "API_BASE=/sklad/api"
set "APP_BASE=/"

cls
color 0A
echo.
echo ========================================
echo      SKLAD APP - DEV MODE
echo ========================================
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found
    echo Install from https://nodejs.org/
    pause
    exit /b 1
)

REM Check .env
if not exist ".env" (
    echo [*] Creating .env from .env.example...
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
        echo OK: Created .env
    ) else (
        echo ERROR: .env.example not found
        pause
        exit /b 1
    )
)

REM Install dependencies
if not exist "node_modules" (
    echo [*] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo OK: Dependencies installed
)

echo.
echo [*] Building frontend...
set "VITE_APP_BASE=%APP_BASE%"
set "VITE_API_BASE_URL=%API_BASE%"
call npm run build-only
if errorlevel 1 (
    echo ERROR: Failed to build frontend
    pause
    exit /b 1
)

echo OK: Frontend built in dist

echo.
echo [*] Preparing nginx...
call :EnsureNginx || goto :error
call :WriteNginxConf || goto :error

echo [*] Starting backend and nginx...

taskkill /IM nginx.exe /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1
timeout /T 1 /NOBREAK >nul
start "Sklad Backend" cmd /k "cd /d ""%ROOT%"" && node server/index.js"
start "Sklad Nginx" cmd /k "cd /d ""%NGINX_HOME%"" && nginx.exe -p ""%NGINX_HOME%"" -c conf\nginx.conf"

echo.
echo ========================================
echo Done.
echo Open app: http://localhost:%FRONTEND_PORT%/
echo Backend:  http://localhost:%BACKEND_PORT%/sklad/api
echo ========================================
pause
exit /b 0

:error
echo.
echo ERROR: Failed to prepare nginx
pause
exit /b 1

:EnsureNginx
if not exist "%NGINX_HOME%\nginx.exe" exit /b 1
exit /b 0

:WriteNginxConf
set "ROOT_FWD=%ROOT:\=/%"
set "DIST_DIR=%ROOT_FWD%dist"
set "NGINX_CONF=%NGINX_HOME%\conf\nginx.conf"

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
    echo             proxy_pass %BACKEND_BASE%;
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
