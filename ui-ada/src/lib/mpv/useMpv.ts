'use client'
// Hook maestro: cablea el cliente IPC con los stores y expone acciones de alto nivel
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { getMpvClient } from './client'
import { usePlayerStore, useUiStore } from '../store'
import type { MpvEvent } from './types'

export function useMpv() {
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const client = getMpvClient()
    const setPropValue = usePlayerStore.getState().setPropValue
    const setStatus = usePlayerStore.getState().setStatus
    const pushEvent = usePlayerStore.getState().pushEvent

    client.handlers = {
      onProperty: (p) => setPropValue(p.name, p.data),
      onStatus: (s) => setStatus(s),
      onEvent: (e: MpvEvent) => {
        pushEvent(e.event)
        if (e.event === 'bridge-connected') toast.success('Motor mpv conectado', { description: String(e.socketPath ?? '') })
        if (e.event === 'bridge-disconnected') toast.warning('Se perdió la conexión con el motor', { description: 'Volviendo al modo demo' })
        if (e.event === 'shutdown') toast.info('El motor se cerró')
        if (e.event === 'end-file' && e.reason === 'error') {
          toast.error('Error al reproducir el archivo', { description: String(e.file_error ?? '') })
        }
      },
    }
    client.connect()
    return () => {
      // el cliente persiste durante toda la sesión
    }
  }, [])
}

// ---------- Acciones de alto nivel (envolturas de comandos) ----------
const cmd = (c: Parameters<ReturnType<typeof getMpvClient>['command']>[0]) => getMpvClient().command(c)

export const actions = {
  togglePause: () => cmd(['cycle', 'pause']),
  pause: (v: boolean) => cmd(['set_property', 'pause', v]),
  seek: (deltaSec: number) => cmd(['seek', deltaSec, 'relative+exact']),
  seekTo: (absSec: number, keyframes = false) => cmd(['seek', absSec, keyframes ? 'absolute+keyframes' : 'absolute+exact']),
  seekPercent: (pct: number) => cmd(['seek', pct, 'absolute-percent+exact']),
  revertSeek: () => cmd(['revert-seek']),
  next: () => cmd(['playlist-next', 'force']),
  prev: () => cmd(['playlist-prev', 'force']),
  playIndex: (i: number | 'current') => cmd(['playlist-play-index', i]),
  chapterSeek: (d: number) => cmd(['add', 'chapter', d]),
  setChapter: (i: number) => cmd(['set_property', 'chapter', i]),
  frameStep: () => cmd(['frame-step', 1]),
  frameBackStep: () => cmd(['frame-back-step']),
  setSpeed: (v: number) => cmd(['set_property', 'speed', v]),
  cycleSpeed: (d: number) => cmd(['multiply', 'speed', d > 0 ? 1.25 : 0.8]),
  setVolume: (v: number) => cmd(['set_property', 'volume', v]),
  addVolume: (d: number) => cmd(['add', 'volume', d]),
  toggleMute: () => cmd(['cycle', 'mute']),
  setMute: (v: boolean) => cmd(['set_property', 'mute', v]),
  screenshot: async () => {
    const r = await cmd(['screenshot'])
    if (r.error === 'success' && r.data && typeof r.data === 'object') {
      const fn = (r.data as { filename?: string }).filename ?? 'captura'
      toast.success('Captura guardada', { description: fn })
    } else if (r.error !== 'success') {
      toast.error('No se pudo tomar la captura', { description: r.error })
    }
    return r
  },
  abLoop: () => cmd(['ab-loop']),
  subSeek: (d: number) => cmd(['sub-seek', d]),
  subStep: (d: number) => cmd(['sub-step', d]),
  setSubDelay: (v: number) => cmd(['set_property', 'sub-delay', v]),
  addSubDelay: (d: number) => cmd(['add', 'sub-delay', d]),
  setAudioDelay: (v: number) => cmd(['set_property', 'audio-delay', v]),
  addAudioDelay: (d: number) => cmd(['add', 'audio-delay', d]),
  loadFile: (url: string, flags: 'replace' | 'append' | 'append+play' = 'append+play') => cmd(['loadfile', url, flags, -1, '']),
  stop: () => cmd(['stop', 'keep-playlist']),
  quit: () => cmd(['quit']),
  clearPlaylist: () => cmd(['playlist-clear']),
  removeEntry: (i: number | 'current') => cmd(['playlist-remove', i]),
  moveEntry: (from: number, to: number) => cmd(['playlist-move', from, to]),
  shuffle: () => cmd(['playlist-shuffle']),
  setLoopFile: (v: 'no' | 'inf' | number) => cmd(['set_property', 'loop-file', v]),
  cycleLoop: () => {
    const cur = usePlayerStore.getState().props['loop-file'] ?? 'no'
    const next = cur === 'no' ? 'inf' : 'no'
    return cmd(['set_property', 'loop-file', next])
  },
  setTrack: (type: 'video' | 'audio' | 'sub', value: number | 'auto' | 'no') =>
    cmd(['set_property', type === 'video' ? 'vid' : type === 'audio' ? 'aid' : 'sid', value]),
  setSecondarySub: (value: number | 'auto' | 'no') => cmd(['set_property', 'secondary-sid', value]),
  subAdd: (url: string) => cmd(['sub-add', url, 'select']),
  audioAdd: (url: string) => cmd(['audio-add', url, 'select']),
  set: (prop: string, value: unknown) => cmd(['set_property', prop, value as any]),
  add: (prop: string, delta: number) => cmd(['add', prop, delta]),
  applyProfile: (name: string) => cmd(['apply-profile', name]),
}
