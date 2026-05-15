#!/bin/bash

clear
echo "================================================="
echo "    INSTALADOR EXTRACTOR DE VIDEOS WHOP - MAC"
echo "================================================="

if command -v python3 &> /dev/null; then
    echo "[+] Python ya está instalado. Puedes usar la herramienta con tranquilidad"
    read -sp "Presiona <Enter> para salir: " salir
else
    echo "[!] Python no detectado. Iniciando descarga..."
    
    # URL del instalador oficial de Python para Mac
    URL="https://www.python.org/ftp/python/3.11.5/python-3.11.5-macos11.pkg"
    TEMP_PKG="python_install.pkg"

    echo "[i] Descargando paquete oficial..."
    curl -L $URL -o $TEMP_PKG

    echo "[!] ATENCION: Mac te pedira tu contraseña para autorizar la instalacion."
    echo "[i] Instalando Python..."
    sudo installer -pkg $TEMP_PKG -target /

    rm $TEMP_PKG
    echo "[+] Instalacion finalizada. Ya puedes usar la herramienta con tranquilidad"
    read -sp "Presiona <Enter> para salir: " salir
fi