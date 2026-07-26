# 🤖 Protocolo del Agente y Especificaciones del Proyecto

Bienvenido al sistema de desarrollo del **Descargador de Vídeos ClipProfit**. Este proyecto sigue un protocolo estricto de Memoria, Cuadernos de Apuntes (Skills) y Desarrollo Orientado a Especificaciones (Spec-Driven Development).

---

## 🧠 1. Memoria Viva (`engram.md`)
- El archivo [`engram.md`](file:///c:/Users/PC/Desktop/Extractor%20youtube/Nuevo%20optimizado/Descargador-Videos-RRSS/engram.md) es **LITERAMENTE LA MEMORIA DEL AGENTE**.
- En `engram.md` se anotan obligatoriamente:
  - **Restricciones importantes** del proyecto y del usuario.
  - **Aprendizajes recientes** técnicos y de arquitectura.
  - **Fallos cometidos** y lecciones aprendidas para no volver a repetirlos jamás.
  - Estado activo, historial de decisiones y memoria de sesión.
- Al iniciar cualquier tarea o sesión, se consulta e incrementa `engram.md`.

---

## 📓 2. Cuadernos de Apuntes (`.agent/skills/`)
- Las *Skills* ubicadas en [`.agent/skills/`](file:///c:/Users/PC/Desktop/Extractor%20youtube/Nuevo%20optimizado/Descargador-Videos-RRSS/.agent/skills/) son el **cuaderno de apuntes** del agente.
- Contienen recetas de comandos, flujos de prueba, guías de despliegue y notas reutilizables sobre la construcción del proyecto.

---

## 📄 3. Desarrollo Orientado a Especificaciones (`.agent/specs/`)
- Todo cambio significativo o nueva funcionalidad debe definirse previamente en una especificación en [`.agent/specs/`](file:///c:/Users/PC/Desktop/Extractor%20youtube/Nuevo%20optimizado/Descargador-Videos-RRSS/.agent/specs/).

---

## 🔤 4. Regla de Nombres en Castellano
- **Los nombres de todos los archivos y carpetas creados DEBEN ESTAR EN CASTELLANO** (por ejemplo: `.agent/specs/01-alojamiento-servidor-web.md`, `.agent/skills/descargador-web/`).
- **Excepción**: Únicamente mantienen su nombre estándar en inglés los archivos base de sistema requeridos por convenio (como `engram.md`, `agent.md`, `SKILL.md`, `Dockerfile`, `docker-compose.yml`, `package.json`, `README.md`, `server.js`, `index.html`).

---

## 🎭 5. Estilo de Comunicación
- Habla en **castellano**.
- Mantén un tono **técnico, directo y divertido**.
