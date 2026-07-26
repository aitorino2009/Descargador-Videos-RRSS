# 🧠 ENGRAM MEMORY — Descargador-Videos-RRSS

Este archivo representa el almacenamiento del contexto, arquitectura, decisiones y registro de sesiones del proyecto.

---

## 📐 Ficha Técnica del Proyecto
- **Nombre**: ClipProfit Downloader (Descargador de Videos RRSS)
- **Repositorio**: `aitorino2009/Descargador-Videos-RRSS`
- **Rama activa**: `desarrollo`
- **Versión**: `2.0.0`
- **Stack**: Node.js, Express, `yt-dlp`, `ffmpeg`, HTML5/JS Vanilla (Whop Style CSS).
- **Modos de Ejecución**:
  - **Local Desktop**: Ejecutable estático compilado con `pkg` (`Descargador-Videos-Windows.exe`).
  - **Web Server Hosted**: Servidor expuesto (`0.0.0.0`), descarga web mediante stream HTTP `/api/file/:id`.

---

## 🏛️ Decisiones de Arquitectura Registradas

### [ENGRAM-001] Transición a Servidor Web (Web Application Hosting) & Spec-Driven Framework
- **Fecha**: 26/07/2026
- **Contexto**: El usuario solicitó transformar la aplicación ejecutable de escritorio local en un servicio alojado en un servidor web/nube accesible desde cualquier dispositivo (PC, móvil, tablet), y estructurar el proyecto mediante el sistema Spec-Driven Development (`agent.md`, `engram.md`, `.agent/specs/`, `.agent/skills/`).
- **Decisiones e Implementación**:
  1. **Framework Spec-Driven**:
     - `agent.md`: Reglas del agente, protocolo Engram y flujo orientativo a especificaciones.
     - `engram.md`: Registro vivo de memoria del proyecto.
     - `.agent/specs/01-web-server-hosting.md`: Especificación técnica formal del modo servidor web.
     - `.agent/skills/web-downloader/SKILL.md`: Recetas de prueba, compilación ejecutable y despliegue Docker.
  2. **Dual Mode & Binding**:
     - Modificado `server.js` con detección automática de `HOSTED=true` / `process.env.PORT`.
     - En modo servidor web, escucha en `0.0.0.0` y no intenta abrir ventanas locales del SO.
  3. **Descarga Directa HTTP**:
     - Añadida ruta `GET /api/file/:id` que envía el vídeo/audio en cabeceras de adjunto al navegador del usuario.
     - El frontend (`index.html`) inicia automáticamente la descarga del archivo en el dispositivo del cliente.
  4. **Limpieza de Temporales**:
     - Archivos procesados en `%TEMP%/clipprofit_web_downloads` se eliminan tras 10s de entregarse o tras 30 minutos de inactividad.
  5. **Contenedorización Docker**:
     - Creado `Dockerfile` optimizado y `docker-compose.yml` para despliegue inmediato.

---

## 🎯 Estado Activo y Próximos Pasos
- **Estado Actual**: Especificación [SPEC-01](file:///c:/Users/PC/Desktop/Extractor%20youtube/Nuevo%20optimizado/Descargador-Videos-RRSS/.agent/specs/01-web-server-hosting.md) e infraestructura Spec-Driven completadas y funcionales.
- **Próximos Pasos**: Despliegue en servidor web objetivo o realización de pruebas adicionales según lo requiera el usuario.

---

## 📜 Historial de Sesiones
- **2026-07-26**: Implementación del sistema Spec-Driven Development (`agent.md`, `engram.md`, `.agent/specs/`, `.agent/skills/`) y conversión completa a aplicación servidor web alojable con Docker y descargas en navegador.
