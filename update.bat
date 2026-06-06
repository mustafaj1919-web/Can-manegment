@echo off
cd /d "d:\System\car_showroom_management"
echo.
echo === Pulling latest updates from GitHub ===
git pull origin main
echo.

echo === Stopping old processes ===
taskkill /F /IM python.exe    >nul 2>&1
taskkill /F /IM pythonw.exe   >nul 2>&1
taskkill /F /IM node.exe      >nul 2>&1

echo === Waiting 2 seconds ===
timeout /t 2 /nobreak >nul

echo === Starting application ===
start "" /B ".venv\Scripts\pythonw.exe" desktop_app.py

echo.
echo Done - application updated and started
timeout /t 2 /nobreak >nul
