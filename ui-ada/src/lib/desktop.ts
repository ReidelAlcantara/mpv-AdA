'use client'
// Modo escritorio (AdA Player Desktop / Electron).
// El servidor local inyecta window.__ADA_DESKTOP__=1 en el HTML antes de la
// hidratación, y el preload de Electron expone window.adaDesktop (contextBridge).
// En la web (preview del sandbox) ambas señales están ausentes y todo el
// comportamiento por defecto se mantiene intacto.

declare global {
  interface Window {
    __ADA_DESKTOP__?: boolean
    adaDesktop?: {
      toggleFullscreen: () => void
      isFullscreen: () => boolean
      quit: () => void
      version: string
      platform?: string
      getPathForFile?: (file: unknown) => string
      onFullscreenChanged?: (cb: (fs: boolean) => void) => void
    }
  }
}

export const isDesktop = (): boolean =>
  typeof window !== 'undefined' && window.__ADA_DESKTOP__ === true

export const desktopApi = (): Window['adaDesktop'] =>
  typeof window !== 'undefined' ? window.adaDesktop : undefined

/** Alternar pantalla completa. En escritorio gobierna la ventana nativa. */
export function toggleFullscreen(): boolean {
  if (isDesktop()) {
    desktopApi()?.toggleFullscreen?.()
    return true
  }
  return false // el llamador debe usar la Fullscreen API del navegador
}

/** Salir de pantalla completa (Escape). Devuelve true si se gestionó. */
export function exitFullscreenIfAny(): boolean {
  if (isDesktop()) {
    const api = desktopApi()
    if (api?.isFullscreen?.()) {
      api.toggleFullscreen()
      return true
    }
    return true // en escritorio Escape no debe salir al navegador
  }
  return false
}

export const quitDesktop = () => desktopApi()?.quit?.()
