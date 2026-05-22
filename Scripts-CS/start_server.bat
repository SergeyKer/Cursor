@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Scripts-CS — локальный сервер с API (Помощник, Звонок)
echo.
echo ВАЖНО: для ИИ-коуча нужен npm run dev, не python http.server
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Установите Node.js и добавьте его в PATH.
  pause
  exit /b 1
)

echo Запуск: npm run dev
echo Откройте в браузере: http://localhost:3000/
echo Для остановки нажмите Ctrl+C
echo.
call npm run dev
pause
