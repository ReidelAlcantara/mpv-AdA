'use client'
// AdA Player — aplicación principal
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useMpv, actions } from '@/lib/mpv/useMpv'
import { usePlayerStore, useUiStore } from '@/lib/store'
import { ACCENTS } from '@/lib/mpv/types'
import { isDesktop, toggleFullscreen as desktopToggleFullscreen, exitFullscreenIfAny, quitDesktop } from '@/lib/desktop'
import { PlayerStage } from '@/components/player/PlayerStage'
import { ControlBar } from '@/components/player/ControlBar'
import { PlaylistPanel } from '@/components/player/PlaylistPanel'
import { TopBar } from '@/components/player/TopBar'
import { StatsOverlay } from '@/components/player/StatsOverlay'
import { SettingsDialog } from '@/components/player/SettingsDialog'
import { ShortcutsDialog } from '@/components/player/ShortcutsDialog'
import { ConnectDialog } from '@/components/player/ConnectDialog'
import { AddMediaDialog } from '@/components/player/AddMediaDialog'

export default function Home() {
  useMpv() // arranca el cliente IPC ⇄ puente ⇄ motor

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const playlistOpen = useUiStore((s) => s.playlistOpen)
  const statsVisible = useUiStore((s) => s.statsVisible)
  const accent = useUiStore((s) => s.accent)
  const autoHideSecs = useUiStore((s) => s.autoHideSecs)

  const stageRef = useRef<HTMLDivElement>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // aplicar color de acento dinámico
  useEffect(() => {
    const a = ACCENTS[accent] ?? ACCENTS.amber
    document.documentElement.style.setProperty('--ui-accent', a.css)
    document.documentElement.style.setProperty('--ui-accent-fg', a.fg)
  }, [accent])

  // auto-ocultar controles sobre el escenario
  const onActivity = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      setControlsVisible(false)
    }, autoHideSecs * 1000)
  }, [autoHideSecs])

  useEffect(() => {
    // arranca el temporizador de ocultación sin setState síncrono
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setControlsVisible(false), autoHideSecs * 1000)
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [autoHideSecs])

  // evento desde la barra de control para abrir ajustes
  useEffect(() => {
    const h = () => setSettingsOpen(true)
    document.addEventListener('ada:open-settings', h)
    return () => document.removeEventListener('ada:open-settings', h)
  }, [])

  // atajos de teclado globales
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      // no interceptar si un diálogo con input está abierto
      const k = e.key

      switch (k) {
        case ' ': case 'k': case 'K':
          e.preventDefault(); actions.togglePause(); break
        case 'ArrowLeft':
          e.preventDefault(); actions.seek(e.shiftKey ? -1 : -5); break
        case 'ArrowRight':
          e.preventDefault(); actions.seek(e.shiftKey ? 1 : 5); break
        case 'ArrowUp':
          e.preventDefault(); actions.addVolume(5); break
        case 'ArrowDown':
          e.preventDefault(); actions.addVolume(-5); break
        case 'PageUp':
          e.preventDefault(); actions.chapterSeek(-1); break
        case 'PageDown':
          e.preventDefault(); actions.chapterSeek(1); break
        case 'm': case 'M': actions.toggleMute(); break
        case 'f': case 'F': {
          // escritorio: fullscreen de la ventana nativa; web: Fullscreen API
          if (!desktopToggleFullscreen()) {
            const el = stageRef.current
            if (el) { if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.() }
          }
          break
        }
        case 'Escape': {
          if (exitFullscreenIfAny()) {
            e.preventDefault()
          } else if (document.fullscreenElement) {
            document.exitFullscreen()
          }
          break
        }
        case 'q': case 'Q': {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault(); quitDesktop(); break
          }
          useUiStore.getState().setUi({ playlistOpen: !useUiStore.getState().playlistOpen }); break
        }
        case 's': case 'S': actions.screenshot(); break
        case 'n': case 'N': actions.next(); break
        case 'p': case 'P': actions.prev(); break
        case 'a': case 'A': actions.abLoop(); break
        case 'l': case 'L': actions.cycleLoop(); break
        case 'i': case 'I': useUiStore.getState().setUi({ statsVisible: !useUiStore.getState().statsVisible }); break
        case 'h': case 'H': case '?': setShortcutsOpen((v) => !v); break
        case 'o': case 'O': setAddOpen(true); break
        case 'Backspace': actions.revertSeek(); break
        case 'z': case 'Z': actions.addSubDelay(-0.5); break
        case 'x': case 'X': actions.addSubDelay(0.5); break
        case 'c': case 'C': actions.set('sid', 'auto'); break
        case '<': actions.frameBackStep(); break
        case '>': actions.frameStep(); break
        case '[': actions.cycleSpeed(-1); break
        case ']': actions.cycleSpeed(1); break
        default:
          if (/^[0-9]$/.test(k)) actions.seekPercent(Number(k) * 10)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // en escritorio escuchar cambios de fullscreen de la ventana nativa (para
  // mantener la UI coherente cuando el usuario usa F11 o la barra de título)
  useEffect(() => {
    const api = isDesktop() ? window.adaDesktop : undefined
    api?.onFullscreenChanged?.(() => onActivity())
  }, [onActivity])

  // drag & drop de archivos (solo escritorio): el primero reemplaza la cola
  // y el resto se añade. En web no se interfiere con el navegador.
  useEffect(() => {
    if (!isDesktop()) return
    const onDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
    const onDrop = async (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation()
      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return
      const paths: string[] = []
      for (const f of Array.from(files)) {
        const p = window.adaDesktop?.getPathForFile?.(f) || ''
        if (p) paths.push(p)
      }
      if (paths.length === 0) return
      for (const [i, p] of paths.entries()) {
        await actions.loadFile(p, i === 0 ? 'replace' : 'append')
      }
      onActivity()
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [onActivity])

  return (
    <TooltipProvider delayDuration={400}>
      <div className="h-screen flex flex-col bg-zinc-950 overflow-hidden ada-root" style={{ ['--font-geist-sans' as string]: 'var(--font-geist-sans)' }}>
        <TopBar
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenConnect={() => setConnectOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onAddMedia={() => setAddOpen(true)}
        />

        <main className="flex-1 min-h-0 flex relative">
          {/* escenario */}
          <section className="flex-1 min-w-0 relative bg-black ada-stage-section" aria-label="Reproductor" onMouseMove={onActivity}>
            <PlayerStage fullscreenRef={stageRef} onActivity={onActivity} />
            <ControlBar visible={controlsVisible} onActivity={onActivity} />
            <AnimatePresence>
              {statsVisible && (
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 pointer-events-none"
                >
                  <div className="pointer-events-auto">
                    <StatsOverlay />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* panel de cola */}
          <AnimatePresence initial={false}>
            {playlistOpen && (
              <motion.aside
                key="playlist"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="hidden md:block shrink-0 overflow-hidden"
                aria-label="Cola de reproducción"
              >
                <div className="h-full w-[340px]">
                  <PlaylistPanel />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* cola en móvil: hoja inferior */}
          <AnimatePresence>
            {playlistOpen && (
              <motion.div
                key="playlist-mobile"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="md:hidden fixed inset-x-0 bottom-0 h-[46vh] z-50 rounded-t-2xl overflow-hidden border-t border-zinc-800"
              >
                <PlaylistPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* diálogos */}
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
        <AddMediaDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    </TooltipProvider>
  )
}
