@echo off
echo ==========================================================
echo   Launching PSG iTech Java Fleet Management Console...
echo ==========================================================

cd /d "%~dp0"
if not exist "bin" (
    echo Compiling first...
    call compile.bat
)

java -cp bin com.psgitech.transport.Main
pause
