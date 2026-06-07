@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\pythonw.exe" (
    start "" /B ".venv\Scripts\pythonw.exe" desktop_app.py
) else (
    start "" /B pythonw desktop_app.py
)
