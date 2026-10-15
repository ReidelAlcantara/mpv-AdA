# AdA Player Desktop — envoltorio de escritorio (Windows)

Esta carpeta contiene la aplicación de escritorio **AdA Player**: la interfaz
AdA (carpeta `../ui-ada`) empaquetada junto al motor **mpv-AdA** en una sola
app para Windows, construida con [Electron](https://www.electronjs.org/).

## Arquitectura (ventana doble)

```
┌───────────────────────────── AdA-Player.exe ──────────────────────────────┐
│  proceso principal (main.js)                                              │
│   ├── videoWin (ventana nativa, barra de título)                          │
│   │     └── mpv.exe --wid=<HWND>  ← el motor dibuja el vídeo como hija    │
│   │           WS_CHILD y sigue los cambios de tamaño (WinEventHook)        │
│   ├── overlay (capa transparente sin marco, exactamente sobre el área     │
│   │     cliente de videoWin) ← renderiza la UI AdA; teclado y ratón       │
│   └── server.js (HTTP 127.0.0.1:puerto + socket.io + cliente JSON IPC     │
│         del motor; spawn/reinicio del motor; fallback a modo demo)        │
└───────────────────────────────────────────────────────────────────────────┘
```

* La UI se sirve desde `http://127.0.0.1:<puerto>` (nunca expuesta a la red).
* El protocolo puente ⬄ UI es el mismo de la versión web
  (`mpv:command`, `mpv:observe`, `mpv:reply`, `mpv:property`, `mpv:event`,
  `mpv:status`), por lo que la interfaz no cambia entre web y escritorio.
* El preload (`preload.js`) expone `window.adaDesktop` de forma segura
  (`contextBridge`): pantalla completa, salir, rutas de archivos reales
  (`webUtils.getPathForFile`), eventos de la ventana.

## Archivos

| archivo | descripción |
|---|---|
| `main.js` | proceso principal Electron: ventanas, motor, IPC renderer↔main |
| `preload.js` | puente seguro renderer↔main (`window.adaDesktop`) |
| `server.js` | servidor local + puente socket.io ⬄ JSON IPC de mpv (CJS compilado desde `src/server.ts`) |
| `src/server.ts` | fuente TypeScript de `server.js` (compilar con `bun build`) |
| `src/demo-engine.ts` | motor simulado (fallback cuando no hay motor real) |
| `package.json` | dependencias de runtime (`socket.io`) |

## Compilar el paquete (desde la raíz del checkout)

```sh
# 1) UI estática
cd ui-ada
bun install
ADA_DESKTOP=1 bun run build:desktop     # genera ui-ada/out/

# 2) servidor CJS + dependencias
cd ../desktop
bun install
bun build src/server.ts --target=node --format=cjs \
     --external:socket.io --outfile server.js

# 3) ensamblar el ZIP (requiere el motor mpv-AdA y Electron win32-x64;
#    el script los descarga/ubica por defecto desde el release del motor)
python3 TOOLS/ada/package-ada-desktop.py   # o el script equivalente
```

El motor se toma del release `v0.41.0-ada1` (mpv.exe estático, GPL) y
Electron de `electron/electron` (win32-x64). El resultado es un ZIP portable:
descomprimir y ejecutar `AdA-Player.exe`.

## Diagnóstico

* `ADA_DEVTOOLS=1` → abre DevTools en el overlay.
* `ADA_SELFTEST=1` → autotest de arranque (inyección de modo escritorio,
  preload y estado del motor) en el log y salida ordenada.
* `MPV_ENGINE_PATH` / `MPV_IPC_SOCKET` → anulan el motor y la tubería IPC.

## Notas técnicas

* `--wid` en Windows: mpv crea una ventana hija `WS_CHILD` y usa
  `SetWinEventHook(EVENT_OBJECT_LOCATIONCHANGE)` para seguir el tamaño del
  padre entre procesos (mismo mecanismo que usan mpv.net/SMPlayer).
* Se lanza el motor con `--osc=no` e `--input-default-bindings=no`: toda la
  interacción pasa por la UI (overlay), sin duplicar controles.
* La tubería IPC es `\\.\pipe\mpv-ada-<pid>` (último `<pid>` = proceso de la
  app), evitando colisiones con instancias previas.
