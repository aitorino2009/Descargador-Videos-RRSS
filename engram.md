# 🧠 ENGRAM MEMORY — Descargador-Videos-RRSS

Este archivo representa la **MEMORIA LITERARIA VIVA DEL AGENTE**. Aquí se registran las restricciones críticas del proyecto, los aprendizajes adquiridos, los fallos cometidos para no repetirlos jamás y el historial continuo de decisiones de arquitectura.

---

## ⛔ 1. RESTRICCIONES IMPORTANTES
1. **Nombres de archivos en CASTELLANO**: Todos los archivos y carpetas nuevos creados en el repositorio (specs, skills, documentaciones, artifacts) DEBEN nombrarse en español (ej. `01-alojamiento-servidor-web.md`, `descargador-web/`). Solo se permiten excepciones en nombres estándar fijados por ecosistema (`engram.md`, `agent.md`, `SKILL.md`, `Dockerfile`, `docker-compose.yml`, `package.json`, `README.md`, `server.js`, `index.html`).
2. **Compatibilidad Dual**: La aplicación NUNCA debe romper su modo escritorio local ejecutable al añadir funciones de servidor web. Debe detectar automáticamente si está alojada (`HOSTED=true` / `PORT`) o en local.
3. **No ejecutar comandos nativos de sistema en modo Hosted**: En servidor web expuesto (`0.0.0.0`), NO llamar a `start`, `open`, `powershell FolderBrowserDialog` ni `xdg-open` porque provocaría fallos o congelamientos en el servidor sin interfaz gráfica.
4. **Limpieza estricta de temporales**: En modo servidor, eliminar archivos temporales inmediatamente tras servirlos por HTTP al navegador o tras TTL de seguridad para evitar llenar el disco del servidor.

---

## 🎓 2. APRENDIZAJES RECIENTES
- **Aislamiento por ID de Sesión**: Para descargas concurrentes en el servidor web, guardar cada procesamiento en una subcarpeta `%TEMP%/clipprofit_web_downloads/:downloadId` garantiza que varios usuarios no se pisen los archivos ni los nombres.
- **Ruta de Entrega HTTP Directa**: Endpoint `GET /api/file/:id` utilizando `res.download()` envía las cabeceras `Content-Disposition: attachment` forzando la descarga directa en el navegador del usuario en cualquier dispositivo (móvil, PC, tablet).
- **Extracción Fiable para Instagram y TikTok**: Añadidos flags de `--user-agent` de Chrome moderno y `--referer`, junto con la selección flexible de formato `-f b/bestvideo+bestaudio/best`. Esto evita bloqueos 403 y errores de extracción en Reels de Instagram y TikToks.
- **Detección de Binarios Híbrida**: Verificar primero `bin/${platform}/`, luego `%TEMP%/clipprofit_engine/` y finalmente el `PATH` del sistema asegura la máxima portabilidad tanto en Docker (Linux/Alpine) como en Windows local.

---

## ⚠️ 3. FALLOS COMETIDOS Y CÓMO EVITARLOS
1. **Fallo**: Nombrar inicialmente especificaciones y habilidades en inglés (`01-web-server-hosting.md`, `web-downloader/`).
   - **Solución / Regla**: Toda spec o skill creada debe bautizarse en castellano (ej: `.agent/specs/01-alojamiento-servidor-web.md`, `.agent/skills/descargador-web/`).
2. **Fallo**: Intentar usar selectores de carpeta de sistema local cuando la app corre en un servidor remoto.
   - **Solución / Regla**: Comprobar siempre `if (isHosted)` y devolver respuesta nula o deshabilitar elementos de ruta local en la interfaz web.

---

## 🏛️ 4. DECISIONES DE ARQUITECTURA REGISTRADAS

### [ENGRAM-001] Modo Servidor Web Dual & Estructura Spec-Driven
- **Fecha**: 26/07/2026
- **Resumen**: Transformación de ejecutable plano a plataforma web alojable.
- **Detalles**:
  - `server.js` escucha en `0.0.0.0` si `isHosted === true`.
  - Servido estático de frontend con descarga remota vía `/api/file/:id`.
  - Contenedorización lista con `Dockerfile` y `docker-compose.yml`.

---

## 🎯 5. ESTADO ACTIVO
- **Memoria viva**: Actualizada con restricciones, fallos y aprendizajes.
- **Cuadernos de apuntes**: [`.agent/skills/descargador-web/SKILL.md`](file:///c:/Users/PC/Desktop/Extractor%20youtube/Nuevo%20optimizado/Descargador-Videos-RRSS/.agent/skills/descargador-web/SKILL.md)
- **Especificaciones**: [`.agent/specs/01-alojamiento-servidor-web.md`](file:///c:/Users/PC/Desktop/Extractor%20youtube/Nuevo%20optimizado/Descargador-Videos-RRSS/.agent/specs/01-alojamiento-servidor-web.md)
