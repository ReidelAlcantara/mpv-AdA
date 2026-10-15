# ui-ada — Interfaz AdA Player

Interfaz de usuario moderna, personalizable y configurable para el motor
**mpv-AdA**. Next.js 16 + React 19 + Tailwind 4 + shadcn/ui + zustand +
framer-motion + dnd-kit.

## Estructura

```
src/
  app/                 página principal (page.tsx) y layout
  components/player/   PlayerStage, ControlBar, SeekBar, PlaylistPanel,
                       TrackMenus, SettingsDialog (8 pestañas), StatsOverlay,
                       AddMediaDialog, ConnectDialog, ShortcutsDialog…
  lib/mpv/             cliente del puente (socket.io), propiedades observadas
  lib/store.ts         stores (estado del reproductor + preferencias UI)
  lib/desktop.ts       integración con el escritorio (Electron, opcional)
```

## Modos

* **Web**: se conecta al puente `mpv-bridge` (puerto 3030) vía el gateway.
* **Escritorio** (`ADA_DESKTOP=1`): export estático servido por la app
  Electron (`../desktop`); el vídeo lo dibuja el motor en la ventana nativa
  debajo de la capa transparente de la UI.

## Desarrollo

```sh
bun install
bun run dev            # modo web con motor demo integrado
```

## Build de escritorio

```sh
ADA_DESKTOP=1 bun run build:desktop   # → out/ (export estático)
```

La documentación completa de la integración (protocolo IPC, mapeo
UI↔propiedades de mpv, atajos) está en `DOCS` del release y en el README
del proyecto.
