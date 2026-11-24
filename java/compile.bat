@echo off
echo ==========================================================
echo   Compiling PSG iTech Java Fleet Management Console...
echo ==========================================================

cd /d "%~dp0"
if not exist "bin" mkdir bin

javac -encoding UTF-8 -d bin -sourcepath src src/com/psgitech/transport/Main.java

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Compilation completed without errors.
    echo Binaries are located in the 'bin/' folder.
) else (
    echo [ERROR] Compilation failed. Please check the error messages above.
)
pause
