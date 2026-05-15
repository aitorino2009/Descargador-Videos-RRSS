@echo off
title Descargador de Videos ClipProfit
color 0E
chcp 65001 >nul

echo.
echo  ============================================
echo    ClipProfit - VIDEO DOWNLOADER
echo  ============================================
echo.

:: Comprobar si Node.js esta instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Node.js no esta instalado.
    echo.
    echo  Por favor, descargalo gratis desde:
    echo  https://nodejs.org
    echo.
    echo  Instalalo y vuelve a iniciar esta aplicacion.
    echo.
    pause
    exit /b 1
)

:: Ir a la carpeta del script
cd /d "%~dp0"

:: Cerrar procesos previos para evitar el error EADDRINUSE
taskkill /f /im node.exe >nul 2>&1

:: Instalar dependencias si no existen
if not exist "node_modules" (
    echo  [*] Instalando archivos necesarios - solo la primera vez...
    npm install --silent
    echo  [OK] Archivos instalados.
    echo.
)

echo  [OK] Abriendo el navegador automaticamente...
echo  [OK] Para cerrar el programa, cierra esta ventana.
echo.

:: Lanzar servidor
node server.js

pause
