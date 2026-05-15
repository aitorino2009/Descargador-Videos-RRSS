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

const BIN_DIR = path.join(__dirname, "bin");
const CONFIG_FILE = path.join(os.homedir(), ".videodl_config.json");

function getYtDlpBinName() {
  if (process.platform === "win32") return "yt-dlp.exe";
  if (process.platform === "darwin") return "yt-dlp_macos";
  return "yt-dlp_linux";
}

function getYtDlpPath() {
  return path.join(BIN_DIR, getYtDlpBinName());
}

function getYtDlpDownloadUrl() {
  const base =
    "https://github.com/yt-dlp/yt-dlp/releases/latest/download/";
  return base + getYtDlpBinName();
}

function getDefaultDownloadDir() {
  const home = os.homedir();
  if (process.platform === "win32")
    return path.join(home, "Videos", "Video Downloader");
  if (process.platform === "darwin")
    return path.join(home, "Movies", "Video Downloader");
  return path.join(home, "Videos", "Video Downloader");
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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf8");
  } catch (_) {}
}

function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes("youtu")) return "YouTube";
  if (u.includes("instagr")) return "Instagram";
  if (u.includes("tiktok")) return "TikTok";
  if (u.includes("twitter") || u.includes("x.com")) return "Twitter";
  if (u.includes("facebook") || u.includes("fb.watch")) return "Facebook";
  if (u.includes("vimeo")) return "Vimeo";
  if (u.includes("twitch")) return "Twitch";
  return "Otros";
}

function openBrowser(url) {
  const cmd =
    process.platform === "win32"
      ? `start ${url}`
      : process.platform === "darwin"
      ? `open ${url}`
      : `xdg-open ${url}`;
  exec(cmd);
}

function openFolder(folder) {
  const cmd =
    process.platform === "win32"
      ? `explorer "${folder}"`
      : process.platform === "darwin"
      ? `open "${folder}"`
      : `xdg-open "${folder}"`;
  exec(cmd);
}

// ─────────────────────────────────────────
//  Descarga de yt-dlp automática
// ─────────────────────────────────────────

let ytDlpReady = false;
let ytDlpStatus = "downloading"; // "downloading" | "ready" | "error"

function downloadYtDlp() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

    const destPath = getYtDlpPath();

    // Si ya existe, listo
    if (fs.existsSync(destPath)) {
      // Asegurar permisos en Unix
      if (process.platform !== "win32") {
        try { fs.chmodSync(destPath, 0o755); } catch (_) {}
      }
      ytDlpReady = true;
      ytDlpStatus = "ready";
      return resolve();
    }

    console.log("  → Descargando yt-dlp automáticamente...");
    const url = getYtDlpDownloadUrl();

    function doDownload(downloadUrl, redirectCount = 0) {
      if (redirectCount > 10) return reject(new Error("Demasiadas redirecciones"));

      const proto = downloadUrl.startsWith("https") ? https : http;
      proto.get(downloadUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          return doDownload(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }

        const tmpPath = destPath + ".tmp";
        const file = fs.createWriteStream(tmpPath);
        res.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            fs.renameSync(tmpPath, destPath);
            if (process.platform !== "win32") {
              try { fs.chmodSync(destPath, 0o755); } catch (_) {}
            }
            ytDlpReady = true;
            ytDlpStatus = "ready";
            console.log("  → yt-dlp listo ✓");
            resolve();
          });
        });
        file.on("error", (err) => {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          reject(err);
        });
      }).on("error", reject);
    }

    doDownload(url);
  });
}

// ─────────────────────────────────────────
//  Storage de descargas en curso
// ─────────────────────────────────────────

const downloads = {}; // id → { clients: [], done: false }

function sendToClients(id, data) {
  const dl = downloads[id];
  if (!dl) return;
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  dl.clients.forEach((res) => {
    try { res.write(msg); } catch (_) {}
  });
  if (data.type === "complete" || data.type === "error") {
    dl.done = true;
    dl.lastEvent = data;
    // Cerrar SSE tras un momento
    setTimeout(() => {
      dl.clients.forEach((res) => { try { res.end(); } catch (_) {} });
    }, 500);
  }
}

// ─────────────────────────────────────────
//  Middleware
// ─────────────────────────────────────────

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────
//  Rutas
// ─────────────────────────────────────────

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Estado de yt-dlp
app.get("/api/status", (req, res) => {
  res.json({ ytdlp: ytDlpStatus });
});

// Config
app.get("/api/config", (req, res) => res.json(loadConfig()));
app.post("/api/config", (req, res) => {
  const cfg = loadConfig();
  if (req.body.download_dir) cfg.download_dir = req.body.download_dir;
  saveConfig(cfg);
  res.json({ ok: true });
});

// Info del vídeo
app.post("/api/info", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL vacía" });
  if (!ytDlpReady) return res.status(503).json({ error: "yt-dlp no disponible aún" });

  const ytdlp = getYtDlpPath();
  const proc = spawn(ytdlp, [
    "--dump-json",
    "--no-playlist",
    "--no-warnings",
    "--quiet",
    url,
  ]);

  let output = "";
  let errOutput = "";
  proc.stdout.on("data", (d) => (output += d));
  proc.stderr.on("data", (d) => (errOutput += d));
  proc.on("close", (code) => {
    if (code !== 0) return res.status(400).json({ error: errOutput.trim() || "URL no válida" });
    try {
      const info = JSON.parse(output);
      res.json({
        title: info.title || "Sin título",
        thumbnail: info.thumbnail || "",
        duration: info.duration || 0,
        uploader: info.uploader || info.channel || "",
        platform: detectPlatform(url),
      });
    } catch (e) {
      res.status(500).json({ error: "Error al procesar la respuesta" });
    }
  });
});

