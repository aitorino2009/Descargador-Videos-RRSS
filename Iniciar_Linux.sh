#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "============================================"
echo "  🎬  VIDEO DOWNLOADER  —  Iniciando..."
echo "============================================"
echo ""

# Comprobar Node.js
if ! command -v node &> /dev/null; then
    echo "  ❌  Node.js no está instalado."
    echo ""
    echo "  Instálalo con tu gestor de paquetes:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  Arch:          sudo pacman -S nodejs npm"
    echo "  O desde:       https://nodejs.org"
    echo ""
    read -p "  Pulsa Enter para cerrar..."
    exit 1
fi

# Instalar dependencias si hace falta
if [ ! -d "node_modules" ]; then
    echo "  ⏳  Instalando dependencias (solo la primera vez)..."
    npm install --silent
    echo "  ✓  Dependencias instaladas."
    echo ""
fi

echo "  ✓  El navegador se abrirá automáticamente."
echo "  ✓  Para cerrar el programa, cierra esta ventana."
echo ""

node server.js
