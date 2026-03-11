@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Проверка Python...
python --version
if errorlevel 1 (
  echo Установите Python и добавьте его в PATH.
  pause
  exit /b 1
)

echo.
echo Запуск миграции Excel -^> JSON...
python migrate_excel_to_json.py
if errorlevel 1 (
  echo Ошибка миграции. Проверьте, что файл CS_процессы_и_скрипты.xlsx в этой папке.
  pause
  exit /b 1
)

echo.
echo Запуск сервера на http://localhost:8080
echo Откройте в браузере: http://localhost:8080/frontend/
echo Для остановки нажмите Ctrl+C
echo.
python -m http.server 8080
pause
