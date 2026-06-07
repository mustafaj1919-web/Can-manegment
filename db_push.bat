@echo off
chcp 65001 >nul
echo ===================================
echo   رفع قاعدة البيانات على GitHub
echo ===================================
cd /d "%~dp0"
.venv\Scripts\python.exe db_push.py
pause
