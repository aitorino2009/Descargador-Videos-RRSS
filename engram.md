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
- **Actualización Dinámica de Motor `yt-dlp`**: Mantener `yt-dlp` en su última versión mediante chequeo en segundo plano (`yt-dlp -U`) es imprescindible debido a las constantes modificaciones de algoritmos de descifrado, SABR streaming y PoTokens de YouTube.
- **Runtime Explícito de JavaScript para YouTube**: Pasar `--js-runtimes node:${process.execPath}` garantiza que `yt-dlp` siempre resuelva los desafíos de firma (`n challenge`) sin requerir Deno ni Bun externos en cualquier sistema operativo o entorno empaquetado.
- **Evitar forzar clientes `android,ios` sin PoToken**: Forzar `player_client=android,ios;player_skip=webpage` provoca `HTTP Error 403: Forbidden` en vídeos recientes de YouTube porque la plataforma exige PoToken en streams de Android. La estrategia por defecto de `yt-dlp` con runtime JS maneja los flujos modernos (visionos, web, m3u8) sin bloqueos 403.
- **Soporte de Cookies de Autenticación de YouTube**: En el servidor web (`isHosted`), si existe `cookies.txt` o la variable de entorno `YOUTUBE_COOKIES`, `yt-dlp` pasa automáticamente el argumento `--cookies cookies.txt`. Esto permite a Render autenticarse como usuario verificado y omitir las restricciones de IP de centros de datos. `cookies.txt` está incluido en `.gitignore` para proteger la privacidad del usuario.
- **Aislamiento por ID de Sesión**: Para descargas concurrentes en el servidor web, guardar cada procesamiento en una subcarpeta `%TEMP%/clipprofit_web_downloads/:downloadId` garantiza que varios usuarios no se pisen los archivos ni los nombres.
- **Ruta de Entrega HTTP Directa**: Endpoint `GET /api/file/:id` utilizando `res.download()` envía las cabeceras `Content-Disposition: attachment` forzando la descarga directa en el navegador del usuario en cualquier dispositivo (móvil, PC, tablet).
- **Extracción Fiable para Instagram y TikTok**: Añadidos flags de `--user-agent` de Chrome moderno y `--referer`, junto con la selección flexible de formato `-f b/bestvideo+bestaudio/best`. Esto evita bloqueos 403 y errores de extracción en Reels de Instagram y TikToks.
- **Detección de Binarios Híbrida**: Verificar primero `bin/${platform}/`, luego `%TEMP%/clipprofit_engine/` y finalmente el `PATH` del sistema asegura la máxima portabilidad tanto en Docker (Linux/Alpine) como en Windows local.

---

## ⚠️ 3. FALLOS COMETIDOS Y CÓMO EVITARLOS
1. **Fallo**: `HTTP Error 403: Forbidden` al 0%-2% de descarga en YouTube, junto con `WARNING: Your yt-dlp version is older than 90 days!` y `No supported JavaScript runtime could be found`.
   - **Causa**: (a) El binario `yt-dlp` descargado previamente nunca se actualizaba, quedando obsoleto frente a los ciphers de YouTube. (b) Se forzaba `--extractor-args "youtube:player_client=android,ios;player_skip=webpage"` que YouTube ahora corta con 403. (c) No se proporcionaba la ruta completa al binario de Node en `--js-runtimes`.
   - **Solución / Regla**: Añadir chequeo y actualización en segundo plano (`yt-dlp -U`), pasar `node:${process.execPath}` y usar argumentos base unificados con el selector dinámico por defecto de `yt-dlp`.
2. **Fallo**: `n challenge solving failed` seguido de `Only images are available for download` / `Requested format is not available`. Ocurre porque YouTube requiere resolver un desafío criptográfico en JavaScript (el algoritmo `n`). Sin un runtime JS especificado, YouTube oculta todos los formatos de vídeo y solo ofrece miniaturas.
   - **Solución / Regla**: Incluir `--js-runtimes node:${process.execPath}` en los argumentos globales de `yt-dlp`. Como el entorno Node.js del servidor está disponible, `yt-dlp` resuelve el `n challenge` inmediatamente y expone todos los formatos de vídeo (1080p, 720p, etc.).
