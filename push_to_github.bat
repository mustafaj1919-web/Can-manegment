@echo off
cd /d "d:\System\car_showroom_management"

echo [1/6] Git config...
git config --global user.email "mustafaj1919@gmail.com"
git config --global user.name "Mustafa"

echo [2/6] Git add...
git add backend/app.py frontend/src/lib/api/backup.ts frontend/src/app/backup/page.tsx

echo [3/6] Git commit...
git commit -m "add: backup upload and restore UI"

echo [4/6] Git push...
git push origin master

echo [5/6] Killing node.exe...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [6/6] Building frontend...
cd frontend
call npm run build
xcopy /E /Y ".next\static" ".next\standalone\.next\static\" >nul
xcopy /E /Y "public" ".next\standalone\public\" >nul
cd ..

echo.
echo Done! Restart the app.
echo.
pause
