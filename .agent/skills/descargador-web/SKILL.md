---
name: descargador-web
description: Apuntes, recetas e instrucciones para ejecutar, probar, compilar y desplegar el descargador en modo escritorio local o en servidor web remoto (Docker / VPS).
---

# 📔 Cuaderno de Apuntes: Descargador de Vídeos ClipProfit (Gestión y Despliegue)

Este cuaderno de apuntes documenta los flujos de trabajo clave para probar, compilar y desplegar el **Descargador de Vídeos ClipProfit**.

---

## 💻 1. Ejecución Local (Modo Escritorio)

```bash
# Iniciar servidor en modo escritorio local
npm start
```
- Escucha en `http://127.0.0.1:7432`.
- Abre el navegador del sistema automáticamente.
- Guarda las descargas directamente en la carpeta elegida localmente.

---

## 🌐 2. Ejecución en Modo Servidor Web (Hosted Mode)

```powershell
# PowerShell (Windows)
$env:HOSTED="true"; node server.js
```

```bash
# Bash (Linux / macOS / VPS)
HOSTED=true PORT=7432 node server.js
```
- Escucha en `0.0.0.0` para aceptar conexiones remotas desde cualquier dispositivo.
- Desactiva el auto-arranque de navegador en la máquina servidor.
- Transfiere el contenido directamente al navegador del usuario vía `GET /api/file/:id`.

---

## 🐳 3. Despliegue con Docker

### Construir Imagen Docker
```bash
docker build -t clipprofit-downloader .
```

### Ejecutar Contenedor
```bash
docker run -d -p 7432:7432 --name clipprofit clipprofit-downloader
```

### O usar Docker Compose
```bash
docker-compose up -d --build
```

---

## 📦 4. Compilar Ejecutable Portátil de Escritorio

```bash
npm run build:exe
```
Genera los ejecutables nativos en `dist/`:
- `Descargador-Videos-Windows.exe`
- `Descargador-Videos-MacOS`
- `Descargador-Videos-Linux`
