'use client'
// Barra de progreso: capítulos, búfer, A-B loop, scrubbing y tooltip
import { useCallback, useEffect, useRef, useState } from 'react'
import { actions } from '@/lib/mpv/useMpv'
import { useProp } from '@/lib/store'
import { fmtTime } from '@/lib/format'
import type { Chapter, DemuxerCacheState } from '@/lib/mpv/types'
import { cn } from '@/lib/utils'

export function SeekBar({ compact = false }: { compact?: boolean }) {
  const barRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null)
  const [scrubbing, setScrubbing] = useState(false)

  const timePos = useProp<number>('time-pos', 0)
  const duration = useProp<number>('duration', 0)
  const paused = useProp<boolean>('pause', true)
  const speed = useProp<number>('speed', 1)
  const chapters = useProp<Chapter[]>('chapter-list', [])
  const cache = useProp<DemuxerCacheState | null>('demuxer-cache-state', null)
  const abA = useProp<number | string>('ab-loop-a', 'no')
  const abB = useProp<number | string>('ab-loop-b', 'no')

  const lastObserved = useRef({ t: timePos, at: performance.now() })

  // interpolar tiempo entre notificaciones para movimiento fluido
  useEffect(() => {
    if (timePos !== lastObserved.current.t) lastObserved.current = { t: timePos, at: performance.now() }
  }, [timePos])

  useEffect(() => {
    let raf = 0
    const loop = () => {
      const dur = duration || 0
      if (fillRef.current && knobRef.current && dur > 0) {
        let t = lastObserved.current.t
        if (!paused && !scrubbing) {
          t += ((performance.now() - lastObserved.current.at) / 1000) * speed
        }
        const pct = Math.min(100, Math.max(0, (t / dur) * 100))
        fillRef.current.style.width = pct + '%'
        knobRef.current.style.left = pct + '%'
      } else if (fillRef.current && knobRef.current) {
        fillRef.current.style.width = '0%'
        knobRef.current.style.left = '0%'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [duration, paused, speed, scrubbing])

  const pctToTime = useCallback((pct: number) => (pct / 100) * (duration || 0), [duration])
  const xToPct = useCallback((clientX: number) => {
    const el = barRef.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100))
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!duration) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrubbing(true)
    const t = pctToTime(xToPct(e.clientX))
    actions.seekTo(t)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const pct = xToPct(e.clientX)
    const t = pctToTime(pct)
    setHover({ x: pct, t })
    if (scrubbing && duration) {
      fillRef.current!.style.width = pct + '%'
      knobRef.current!.style.left = pct + '%'
    }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (scrubbing && duration) {
      const t = pctToTime(xToPct(e.clientX))
      actions.seekTo(t)
    }
    setScrubbing(false)
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  const dur = duration || 0
  const hoverChapter = hover ? chapters.find((c, i) => {
    const next = chapters[i + 1]?.time ?? Infinity
    return hover.t >= c.time && hover.t < next
  }) : null

  const abAPos = typeof abA === 'number' && dur > 0 ? (abA / dur) * 100 : null
  const abBPos = typeof abB === 'number' && dur > 0 ? (abB / dur) * 100 : null
  const inAb = hover?.t != null && typeof abA === 'number' && typeof abB === 'number' && hover.t >= abA && hover.t <= abB

  if (!dur) {
    return <div className={cn('w-full rounded-full bg-zinc-800/70 h-1.5', compact ? 'h-1' : 'h-1.5')} />
  }

  return (
    <div className="relative group/seek w-full py-3" onPointerLeave={() => setHover(null)}>
      {/* tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute -top-1 z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur px-2.5 py-1.5 shadow-xl"
          style={{ left: `clamp(40px, ${hover.x}%, calc(100% - 40px))` }}
        >
          <div className="text-xs font-mono text-zinc-100 tabular-nums">{fmtTime(hover.t, true)}</div>
          {hoverChapter && (
            <div className="text-[10px] text-zinc-400 max-w-40 truncate">{hoverChapter.title}</div>
          )}
          {inAb && <div className="text-[10px] ui-accent font-medium">bucle A-B</div>}
        </div>
      )}

      <div
        ref={barRef}
        role="slider"
        aria-label="Posición de reproducción"
        aria-valuemin={0}
        aria-valuemax={Math.round(dur)}
        aria-valuenow={Math.round(timePos)}
        tabIndex={0}
        className="seekbar-hit relative h-1.5 rounded-full bg-zinc-800/70 transition-[height] group-hover/seek:h-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') actions.seek(-5)
          if (e.key === 'ArrowRight') actions.seek(5)
        }}
      >
        {/* rangos cacheados */}
        {cache?.['seekable-ranges']?.map((r, i) => {
          const l = dur > 0 ? (r.start / dur) * 100 : 0
          const w = dur > 0 ? ((r.end - r.start) / dur) * 100 : 0
          return <div key={i} className="absolute inset-y-0 rounded-full bg-zinc-600/50" style={{ left: `${l}%`, width: `${w}%` }} />
        })}

        {/* progreso */}
        <div ref={fillRef} className="absolute inset-y-0 left-0 rounded-full bg-ui-accent ui-accent-glow" style={{ width: '0%' }} />

        {/* marcadores de capítulo */}
        {chapters.length > 1 && chapters.slice(1).map((c) => (
          <div key={c.time} className="seekbar-chapter-tick" style={{ left: `${dur > 0 ? (c.time / dur) * 100 : 0}%` }} title={c.title} />
        ))}

        {/* marcadores A-B */}
        {abAPos != null && (
          <div className="absolute -top-1 -translate-x-1/2 w-0.5 h-[calc(100%+8px)] bg-amber-400 rounded-full" style={{ left: `${abAPos}%` }} title={`A: ${fmtTime(abA as number)}`} />
        )}
        {abBPos != null && (
          <div className="absolute -top-1 -translate-x-1/2 w-0.5 h-[calc(100%+8px)] bg-amber-400 rounded-full" style={{ left: `${abBPos}%` }} title={`B: ${fmtTime(abB as number)}`} />
        )}

        {/* perilla */}
        <div
          ref={knobRef}
          className={cn(
            'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md ring-2 ring-ui-accent transition-transform',
            scrubbing ? 'scale-110' : 'scale-0 group-hover/seek:scale-100',
          )}
          style={{ left: '0%' }}
        />
      </div>
    </div>
  )
}
