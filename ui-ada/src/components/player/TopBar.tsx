'use client'
// Barra superior: identidad, título del medio, estado de conexión y acciones globales
import { Play, Plug, Keyboard, Settings2, ListMusic, Plus, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useProp, usePlayerStore, useUiStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface Props {
  onOpenSettings: () => void
  onOpenConnect: () => void
  onOpenShortcuts: () => void
  onAddMedia: () => void
}

export function TopBar({ onOpenSettings, onOpenConnect, onOpenShortcuts, onAddMedia }: Props) {
  const status = usePlayerStore((s) => s.status)
  const mediaTitle = useProp<string>('media-title', '')
  const filename = useProp<string>('filename', '')
  const playlistCount = useProp<number>('playlist-count', 0)
  const playlistPos = useProp<number>('playlist-playing-pos', -1)
  const statsVisible = useUiStore((s) => s.statsVisible)
  const playlistOpen = useUiStore((s) => s.playlistOpen)
  const setUi = useUiStore((s) => s.setUi)
  const isLive = status?.mode === 'live'

  return (
    <header className="ada-topbar flex items-center gap-3 px-3 sm:px-5 h-14 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl shrink-0 z-40">
      {/* identidad */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-ui-accent ui-accent-glow">
          <Play className="h-4 w-4 text-ui-accent-fg translate-x-[1px]" fill="currentColor" />
        </div>
        <div className="hidden sm:block leading-none">
          <div className="text-sm font-semibold tracking-tight text-zinc-100">AdA Player</div>
          <div className="text-[10px] text-zinc-600 font-mono mt-0.5">motor mpv · JSON IPC</div>
        </div>
      </div>

      {/* título del medio */}
      <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
        {mediaTitle ? (
          <div className="min-w-0 text-center">
            <div className="text-[13px] font-medium text-zinc-200 truncate max-w-[46vw]" title={filename}>
              {mediaTitle}
            </div>
            <div className="text-[10px] text-zinc-600 tabular-nums">
              {playlistPos >= 0 && playlistCount > 0 ? `${playlistPos + 1} / ${playlistCount}` : ''}
            </div>
          </div>
        ) : (
          <span className="text-xs text-zinc-700">sin medio</span>
        )}
      </div>

      {/* estado */}
      <button
        onClick={onOpenConnect}
        className={cn(
          'flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium transition-colors shrink-0',
          isLive
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
        )}
        title={isLive ? `Conectado: ${status?.socketPath}` : (status?.error ?? 'Modo demostración')}
      >
        {isLive ? (
          <><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> LIVE</>
        ) : (
          <><span className="h-1.5 w-1.5 rounded-full bg-amber-400 demo-pulse" /> DEMO</>
        )}
      </button>

      {/* acciones */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-100" onClick={onAddMedia} aria-label="Añadir medio">
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs bg-zinc-900 border-zinc-700">Añadir medio (O)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-100 hidden sm:inline-flex" onClick={onOpenConnect} aria-label="Conexión">
              <Plug className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs bg-zinc-900 border-zinc-700">Conexión con el motor</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={cn('h-9 w-9 hidden sm:inline-flex', statsVisible ? 'ui-accent' : 'text-zinc-400 hover:text-zinc-100')} onClick={() => setUi({ statsVisible: !statsVisible })} aria-label="Estadísticas">
              <Activity className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs bg-zinc-900 border-zinc-700">Estadísticas (I)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-100 hidden sm:inline-flex" onClick={onOpenShortcuts} aria-label="Atajos">
              <Keyboard className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs bg-zinc-900 border-zinc-700">Atajos (H)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={cn('h-9 w-9', playlistOpen ? 'ui-accent' : 'text-zinc-400 hover:text-zinc-100')} onClick={() => setUi({ playlistOpen: !playlistOpen })} aria-label="Cola">
              <ListMusic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs bg-zinc-900 border-zinc-700">Cola de reproducción (Q)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-100" onClick={onOpenSettings} aria-label="Configuración">
              <Settings2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs bg-zinc-900 border-zinc-700">Configuración</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
