import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NtExecutable, NtExecutableResource, Data, Resource } from "resedit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

async function main() {
  const distDir = path.join(rootDir, "dist");
  const exePath = path.join(distDir, "video-downloader-win.exe");
  const iconPath = path.join(rootDir, "ClipProfit.ico");
  const destExePath = path.join(distDir, "Descargador-Videos-Windows.exe");

  if (fs.existsSync(exePath)) {
    console.log("Leyendo ejecutable base:", exePath);
    const exeData = fs.readFileSync(exePath);
    const exe = NtExecutable.from(exeData);
    const res = NtExecutableResource.from(exe);

    if (fs.existsSync(iconPath)) {
      console.log("Cargando icono:", iconPath);
      const iconData = fs.readFileSync(iconPath);
      const iconFile = Data.IconFile.from(iconData);

      console.log("Reemplazando recursos de icono...");
      Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        1,
        1033,
        iconFile.icons.map((item) => item.data)
      );

      console.log("Generando binario PE con preservación de payload...");
      res.outputResource(exe);
      const newExeBuffer = Buffer.from(exe.generate());
      console.log(`Tamaño original: ${exeData.length} bytes -> Tamaño final: ${newExeBuffer.length} bytes`);
      fs.writeFileSync(destExePath, newExeBuffer);
    } else {
      fs.copyFileSync(exePath, destExePath);
    }
    try { fs.unlinkSync(exePath); } catch (_) {}
    console.log("✓ Guardado correctamente en:", destExePath);
  }

  // Linux
  const linuxSrc = path.join(distDir, "video-downloader-linux");
  const linuxDest = path.join(distDir, "Descargador-Videos-Linux");
  if (fs.existsSync(linuxSrc)) {
    fs.copyFileSync(linuxSrc, linuxDest);
    try { fs.unlinkSync(linuxSrc); } catch (_) {}
    console.log("✓ Generado:", linuxDest);
  }

  // MacOS
  const macSrc = path.join(distDir, "video-downloader-macos");
  const macDest = path.join(distDir, "Descargador-Videos-MacOS");
  if (fs.existsSync(macSrc)) {
    fs.copyFileSync(macSrc, macDest);
    try { fs.unlinkSync(macSrc); } catch (_) {}
    console.log("✓ Generado:", macDest);
  }

  // Limpiar posibles archivos de pruebas
  const testExe = path.join(distDir, "test-build.exe");
  if (fs.existsSync(testExe)) {
    try { fs.unlinkSync(testExe); } catch (_) {}
  }
}

main().catch((err) => {
  console.error("Error aplicando icono:", err);
  process.exit(1);
});
