// AdA Player Desktop — proceso principal (Electron)
// Arquitectura de ventana doble:
//   1) videoWin: ventana nativa con barra de título. El motor mpv se incrusta
//      en su área cliente con --wid=<HWND> (mpv crea una hija WS_CHILD que
//      sigue el tamaño del padre mediante WinEventHook).
//   2) overlay: capa transparente sin marco que cubre exactamente el área
//      cliente de videoWin y renderiza la interfaz AdA (export estático de
//      Next.js servido localmente). El teclado y el ratón viven aquí.
// El proceso principal además gestiona: servidor local HTTP+socket.io
// (desktop/server.js), spawn/reinicio del motor mpv y la salida ordenada.
'use strict'

const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { startDesktopServer } = require('./server')

const IS_WIN = process.platform === 'win32'
const APP_TITLE = 'AdA Player'
const APP_DIR = __dirname // desktop/ en desarrollo, resources/app en el paquete

// Directorios de la app empaquetada:
//   resources/app/{main.js, preload.js, server.js, node_modules, ui/, engine/, ada-icon.ico}
// En desarrollo: desktop/{...} con la UI en ../out y el motor en ./engine o MPV_ENGINE_PATH.
const uiDir = fs.existsSync(path.join(APP_DIR, 'ui'))
  ? path.join(APP_DIR, 'ui')
  : path.join(APP_DIR, '..', 'out')
const engineDir = path.join(APP_DIR, 'engine')
const iconPath = fs.existsSync(path.join(APP_DIR, 'ada-icon.ico'))
  ? path.join(APP_DIR, 'ada-icon.ico')
  : null

const log = (line) => console.log(`[ada-main] ${line}`)

let videoWin = null
let overlay = null
let server = null
let quitting = false

// ------------------------------ utilidades ------------------------------

function findEngine() {
  if (process.env.MPV_ENGINE_PATH) return process.env.MPV_ENGINE_PATH
  const name = IS_WIN ? 'mpv.exe' : 'mpv'
  const p = path.join(engineDir, name)
  if (fs.existsSync(p)) return p
  return '' // sin motor: la UI arranca en modo demo
}

/** HWND de videoWin como cadena decimal (x64: puntero completo en 8 bytes). */
function readHwnd(win) {
  try {
    const buf = win.getNativeWindowHandle()
    if (buf.length >= 8) return String(buf.readBigUInt64LE(0))
    if (buf.length >= 4) return String(buf.readUInt32LE(0))
  } catch (e) {
    log(`no se pudo leer el HWND: ${e?.message ?? e}`)
  }
  return null
}

function engineArgsFor(hwnd) {
  const args = [
    '--idle=yes',
    '--force-window=yes',
    '--osc=no',
    '--input-default-bindings=no',
    '--no-terminal',
    '--keep-open=always',
  ]
  if (IS_WIN && hwnd) args.unshift(`--wid=${hwnd}`)
  return args
}

function handleArgv(argv) {
  if (!server) return
  const files = argv
    .slice(1)
    .filter((a) => a && !a.startsWith('-') && path.extname(a) && fs.existsSync(a))
  files.forEach((f, i) => server.loadFile(f, i === 0 ? 'replace' : 'append-play'))
  if (files.length) log(`abriendo ${files.length} archivo(s) desde la línea de comandos`)
  if (files.length && videoWin && !videoWin.isDestroyed()) videoWin.focus()
}

// ------------------------------ ventanas ------------------------------

function createVideoWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    useContentSize: true,
    backgroundColor: '#000000',
    title: APP_TITLE,
    autoHideMenuBar: true,
    show: false,
    icon: iconPath ?? undefined,
    webPreferences: {
      // la ventana solo aloja el HWND del motor: no carga contenido remoto
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  win.once('ready-to-show', () => win.show())
  // about:blank puede no emitir ready-to-show en algunos entornos
  setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) win.show()
  }, 600)
  return win
}

function createOverlay() {
  const b = videoWin.getContentBounds()
  const w = new BrowserWindow({
    x: b.x,
    y: b.y,
    width: Math.max(b.width, 320),
    height: Math.max(b.height, 240),
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    closable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    title: APP_TITLE,
    icon: iconPath ?? undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })
  w.loadURL(`http://127.0.0.1:${server.port}/`)
  w.once('ready-to-show', () => {
    if (videoWin && !videoWin.isDestroyed() && videoWin.isVisible()) w.show()
    syncOverlay()
  })
  // los enlaces se abren en el navegador del sistema, nunca dentro de la capa
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  if (process.env.ADA_DEVTOOLS === '1') {
    w.webContents.openDevTools({ mode: 'detach' })
  }
  return w
}

