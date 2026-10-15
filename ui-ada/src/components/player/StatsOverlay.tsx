'use client'
// Overlay de estadísticas (inspirado en stats.lua del motor): datos en tiempo real
import { Activity, X, Cpu, HardDriveDownload, Clapperboard, AudioLines, Database } from 'lucide-react'
import { actions } from '@/lib/mpv/useMpv'
import { useProp, useUiStore, usePlayerStore } from '@/lib/store'
import { fmtBitrate, fmtBytes, fmtTime } from '@/lib/format'
import type { DemuxerCacheState } from '@/lib/mpv/types'
import { cn } from '@/lib/utils'

function Row({ k, v, accent }: { k: string; v: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className="text-[10px] text-zinc-500 shrink-0">{k}</span>
      <span className={cn('text-[11px] font-mono tabular-nums text-right truncate', accent ? 'ui-accent' : 'text-zinc-200')}>{v}</span>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-800/80 pt-1.5 mt-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-widest text-zinc-400">{title}</span>
      </div>
      {children}
    </div>
  )
}

export function StatsOverlay() {
  const setUi = useUiStore((s) => s.setUi)
  const mode = usePlayerStore((s) => s.status?.mode ?? 'demo')
  const mpvVersion = useProp<string>('mpv-version', '—')
  const vo = useProp<string>('current-vo', '—')
  const ao = useProp<string>('current-ao', '—')

  const mediaTitle = useProp<string>('media-title', '—')
  const fileFormat = useProp<string>('file-format', '—')
  const fileSize = useProp<number>('file-size', 0)
  const vbr = useProp<number>('video-bitrate', 0)
  const abr = useProp<number>('audio-bitrate', 0)
  const cache = useProp<DemuxerCacheState | null>('demuxer-cache-state', null)
  const buffering = useProp<boolean>('paused-for-cache', false)

  const width = useProp<number>('width', 0)
  const height = useProp<number>('height', 0)
  const hwdec = useProp<string>('hwdec-current', '')
  const hwdecReq = useProp<string>('hwdec', 'no')
  const fps = useProp<number>('container-fps', 0)
  const vfps = useProp<number>('estimated-vf-fps', 0)
  const frameDrops = useProp<number>('frame-drop-count', 0)
  const voDrops = useProp<number>('vo-drop-frame-count', 0)
  const scaler = useProp<string>('scale', '—')
  const speed = useProp<number>('speed', 1)
  const timePos = useProp<number>('time-pos', 0)
  const duration = useProp<number>('duration', 0)

  const audioParams = useProp<Record<string, unknown> | null>('audio-params', null)

  const cacheDur = Number(cache?.['cache-duration'] ?? 0)
  const inputRate = Number(cache?.['raw-input-rate'] ?? 0)

  return (
    <div
      className="absolute top-3 left-3 z-40 w-[290px] max-h-[85%] overflow-y-auto rounded-xl border border-zinc-700/80 bg-zinc-950/85 backdrop-blur-xl p-3 shadow-2xl ada-panel"
      role="status"
      aria-label="Estadísticas del reproductor"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 mb-1">
        <Activity className="h-3.5 w-3.5 ui-accent" />
        <span className="text-xs font-semibold text-zinc-200">Estadísticas</span>
        <span className={cn(
          'text-[9px] px-1.5 py-0.5 rounded-full border font-medium',
          mode === 'live' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300',
        )}>
          {mode === 'live' ? 'LIVE' : 'DEMO'}
        </span>
        <button className="ml-auto p-1 rounded hover:bg-zinc-800 text-zinc-500" onClick={() => setUi({ statsVisible: false })} aria-label="Cerrar estadísticas">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-0.5">
        <Row k="Motor" v={mpvVersion} />
        <Row k="Salida VO / AO" v={`${vo} · ${ao}`} />
      </div>

      <Section title="Archivo" icon={<HardDriveDownload className="h-3 w-3 text-zinc-500" />}>
        <Row k="Título" v={mediaTitle} />
        <Row k="Formato" v={fileFormat} />
        <Row k="Tamaño" v={fmtBytes(fileSize)} />
        <Row k="Posición" v={`${fmtTime(timePos)} / ${fmtTime(duration)}`} accent />
      </Section>

      <Section title="Vídeo" icon={<Clapperboard className="h-3 w-3 text-zinc-500" />}>
        <Row k="Resolución" v={width ? `${width}×${height}` : '—'} />
        <Row k="FPS cont. / medido" v={`${fps.toFixed(fps % 1 ? 3 : 0)} / ${vfps.toFixed(2)}`} />
        <Row k="Decodificación" v={hwdec === 'no' ? 'software' : hwdec || '—'} accent={hwdec !== 'no' && hwdec !== ''} />
        <Row k="Solicitado" v={`--hwdec=${hwdecReq}`} />
        <Row k="Escalador" v={scaler} />
        <Row k="Bitrate" v={fmtBitrate(vbr)} />
        <Row k="Caídas" v={`${frameDrops} dec · ${voDrops} vo`} />
      </Section>

      <Section title="Audio" icon={<AudioLines className="h-3 w-3 text-zinc-500" />}>
        <Row k="Formato" v={String(audioParams?.format ?? '—')} />
        <Row k="Canales" v={String(audioParams?.channels ?? '—')} />
        <Row k="Muestreo" v={audioParams?.samplerate ? Math.round(Number(audioParams.samplerate) / 1000) + ' kHz' : '—'} />
        <Row k="Bitrate" v={fmtBitrate(abr)} />
      </Section>

      <Section title="Caché" icon={<Database className="h-3 w-3 text-zinc-500" />}>
        <Row k="Duración caché" v={`${cacheDur.toFixed(1)} s`} accent={cacheDur < 5} />
        <Row k="Tasa de lectura" v={fmtBitrate(inputRate)} />
        <Row k="Rangos" v={(cache?.['seekable-ranges']?.length ?? 0).toString()} />
        <Row k="Estado" v={buffering ? 'reponiendo búfer…' : 'estable'} accent={buffering} />
        <div className="mt-1.5 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-ui-accent rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, (cacheDur / 30) * 100)}%` }}
          />
        </div>
      </Section>

      <Section title="Motor" icon={<Cpu className="h-3 w-3 text-zinc-500" />}>
        <Row k="Velocidad" v={`${speed.toFixed(2)}×`} />
        <Row k="Perfil" v="pulse sobre I para alternar" />
      </Section>
    </div>
  )
}
