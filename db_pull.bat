@echo off
chcp 65001 >nul
echo ===================================
echo   سحب قاعدة البيانات من GitHub
echo ===================================
cd /d "%~dp0"
.venv\Scripts\python.exe db_pull.py
pause