2. **Fallo**: `Requested format is not available` al pedir descargas de YouTube. Ocurrió porque la cadena de formato forzaba la extensión rígida `best[ext=mp4]`, la cual no existe directamente en vídeos de alta resolución donde YouTube utiliza WebM/VP9 o flujos mixtos.
   - **Solución / Regla**: Utilizar la cadena de formato universal `b/bestvideo+bestaudio/best`. `yt-dlp` elegirá automáticamente el mejor flujo de vídeo disponible sin fallar por restricción de extensión.
2. **Fallo**: `Failed to extract any player response` al usar cookies junto con `player_skip=webpage`. El modificador `player_skip=webpage` impedía que YouTube validase los tokens de sesión de las cookies enviadas.
   - **Solución / Regla**: Evaluar `hasCookies`: si hay cookies (`hasCookies === true`), enviar `--cookies cookies.txt --extractor-args "youtube:player_client=web,android"` (con descarga de página para validar la sesión). Si no hay cookies, emplear `player_client=android,ios;player_skip=webpage`.
2. **Fallo**: `SyntaxError: Unexpected end of input` en `server.js`. Ocurrió al dejar sin cerrar el bloque `try {` de la limpieza inicial de `SERVER_TEMP_DIR` al insertar las funciones de cookies.
   - **Solución / Regla**: Ejecutar siempre `node --check server.js` localmente antes de hacer push a producción para verificar la sintaxis de JavaScript.
2. **Fallo**: `HTTP Error 429: Too Many Requests` seguido de `Sign in to confirm you’re not a bot` en Render. Ocurre porque la IP del datacenter de Render recibe un bloqueo 429 al solicitar la página HTML `youtube.com/watch?v=...`.
   - **Solución / Regla**: Incluir `--extractor-args "youtube:player_client=android,ios;player_skip=webpage"` en los argumentos de `yt-dlp`. El parámetro `player_skip=webpage` omite por completo la descarga de la página HTML, conectando directamente a las APIs nativas de Android/iOS de YouTube, eliminando el Error 429 y los desvíos antibot.
2. **Fallo**: Binarios corruptos en `/tmp` por redirecciones HTTP 302 no seguidas recursivamente por `https.get`. GitHub Releases redirige a AWS S3. Al no seguir todas las redirecciones de forma síncrona, el archivo `/tmp/clipprofit_engine/yt-dlp` quedaba corrupto o trunco, lanzando un error al invocar `spawn()`.
   - **Solución / Regla**: Creada la función `downloadFile(url, dest)` con seguimiento recursivo de redirecciones y validación estricta de tamaño (`fs.statSync().size > 1000000`) antes de permitir la ejecución de binarios.
2. **Fallo**: `Cannot GET /` en Render. Ocurrió por la eliminación accidental de `app.use(express.static(...))` al insertar funciones auxiliares.
   - **Solución / Regla**: Mantener siempre `app.use(express.static(path.join(__dirname, "public")))` y una ruta explícita `app.get("/", ...)` que entregue `index.html`.
2. **Fallo**: `No se pudo generar el archivo final en el servidor.` cuando el vídeo descargado de YouTube conservaba etiquetas de formato individual como `.f399.mp4` antes de o en ausencia de fusión por FFmpeg. La expresión regular anterior descartaba estos archivos creyendo que eran temporales.
   - **Solución / Regla**: Escanear todos los archivos válidos en `finalDir`, dar prioridad a consolidados y usar fallback al primer archivo válido limpiando la etiqueta de formato (`chosenFile.replace(/\.f\d+\./, '.')`).
2. **Fallo**: `{"error":"Archivo no encontrado o expirado."}` al descargar en Linux/Render. Ocurrió por 3 razones: (a) En Linux no existía la utilidad `unzip`, haciendo que `downloadFfmpeg()` fallase. Sin `ffmpeg`, `yt-dlp` no podía combinar pistas `bestvideo+bestaudio`. (b) `yt-dlp` elegía formatos separados sin fallback seguro. (c) El servidor marcaba estado `complete` sin verificar la presencia física del archivo final en el disco.
   - **Solución / Regla**: (1) Extracción de `ffmpeg.zip` mediante el módulo nativo de `python3` (`python3 -c "import zipfile..."`). (2) Selección adaptable de formatos (`best[ext=mp4]/bestvideo[ext=mp4]+bestaudio/best`). (3) Validación física del archivo en disco antes de marcar `complete`.
