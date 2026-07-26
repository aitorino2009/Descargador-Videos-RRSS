# 📄 ESPEC-01: Transformación a Servidor Web Remoto (Modo Alojado)

- **ID**: ESPEC-01
- **Título**: Transformación de Aplicación de Escritorio Local a Servidor Web Remoto Alojable
- **Fecha**: 2026-07-26
- **Estado**: Implementado / En Verificación

---

## 🎯 1. Objetivo
Permitir que el descargador de vídeos funcione como un servicio web completo alojado en un servidor remoto (VPS, Docker, Cloud como Render/Railway/Fly.io) donde cualquier usuario puede conectarse desde su dispositivo (PC, smartphone, tablet), procesar enlaces de más de 1000 plataformas y descargar el vídeo o audio directamente a su almacenamiento local mediante el navegador.

---

## 📋 2. Requisitos

### Requisitos Funcionales
1. **Detección Automática de Entorno (Modo Dual)**:
   - Si `process.env.HOSTED === "true"`, `NODE_ENV === "production"` o existe `process.env.PORT`, activar **Modo Servidor Web Alojado**.
   - En caso contrario, mantener **Modo Escritorio Local**.

2. **Binding de Red Dinámico**:
   - Escuchar en `0.0.0.0` cuando esté en modo Servidor.
   - Escuchar en `127.0.0.1` cuando esté en modo Escritorio.
   - Utilizar `process.env.PORT || 7432`.

3. **Descarga y Transferencia HTTP Directa**:
   - Endpoint `GET /api/file/:id`.
   - Cuando la descarga en el servidor finalice (`100%`), el servidor entrega el archivo final mediante la respuesta HTTP `res.download()`.
   - La interfaz web activa automáticamente la descarga en el navegador del usuario al completarse el procesamiento.

4. **Gestión y Limpieza de Almacenamiento en Servidor**:
   - Las descargas en modo servidor se aíslan en carpetas temporales por ID (`%TEMP%/clipprofit_web_downloads/:downloadId`).
   - Los archivos temporales en el servidor se eliminan automáticamente 10 segundos después de enviarse al usuario, o tras 30 minutos por inactividad.

5. **Adaptación de la Interfaz Web (Frontend)**:
   - Cuando `isHosted === true`, el frontend oculta la selección de ruta local en disco del servidor.
   - Muestra un botón de descarga directa: **"📥 Guardar en mi dispositivo"**.

6. **Facilidad de Despliegue**:
   - Proveer `Dockerfile` y `docker-compose.yml` para despliegues en 1-clic con Node.js, `yt-dlp` y `ffmpeg` preinstalados.

---

## 🛠️ 3. Especificación de Endpoints API

### `GET /api/status`
**Respuesta:**
```json
{
  "ytdlp": "ready",
  "ffmpeg": "ready",
  "isHosted": true
}
```

### `POST /api/download`
**Cuerpo:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "mode": "video" | "audio"
}
```
**Respuesta:**
```json
{
  "download_id": "uuid-v4-cadena"
}
```

### `GET /api/file/:id`
Transfiere el archivo procesado al cliente con la cabecera `Content-Disposition: attachment; filename="<titulo>.<ext>"`.

---

## 🧪 4. Plan de Verificación

1. **Verificación en Desarrollo (Simulación Servidor)**:
   - Ejecutar `$env:HOSTED="true"; node server.js`.
   - Probar descarga desde `http://localhost:7432`.
   - Verificar que el navegador descarga el archivo `.mp4`/`.mp3` al dispositivo.
   - Confirmar que la carpeta temporal en el servidor se limpia tras la transferencia.
2. **Verificación en Modo Escritorio**:
   - Ejecutar `node server.js` sin variables de entorno.
   - Verificar que funciona guardando en la carpeta local seleccionada.
