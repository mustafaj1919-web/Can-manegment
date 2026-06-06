@echo off
cd /d %~dp0

echo [1/5] Installing Python packages...
pip install -r requirements.txt

echo [2/5] Installing Node.js packages...
cd frontend
call npm install

echo [3/5] Building frontend...
call npm run build
xcopy /E /Y ".next\static" ".next\standalone\.next\static\"
xcopy /E /Y "public" ".next\standalone\public\"
cd ..

echo [4/5] Creating folders...
mkdir "database" 2>nul
mkdir "static\uploads" 2>nul
mkdir "static\images" 2>nul
mkdir "data\backups" 2>nul
mkdir "logs" 2>nul

echo [5/5] Creating .env file...
if not exist ".env" (
    echo DATABASE_URL=sqlite:///database/showroom.db> .env
    echo SECRET_KEY=e659831d3cec0e1fcf36d9714f99bc7faadd561063e5f6096d447901c020ea37>> .env
    echo .env created OK
) else (
    echo .env already exists - skipped
)

echo.
echo Done! Run: python desktop_app.py
echo.
pause
