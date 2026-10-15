'use client'
// Escenario del reproductor: escena canvas (demo), monitor (live), subtítulos y overlays
import { useCallback, useEffect, useRef } from 'react'
import { Play, Loader2, Music4, MonitorPlay, FileVideo2, Layers } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { actions } from '@/lib/mpv/useMpv'
import { useProp, usePlayerStore } from '@/lib/store'
import { isDesktop, toggleFullscreen as desktopToggleFullscreen } from '@/lib/desktop'
import { fmtBitrate, fmtHz } from '@/lib/format'
import type { DemuxerCacheState } from '@/lib/mpv/types'
import { cn } from '@/lib/utils'

interface Props {
  fullscreenRef: React.RefObject<HTMLDivElement | null>
  onActivity: () => void
}

export function PlayerStage({ fullscreenRef, onActivity }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  const paused = useProp<boolean>('pause', true)
  const idle = useProp<boolean>('idle-active', true)
  const buffering = useProp<boolean>('paused-for-cache', false)
  const bufferPct = useProp<number>('cache-buffering-state', 100)
  const subText = useProp<string>('sub-text', '')
  const palette = useProp<string[] | null>('user-data/ada/palette', null)
  const kind = useProp<string | null>('user-data/ada/kind', 'video')
  const speed = useProp<number>('speed', 1)
  const mode = usePlayerStore((s) => s.status?.mode ?? 'demo')

  // estilos de subtítulos observados
  const subColor = useProp<string>('sub-color', '#ffffffff')
  const subFont = useProp<string>('sub-font', 'sans-serif')
  const subSize = useProp<number>('sub-font-size', 38)
  const subScale = useProp<number>('sub-scale', 1)
  const subPos = useProp<number>('sub-pos', 100)
  const subBold = useProp<boolean>('sub-bold', false)
  const subItalic = useProp<boolean>('sub-italic', false)
  const subOutline = useProp<number>('sub-outline-size', 1.65)
  const subOutlineColor = useProp<string>('sub-outline-color', '#000000ff')
  const subShadow = useProp<number>('sub-shadow-offset', 0)
  const subShadowColor = useProp<string>('sub-shadow-color', '#000000ff')
  const subVisibility = useProp<boolean>('sub-visibility', true)
  const subMarginY = useProp<number>('sub-margin-y', 34)

  // datos para el monitor LIVE
  const videoParams = useProp<Record<string, unknown> | null>('video-params', null)
  const audioParams = useProp<Record<string, unknown> | null>('audio-params', null)
  const vbr = useProp<number>('video-bitrate', 0)
  const abr = useProp<number>('audio-bitrate', 0)
  const hwdec = useProp<string>('hwdec-current', '')
  const cache = useProp<DemuxerCacheState | null>('demuxer-cache-state', null)
  const containerFps = useProp<number>('container-fps', 0)
  const voDropped = useProp<number>('vo-drop-frame-count', 0)

  const isLive = mode === 'live'
  const pal = palette ?? ['#27272a', '#52525b', '#e4e4e7']

  // Modo escritorio: el vídeo real se dibuja en la ventana nativa del motor
  // (debajo de esta capa transparente), así que no se pinta ni monitor ni
  // subtítulos propios (mpv los renderiza dentro del vídeo).
  const desktop = isDesktop()
  const hideOverlays = desktop && isLive

  // ---------- escena canvas ----------
  const draw = useCallback((t: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const stage = canvas.parentElement
    if (!stage) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = stage.clientWidth, h = stage.clientHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    // fondo
    const base = ctx.createLinearGradient(0, 0, 0, h)
    base.addColorStop(0, '#0a0a0b')
    base.addColorStop(1, '#000000')
    ctx.fillStyle = base
    ctx.fillRect(0, 0, w, h)

    const audio = kind === 'audio'
    if (audio) {
      // espectro para solo-audio
      const bars = 48
      const bw = (w * 0.7) / bars
      const x0 = w * 0.15
      for (let i = 0; i < bars; i++) {
        const f = (Math.sin(t * 0.0012 + i * 0.35) + Math.sin(t * 0.0021 + i * 0.12)) * 0.25 + 0.5
        const bh = Math.max(6, f * h * 0.42 * (1 - Math.abs(i - bars / 2) / (bars * 1.2)))
        const grad = ctx.createLinearGradient(0, h / 2 - bh, 0, h / 2 + bh)
        grad.addColorStop(0, pal[2] + 'cc')
        grad.addColorStop(0.5, pal[1])
        grad.addColorStop(1, pal[0] + 'aa')
        ctx.fillStyle = grad
        const x = x0 + i * bw
        ctx.beginPath()
        ctx.roundRect(x + bw * 0.18, h / 2 - bh / 2, bw * 0.64, bh, 4)
        ctx.fill()
      }
    } else {
      // blobs de color cinematográficos
      const blobs = [
        { c: pal[0], r: 0.62, sx: 0.16, sy: 0.021, px: 0.22, py: 0.18, a: 0.9 },
        { c: pal[1], r: 0.45, sx: 0.024, sy: 0.03, px: 0.55, py: 0.24, a: 0.55 },
        { c: pal[2], r: 0.3, sx: 0.036, sy: 0.018, px: 0.35, py: 0.6, a: 0.32 },
        { c: pal[1], r: 0.35, sx: 0.017, sy: 0.026, px: 0.8, py: 0.55, a: 0.4 },
      ]
      for (const b of blobs) {
        const cx = (b.px + Math.sin(t * b.sx) * 0.14 + 1) * 0.5 * w
        const cy = (b.py + Math.cos(t * b.sy) * 0.12 + 1) * 0.5 * h
        const rad = b.r * Math.min(w, h) * 0.6
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
        g.addColorStop(0, b.c + Math.round(b.a * 255).toString(16).padStart(2, '0'))
        g.addColorStop(1, b.c + '00')
        ctx.fillStyle = g
        ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
      }
    }
    // viñeta
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, w, h)
  }, [kind, pal])

  useEffect(() => {
    const loop = (ts: number) => {
      draw(ts)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  const handleClick = () => { actions.togglePause() }
  const handleDoubleClick = () => {
    // escritorio: fullscreen de la ventana nativa; web: Fullscreen API
    if (!desktopToggleFullscreen()) {
      const el = fullscreenRef.current
      if (!el) return
      if (document.fullscreenElement) document.exitFullscreen()
      else el.requestFullscreen?.()
    }
  }

  // color de subtítulos: quitar canal alpha (mpv #RRGGBBAA → CSS)
  const stripAlpha = (c: string) => (c && c.length >= 7 ? c.slice(0, 7) : c)
  const subAlpha = (c: string) => (c && c.length === 9 ? parseInt(c.slice(7, 9), 16) / 255 : 1)
  const scale = 1 // escala relativa: el contenedor ya limita el alto

  return (
    <div
      ref={fullscreenRef}
      className="relative w-full h-full overflow-hidden bg-black no-select ada-stage"
      onMouseMove={onActivity}
      onTouchStart={onActivity}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      role="region"
      aria-label="Área de vídeo"
    >
      {/* Escena (demo) */}
      {!isLive && !idle && (
        <canvas ref={canvasRef} className={cn('absolute inset-0 w-full h-full stage-grain', paused && 'opacity-70 saturate-50')} />
      )}

      {/* Monitor LIVE (solo en web: en escritorio el vídeo real está detrás) */}
      {isLive && !idle && !desktop && <LiveMonitor {...{ videoParams, audioParams, vbr, abr, hwdec, containerFps, voDropped, cache, paused }} />}

      {/* Estado vacío */}
      {idle && (
        <div className="absolute inset-0 flex items-center justify-center p-6" onClick={(e) => e.stopPropagation()}>
          <div className="text-center max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl p-8"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ui-accent-soft">
                <FileVideo2 className="h-7 w-7 ui-accent" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-100">Nada en reproducción</h2>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Añade archivos o URLs a la cola desde el panel derecho, o pulsa
                <kbd className="mx-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[11px]">O</kbd>
                para abrir un medio.
              </p>
              <button
                onClick={() => actions.playIndex(0)}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-medium bg-ui-accent text-ui-accent-fg hover:brightness-110 active:brightness-95 transition"
              >
                <Play className="h-4 w-4" /> Reproducir la cola
              </button>
            </motion.div>
          </div>
        </div>
      )}

      {/* Indicador de solo-audio */}
      {!idle && kind === 'audio' && (
        <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/50 backdrop-blur px-3 py-1.5 text-xs text-zinc-300">
          <Music4 className="h-3.5 w-3.5 ui-accent" /> Solo audio
        </div>
      )}

      {/* Buffering */}
      {!idle && buffering && (
        <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs text-zinc-200">
          <Loader2 className="h-3.5 w-3.5 animate-spin ui-accent" />
          Almacenando en búfer… {Math.round(bufferPct)}%
        </div>
      )}

      {/* Botón central de reproducción */}
      {!idle && paused && !buffering && (
        <AnimatePresence>
          <motion.button
            key="bigplay"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 transition-colors"
            onClick={(e) => { e.stopPropagation(); actions.pause(false) }}
            aria-label="Reproducir"
          >
            <Play className="h-9 w-9 text-white translate-x-0.5" fill="white" />
          </motion.button>
        </AnimatePresence>
      )}

      {/* Velocidad ≠ 1 */}
      {speed !== 1 && !idle && (
        <div className="absolute bottom-16 right-4 rounded-full bg-black/50 backdrop-blur px-3 py-1 text-xs font-mono ui-accent border border-ui-accent/30">
          {speed.toFixed(2)}×
        </div>
      )}

      {/* Subtítulos (posición/estilo según propiedades del motor) — en escritorio los renderiza mpv */}
      {!idle && !hideOverlays && subVisibility && subText && (
        <div
          className="absolute left-0 right-0 pointer-events-none flex justify-center px-[var(--submx)]"
          style={{ bottom: `calc(${subMarginY * 0.55}px + ${Math.max(0, 150 - subPos) * 0.35}%)` }}
          aria-live="polite"
        >
          <span
            style={{
              color: stripAlpha(subColor),
              opacity: subAlpha(subColor),
              fontFamily: subFont.includes('mono') ? 'var(--font-geist-mono)' : 'var(--font-geist-sans)',
              fontSize: `calc(${subSize} * ${subScale} * ${scale} * clamp(0.55px, 0.9vh, 1.1px) + 0.35rem)`,
              fontWeight: subBold ? 700 : 500,
              fontStyle: subItalic ? 'italic' : 'normal',
              textShadow: [
                subOutline > 0 ? `-${subOutline}px 0 0 ${stripAlpha(subOutlineColor)}, 0 -${subOutline}px 0 ${stripAlpha(subOutlineColor)}, ${subOutline}px 0 0 ${stripAlpha(subOutlineColor)}, 0 ${subOutline}px 0 ${stripAlpha(subOutlineColor)}` : '',
                subShadow > 0 ? `${subShadow * 1.2}px ${subShadow * 1.2}px ${subShadow * 2}px ${stripAlpha(subShadowColor)}` : '',
              ].filter(Boolean).join(', ') || '0 1px 3px rgba(0,0,0,0.8)',
              lineHeight: 1.35,
              textAlign: 'center',
              maxWidth: '80%',
            }}
          >
            {subText}
          </span>
        </div>
      )}

      {/* Marca de agua demo */}
      {!isLive && !idle && (
        <div className="absolute bottom-2 right-3 text-[10px] font-mono tracking-widest text-white/25">
          AdA · DEMO ENGINE
        </div>
      )}
    </div>
  )
}

function LiveMonitor(props: {
  videoParams: Record<string, unknown> | null
  audioParams: Record<string, unknown> | null
  vbr: number; abr: number; hwdec: string; containerFps: number; voDropped: number
  cache: DemuxerCacheState | null; paused: boolean
}) {
  const vp = props.videoParams
  const ap = props.audioParams
  const items: [string, string, React.ReactNode?][] = [
    ['Vídeo', vp ? `${vp.w}×${vp.h} · ${vp.pixelformat}` : '—'],
    ['FPS', vp ? String(props.containerFps || '—') : '—'],
    ['Decodificación', props.hwdec === 'no' ? 'Software' : (props.hwdec || '—')],
    ['Audio', ap ? `${ap.channels} · ${fmtHz(ap.samplerate)}` : '—'],
    ['Bitrate', `${fmtBitrate(props.vbr)} / ${fmtBitrate(props.abr)}`],
    ['Caché', props.cache?.['cache-duration'] != null ? `${Math.round(Number(props.cache['cache-duration']))} s` : '—'],
    ['Caídas', String(props.voDropped || 0)],
  ]
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_30%,#18181b_0%,#09090b_70%)]">
      <div className="w-full max-w-2xl px-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ui-accent-soft">
            <MonitorPlay className="h-5 w-5 ui-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 text-sm">Monitor del motor</h3>
            <p className="text-xs text-zinc-500">El vídeo se muestra en la ventana del motor mpv; controla aquí la reproducción.</p>
          </div>
          {props.paused && <span className="ml-auto badge text-xs rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 px-2.5 py-1">En pausa</span>}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-zinc-800/70">
            {items.map(([k, v]) => (
              <div key={k} className="px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">{k}</div>
                <div className="mt-0.5 text-sm font-mono text-zinc-200 truncate">{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
          <Layers className="h-3.5 w-3.5" />
          <span>Interfaz conectada por JSON IPC · estado en tiempo real</span>
        </div>
      </div>
    </div>
  )
}
