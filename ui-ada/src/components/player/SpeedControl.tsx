'use client'
// Control de velocidad: presets, ajuste fino y corrección de tono
import { FastForward, AudioWaveform } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { actions } from '@/lib/mpv/useMpv'
import { useProp } from '@/lib/store'
import { cn } from '@/lib/utils'

const PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4]

export function SpeedControl() {
  const speed = useProp<number>('speed', 1)
  const pitch = useProp<boolean>('audio-pitch-correction', true)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'h-9 px-2.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1.5',
            speed !== 1 && 'bg-ui-accent-soft',
          )}
          aria-label={`Velocidad ${speed}×`}
        >
          <FastForward className={cn('h-[18px] w-[18px]', speed !== 1 ? 'ui-accent' : 'text-zinc-300')} />
          <span className={cn('text-xs font-mono tabular-nums hidden sm:block', speed !== 1 ? 'ui-accent' : 'text-zinc-300')}>
            {speed.toFixed(speed % 1 === 0 ? 0 : 2).replace(/0$/, '')}×
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-72 p-4 bg-zinc-900/95 backdrop-blur-xl border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-300">Velocidad</span>
          <span className="text-sm font-mono tabular-nums text-zinc-100">{speed.toFixed(2)}×</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => actions.setSpeed(v)}
              className={cn(
                'h-8 rounded-md text-xs font-mono tabular-nums transition-colors',
                speed === v
                  ? 'bg-ui-accent text-ui-accent-fg font-bold'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300',
              )}
            >
              {v}×
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Slider
            value={[speed]}
            min={0.25}
            max={4}
            step={0.05}
            onValueChange={([v]) => actions.setSpeed(v)}
            aria-label="Velocidad fina"
          />
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400 flex items-center gap-2">
            <AudioWaveform className="h-3.5 w-3.5" /> Corregir tono
          </span>
          <Switch checked={pitch} onCheckedChange={(v) => actions.set('audio-pitch-correction', v)} aria-label="Corrección de tono" />
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
          mapea <code className="text-zinc-500">--speed</code> · <code className="text-zinc-500">--audio-pitch-correction</code> (evita el cambio de tono)
        </p>
      </PopoverContent>
    </Popover>
  )
}
