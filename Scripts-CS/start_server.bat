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
REM Миграция Excel отключена — данные правятся только по скриншотам/вручную в JSON.
REM echo Запуск миграции Excel -^> JSON...
REM python migrate_excel_to_json.py
REM if errorlevel 1 (
REM   echo Ошибка миграции. Проверьте, что файл CS_процессы_и_скрипты.xlsx в этой папке.
REM   pause
REM   exit /b 1
REM )

echo.
echo Запуск сервера на http://localhost:8080
echo Откройте в браузере: http://localhost:8080/frontend/
echo Для остановки нажмите Ctrl+C
echo.
python -m http.server 8080
pause
