"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn, exec } = require("child_process");
const https = require("https");
const http = require("http");
const crypto = require("crypto");

const app = express();
const PORT = 7432;

// ─────────────────────────────────────────
//  Rutas y config
// ─────────────────────────────────────────

// Motor invisible en la carpeta temporal del sistema
const BIN_DIR = path.join(os.tmpdir(), "clipprofit_engine");
const CONFIG_FILE = path.join(os.homedir(), ".videodl_config.json");

function getYtDlpBinName() {
  if (process.platform === "win32") return "yt-dlp.exe";
  return "yt-dlp";
}

function getYtDlpPath() {
  return path.join(BIN_DIR, getYtDlpBinName());
}

let ytDlpStatus = "checking"; // checking, ready, downloading, error
let ffmpegStatus = "checking";

function getFfmpegBinName() {
  return process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
}

function getFfmpegPath() {
  return path.join(BIN_DIR, getFfmpegBinName());
}

async function checkFfmpeg() {
  if (fs.existsSync(getFfmpegPath())) {
    ffmpegStatus = "ready";
    return true;
  }
  return new Promise((resolve) => {
    exec("ffmpeg -version", (err) => {
      if (!err) {
        ffmpegStatus = "system";
        resolve(true);
      } else {
        ffmpegStatus = "missing";
        resolve(false);
      }
    });
  });
}

// ─────────────────────────────────────────
//  Funciones de Utilidad
// ─────────────────────────────────────────

function getDefaultDownloadDir() {
  const home = os.homedir();
  return path.join(home, "Videos", "Descargas Whop");
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE))
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  } catch (_) {}
  return { download_dir: getDefaultDownloadDir() };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  } catch (_) {}
}

async function downloadYtDlp() {
  if (fs.existsSync(getYtDlpPath())) {
    ytDlpStatus = "ready";
    return;
  }
  ytDlpStatus = "downloading";
  if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

  const arch = process.arch === "arm64" ? "_macos_arm64" : "";
  const urls = {
    win32: "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
    darwin: `https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp${arch}`,
    linux: "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp",
  };

  const url = urls[process.platform] || urls.linux;
  const dest = getYtDlpPath();

  console.log(` [i] Descargando yt-dlp desde: ${url}`);
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, (res2) => res2.pipe(file));
      } else {
        res.pipe(file);
      }
      file.on("finish", () => {
        file.close();
        if (process.platform !== "win32") fs.chmodSync(dest, "755");
        ytDlpStatus = "ready";
        console.log("  ✓  yt-dlp descargado.");
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      ytDlpStatus = "error";
      reject(err);
    });
  });
}

async function downloadFfmpeg() {
  const isReady = await checkFfmpeg();
  if (isReady && ffmpegStatus !== "missing") return;

  ffmpegStatus = "downloading";
  console.log(" [i] FFmpeg no detectado. Iniciando descarga del motor de medios...");
  
  const urls = {
    win32: "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffmpeg-6.1-win-64.zip",
    darwin: "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffmpeg-6.1-osx-64.zip",
    linux: "https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v6.1/ffmpeg-6.1-linux-64.zip"
  };

  const url = urls[process.platform] || urls.linux;
  const zipDest = path.join(BIN_DIR, "ffmpeg.zip");

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(zipDest);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, (res2) => res2.pipe(file));
      } else {
        res.pipe(file);
      }
      file.on("finish", () => {
        file.close();
        console.log(" [i] Extrayendo FFmpeg...");
        
        let extractCmd = "";
        if (process.platform === "win32") {
          extractCmd = `powershell -Command "Expand-Archive -Path '${zipDest}' -DestinationPath '${BIN_DIR}' -Force"`;
        } else {
          extractCmd = `unzip -o "${zipDest}" -d "${BIN_DIR}"`;
        }

        exec(extractCmd, (err) => {
          fs.unlink(zipDest, () => {});
          if (err) {
            console.error(" [X] Error extrayendo FFmpeg. Asegúrate de tener 'unzip' instalado.");
            ffmpegStatus = "error";
            reject(err);
          } else {
            if (process.platform !== "win32") fs.chmodSync(getFfmpegPath(), "755");
            ffmpegStatus = "ready";
            console.log("  ✓  FFmpeg listo.");
            resolve();
          }
        });
      });
    }).on("error", (err) => {
      fs.unlink(zipDest, () => {});
      ffmpegStatus = "error";
      reject(err);
    });
  });
}

