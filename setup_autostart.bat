@echo off
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set PROJECT=%~dp0

echo Set oShell = CreateObject("WScript.Shell") > "%STARTUP%\CarShowroom.vbs"
echo oShell.Run """"%PROJECT%launch.bat"""", 0, False >> "%STARTUP%\CarShowroom.vbs"

echo.
echo Done! App will start automatically on every Windows login.
echo Path: %PROJECT%
echo.
pause
