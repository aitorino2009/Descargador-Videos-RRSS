@echo off
title Video Downloader
color 0A
chcp 65001 >nul

echo.
echo  ============================================
echo   🎬  VIDEO DOWNLOADER  —  Iniciando...
echo  ============================================
echo.

:: Comprobar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ❌  Node.js no está instalado.
    echo.
    echo  Por favor, descárgalo gratis desde:
    echo  https://nodejs.org
    echo.
    echo  Instálalo y vuelve a hacer doble clic aquí.
    echo.
    pause
    exit /b 1
)

:: Ir a la carpeta del script
cd /d "%~dp0"

:: Instalar dependencias si hace falta
if not exist "node_modules" (
    echo  ⏳  Instalando dependencias ^(solo la primera vez^)...
    npm install --silent
    echo  ✓  Dependencias instaladas.
    echo.
)

echo  ✓  Abriendo el navegador automáticamente...
echo  ✓  Para cerrar el programa, cierra esta ventana.
echo.

:: Lanzar servidor
node server.js

pause
