'use client'
// Barra de control flotante: transporte, capítulos, A-B, capturas, ajustes rápidos
import {
  Play, Pause, SkipBack, SkipForward, ChevronFirst, ChevronLast,
  Repeat, Camera, ListMusic, Settings2, Activity, RotateCcw, ArrowLeftToLine, ArrowRightToLine,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { actions } from '@/lib/mpv/useMpv'
import { useProp, useUiStore } from '@/lib/store'
import { fmtTime } from '@/lib/format'
import { SeekBar } from './SeekBar'
import { VolumeControl } from './VolumeControl'
import { SpeedControl } from './SpeedControl'
import { TrackMenu } from './TrackMenus'
import { cn } from '@/lib/utils'

function CtrlBtn({
  onClick, onDoubleClick, label, children, active, className, disabled,
}: {
  onClick?: () => void; onDoubleClick?: () => void; label: string; children: React.ReactNode
  active?: boolean; className?: string; disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          aria-label={label}
          disabled={disabled}
          className={cn(
            'h-11 w-11 rounded-xl flex items-center justify-center transition-colors',
            disabled ? 'opacity-40 cursor-default' : 'hover:bg-white/10 active:scale-95 transition-transform',
            active && 'bg-ui-accent-soft ui-accent',
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs bg-zinc-900 border-zinc-700">{label}</TooltipContent>
    </Tooltip>
  )
}

export function ControlBar({ visible, onActivity }: { visible: boolean; onActivity?: () => void }) {
  const paused = useProp<boolean>('pause', true)
  const timePos = useProp<number>('time-pos', 0)
  const duration = useProp<number>('duration', 0)
  const chapter = useProp<number>('chapter', -1)
  const chapters = useProp<number>('chapters', 0)
  const loopFile = useProp<string | number>('loop-file', 'no')
  const abA = useProp<number | string>('ab-loop-a', 'no')
  const abB = useProp<number | string>('ab-loop-b', 'no')
  const playlistCount = useProp<number>('playlist-count', 0)
  const showRemaining = useUiStore((s) => s.showRemaining)
  const statsVisible = useUiStore((s) => s.statsVisible)
  const playlistOpen = useUiStore((s) => s.playlistOpen)
  const setUi = useUiStore((s) => s.setUi)

  const abActive = abA !== 'no' || abB !== 'no'
  const remaining = duration > 0 ? Math.max(0, duration - timePos) : 0

  return (
    <TooltipProvider delayDuration={350}>
      <div
        onMouseMove={onActivity}
        className={cn(
          'absolute bottom-0 inset-x-0 z-30 px-3 pb-3 sm:px-5 sm:pb-4 transition-all duration-300 ada-panel',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        )}
        role="toolbar"
        aria-label="Controles de reproducción"
      >
        <div className="rounded-2xl border border-white/10 bg-black/55 backdrop-blur-2xl px-4 sm:px-5 pt-1 pb-2 shadow-2xl">
          <SeekBar />

          <div className="flex items-center gap-0.5 sm:gap-1 flex-wrap">
            {/* --- transporte --- */}
            <CtrlBtn onClick={() => actions.prev()} label="Anterior en la cola (P)">
              <ChevronFirst className="h-5 w-5" />
            </CtrlBtn>
            <CtrlBtn onClick={() => actions.seek(-10)} label="Atrás 10 s (←)">
              <SkipBack className="h-5 w-5" />
            </CtrlBtn>
            <CtrlBtn onClick={() => actions.togglePause()} label={paused ? 'Reproducir (Espacio)' : 'Pausa (Espacio)'} className={paused ? 'bg-ui-accent text-ui-accent-fg hover:brightness-110' : ''}>
              {paused ? <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" /> : <Pause className="h-6 w-6" fill="currentColor" />}
            </CtrlBtn>
            <CtrlBtn onClick={() => actions.seek(10)} label="Adelante 10 s (→)">
              <SkipForward className="h-5 w-5" />
            </CtrlBtn>
            <CtrlBtn onClick={() => actions.next()} label="Siguiente en la cola (N)">
              <ChevronLast className="h-5 w-5" />
            </CtrlBtn>

            {/* --- capítulos --- */}
            {chapters > 0 && (
              <>
                <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />
                <CtrlBtn onClick={() => actions.chapterSeek(-1)} label="Capítulo anterior (RePág)" disabled={chapter <= 0}>
                  <ArrowLeftToLine className="h-[18px] w-[18px]" />
                </CtrlBtn>
                <CtrlBtn onClick={() => actions.chapterSeek(1)} label="Capítulo siguiente (AvPág)" disabled={chapter >= chapters - 1}>
                  <ArrowRightToLine className="h-[18px] w-[18px]" />
                </CtrlBtn>
                <span className="text-[11px] font-mono text-zinc-500 px-1 hidden md:block tabular-nums">
                  {chapter + 1}/{chapters}
                </span>
              </>
            )}

            {/* --- tiempo --- */}
            <div className="mx-auto hidden sm:flex items-center gap-2 px-3">
              <span className="text-xs font-mono tabular-nums text-zinc-100">{fmtTime(timePos, true)}</span>
              <span className="text-zinc-600 text-[10px]">/</span>
              <span className="text-xs font-mono tabular-nums text-zinc-500">
                {showRemaining ? `-${fmtTime(remaining)}` : fmtTime(duration)}
              </span>
            </div>
            {/* versión móvil compacta */}
            <div className="mx-auto sm:hidden text-[11px] font-mono tabular-nums text-zinc-300 px-2">
              {fmtTime(timePos)} / {showRemaining ? `-${fmtTime(remaining)}` : fmtTime(duration)}
            </div>

            {/* --- derecha --- */}
            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />
            <CtrlBtn onClick={() => actions.cycleLoop()} label={loopFile === 'no' ? 'Repetir archivo (L)' : 'Repetición desactivada'} active={loopFile !== 'no'}>
              <Repeat className="h-[18px] w-[18px]" />
            </CtrlBtn>
            <CtrlBtn
              onClick={() => actions.abLoop()}
              label={abA === 'no' ? 'Marcar inicio A-B (A)' : abB === 'no' ? 'Marcar fin A-B (A)' : 'Quitar bucle A-B'}
              active={abActive}
            >
              <span className={cn('relative text-[10px] font-bold tracking-tighter', abActive ? 'ui-accent' : 'text-zinc-300')}>
                A·B
              </span>
            </CtrlBtn>
            <CtrlBtn onClick={() => actions.revertSeek()} label="Deshacer salto (Retroceso)">
              <RotateCcw className="h-[18px] w-[18px]" />
            </CtrlBtn>

            <SpeedControl />
            <TrackMenu type="sub" />
            <TrackMenu type="audio" />
            <TrackMenu type="video" />
            <VolumeControl />

            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />
            <CtrlBtn onClick={() => actions.screenshot()} label="Captura (S)">
              <Camera className="h-[18px] w-[18px]" />
            </CtrlBtn>
            <CtrlBtn onClick={() => setUi({ statsVisible: !statsVisible })} label="Estadísticas (I)" active={statsVisible}>
              <Activity className="h-[18px] w-[18px]" />
            </CtrlBtn>
            <CtrlBtn
              onClick={() => setUi({ playlistOpen: !playlistOpen })}
              label={playlistOpen ? 'Ocultar cola (Q)' : 'Mostrar cola (Q)'}
              active={playlistOpen}
              className="hidden sm:flex"
            >
              <ListMusic className="h-[18px] w-[18px]" />
            </CtrlBtn>
            <CtrlBtn onClick={() => document.dispatchEvent(new CustomEvent('ada:open-settings'))} label="Configuración (O)">
              <Settings2 className="h-[18px] w-[18px]" />
            </CtrlBtn>
          </div>

          {/* estado discreto de la cola en pantallas pequeñas */}
          <div className="sm:hidden flex items-center justify-center gap-2 pt-1 text-[10px] text-zinc-500">
            <ListMusic className="h-3 w-3" /> {playlistCount} en la cola
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