// Iniciar descarga
app.post("/api/download", (req, res) => {
  const { url, mode = "video" } = req.body;
  if (!url) return res.status(400).json({ error: "URL vacía" });
  if (!ytDlpReady) return res.status(503).json({ error: "yt-dlp no disponible aún" });

  const cfg = loadConfig();
  const downloadDir = cfg.download_dir || getDefaultDownloadDir();
  const plat = detectPlatform(url);
  const dateStr = new Date()
    .toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, "-");
  const finalDir = path.join(downloadDir, plat, dateStr);

  try { fs.mkdirSync(finalDir, { recursive: true }); }
  catch (e) { return res.status(500).json({ error: `No se pudo crear carpeta: ${e.message}` }); }

  const id = crypto.randomUUID();
  downloads[id] = { clients: [], done: false, lastEvent: null };
  res.json({ download_id: id });

  // Argumentos de yt-dlp
  const args = [
    "--newline",
    "--no-playlist",
    "--no-warnings",
    "-o", path.join(finalDir, "%(title)s.%(ext)s"),
  ];

  if (mode === "audio") {
    args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
  } else {
    args.push("-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best");
    args.push("--merge-output-format", "mp4");
  }
  args.push(url);

  const ytdlp = getYtDlpPath();
  const proc = spawn(ytdlp, args);

  // Regex para parsear el progreso estándar de yt-dlp:
  // [download]  75.3% of    9.25MiB at    1.20MiB/s ETA 00:01
  const progressRe = /\[download\]\s+([\d.]+)%\s+of\s+~?([\d.]+\S+)\s+at\s+([\d.]+\S+\/s)\s+ETA\s+([\d:]+)/;
  const destRe = /\[download\] Destination: (.+)/;
  const mergeRe = /\[Merger\]|\[ExtractAudio\]/;

  let filename = "";

  proc.stdout.on("data", (chunk) => {
    const lines = chunk.toString().split("\n");
    for (const line of lines) {
      const pm = line.match(progressRe);
      if (pm) {
        sendToClients(id, {
          type: "progress",
          percent: parseFloat(pm[1]),
          size: pm[2],
          speed: pm[3],
          eta: pm[4],
          filename,
        });
        continue;
      }
      const dm = line.match(destRe);
      if (dm) { filename = path.basename(dm[1].trim()); continue; }
      if (mergeRe.test(line)) {
        sendToClients(id, { type: "processing", percent: 99, filename });
      }
    }
  });

  proc.stderr.on("data", (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.error("[yt-dlp stderr]", text);
  });

  proc.on("close", (code) => {
    if (code === 0) {
      sendToClients(id, {
        type: "complete",
        percent: 100,
        filename,
        directory: finalDir,
      });
    } else {
      sendToClients(id, {
        type: "error",
        message: "Error en la descarga. Comprueba que la URL sea correcta.",
      });
    }
    setTimeout(() => delete downloads[id], 60000);
  });
});

// SSE de progreso
app.get("/api/progress/:id", (req, res) => {
  const { id } = req.params;
  const dl = downloads[id];
  if (!dl) return res.status(404).json({ error: "No encontrado" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Si ya acabó, mandar el último evento y cerrar
  if (dl.done && dl.lastEvent) {
    res.write(`data: ${JSON.stringify(dl.lastEvent)}\n\n`);
    return res.end();
  }

  dl.clients.push(res);

  // Ping cada 15s para mantener conexión viva
  const ping = setInterval(() => {
    try { res.write("data: {\"type\":\"ping\"}\n\n"); } catch (_) {}
  }, 15000);

  req.on("close", () => {
    clearInterval(ping);
    dl.clients = dl.clients.filter((c) => c !== res);
  });
});

// Abrir carpeta
app.post("/api/open-folder", (req, res) => {
  const cfg = loadConfig();
  const folder = req.body.folder || cfg.download_dir || getDefaultDownloadDir();
  try { fs.mkdirSync(folder, { recursive: true }); } catch (_) {}
  openFolder(folder);
  res.json({ ok: true });
});

// ─────────────────────────────────────────
//  Arranque
// ─────────────────────────────────────────

async function main() {
  console.log("=".repeat(52));
  console.log("  🎬  VIDEO DOWNLOADER  —  Iniciando...");
  console.log("=".repeat(52));

  // Descargar yt-dlp si no existe
  try {
    await downloadYtDlp();
  } catch (err) {
    ytDlpStatus = "error";
    console.error("  ⚠  No se pudo descargar yt-dlp:", err.message);
    console.error("     La app arrancará de todas formas.");
  }

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`  ✓  Servidor en: http://127.0.0.1:${PORT}`);
    console.log("  ✓  El navegador se abrirá automáticamente.");
    console.log("  ✓  Cierra esta ventana para apagar el programa.");
    console.log("=".repeat(52));

    setTimeout(() => openBrowser(`http://127.0.0.1:${PORT}`), 1500);
  });
}

main();
