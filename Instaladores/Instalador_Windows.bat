@echo off
cls
title INSTALADOR EXTRACOTR WHOP - WINDOWS
setlocal

echo [i] Verificando Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [+] Python ya esta instalado.
    pause
    exit /b
)

echo [!] Python no detectado. Iniciando instalacion automatica...
echo [i] Descargando instalador de Python (pesa unos 25MB)...

:: Descarga el instalador usando PowerShell
powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.5/python-3.11.5-amd64.exe' -OutFile 'python_installer.exe'"

echo [i] Instalando... por favor espera (esto tardara 1-2 minutos).
:: Instala de forma silenciosa y añade al PATH
start /wait python_installer.exe /quiet InstallAllUsers=1 PrependPath=1

echo [+] Instalacion completada. Limpiando archivos...
del python_installer.exe

:final
echo [+] Python ya se ha instalado. Ya puedes ejecutar la herramienta con tranquilidad.
pause