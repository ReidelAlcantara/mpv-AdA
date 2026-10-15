'use client'
// Selectores de pista: vídeo, audio y subtítulos (incluye secundaria y externas)
import { useState } from 'react'
import { AudioLines, Subtitles, Video, Plus, Trash2, CircleCheck, Circle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { actions } from '@/lib/mpv/useMpv'
import { useProp } from '@/lib/store'
import { langName } from '@/lib/format'
import type { Track } from '@/lib/mpv/types'
import { cn } from '@/lib/utils'

type TrackType = 'video' | 'audio' | 'sub'

function trackLabel(t: Track): string {
  if (t.title) return t.title
  if (t.lang) return langName(t.lang)
  return `${t.type === 'sub' ? 'Subtítulo' : t.type === 'audio' ? 'Audio' : 'Vídeo'} ${t.id}`
}

function trackDesc(t: Track): string {
  const bits: string[] = []
  if (t.codecDesc) bits.push(t.codecDesc)
  else bits.push(t.codec)
  if (t.demuxChannels) bits.push(t.demuxChannels)
  if (t.demuxSamplerate) bits.push(Math.round(t.demuxSamplerate / 1000) + ' kHz')
  if (t.demuxW) bits.push(`${t.demuxW}×${t.demuxH}`)
  if (t.demuxFps) bits.push(`${t.demuxFps.toFixed(t.demuxFps % 1 ? 3 : 0)} fps`)
  return bits.join(' · ')
}

function TrackRow({ t, active, onPick, showPick }: { t: Track; active: boolean; onPick: () => void; showPick: boolean }) {
  return (
    <DropdownMenuItem
      key={t.id}
      onSelect={(e) => { e.preventDefault(); onPick() }}
      className="gap-2.5 py-2.5 items-start data-[highlighted]:bg-zinc-800"
    >
      <span className="mt-0.5 shrink-0">
        {active ? <CircleCheck className="h-4 w-4 ui-accent" /> : <Circle className="h-4 w-4 text-zinc-600" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-sm font-medium', active ? 'text-zinc-50' : 'text-zinc-300')}>{trackLabel(t)}</span>
          {t.lang && <span className="text-[10px] uppercase text-zinc-500 tracking-wide">{t.lang}</span>}
          {t.default && <Flag>predet.</Flag>}
          {t.forced && <Flag>forzada</Flag>}
          {t.external && <Flag>externa</Flag>}
        </span>
        <span className="block text-[11px] text-zinc-500 truncate mt-0.5">{trackDesc(t)}</span>
      </span>
      {showPick && t.external && (
        <button
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
          title="Quitar pista externa"
        >
          <Trash2 className="h-3.5 w-3.5 text-zinc-500" />
        </button>
      )}
    </DropdownMenuItem>
  )
}

function Flag({ children }: { children: React.ReactNode }) {
  return <span className="text-[9px] rounded px-1 py-px bg-zinc-800 text-zinc-400 border border-zinc-700">{children}</span>
}

export function TrackMenu({ type }: { type: TrackType }) {
  const tracks = useProp<Track[]>('track-list', []).filter((t) => t.type === type)
  const sid = useProp<number | string>('sid', 'auto')
  const aid = useProp<number | string>('aid', 'auto')
  const vid = useProp<number | string>('vid', 'auto')
  const secondarySid = useProp<number | string>('secondary-sid', 'no')
  const [open, setOpen] = useState(false)

  const current = type === 'sub' ? sid : type === 'audio' ? aid : vid
  const curNum = typeof current === 'number' ? current : Number(current)
  const propName = type === 'sub' ? 'sid' : type === 'audio' ? 'aid' : 'vid'
  const Icon = type === 'sub' ? Subtitles : type === 'audio' ? AudioLines : Video
  const label = type === 'sub' ? 'Subtítulos' : type === 'audio' ? 'Audio' : 'Vídeo'

  const activeTrack = Number.isFinite(curNum) ? tracks.find((t) => t.id === curNum) ?? null : null
  const isOff = current === 'no'
  const isAuto = current === 'auto'

  const [addOpen, setAddOpen] = useState(false)
  const [addUrl, setAddUrl] = useState('')

  const addExternal = async () => {
    if (!addUrl.trim()) return
    if (type === 'sub') await actions.subAdd(addUrl.trim())
    else if (type === 'audio') await actions.audioAdd(addUrl.trim())
    setAddOpen(false)
    setAddUrl('')
    toast.success('Pista externa añadida', { description: addUrl })
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'h-9 px-2.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2',
              (isOff || (type !== 'video' && activeTrack == null && !isAuto)) && 'text-zinc-500',
            )}
            aria-label={`Pistas de ${label}`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {type !== 'video' && (
              <span className="text-xs text-zinc-300 hidden lg:block max-w-24 truncate">
                {isOff ? 'off' : activeTrack ? trackLabel(activeTrack) : 'auto'}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-1.5 bg-zinc-900/95 backdrop-blur-xl border-zinc-700 group">
          <DropdownMenuLabel className="text-xs text-zinc-500 px-2">{label}</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-800" />

          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); actions.setTrack(type, 'auto') }} className="gap-2.5">
            {isAuto ? <CircleCheck className="h-4 w-4 ui-accent" /> : <Circle className="h-4 w-4 text-zinc-600" />}
            <span className="text-sm text-zinc-300">Automático</span>
            <span className="ml-auto text-[10px] text-zinc-600">--{propName}=auto</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); actions.setTrack(type, 'no') }} className="gap-2.5">
            {isOff ? <CircleCheck className="h-4 w-4 ui-accent" /> : <Circle className="h-4 w-4 text-zinc-600" />}
            <span className="text-sm text-zinc-300">Desactivado</span>
            <span className="ml-auto text-[10px] text-zinc-600">--{propName}=no</span>
          </DropdownMenuItem>

          {tracks.length > 0 && <DropdownMenuSeparator className="bg-zinc-800" />}
          {tracks.map((t) => (
            <TrackRow
              key={`${t.type}-${t.id}-${t.external ? 'ext' : 'in'}`}
              t={t}
              active={t.id === curNum}
              onPick={() => actions.setTrack(type, t.id)}
              showPick={false}
            />
          ))}

          {type === 'sub' && (
            <>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuLabel className="text-xs text-zinc-500 px-2">Subtítulo secundario</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={secondarySid !== 'no'}
                onCheckedChange={(v) => actions.setSecondarySub(v ? (tracks.find((t) => t.id !== curNum)?.id ?? 'auto') : 'no')}
                className="text-sm"
              >
                <Sparkles className="h-4 w-4 ui-accent" /> Activar secundario
              </DropdownMenuCheckboxItem>
              {tracks.filter((t) => t.id !== curNum).slice(0, 3).map((t) => (
                <DropdownMenuItem key={`2-${t.id}`} onSelect={(e) => { e.preventDefault(); actions.setSecondarySub(t.id) }} className="gap-2.5 pl-8">
                  {secondarySid == t.id ? <CircleCheck className="h-3.5 w-3.5 ui-accent" /> : <Circle className="h-3.5 w-3.5 text-zinc-600" />}
                  <span className="text-xs text-zinc-400">{trackLabel(t)}</span>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setAddOpen(true) }} className="gap-2.5">
            <Plus className="h-4 w-4 ui-accent" />
            <span className="text-sm text-zinc-200">Cargar {type === 'sub' ? 'subtítulos' : type === 'audio' ? 'audio' : 'vídeo'} externo…</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent aria-describedby={undefined} className="bg-zinc-900 border-zinc-700 max-w-md">
          <DialogHeader>
            <DialogTitle>Cargar pista externa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400 -mt-2">
            Ruta o URL del archivo {type === 'sub' ? '(srt, ass, vtt…)' : type === 'audio' ? '(mka, mp3, flac…)' : '(mkv, mp4…)'}.
            En modo LIVE se pasa tal cual al motor.
          </p>
          <Input
            placeholder={type === 'sub' ? '/media/subs/pelicula.spa.srt' : '/media/audio/comentario.mka'}
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExternal()}
            className="font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={addExternal} className="bg-ui-accent text-ui-accent-fg hover:brightness-110">Añadir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