function syncOverlay() {
  if (!overlay || overlay.isDestroyed()) return
  if (!videoWin || videoWin.isDestroyed()) return
  if (videoWin.isMinimized()) {
    if (overlay.isVisible()) overlay.hide()
    return
  }
  if (!overlay.isVisible() && videoWin.isVisible()) overlay.show()
  try {
    overlay.setBounds(videoWin.getContentBounds())
  } catch (e) {
    log(`syncOverlay: ${e?.message ?? e}`)
  }
}

function bindWindowSync() {
  const events = ['resize', 'move', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen', 'restore', 'focus']
  for (const ev of events) {
    videoWin.on(ev, () => {
      syncOverlay()
      if (ev !== 'focus' && overlay && !overlay.isDestroyed()) overlay.moveTop()
    })
  }
  videoWin.on('minimize', () => overlay && !overlay.isDestroyed() && overlay.hide())
  videoWin.on('closed', () => {
    if (overlay && !overlay.isDestroyed()) overlay.destroy()
    overlay = null
    videoWin = null
    if (!quitting) app.quit()
  })
  overlay.on('closed', () => { overlay = null })

  videoWin.on('enter-full-screen', () => overlay && !overlay.isDestroyed() && overlay.webContents.send('ada:fullscreen-changed', true))
  videoWin.on('leave-full-screen', () => overlay && !overlay.isDestroyed() && overlay.webContents.send('ada:fullscreen-changed', false))
}

// ------------------------------ IPC renderer → main ------------------------------

ipcMain.handle('ada:toggle-fullscreen', () => {
  if (videoWin && !videoWin.isDestroyed()) {
    videoWin.setFullScreen(!videoWin.isFullScreen())
    return videoWin.isFullScreen()
  }
  return false
})

ipcMain.handle('ada:is-fullscreen', () => !!(videoWin && !videoWin.isDestroyed() && videoWin.isFullScreen()))

ipcMain.on('ada:quit', () => app.quit())

// ------------------------------ arranque ------------------------------

async function boot() {
  app.setAppUserModelId('mpv-ada.player')

  videoWin = createVideoWindow()
  const hwnd = readHwnd(videoWin)
  if (hwnd) log(`videoWin HWND: ${hwnd}`)

  const enginePath = findEngine()
  const engineArgs = engineArgsFor(hwnd)
  log(`motor: ${enginePath || '(no encontrado — modo demo)'}`)
  log(`argumentos del motor: ${engineArgs.join(' ')}`)

  server = await startDesktopServer({
    uiDir,
    enginePath,
    engineArgs,
    engineCwd: enginePath ? path.dirname(enginePath) : undefined,
    log,
  })
  log(`servidor local listo en http://127.0.0.1:${server.port}`)

  overlay = createOverlay()
  bindWindowSync()

  // autotest interno (ADA_SELFTEST=1): verifica inyección de modo escritorio
  // y preload dentro del overlay, y cierra ordenadamente la app.
  if (process.env.ADA_SELFTEST === '1') {
    overlay.webContents.once('did-finish-load', async () => {
      try {
        const r = await overlay.webContents.executeJavaScript(
          '({ desktop: window.__ADA_DESKTOP__ === true, hasApi: !!window.adaDesktop, cls: document.documentElement.className })',
        )
        log(`SELFTEST overlay: ${JSON.stringify(r)}`)
        const fs = await overlay.webContents.executeJavaScript('window.adaDesktop ? window.adaDesktop.isFullscreen() : null')
        log(`SELFTEST isFullscreen(): ${fs}`)
        const status = server.getStatus()
        log(`SELFTEST estado: mode=${status.mode} engine=${status.engine ? status.engine.pid : 'no'} version=${status.mpvVersion}`)
      } catch (e) {
        log(`SELFTEST error: ${e?.message ?? e}`)
      }
      setTimeout(() => app.quit(), 1500)
    })
  }

  // archivos abiertos con la app (argv inicial o segunda instancia)
  handleArgv(process.argv)
}

// ------------------------------ ciclo de vida ------------------------------

if (!app.requestSingleInstanceLock()) {
  log('ya hay una instancia de AdA Player — cerrando esta')
  app.quit()
} else {
  app.on('second-instance', (_e, argv) => {
    log('segunda instancia: enfocando y procesando argumentos')
    handleArgv(argv)
    if (videoWin && !videoWin.isDestroyed()) {
      if (videoWin.isMinimized()) videoWin.restore()
      videoWin.focus()
    }
  })

  app.whenReady().then(boot).catch((err) => {
    console.error('[ada-main] fallo en el arranque:', err)
    app.quit()
  })

  app.on('window-all-closed', () => app.quit())
}

// salida ordenada: quit por IPC al motor (respeta save-position-on-quit)
// y como respaldo kill del proceso.
app.on('before-quit', (e) => {
  if (quitting) return
  quitting = true
  e.preventDefault()
  ;(async () => {
    try {
      if (server) {
        await server.stopEngine({ gracefulMs: 1500 })
        await server.close()
      }
    } catch (err) {
      log(`cierre: ${err?.message ?? err}`)
    }
    app.exit(0)
  })()
})
