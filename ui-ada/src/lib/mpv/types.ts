// Tipos del dominio mpv (espejo del motor y del puente)

export interface BridgeStatus {
  mode: 'live' | 'demo'
  socketPath: string
  connected: boolean
  error?: string
  demoReason?: string
  mpvVersion?: string
  clients: number
}

export interface Track {
  id: number
  type: 'video' | 'audio' | 'sub'
  title?: string
  lang?: string
  codec: string
  codecDesc?: string
  default: boolean
  forced: boolean
  selected: boolean
  external: boolean
  externalFilename?: string
  demuxChannels?: string
  demuxSamplerate?: number
  demuxBitrate?: number
  demuxW?: number
  demuxH?: number
  demuxFps?: number
}

export interface PlaylistEntry {
  filename: string
  title?: string
  current?: boolean
  playing?: boolean
  id: number
}

export interface Chapter {
  title: string
  time: number
}

export interface DemuxerCacheState {
  'seekable-ranges': { start: number; end: number }[]
  'bof-cached'?: boolean
  'eof-cached'?: boolean
  'fw-bytes'?: number
  'cache-end'?: number
  'reader-pts'?: number
  'cache-duration'?: number
  'raw-input-rate'?: number
  eof?: boolean
  underrun?: boolean
  idle?: boolean
}

export interface VideoParams {
  pixelformat: string
  w: number
  h: number
  dw: number
  dh: number
  aspect: number
  colormatrix: string
  primaries: string
  gamma: string
  rotate?: number
}

export interface AudioParams {
  format: string
  samplerate: number
  channels: string
  'channel-count'?: number
}

export interface Reply {
  requestId: number
  error: string
  data: unknown
}

export type MpvEvent = { event: string } & Record<string, unknown>

// Ajustes de interfaz (persistidos localmente, independientes del motor)
export interface UiPrefs {
  accent: string
  playlistOpen: boolean
  showRemaining: boolean
  autoHideSecs: number
  lastSocketPath: string
  statsVisible: boolean
}

export const ACCENTS: Record<string, { label: string; css: string; fg: string }> = {
  amber: { label: 'Ámbar', css: '#f59e0b', fg: '#1c1917' },
  coral: { label: 'Coral', css: '#fb7185', fg: '#1c1917' },
  emerald: { label: 'Esmeralda', css: '#10b981', fg: '#052e1b' },
  violeta: { label: 'Violeta', css: '#a78bfa', fg: '#1e1b4b' },
  cian: { label: 'Cian', css: '#22d3ee', fg: '#083344' },
  lima: { label: 'Lima', css: '#a3e635', fg: '#1a2e05' },
}