function openFolder(folder) {
  if (process.platform === "win32") {
    spawn("explorer", [folder], { detached: true, stdio: "ignore" }).unref();
  } else if (process.platform === "darwin") {
    spawn("open", [folder], { detached: true, stdio: "ignore" }).unref();
  } else {
    // Linux Fallback
    exec(`xdg-open "${folder}"`, (err) => {
      if (err) {
        console.log(" [!] No se pudo abrir con xdg-open. Intentando terminal...");
        // Intentar abrir terminales comunes en Arch/Hyprland
        const terms = [
          `kitty --directory "${folder}"`,
          `alacritty --working-directory "${folder}"`,
          `foot -D "${folder}"`,
          `konsole --workdir "${folder}"`,
          `gnome-terminal --working-directory="${folder}"`,
          `xfce4-terminal --working-directory="${folder}"`,
          `xterm -e "cd '${folder}' && bash"`
        ];
        // Ejecutar el primer comando que funcione
        const finalCmd = terms.join(" || ");
        exec(finalCmd);
      }
    });
  }
}

// ─────────────────────────────────────────
//  Express App
// ─────────────────────────────────────────

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => res.json({ ytdlp: ytDlpStatus, ffmpeg: ffmpegStatus, isHosted }));
app.get("/api/config", (req, res) => res.json(loadConfig()));
app.post("/api/config", (req, res) => {
  saveConfig(req.body);
  res.json({ ok: true });
});

app.post("/api/info", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL requerida" });

  const proc = spawn(getYtDlpPath(), ["-j", "--no-playlist", url]);
  let stdout = "", stderr = "";
  proc.stdout.on("data", (d) => (stdout += d));
  proc.stderr.on("data", (d) => (stderr += d));
  proc.on("close", (code) => {
    if (code !== 0) return res.status(500).json({ error: stderr || "No se pudo obtener la información del vídeo" });
    try {
      const info = JSON.parse(stdout);
      res.json({
        title: info.title,
        thumbnail: info.thumbnail,
        duration: info.duration,
        uploader: info.uploader,
      });
    } catch (e) {
      res.status(500).json({ error: "Error parseando info" });
    }
  });
});

const activeDownloads = new Map();

