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
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      ytDlpStatus = "error";
      reject(err);
    });
  });
}

function openFolder(folder) {
  const cmd = process.platform === "win32" ? "explorer" : process.platform === "darwin" ? "open" : "xdg-open";
  spawn(cmd, [folder], { detached: true, stdio: "ignore" }).unref();
}

// ─────────────────────────────────────────
//  Express App
// ─────────────────────────────────────────

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => res.json({ ytdlp: ytDlpStatus }));
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
    if (code !== 0) return res.status(500).json({ error: stderr });
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

  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = String(now.getFullYear()).slice(-2);
  const dateStr = `${d}-${m}-${y}`;
  let platform = "Otros";
  if (url.includes("youtube.com") || url.includes("youtu.be")) platform = "YouTube";
  else if (url.includes("instagram.com")) platform = "Instagram";
  else if (url.includes("tiktok.com")) platform = "TikTok";

  const finalDir = path.join(cfg.download_dir, platform, dateStr);
  try { fs.mkdirSync(finalDir, { recursive: true }); } catch (_) {}

  const args = ["--newline", "--progress", "--no-playlist", "-o", path.join(finalDir, "%(title)s.%(ext)s"), url];
  if (mode === "audio") {
    args.push("-x", "--audio-format", "mp3");
  } else {
    args.push("-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best");
  }

  const proc = spawn(getYtDlpPath(), args);
  const state = { percent: 0, speed: "", eta: "", filename: "", status: "downloading", directory: finalDir };
  activeDownloads.set(downloadId, state);

  proc.stdout.on("data", (data) => {
    const line = data.toString();
    const m = line.match(/(\d+\.\d+)% of .* at\s+(.*) ETA (.*)/);
    if (m) {
      state.percent = parseFloat(m[1]);
      state.speed = m[2];
      state.eta = m[3];
    }
    const destMatch = line.match(/\[download\] Destination: (.*)/);
    if (destMatch) state.filename = path.basename(destMatch[1]);
  });

  proc.on("close", (code) => {
    state.status = (code === 0) ? "complete" : "error";
    if (code === 0) state.percent = 100;
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
      setTimeout(() => activeDownloads.delete(id), 5000);
    }
  }, 800);
  req.on("close", () => clearInterval(timer));
});

app.post("/api/browse-folder", (req, res) => {
  let cmd = "";
  if (process.platform === "win32") {
    cmd = `powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = 'Selecciona la carpeta de destino'; if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }"`;
  } else if (process.platform === "darwin") {
    cmd = `osascript -e 'POSIX path of (choose folder with prompt "Selecciona la carpeta de destino")'`;
  }
  exec(cmd, (err, stdout) => {
    const folder = stdout ? stdout.trim().replace(/[/\\]$/, "") : "";
    res.json({ folder: folder || null });
  });
});

app.post("/api/open-folder", (req, res) => {
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
  try {
    await downloadYtDlp();
  } catch (err) {
    ytDlpStatus = "error";
    logError(err);
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
        setTimeout(() => server.listen(PORT, "127.0.0.1"), 1000);
      });
    } else {
      logError(e);
    }
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`====================================================`);
    console.log(`  🎬  CLIPPROFIT DOWNLOADER  —  Iniciando...`);
    console.log(`====================================================`);
    console.log(`  ✓  Servidor en: http://127.0.0.1:${PORT}`);
    console.log(`  ✓  El navegador se abrirá automáticamente.`);
    console.log(`====================================================`);
    const startCmd = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
    exec(`${startCmd} http://127.0.0.1:${PORT}`);
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