2. **Fallo**: `ReferenceError: HOST is not defined` al arrancar `startServer()`. Se debe a no declarar `const HOST` en el encabezado global de `server.js`.
   - **Solución / Regla**: Definir siempre `isHosted`, `PORT`, `HOST` y `SERVER_TEMP_DIR` al principio de `server.js` antes de cualquier función o middleware.
3. **Fallo**: Render fallaba en la fase de Build (38 segundos) porque ejecutaba automáticamente `npm run build`, y allí estaba configurado `pkg . --out-path dist`. Al no estar `pkg` instalado en el servidor de Render, el despliegue daba error `pkg: command not found`.
   - **Solución / Regla**: En `package.json`, el script `"build"` debe ser `"echo 'No build step needed'"` para que los servidores en la nube compilen sin error, y la compilación de ejecutables portátiles pasa a ser `"build:exe"`.
4. **Fallo**: Nombrar inicialmente especificaciones y habilidades en inglés (`01-web-server-hosting.md`, `web-downloader/`).
   - **Solución / Regla**: Toda spec o skill creada debe bautizarse en castellano (ej: `.agent/specs/01-alojamiento-servidor-web.md`, `.agent/skills/descargador-web/`).
5. **Fallo**: Intentar usar selectores de carpeta de sistema local cuando la app corre en un servidor remoto.
   - **Solución / Regla**: Comprobar siempre `if (isHosted)` y devolver respuesta nula o deshabilitar elementos de ruta local en la interfaz web.
6. **Fallo**: `Pkg: Error reading from file.` al abrir el ejecutable `.exe` de Windows (la ventana de CMD se abre y se cierra al instante).
   - **Causa**: Al intentar incrustar el icono `.ico` con utilidades C++ directas tipo `rcedit`, se truncaba o corrompía la carga útil (payload / VFS) que `pkg` añade al final del archivo PE (se perdían ~2MB de datos empaquetados).
   - **Solución / Regla**: Usar la biblioteca `resedit` a través de un script dedicado (`scripts/inyectar-icono.js`), la cual analiza la sección `extraData` (overlay) del ejecutable y reconstruye el binario PE manteniendo intacta la carga útil de `pkg`. En `package.json`, el script `"build:exe"` ahora ejecuta automáticamente `npx pkg . --out-path dist && node scripts/inyectar-icono.js`.
7. **Fallo**: En descargas consecutivas en modo escritorio local, el descargador devolvía y mostraba siempre una canción anterior (la primera en orden alfabético del directorio) en lugar de la nueva solicitada.
   - **Causa**: (a) En `server.js` (`proc.on("close")`), se realizaba `fs.readdirSync(finalDir)` y se asignaba ciegamente `chosenFile = mergedFiles[0]`. Dado que `readdirSync` devuelve los archivos ordenados alfabéticamente por nombre, una canción descargada previamente con una letra anterior (ej: `Jeezy...`) ocupaba perpetuamente el índice 0, sobrescribiendo por completo el `state.fullPath` y `state.filename` que `yt-dlp` había descargado correctamente. (b) En `public/index.html`, la función `showSuccess()` ejecutaba incondicionalmente `window.location.href = downloadUrl`, lo que hacía que el navegador web del usuario descargara automáticamente ese archivo antiguo en `Downloads`, dando la impresión de que no se descargaba la nueva canción.
   - **Solución / Regla**: (1) Capturar de forma precisa el destino real de `yt-dlp` en stdout mediante buffers por líneas y expresiones regulares para `Destination:`, `Merging formats into` y `has already been downloaded`. (2) En `proc.on("close")`, preservar `state.fullPath` si existe en disco y realizar chequeo de correspondencia por nombre base. (3) En el fallback de escaneo de `finalDir`, ordenar obligatoriamente por fecha de modificación descendente (`mtimeMs`), eligiendo el archivo más reciente generado desde `startTime`, jamás `files[0]`. (4) Ejecutar la descarga automática en navegador (`window.location.href`) únicamente cuando `isHosted === true`, manteniendo en local la apertura de carpeta con `Abrir carpeta de destino`.

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

