# 🎬 Descargador de videos universal para ClipProfit (Whop)

![Version](https://img.shields.io/badge/version-2.0.0-orange.svg)
![License](https://img.shields.io/badge/license-CC%20BY%204.0-blue.svg)

Una herramienta rápida y multiplataforma diseñada para descargar vídeos y audio de más de 1000 plataformas (YouTube, Instagram, TikTok, Twitter/X, y más) tanto en **modo ejecutable de escritorio** como **alojado en un servidor web (Hosted Cloud)**.

---

## ✨ Características Principales

- **🚀 Modo Servidor Web (Hosted Mode):** Aloja la aplicación en tu propio servidor/VPS o Docker. Cualquier usuario puede conectarse desde su navegador y descargar archivos a su dispositivo.
- **💻 Modo Escritorio Local:** Ejecutables portátiles directos que no requieren instalación.
- **🎨 Interfaz Moderna:** Diseño "Whop-style" limpio, ágil y elegante en tema oscuro con acentos naranjas.
- **🎵 Versatilidad:** Extrae Vídeo (MP4 de máxima calidad) o solo Audio (MP3).
- **🌐 Compatibilidad Total:** Soporta YouTube, Reels de Instagram, TikToks sin marca de agua y más de 1000 plataformas más.
- **🧠 Arquitectura Spec-Driven Development:** Incluye memoria del proyecto (`engram.md`), especificaciones (`.agent/specs/`) y habilidades (`.agent/skills/`).

---

## 🌐 Cómo Desplegar en Servidor Web (Docker / VPS)

### Opción 1: Docker Compose (Recomendado)
```bash
docker-compose up -d --build
```
Accede desde tu navegador a `http://TU_IP_O_DOMINIO:7432`.

### Opción 2: Node.js Directo
```bash
# Instalar dependencias
npm install

# Iniciar servidor web alojado
HOSTED=true PORT=7432 node server.js
```

---

## 💻 Cómo Usar en Modo Escritorio Local

1. Ve a la sección de [**Releases**](https://github.com/aitorino2009/Descargador-Videos-RRSS/releases).
2. Descarga el ejecutable para tu sistema operativo (`Descargador-Videos-Windows.exe`, `Descargador-Videos-MacOS` o `Descargador-Videos-Linux`).
3. Haz doble clic y empieza a descargar.

---

## 📜 Licencia

Este proyecto está bajo la licencia **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

Desarrollado por **Aitor Portales Crespí**.
