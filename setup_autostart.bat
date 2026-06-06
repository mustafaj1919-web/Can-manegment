@echo off
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS=%~dp0autostart.vbs

copy /Y "%VBS%" "%STARTUP%\CarShowroom.vbs" >nul

echo.
echo Done! App will start automatically on every Windows login.
echo.
echo To remove autostart, delete this file:
echo %STARTUP%\CarShowroom.vbs
echo.
pause
