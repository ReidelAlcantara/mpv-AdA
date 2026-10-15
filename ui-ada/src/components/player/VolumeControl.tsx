'use client'
// Control de volumen: botón + popover con slider, refuerzo >100 y silencio
import { Volume, Volume1, Volume2, VolumeX, Gauge } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { actions } from '@/lib/mpv/useMpv'
import { useProp } from '@/lib/store'
import { cn } from '@/lib/utils'

export function VolumeControl() {
  const volume = useProp<number>('volume', 100)
  const volumeMax = useProp<number>('volume-max', 130)
  const mute = useProp<boolean>('mute', false)

  const Icon = mute || volume === 0 ? VolumeX : volume < 33 ? Volume : volume < 66 ? Volume1 : Volume2

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="h-9 px-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 min-w-0"
          aria-label={`Volumen ${Math.round(volume)}${mute ? ' (silenciado)' : '%'}`}
        >
          <Icon className={cn('h-[18px] w-[18px] shrink-0', mute ? 'text-zinc-500' : 'text-zinc-200')} />
          <span className={cn('text-xs font-mono tabular-nums w-8 hidden sm:block truncate', mute ? 'text-zinc-500' : volume > 100 ? 'ui-accent' : 'text-zinc-300')}>
            {mute ? '--' : Math.round(volume)}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-64 p-4 bg-zinc-900/95 backdrop-blur-xl border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-300">Volumen</span>
          <span className={cn('text-sm font-mono tabular-nums', volume > 100 ? 'ui-accent' : 'text-zinc-100')}>
            {Math.round(volume)}
          </span>
        </div>
        <Slider
          value={[Math.min(volume, volumeMax)]}
          min={0}
          max={volumeMax}
          step={1}
          onValueChange={([v]) => actions.setVolume(v)}
          aria-label="Volumen"
        />
        <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1.5">
          <span>0</span>
          <span className={volume > 100 ? 'ui-accent font-bold' : ''}>100</span>
          <span>{Math.round(volumeMax)}</span>
        </div>
        {volume > 100 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] ui-accent">
            <Gauge className="h-3.5 w-3.5" />
            <span>Refuerzo activo — cuidado con audífonos</span>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400 flex items-center gap-2">
            <VolumeX className="h-3.5 w-3.5" /> Silencio
          </span>
          <Switch checked={mute} onCheckedChange={(v) => actions.setMute(v)} aria-label="Silencio" />
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
          mapea <code className="text-zinc-500">--volume</code> · <code className="text-zinc-500">--mute</code> · máx = <code className="text-zinc-500">--volume-max</code>
        </p>
      </PopoverContent>
    </Popover>
  )
}
