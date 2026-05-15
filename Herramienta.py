import os
import subprocess
import platform
import json
import sys
import shutil
import urllib.request
import zipfile
from datetime import datetime

# --- CONFIGURACIÓN DE RUTAS OCULTAS ---


def obtener_ruta_tecnica():
    """Crea y devuelve una carpeta oculta para los archivos del programa"""
    if platform.system() == "Windows":
        ruta = os.path.join(os.environ["APPDATA"], "WhopExtractor")
    else:
        ruta = os.path.join(os.path.expanduser("~"), "Library",
                            "Application Support", "WhopExtractor")

    os.makedirs(ruta, exist_ok=True)
    return ruta


# Definimos las rutas técnicas fuera de la vista del usuario
RUTA_APP = obtener_ruta_tecnica()
CONFIG_FILE = os.path.join(RUTA_APP, "config_whop.json")
BIN_FFMPEG = os.path.join(RUTA_APP, "bin_ffmpeg")


def descargar_ffmpeg():
    print(f"[i] Configurando el procesador de video...")
    urls = {
        "Windows": "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
        "Darwin": "https://evermeet.cx/ffmpeg/getrelease/zip"
    }
    sistema = platform.system()
    if sistema not in urls:
        return

    try:
        url = urls[sistema]
        archivo_zip = os.path.join(RUTA_APP, "temp_ffmpeg.zip")
        urllib.request.urlretrieve(url, archivo_zip)

        with zipfile.ZipFile(archivo_zip, 'r') as zip_ref:
            # Extraemos dentro de nuestra carpeta oculta
            zip_ref.extractall(BIN_FFMPEG)

        os.remove(archivo_zip)
        print("[+] Componentes configurados.")
    except Exception as e:
        print(f"[!] Error: {e}")


def verificar_herramientas():
    print("======================================")
    print("      INICIALIZANDO HERRAMIENTA")
    print("======================================")

    # 1. Instalar yt-dlp
    try:
        import yt_dlp
    except ImportError:
        print("[i] Instalando el motor de descarga...")
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "yt-dlp"])

    # 2. Verificar FFmpeg en la ruta oculta
    ffmpeg_ready = shutil.which(
        "ffmpeg") is not None or os.path.exists(BIN_FFMPEG)
    if not ffmpeg_ready:
        descargar_ffmpeg()


def inicializar_configuracion():
    os.system('cls' if os.name == 'nt' else 'clear')
    print("[i] CONFIGURACION DE DESCARGAS")
    if platform.system() == "Windows":
        default_path = os.path.join(
            os.environ["USERPROFILE"], "Videos", "Descargas Whop")
    else:
        default_path = os.path.join(
            os.path.expanduser("~"), "Movies", "Descargas_Whop")

    print(f"[i] Ruta sugerida: {default_path}")
    ruta = input(
        "[+] Pega aquí la ruta donde quieras guardar tus videos (<Enter> para usar la del ejemplo): ").strip()
    if not ruta:
        ruta = default_path

    os.makedirs(ruta, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump({"ruta_base": ruta}, f)


def ejecutar_descarga(url, modo, ruta_base):
    # Detectar plataforma para subcarpetas
    u = url.lower()
    plat = "YouTube" if "youtu" in u else "Instagram" if "instagr" in u else "TikTok" if "tiktok" in u else "Otros"
    ruta_final = os.path.join(
        ruta_base, plat, datetime.now().strftime("%d-%m-%Y"))
    os.makedirs(ruta_final, exist_ok=True)

    # --- MODIFICACIÓN 1: Buscar el archivo exacto de FFmpeg ---
    exe_name = "ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg"
    ffmpeg_exe_path = None

    if os.path.exists(BIN_FFMPEG):
        for root, dirs, files in os.walk(BIN_FFMPEG):
            if exe_name in files:
                ffmpeg_exe_path = os.path.join(root, exe_name)
                break

    comando = [sys.executable, "-m", "yt_dlp", "--no-warnings",
               "-o", f"{ruta_final}/%(title)s.%(ext)s"]

    # --- MODIFICACIÓN 2: Usar la ruta exacta del ejecutable ---
    if ffmpeg_exe_path:
        comando += ["--ffmpeg-location", ffmpeg_exe_path]

    if modo == "video":
        # --- MODIFICACIÓN 3: Cambiado bv*+ba/b por bestvideo+bestaudio/best ---
        comando += ["-f", "bestvideo+bestaudio/best",
                    "--merge-output-format", "mp4"]
    elif modo == "audio":
        comando += ["-x", "--audio-format", "mp3", "--audio-quality", "0"]

    comando.append(url)
    try:
        print("\n[i] Iniciando descarga...")
        subprocess.run(comando, check=True)
        print("\n[+] El video se ha descargado correctamente...")
    except Exception as e:
        print(f"\n[!] Error: {e}")


def menu():
    verificar_herramientas()

    while True:
        # Forzamos la lectura del config en cada repetición del bucle
        if not os.path.exists(CONFIG_FILE):
            inicializar_configuracion()

        with open(CONFIG_FILE, "r") as f:
            config_data = json.load(f)
            ruta_base = config_data["ruta_base"]

        os.system('cls' if os.name == 'nt' else 'clear')
        print("==========================================")
        print("        EXTRACTOR DE VIDEOS WHOP")
        print("==========================================")
        print(f"[i] Destino: {ruta_base}")
        print("------------------------------------------")
        print("1. Descargar VIDEO")
        print("2. Descargar AUDIO (MP3)")
        print("3. Cambiar carpeta de destino")
        print("4. Salir")

        opc = input("\n[+] Selecciona: ")

        if opc == "4":
            break

        if opc == "3":
            if os.path.exists(CONFIG_FILE):
                os.remove(CONFIG_FILE)
            # Al eliminarlo, en la siguiente vuelta del bucle entrará
            # automáticamente en inicializar_configuracion()
            continue

        url = input("[+] Enlace: ").strip()
        if url:
            if opc == "1":
                ejecutar_descarga(url, "video", ruta_base)
            elif opc == "2":
                ejecutar_descarga(url, "audio", ruta_base)
            input("\n[i] Intro para volver...")


if __name__ == "__main__":
    menu()
