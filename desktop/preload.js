// Preload de AdA Player Desktop — puente seguro entre la UI (renderer) y el
// proceso principal. Con contextIsolation la UI no tiene acceso a Node.
const { contextBridge, ipcRenderer, webUtils } = require('electron')

// estado de pantalla completa cacheado (consulta inicial + eventos)
let fullscreenState = false
ipcRenderer.on('ada:fullscreen-changed', (_e, v) => { fullscreenState = !!v })
ipcRenderer.invoke('ada:is-fullscreen').then((v) => { fullscreenState = !!v }).catch(() => {})

contextBridge.exposeInMainWorld('adaDesktop', {
  version: '0.1.0',
  platform: process.platform,
  /** Alternar pantalla completa de la ventana principal (video + UI). */
  toggleFullscreen: () => ipcRenderer.invoke('ada:toggle-fullscreen'),
  /** Estado cacheado de pantalla completa (sincrónico para el renderer). */
  isFullscreen: () => fullscreenState,
  /** Suscribirse a cambios de pantalla completa. Devuelve función de limpieza. */
  onFullscreenChanged: (cb) => {
    const h = (_e, fs) => cb(fs)
    ipcRenderer.on('ada:fullscreen-changed', h)
    return () => ipcRenderer.removeListener('ada:fullscreen-changed', h)
  },
  /** Cerrar la aplicación (apagado ordenado del motor). */
  quit: () => ipcRenderer.send('ada:quit'),
  /** Ruta real de un File del renderer (Electron moderno: webUtils). */
  getPathForFile: (file) => {
    try { return webUtils.getPathForFile(file) } catch { return '' }
  },
})
