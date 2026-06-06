@echo off
cd /d "d:\System\car_showroom_management"

echo [1/4] Killing node.exe...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/4] Git pull...
git pull origin master

echo [3/4] Building frontend...
cd frontend
call npm run build
xcopy /E /Y ".next\static" ".next\standalone\.next\static\" >nul
xcopy /E /Y "public" ".next\standalone\public\" >nul
cd ..

echo.
echo Done! Restart the app.
echo.
pause
