// Tipos compartidos del protocolo puente ⇄ mpv
export interface BridgeStatus {
  mode: 'live' | 'demo'
  socketPath: string
  connected: boolean
  error?: string
  demoReason?: string
  mpvVersion?: string
  clients: number
  /** Presente cuando el puente gestiona el proceso del motor (modo escritorio) */
  engine?: { spawned: boolean; pid?: number }
}

export interface CommandMsg {
  requestId: number
  command: (string | number | boolean | Record<string, unknown>)[]
}

export interface ReplyMsg {
  requestId: number
  error: string
  data: unknown
}

export interface PropertyMsg {
  name: string
  data: unknown
}

export interface EventMsg {
  event: string
  [key: string]: unknown
}

// ---------- Modelo de pistas / playlist (espejo de mpv) ----------
export interface DemoTrack {
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

export interface DemoEntry {
  id: number
  filename: string
  title: string
  current?: boolean
  playing?: boolean
  duration: number
  chapters: { title: string; time: number }[]
  tracks: DemoTrack[]
  metadata: Record<string, string>
  palette: [string, string, string]
  kind: 'video' | 'audio'
  subScript: { start: number; end: number; text: string }[]
}
