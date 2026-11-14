@echo off
title OlliEcode Builder & Runner
cd /d "%~dp0"

echo [1/4] Fechando instancias abertas do app...
powershell -Command "Stop-Process -Name 'olliEcode Dev' -Force -ErrorAction SilentlyContinue"

echo [2/4] Construindo CLI...
cd packages\cli
call bun run build
if %errorlevel% neq 0 (
    echo Erro ao construir o CLI!
    pause
    exit /b %errorlevel%
)

echo [3/4] Construindo Desktop (Windows x64)...
cd ..\desktop
set OPENCODE_TARGET=windows-x64
call bun run script/build.ts
if %errorlevel% neq 0 (
    echo Erro ao construir o app desktop!
    pause
    exit /b %errorlevel%
)

echo [4/4] Empacotando Electron...
call bun run script/pack.ts
if %errorlevel% neq 0 (
    echo Erro ao empacotar o app desktop!
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo  Build e empacotamento concluidos!
echo  Executavel gerado em: packages\desktop\dist\win-unpacked\olliEcode Dev.exe
echo ==========================================
pause