app.post("/api/download", (req, res) => {
  const { url, mode } = req.body;
  const cfg = loadConfig();
  const downloadId = crypto.randomUUID();

  let finalDir;
  if (isHosted) {
    finalDir = path.join(SERVER_TEMP_DIR, downloadId);
  } else {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = String(now.getFullYear()).slice(-2);
    const dateStr = `${d}-${m}-${y}`;
    let platform = "Otros";
    if (url.includes("youtube.com") || url.includes("youtu.be")) platform = "YouTube";
    else if (url.includes("instagram.com")) platform = "Instagram";
    else if (url.includes("tiktok.com")) platform = "TikTok";
    finalDir = path.join(cfg.download_dir, platform, dateStr);
  }

  try { fs.mkdirSync(finalDir, { recursive: true }); } catch (_) {}

  const args = [
    "--newline", 
    "--progress", 
    "--no-playlist", 
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "--referer", "https://www.google.com/",
    "-o", path.join(finalDir, "%(title)s.%(ext)s")
  ];
  
  const ffmpegP = getFfmpegPath();
  if (ffmpegStatus === "ready" || ffmpegStatus === "system") {
    if (fs.existsSync(ffmpegP)) {
      args.push("--ffmpeg-location", ffmpegP);
    }
  }

  args.push(url);

  if (mode === "audio") {
    args.push("-x", "--audio-format", "mp3");
  } else {
    // Formato flexible compatible con Instagram, TikTok y YouTube
    args.push("-f", "b/bestvideo+bestaudio/best");
  }

  const proc = spawn(getYtDlpPath(), args);
  const state = { 
    percent: 0, 
    speed: "", 
    eta: "", 
    filename: "", 
    status: "downloading", 
    directory: finalDir,
    fullPath: null,
    downloadId
  };
  activeDownloads.set(downloadId, state);

  proc.stdout.on("data", (data) => {
    const line = data.toString();
    console.log(`[yt-dlp] ${line.trim()}`);
    const m = line.match(/(\d+\.\d+)% of .* at\s+(.*) ETA (.*)/);
    if (m) {
      state.percent = parseFloat(m[1]);
      state.speed = m[2];
      state.eta = m[3];
    }
    const destMatch = line.match(/(?:Destination:|(?:Merging formats into ")|(?:has already been downloaded)) (.*)/);
    if (destMatch) {
      let cleaned = destMatch[1].replace(/^"|"$/g, '').trim();
      state.filename = path.basename(cleaned);
      state.fullPath = cleaned;
    }
  });

  proc.stderr.on("data", (data) => {
    console.error(`[yt-dlp ERROR] ${data.toString().trim()}`);
  });

  proc.on("error", (err) => {
    console.error(`[!] Error al iniciar yt-dlp: ${err.message}`);
    state.status = "error";
    logError(err);
  });

  proc.on("close", (code) => {
    console.log(`[yt-dlp] Proceso finalizado con código ${code}`);
    state.status = (code === 0) ? "complete" : "error";
    if (code === 0) {
      state.percent = 100;
      // Si no se capturó la ruta exacta del archivo, buscarlo en finalDir
      if (!state.fullPath || !fs.existsSync(state.fullPath)) {
        try {
          const files = fs.readdirSync(finalDir).filter(f => !f.endsWith('.part') && !f.endsWith('.ytdl'));
          if (files.length > 0) {
            state.filename = files[0];
            state.fullPath = path.join(finalDir, files[0]);
          }
        } catch (_) {}
      }

      // En modo hosted, programar limpieza tras 30 minutos si el usuario no descarga
      if (isHosted) {
        setTimeout(() => {
          try {
            if (fs.existsSync(finalDir)) {
              fs.rmSync(finalDir, { recursive: true, force: true });
            }
          } catch (_) {}
        }, 30 * 60 * 1000);
      }
    }
  });

  res.json({ download_id: downloadId });
});

app.get("/api/progress/:id", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const id = req.params.id;
  const timer = setInterval(() => {
    const state = activeDownloads.get(id);
    if (!state) return;
    res.write(`data: ${JSON.stringify({ type: "progress", ...state })}\n\n`);
    if (state.status === "complete" || state.status === "error") {
      clearInterval(timer);
      res.write(`data: ${JSON.stringify({ type: state.status, ...state })}\n\n`);
      if (!isHosted) {
        setTimeout(() => activeDownloads.delete(id), 5000);
      }
    }
  }, 800);
  req.on("close", () => clearInterval(timer));
});

app.get("/api/file/:id", (req, res) => {
  const state = activeDownloads.get(req.params.id);
  if (!state || !state.fullPath || !fs.existsSync(state.fullPath)) {
    return res.status(404).json({ error: "Archivo no encontrado o expirado." });
  }

  const filename = state.filename || path.basename(state.fullPath);
  res.download(state.fullPath, filename, (err) => {
    if (err) {
      console.error(`[!] Error enviando archivo ${req.params.id}:`, err);
    }
    // En modo hosted, limpiar carpeta temporal 10 segundos después de entregar el archivo
    if (isHosted && state.directory && state.directory.startsWith(SERVER_TEMP_DIR)) {
      setTimeout(() => {
        try {
          if (fs.existsSync(state.directory)) {
            fs.rmSync(state.directory, { recursive: true, force: true });
          }
        } catch (_) {}
      }, 10000);
    }
  });
});

app.post("/api/browse-folder", (req, res) => {
  if (isHosted) return res.json({ folder: null, isHosted: true });
  let cmd = "";
  if (process.platform === "win32") {
    cmd = `powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Selecciona la carpeta de destino'; if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }"`;
  } else if (process.platform === "darwin") {
    cmd = `osascript -e 'POSIX path of (choose folder with prompt "Selecciona la carpeta de destino")'`;
  } else {
    cmd = `zenity --file-selection --directory --title="Selecciona la carpeta de destino" || kdialog --getexistingdirectory .`;
  }

  if (!cmd) return res.json({ folder: null });

  exec(cmd, (err, stdout) => {
    const folder = stdout ? stdout.trim().replace(/[/\\]$/, "") : "";
    res.json({ folder: folder || null });
  });
});

app.post("/api/open-folder", (req, res) => {
  if (isHosted) return res.json({ ok: false, error: "No disponible en modo servidor web" });
  const cfg = loadConfig();
  const folder = req.body.folder || cfg.download_dir || getDefaultDownloadDir();
  try { fs.mkdirSync(folder, { recursive: true }); } catch (_) {}
  openFolder(folder);
  res.json({ ok: true });
});

// ─────────────────────────────────────────
//  Arranque del servidor con protección
// ─────────────────────────────────────────

async function main() {
  console.log(" [i] Verificando dependencias...");
  
  try {
    await Promise.all([
      downloadYtDlp(),
      downloadFfmpeg()
    ]);
    console.log(" ====================================================");
    console.log("  ✓  Todos los motores están listos.");
  } catch (err) {
    logError(err);
    console.error(" [X] Error al preparar motores. Revisa tu conexión.");
  }
  startServer();
}

function startServer() {
  const server = http.createServer(app);
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(` [!] Puerto ${PORT} ocupado. Liberando...`);
      const cmd = process.platform === 'win32' ? `taskkill /F /FI "PID ne ${process.pid}" /IM node.exe` : `fuser -k ${PORT}/tcp`;
      exec(cmd, () => {
        setTimeout(() => server.listen(PORT, HOST), 1000);
      });
    } else {
      logError(e);
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`  🎬  CLIPPROFIT DOWNLOADER  —  Iniciando...`);
    console.log(`====================================================`);
    console.log(`  ✓  Modo: ${isHosted ? "Servidor Web (Hosted)" : "Escritorio Local"}`);
    console.log(`  ✓  Servidor escuchando en: http://${HOST}:${PORT}`);
    if (!isHosted) {
      console.log(`  ✓  El navegador se abrirá automáticamente.`);
    }
    console.log(`====================================================`);
    
    if (!isHosted) {
      const url = `http://127.0.0.1:${PORT}`;
      if (process.platform === "win32") {
        exec(`start ${url}`);
      } else if (process.platform === "darwin") {
        exec(`open ${url}`);
      } else {
        const browserCmds = [
          `xdg-open "${url}"`,
          `firefox "${url}"`,
          `google-chrome-stable "${url}"`,
          `google-chrome "${url}"`,
          `chromium "${url}"`,
          `brave "${url}"`
        ];
        exec(browserCmds.join(" || "));
      }
    }
  });
}

function logError(err) {
  const logPath = path.join(os.homedir(), "error_clipprofit.log");
  const msg = `[${new Date().toISOString()}] ERROR: ${err.stack || err}\n`;
  try { fs.appendFileSync(logPath, msg); } catch(_) {}
  console.error(msg);
}

process.on('uncaughtException', logError);
process.on('unhandledRejection', logError);

main();