### [ENGRAM-002] Carpeta del proyecto de reels y modo silencioso para agentes
- **Fecha**: 11/11/2026
- **Resumen**: Las descargas del usuario van a la carpeta del proyecto de reels de Whop para que el sistema de agentes tenga acceso siempre.
- **Detalles**:
  - `~/.videodl_config.json` → `download_dir = C:\Users\PC\Videos\Parrilla de reels Whop\descargas`. Copia previa: `~/.videodl_config.json.antes-proyecto-reels-20261111.bak`. El organizador sigue siendo `<carpeta>/<Plataforma>/<dd-mm-aa>/`.
  - `loadConfig()` acepta la variable de entorno **`DESCARGAS_DIR`**, que manda sobre la carpeta guardada.
  - **`SIN_NAVEGADOR=1`** arranca el servidor local sin abrir el navegador. Lo usa `herramientas/descargar.py` del proyecto de reels.
  - `/api/info` devuelve además `view_count`, `like_count`, `comment_count`, `upload_date`, `channel`, `webpage_url`, `description`, `track` y `artist`. Instagram no da las vistas sin sesión.
  - El valor por defecto para otros usuarios no cambia (`~/Videos/Descargas Whop`). Los ejecutables de `dist/` no llevan estos cambios hasta el próximo `npm run build:exe`, pero leen la misma configuración.

### [ENGRAM-003] Descargas simultáneas seguras (varios agentes a la vez)
- **Fecha**: 11/11/2026
- **Motivo**: varias instancias de un mismo agente tienen que poder descargar a la vez, sin esperas y sin pisarse.
- **Cambios**:
  1. **Adiós al `taskkill`.** Antes, con el puerto ocupado, `startServer()` mataba **todos** los `node.exe` (o hacía `fuser -k`), tumbando otros programas y otras instancias. Ahora:
     - `main()` comprueba primero con `consultarDescargador(PORT)` (GET `/api/status`) si ya hay un descargador abierto. Si lo hay, lo reutiliza (abre el navegador ahí, salvo con `SIN_NAVEGADOR=1`) y sale **sin preparar motores**, así que no hay `yt-dlp -U` duplicado.
     - Si aun así salta `EADDRINUSE` (dos arranques a la vez), vuelve a comprobarlo. Si es otro descargador, `exit(0)`; si es otro programa, avisa y `exit(1)` sin tocar nada.
     - Se puede usar otro puerto con `PORT`.
  2. **Carpeta privada por descarga** en local: `finalDir/.descargando-<downloadId>/`. Los `.part`, fragmentos y escaneos de respaldo solo ven esa descarga. Al terminar, el archivo se mueve a `finalDir` y la carpeta privada se borra siempre, también con error.
  3. **Nombre con el id del vídeo**: `%(title).120B_%(id)s.%(ext)s`. Dos vídeos con el mismo título ("Video by <cuenta>" en Instagram) ya no se pisan. Si el mismo vídeo llega dos veces, se reutiliza el que ya estaba y no se duplica.
- **Probado**: 4 descargas simultáneas (el mismo reel dos veces, otro reel de la misma cuenta y un audio de YouTube) en 20 s. Salieron nombres distintos, sin duplicados ni restos `.descargando-*`. El segundo arranque concurrente registró "Otro descargador ya escucha… Se reutiliza ese".

## 🎯 5. ESTADO ACTIVO
- **Memoria viva**: Actualizada con restricciones, fallos y aprendizajes.
- **Cuadernos de apuntes**: [`.agent/skills/descargador-web/SKILL.md`](file:///c:/Users/PC/Desktop/Extractor%20youtube/Nuevo%20optimizado/Descargador-Videos-RRSS/.agent/skills/descargador-web/SKILL.md)
- **Especificaciones**: [`.agent/specs/01-alojamiento-servidor-web.md`](file:///c:/Users/PC/Desktop/Extractor%20youtube/Nuevo%20optimizado/Descargador-Videos-RRSS/.agent/specs/01-alojamiento-servidor-web.md)
