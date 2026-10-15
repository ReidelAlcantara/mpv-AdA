// Motor de simulación: replica el comportamiento IPC de mpv 0.41
// Permite demostrar/probar la UI sin una instancia real de mpv-AdA.
import type { DemoEntry, DemoTrack, EventMsg, PropertyMsg, ReplyMsg } from './types'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const rnd = (a: number, b: number) => a + Math.random() * (b - a)

// normaliza selecciones de pista: número válido → number; 'auto'/'no' → string
function normTrackSel(v: unknown): number | string {
  if (typeof v === 'number') return Math.round(v)
  const s = String(v)
  if (/^\d+$/.test(s)) return Number(s)
  return s
}

function subScript(dur: number, bank: string[]): { start: number; end: number; text: string }[] {
  const out: { start: number; end: number; text: string }[] = []
  let t = 1.2
  let i = 0
  while (t < dur - 2) {
    const len = rnd(2.4, 5.2)
    out.push({ start: t, end: Math.min(dur - 0.5, t + len), text: bank[i % bank.length] })
    t += len + rnd(0.4, 1.6)
    i++
  }
  return out
}

function mkTracks(defs: Array<Partial<DemoTrack> & { type: DemoTrack['type'] }>): DemoTrack[] {
  const counters: Record<string, number> = { video: 0, audio: 0, sub: 0 }
  return defs.map((d) => {
    counters[d.type] += 1
    return {
      id: counters[d.type],
      type: d.type,
      title: d.title,
      lang: d.lang,
      codec: d.codec ?? 'unknown',
      codecDesc: d.codecDesc,
      default: d.default ?? false,
      forced: d.forced ?? false,
      selected: false,
      external: d.external ?? false,
      externalFilename: d.externalFilename,
      demuxChannels: d.demuxChannels,
      demuxSamplerate: d.demuxSamplerate,
      demuxBitrate: d.demuxBitrate,
      demuxW: d.demuxW,
      demuxH: d.demuxH,
      demuxFps: d.demuxFps,
    }
  })
}

function entry(partial: Omit<DemoEntry, 'id' | 'subScript'> & { subBank: string[] }): DemoEntry {
  const { subBank, ...rest } = partial
  return { ...rest, id: 0, subScript: subScript(rest.duration, subBank) }
}

const LIB = [
  entry({
    subBank: [
      '¡Bienvenido a la demostración de AdA Player!',
      'Este reproductor está construido sobre el motor mpv.',
      'La interfaz se comunica vía JSON IPC.',
      'Cada control está mapeado a una propiedad real del motor.',
      'Prueba a cambiar los subtítulos en Configuración.',
      'Los capítulos se marcan sobre la línea de tiempo.',
      'También puedes cambiar pistas de audio al vuelo.',
      'El panel derecho gestiona la cola de reproducción.',
      'Pulsa I para ver las estadísticas del motor.',
      'Pulsa H para ver todos los atajos de teclado.',
    ],
    filename: '/media/demo/Big Buck Bunny 1080p60.mkv',
    title: 'Big Buck Bunny (1080p60)',
    duration: 596,
    chapters: [
      { title: 'Presentación', time: 0 },
      { title: 'El bosque', time: 94 },
      { title: 'La venganza', time: 312 },
      { title: 'Créditos', time: 551 },
    ],
    tracks: mkTracks([
      { type: 'video', codec: 'h264', codecDesc: 'H.264 High', demuxW: 1920, demuxH: 1080, demuxFps: 60, selected: true, default: true },
      { type: 'audio', codec: 'eac3', codecDesc: 'E-AC-3 5.1', lang: 'spa', demuxChannels: '5.1(side)', demuxSamplerate: 48000, demuxBitrate: 640000, default: true },
      { type: 'audio', codec: 'aac', codecDesc: 'AAC LC estéreo', lang: 'eng', demuxChannels: 'stereo', demuxSamplerate: 48000, demuxBitrate: 192000 },
      { type: 'sub', codec: 'subrip', lang: 'spa', title: 'Español', default: true },
      { type: 'sub', codec: 'ass', lang: 'eng', title: 'English (ASS)' },
    ]),
    metadata: { title: 'Big Buck Bunny', artist: 'Blender Foundation', date: '2008', genre: 'Animación' },
    palette: ['#365314', '#84cc16', '#f7fce7'],
    kind: 'video',
  }),
  entry({
    subBank: [
      'Sintel — película abierta de la Blender Foundation.',
      'La decodificación por hardware está activada.',
      'hwdec: vaapi (copiado a memoria de vídeo).',
      'El escalador actual es lanczos.',
      'Mapa tonal HDR activo en contenidos 10-bit.',
      'Puedes ajustar el mapa tonal en Configuración → Vídeo.',
      'Caché de demuxer: 180 s de lectura anticipada.',
      'Pista de audio FLAC sin pérdida, 96 kHz.',
      'La reproducción fluida es prioridad del motor.',
      'Disfruta de la demo.',
    ],
    filename: '/media/demo/Sintel 2160p HDR.mkv',
    title: 'Sintel (2160p HDR10)',
    duration: 888,
    chapters: [
      { title: 'Apertura', time: 0 },
      { title: 'La búsqueda', time: 148 },
      { title: 'El duelista', time: 401 },
      { title: 'Reencuentro', time: 702 },
      { title: 'Créditos', time: 839 },
    ],
    tracks: mkTracks([
      { type: 'video', codec: 'hevc', codecDesc: 'HEVC Main 10', demuxW: 3840, demuxH: 2160, demuxFps: 24, selected: true, default: true },
      { type: 'audio', codec: 'flac', codecDesc: 'FLAC 5.1', lang: 'eng', demuxChannels: '5.1(side)', demuxSamplerate: 96000, demuxBitrate: 2822000, default: true },
      { type: 'audio', codec: 'aac', codecDesc: 'AAC LC', lang: 'spa', demuxChannels: 'stereo', demuxSamplerate: 48000, demuxBitrate: 160000 },
      { type: 'sub', codec: 'ass', lang: 'spa', title: 'Español completo', default: true },
      { type: 'sub', codec: 'subrip', lang: 'eng', title: 'English' },
      { type: 'sub', codec: 'subrip', lang: 'deu', title: 'Deutsch', forced: true },
    ]),
    metadata: { title: 'Sintel', artist: 'Blender Foundation', date: '2010', genre: 'Fantasía' },
    palette: ['#1e1b4b', '#818cf8', '#eef2ff'],
    kind: 'video',
  }),
  entry({
    subBank: [
      'Tears of Steel — demo de HDR y tonemapping.',
      'El mapa tonal bt.2390 procesa este contenido.',
      'Brillo máximo de pantalla: 1000 nits.',
      'Los metadatos MaxCLL/MaxFALL llegan del contenedor.',
      'Puedes tomar capturas con la tecla S.',
      'El formato de captura es configurable.',
      'Consumo de VRAM bajo gracias a --hwdec=auto-safe.',
      'Segunda pista de subtítulos disponible como secundaria.',
      'La interfaz no interfiere con el pipeline de vídeo.',
      'Todo listo para producción.',
    ],
    filename: '/media/demo/Tears of Steel 1080p.mkv',
    title: 'Tears of Steel (1080p)',
    duration: 734,
    chapters: [
      { title: 'Prólogo', time: 0 },
      { title: 'Amsterdam', time: 162 },
      { title: 'El plan', time: 388 },
      { title: 'Final', time: 640 },
    ],
    tracks: mkTracks([
      { type: 'video', codec: 'h264', codecDesc: 'H.264 High 10', demuxW: 1920, demuxH: 800, demuxFps: 24, selected: true, default: true },
      { type: 'audio', codec: 'aac', codecDesc: 'AAC 5.1', lang: 'eng', demuxChannels: '5.1(side)', demuxSamplerate: 48000, demuxBitrate: 384000, default: true },
      { type: 'sub', codec: 'ass', lang: 'spa', title: 'Español', default: true },
      { type: 'sub', codec: 'subrip', lang: 'eng', title: 'English' },
    ]),
    metadata: { title: 'Tears of Steel', artist: 'Blender Foundation', date: '2012', genre: 'Ciencia ficción' },
    palette: ['#3f1d38', '#fb7185', '#fff1f2'],
    kind: 'video',
  }),
  entry({
    subBank: [
      'Elephants Dream — el primer filme abierto.',
      'Decodificación por software en esta pista.',
      'Filtros de desentrelazado desactivados.',
      'Ajuste de sincronía de audio: 0 ms.',
      'Sincronía de vídeo: audio (por defecto).',
      'El historial de posición se guarda al salir.',
      'Reanudación automática en la próxima sesión.',
      'El modo A-B te permite repetir un fragmento.',
      'Pulsa la tecla A para marcar el punto A.',
      'Gracias por probar AdA Player.',
    ],
    filename: '/media/demo/Elephants Dream 720p.mkv',
    title: 'Elephants Dream (720p)',
    duration: 653,
    chapters: [
      { title: 'La máquina', time: 0 },
      { title: 'El abismo', time: 240 },
      { title: 'Despertar', time: 540 },
    ],
    tracks: mkTracks([
      { type: 'video', codec: 'vp9', codecDesc: 'VP9 Profile 0', demuxW: 1280, demuxH: 720, demuxFps: 24, selected: true, default: true },
      { type: 'audio', codec: 'opus', codecDesc: 'Opus estéreo', lang: 'eng', demuxChannels: 'stereo', demuxSamplerate: 48000, demuxBitrate: 128000, default: true },
      { type: 'sub', codec: 'subrip', lang: 'eng', title: 'English', default: true },
    ]),
    metadata: { title: 'Elephants Dream', artist: 'Blender Foundation', date: '2006', genre: 'Surrealismo' },
    palette: ['#312e81', '#2dd4bf', '#ecfeff'],
    kind: 'video',
  }),
  entry({
    subBank: ['— pista de solo audio —'],
    filename: '/media/musica/Cosmos FM - Sesion Chillwave.flac',
    title: 'Cosmos FM — Sesión Chillwave',
    duration: 222,
    chapters: [],
    tracks: mkTracks([
      { type: 'audio', codec: 'flac', codecDesc: 'FLAC 24-bit 96 kHz', lang: 'und', demuxChannels: 'stereo', demuxSamplerate: 96000, demuxBitrate: 2304000, default: true },
    ]),
    metadata: { title: 'Sesión Chillwave', artist: 'Cosmos FM', album: 'Transmisiones Vol. 3', date: '2025', genre: 'Chillwave' },
    palette: ['#422006', '#eab308', '#fefce8'],
    kind: 'audio',
  }),
]

export class DemoEngine {
  // ----- estado del reproductor -----
  private playlist: DemoEntry[] = []
  private playlistPos = -1
  private playingId = -1
  private nextEntryId = 1
  private timePos = 0
  private paused = true
  private idle = true
  private speed = 1
  private volume = 100
  private volumeMax = 130
  private mute = false
  private audioDelay = 0
  private subDelay = 0
  private subPos = 100
  private subScale = 1
  private subColor = '#ffffffff'
  private subFont = 'sans-serif'
  private subFontSize = 38
  private subBold = false
  private subItalic = false
  private subOutlineSize = 1.65
  private subOutlineColor = '#000000ff'
  private subShadowOffset = 0
  private subShadowColor = '#000000ff'
  private subMarginX = 19
  private subMarginY = 34
  private subBorderStyle = 'outline-and-shadow'
  private subVisibility = true
  private subScaleWithWindow = true
  private secondarySid = 'no'
  private sid = 'auto'
  private aid = 'auto'
  private vid = 'auto'
  private loopFile: 'no' | 'inf' | number = 'no'
  private keepOpen = 'no'
  private hwdec = 'auto-safe'
  private hwdecCurrent = 'vaapi'
  private deinterlace = 'auto'
  private scaler = 'lanczos'
  private toneMapping = 'auto'
  private videoSync = 'audio'
  private interpolation = false
  private demuxerMaxBytes = 150
  private cacheSecs = 180
  private abLoopA = 'no'
  private abLoopB = 'no'
  private gaplessAudio = 'weak'
  private replaygain = 'no'
  private pitchCorrection = true
  private audioChannels = 'auto-safe'
  private seeking = false
  private buffering = false
  private bufferState = 100
  private cacheRanges: { start: number; end: number }[] = []
  private frameDrops = 0
  private voDropped = 0
  private displayFps = 60
  private startAt = Date.now()
  private lastTick = Date.now()
  private lastTimeNotify = 0
  private lastCacheNotify = 0
  private lastBrNotify = 0
  private lastSubText = ''
  private undoSeekMark: number | null = null
  private observed = new Map<number, string>()
  private entrySeq = 0
  private confMap: Record<string, unknown> = {
    'screenshot-format': 'jpg',
    'screenshot-template': 'mpv-shot%n',
    'screenshot-jpeg-quality': 90,
    'screenshot-directory': '',
  }

  emit: (m: ReplyMsg | PropertyMsg | EventMsg) => void = () => {}

  constructor() {
    this.seedPlaylist()
    // auto-arranque: la demo comienza reproduciendo la primera entrada
    setTimeout(() => this.playIndex(0, true), 700)
  }

  private seedPlaylist() {
    this.playlist = LIB.map((e) => ({ ...e, id: this.nextEntryId++ }))
    this.playlistPos = 0
  }

  // ---------- utilidades ----------
  private cur(): DemoEntry | null {
    return this.playlist[this.playlistPos] ?? null
  }

  private now() {
    return (Date.now() - this.startAt) / 1000
  }

  private notifyProp(name: string) {
    for (const [id, prop] of this.observed) {
      if (prop === name) {
        this.emit({ id, name, data: this.getProp(name) })
      }
    }
  }

  private notifyAllObserved() {
    for (const [id, prop] of this.observed) {
      this.emit({ id, name: prop, data: this.getProp(prop) })
    }
  }

  private selectedTrack(type: 'video' | 'audio' | 'sub', mainIdx = 0): DemoTrack | null {
    const cur = this.cur()
    if (!cur) return null
    const sel = cur.tracks.filter((t) => t.type === type)
    const val = type === 'video' ? this.vid : type === 'audio' ? this.aid : this.sid
    let chosen: DemoTrack | undefined
    if (val === 'no') chosen = undefined
    else if (val === 'auto' || typeof val === 'number') {
      chosen = sel.find((t) => (typeof val === 'number' ? t.id === val : t.default)) ?? sel[mainIdx]
    }
    return chosen ?? null
  }

  private videoBitrate = 4800000
  private audioBitrate = 192000

  // ---------- propiedades ----------
  getProp(name: string): unknown {
    const cur = this.cur()
    switch (name) {
      case 'pause': return this.paused
      case 'paused-for-cache': return this.buffering
      case 'cache-buffering-state': return this.bufferState
      case 'time-pos':
      case 'playback-time': return this.idle || !cur ? null : Number(this.timePos.toFixed(3))
      case 'percent-pos': return !cur || cur.duration <= 0 ? null : Number(((this.timePos / cur.duration) * 100).toFixed(2))
      case 'duration': return !cur ? null : cur.duration
      case 'time-remaining': return !cur ? null : Number((cur.duration - this.timePos).toFixed(3))
      case 'speed': return this.speed
      case 'volume': return this.volume
      case 'volume-max': return this.volumeMax
      case 'mute': return this.mute
      case 'audio-delay': return this.audioDelay
      case 'sub-delay': return this.subDelay
      case 'sub-pos': return this.subPos
      case 'sub-scale': return this.subScale
      case 'sub-color': return this.subColor
      case 'sub-font': return this.subFont
      case 'sub-font-size': return this.subFontSize
      case 'sub-bold': return this.subBold
      case 'sub-italic': return this.subItalic
      case 'sub-outline-size': return this.subOutlineSize
      case 'sub-outline-color': return this.subOutlineColor
      case 'sub-shadow-offset': return this.subShadowOffset
      case 'sub-shadow-color': return this.subShadowColor
      case 'sub-margin-x': return this.subMarginX
      case 'sub-margin-y': return this.subMarginY
      case 'sub-border-style': return this.subBorderStyle
      case 'sub-visibility': return this.subVisibility
      case 'sub-scale-with-window': return this.subScaleWithWindow
      case 'sub-text': {
        if (!cur || !this.subVisibility) return ''
        const line = cur.subScript.find((s) => this.timePos + this.subDelay >= s.start && this.timePos + this.subDelay <= s.end)
        return line?.text ?? ''
      }
      case 'sub-start': {
        if (!cur) return null
        const line = cur.subScript.find((s) => this.timePos + this.subDelay >= s.start && this.timePos + this.subDelay <= s.end)
        return line?.start ?? null
      }
      case 'sid': return this.sid
      case 'secondary-sid': return this.secondarySid
      case 'aid': return this.aid
      case 'vid': return this.vid
      case 'chapter': {
        if (!cur || cur.chapters.length === 0) return null
        let ch = -1
        cur.chapters.forEach((c, i) => { if (this.timePos >= c.time) ch = i })
        return ch
      }
      case 'chapters': return cur ? cur.chapters.length : 0
      case 'chapter-list': return cur ? cur.chapters : []
      case 'chapter-metadata': {
        if (!cur) return {}
        let ch = -1
        cur.chapters.forEach((c, i) => { if (this.timePos >= c.time) ch = i })
        return ch >= 0 ? { title: cur.chapters[ch].title } : {}
      }
      case 'track-list': {
        if (!cur) return []
        return cur.tracks.map((t) => ({
          id: t.id, type: t.type, title: t.title, lang: t.lang, codec: t.codec, codecDesc: t.codecDesc,
          default: t.default, forced: t.forced, selected: t.selected, external: t.external, externalFilename: t.externalFilename,
          demuxChannels: t.demuxChannels, demuxSamplerate: t.demuxSamplerate, demuxBitrate: t.demuxBitrate,
          demuxW: t.demuxW, demuxH: t.demuxH, demuxFps: t.demuxFps,
        }))
      }
      case 'current-tracks/video': {
        const t = this.selectedTrack('video')
        if (!t) return { id: null, type: 'video', selected: false }
        return { id: t.id, type: 'video', codec: t.codec, demuxW: t.demuxW, demuxH: t.demuxH, demuxFps: t.demuxFps, selected: true }
      }
      case 'current-tracks/audio': {
        const t = this.selectedTrack('audio')
        if (!t) return { id: null, type: 'audio', selected: false }
        return { id: t.id, type: 'audio', lang: t.lang, codec: t.codec, demuxChannels: t.demuxChannels, demuxSamplerate: t.demuxSamplerate, selected: true }
      }
      case 'current-tracks/sub': {
        const t = this.selectedTrack('sub')
        if (!t) return { id: null, type: 'sub', selected: false }
        return { id: t.id, type: 'sub', lang: t.lang, title: t.title, codec: t.codec, selected: true }
      }
      case 'playlist': {
        return this.playlist.map((e) => ({
          filename: e.filename, title: e.title, current: e.id === this.playingId, playing: e.id === this.playingId, id: e.id,
        }))
      }
      case 'playlist-count': return this.playlist.length
      case 'playlist-pos':
      case 'playlist-current-pos': return this.playlistPos
      case 'playlist-playing-pos': return this.playingId >= 0 ? this.playlistPos : -1
      case 'metadata': return cur ? { ...cur.metadata } : {}
      case 'filename': return cur ? cur.filename.split('/').pop() : ''
      case 'filename/no-ext': return cur ? (cur.filename.split('/').pop() ?? '').replace(/\.[^.]+$/, '') : ''
      case 'path': return cur ? cur.filename : ''
      case 'media-title': return cur ? (cur.metadata.title ?? cur.title) : ''
      case 'file-format': return cur?.kind === 'audio' ? 'flac' : 'Matroska'
      case 'file-size': return cur ? Math.round(cur.duration * 5200000) : null
      case 'container-fps': return this.selectedTrack('video')?.demuxFps ?? null
      case 'estimated-vf-fps': return Number((this.selectedTrack('video')?.demuxFps ?? 0).toFixed(3))
      case 'width': return this.selectedTrack('video')?.demuxW ?? null
      case 'height': return this.selectedTrack('video')?.demuxH ?? null
      case 'video-params': {
        const t = this.selectedTrack('video')
        if (!t) return null
        return {
          pixelformat: 'yuv420p', w: t.demuxW, h: t.demuxH, dw: t.demuxW, dh: t.demuxH, aspect: Number(((t.demuxW ?? 16) / (t.demuxH ?? 9)).toFixed(4)),
          par: 1, colormatrix: 'bt.709', primaries: 'bt.709', gamma: 'bt.1886', colorlevels: 'limited', rotate: 0, 'stereo-in': 'mono',
        }
      }
      case 'audio-params': {
        const t = this.selectedTrack('audio')
        return t ? { format: 'floatp', samplerate: t.demuxSamplerate, channels: t.demuxChannels, 'channel-count': t.demuxChannels?.includes('5.1') ? 6 : 2 } : null
      }
      case 'audio-device-list': return [
        { name: 'auto', description: 'Autoseleccionar dispositivo' },
        { name: 'pipewire/output', description: 'PipeWire — Salida por defecto' },
        { name: 'alsa/output.3', description: 'ALSA — HDA Intel HDMI 0' },
        { name: 'alsa/output.2', description: 'ALSA — Analógico' },
      ]
      case 'hwdec': return this.hwdec
      case 'hwdec-current': return this.hwdecCurrent
      case 'deinterlace': return this.deinterlace
      case 'scale': return this.scaler
      case 'tone-mapping': return this.toneMapping
      case 'video-sync': return this.videoSync
      case 'interpolation': return this.interpolation
      case 'gapless-audio': return this.gaplessAudio
      case 'replaygain': return this.replaygain
      case 'audio-pitch-correction': return this.pitchCorrection
      case 'audio-channels': return this.audioChannels
      case 'demuxer-max-bytes': return this.demuxerMaxBytes * 1024 * 1024
      case 'cache-secs': return this.cacheSecs
      case 'demuxer-cache-state': return {
        'seekable-ranges': this.cacheRanges.map((r) => ({ start: Number(r.start.toFixed(2)), end: Number(r.end.toFixed(2)) })),
        'bof-cached': this.cacheRanges.some((r) => r.start <= 0.5),
        'eof-cached': cur ? this.cacheRanges.some((r) => r.end >= cur.duration - 1) : false,
        'fw-bytes': Math.round(this.cacheRanges.reduce((a, r) => a + (r.end - r.start), 0) * 5200000 / 8),
        'cache-end': this.cacheRanges.at(-1)?.end ?? 0,
        'reader-pts': Number(this.timePos.toFixed(2)),
        'cache-duration': Number(((this.cacheRanges.at(-1)?.end ?? 0) - this.timePos).toFixed(2)),
        'raw-input-rate': Math.round(this.videoBitrate + this.audioBitrate + rnd(-80000, 80000)),
        eof: false, underrun: this.buffering, idle: this.idle, 'total-bytes': 0, 'file-cache-bytes': 0,
      }
      case 'video-bitrate': return Math.round(this.videoBitrate)
      case 'audio-bitrate': return Math.round(this.audioBitrate)
      case 'frame-drop-count': return this.frameDrops
      case 'vo-drop-frame-count': return this.voDropped
      case 'display-fps': return this.displayFps
      case 'seeking': return this.seeking
      case 'core-idle': return this.paused || this.idle || this.buffering
      case 'eof-reached': return false
      case 'idle-active': return this.idle
      case 'loop-file': return this.loopFile
      case 'keep-open': return this.keepOpen
      case 'ab-loop-a': return this.abLoopA
      case 'ab-loop-b': return this.abLoopB
      case 'vo-configured': return true
      case 'current-vo': return 'gpu-next'
      case 'current-ao': return 'pipewire'
      case 'mpv-version': return '0.41.0-AdA (demo)'
      case 'platform': return 'linux'
      case 'user-data/ada/palette': return cur ? cur.palette : null
      case 'user-data/ada/kind': return cur ? cur.kind : null
      case 'screenshot-format': case 'screenshot-template': case 'screenshot-jpeg-quality':
      case 'screenshot-directory': case 'screenshot-png-compression': case 'screenshot-webp-lossless':
        return this.confMap[name] ?? null
      case 'seekable': return true
      case 'partially-seekable': return false
      case 'profile-list': return [
        { name: 'high-quality', type: 'builtin' },
        { name: 'fast', type: 'builtin' },
        { name: 'pseudo-gui', type: 'builtin' },
        { name: 'low-latency', type: 'builtin' },
      ]
      default: return null
    }
  }

  setProp(name: string, value: unknown): string | null {
    const num = (v: unknown, lo: number, hi: number, dflt: number) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v))
      return Number.isFinite(n) ? clamp(n, lo, hi) : dflt
    }
    const bool = (v: unknown) => (typeof v === 'boolean' ? v : v === 'yes' || v === 'true')
    switch (name) {
      case 'pause': this.paused = bool(value); break
      case 'speed': this.speed = num(value, 0.01, 100, 1); break
      case 'volume': this.volume = num(value, 0, this.volumeMax, 100); break
      case 'volume-max': this.volumeMax = num(value, 100, 1000, 130); break
      case 'mute': this.mute = bool(value); break
      case 'audio-delay': this.audioDelay = num(value, -10, 10, 0); break
      case 'sub-delay': this.subDelay = num(value, -10, 10, 0); break
      case 'sub-pos': this.subPos = num(value, 0, 150, 100); break
      case 'sub-scale': this.subScale = num(value, 0.1, 10, 1); break
      case 'sub-color': this.subColor = String(value); break
      case 'sub-font': this.subFont = String(value); break
      case 'sub-font-size': this.subFontSize = num(value, 5, 200, 38); break
      case 'sub-bold': this.subBold = bool(value); break
      case 'sub-italic': this.subItalic = bool(value); break
      case 'sub-outline-size': this.subOutlineSize = num(value, 0, 30, 1.65); break
      case 'sub-outline-color': this.subOutlineColor = String(value); break
      case 'sub-shadow-offset': this.subShadowOffset = num(value, 0, 30, 0); break
      case 'sub-shadow-color': this.subShadowColor = String(value); break
      case 'sub-margin-x': this.subMarginX = num(value, 0, 300, 19); break
      case 'sub-margin-y': this.subMarginY = num(value, 0, 300, 34); break
      case 'sub-border-style': this.subBorderStyle = String(value); break
      case 'sub-visibility': this.subVisibility = bool(value); break
      case 'sub-scale-with-window': this.subScaleWithWindow = bool(value); break
      case 'sid': this.sid = normTrackSel(value); this.refreshTracks(); break
      case 'secondary-sid': this.secondarySid = normTrackSel(value); break
      case 'aid': this.aid = normTrackSel(value); this.refreshTracks(); break
      case 'vid': this.vid = normTrackSel(value); this.refreshTracks(); break
      case 'loop-file': this.loopFile = value as 'no' | 'inf' | number; break
      case 'keep-open': this.keepOpen = String(value); break
      case 'hwdec': this.hwdec = String(value); this.hwdecCurrent = value === 'no' ? 'no' : value === 'auto-safe' || value === 'auto' ? 'vaapi' : String(value).replace('-copy', ''); break
      case 'deinterlace': this.deinterlace = String(value); break
      case 'scale': this.scaler = String(value); break
      case 'tone-mapping': this.toneMapping = String(value); break
      case 'video-sync': this.videoSync = String(value); break
      case 'interpolation': this.interpolation = bool(value); break
      case 'gapless-audio': this.gaplessAudio = String(value); break
      case 'replaygain': this.replaygain = String(value); break
      case 'audio-pitch-correction': this.pitchCorrection = bool(value); break
      case 'audio-channels': this.audioChannels = String(value); break
      case 'demuxer-max-bytes': this.demuxerMaxBytes = num(value, 0, 4096, 150) / (1024 * 1024); break
      case 'cache-secs': this.cacheSecs = num(value, 1, 3600, 180); break
      case 'playback-time':
      case 'time-pos': case 'percent-pos': {
        const cur = this.cur()
        if (!cur) return 'property unavailable'
        let t: number
        if (name === 'percent-pos') t = (num(value, 0, 100, 0) / 100) * cur.duration
        else t = num(value, 0, cur.duration, 0)
        this.doSeek(t, false)
        return null
      }
      case 'playlist-pos':
      case 'playlist-current-pos': {
        const idx = Math.round(num(value, -1, this.playlist.length - 1, 0))
        if (idx === -1) { this.stop(true); return null }
        this.playIndex(idx, false)
        return null
      }
      case 'screenshot-format': case 'screenshot-template': case 'screenshot-jpeg-quality':
      case 'screenshot-directory': case 'screenshot-png-compression': case 'screenshot-webp-lossless': {
        this.confMap[name] = value
        return null
      }
      default: return 'property unavailable'
    }
    this.notifyProp(name)
    return null
  }

  private refreshTracks() {
    const cur = this.cur()
    if (!cur) return
    for (const t of cur.tracks) {
      t.selected =
        (t.type === 'video' && (this.vid === 'no' ? false : this.selectedTrack('video')?.id === t.id)) ||
        (t.type === 'audio' && (this.aid === 'no' ? false : this.selectedTrack('audio')?.id === t.id)) ||
        (t.type === 'sub' && (this.sid === 'no' ? false : this.selectedTrack('sub')?.id === t.id))
    }
    this.notifyProp('track-list')
  }

  // ---------- comandos ----------
  handleCommand(requestId: number, command: unknown[]): void {
    const cmd = String(command[0] ?? '')
    const arg = (i: number) => command[i]
    switch (cmd) {
      case 'client_name': return this.reply(requestId, 'success', 'ipc-demo')
      case 'get_version': return this.reply(requestId, 'success', '2.5')
      case 'get_time_us': return this.reply(requestId, 'success', Math.round(this.now() * 1e6))
      case 'get_property': return this.reply(requestId, this.getProp(String(arg(1))) === null ? 'property unavailable' : 'success', this.getProp(String(arg(1))))
      case 'get_property_string': {
        const v = this.getProp(String(arg(1)))
        return this.reply(requestId, v === null ? 'property unavailable' : 'success', typeof v === 'object' ? JSON.stringify(v) : String(v))
      }
      case 'set_property': {
        const err = this.setProp(String(arg(1)), arg(2))
        return this.reply(requestId, err ?? 'success', null)
      }
      case 'set_property_string': {
        let v: unknown = arg(2)
        try { v = JSON.parse(String(arg(2))) } catch { /* string */ }
        const err = this.setProp(String(arg(1)), v)
        return this.reply(requestId, err ?? 'success', null)
      }
      case 'observe_property':
      case 'observe_property_string': {
        const id = Number(arg(1))
        const prop = String(arg(2))
        this.observed.set(id, prop)
        this.emit({ id, name: prop, data: this.getProp(prop) })
        return this.reply(requestId, 'success', null)
      }
      case 'unobserve_property': {
        this.observed.delete(Number(arg(1)))
        return this.reply(requestId, 'success', null)
      }
      case 'loadfile': {
        const url = String(arg(1))
        const flags = String(arg(2) ?? 'replace')
        const entry = this.makeEntryFromUrl(url)
        const play = flags.includes('play') || flags.includes('replace')
        if (flags.includes('replace')) {
          this.playlist = [entry]
          this.playlistPos = 0
          if (!flags.includes('play')) this.playIndex(0, true)
          else this.playIndex(0, true)
        } else if (flags.includes('append')) {
          this.playlist.push(entry)
          if (flags.includes('play') && this.playlistPos < 0) this.playIndex(this.playlist.length - 1, true)
        } else if (flags.includes('insert-next')) {
          this.playlist.splice(this.playlistPos + 1, 0, entry)
        } else if (flags.includes('insert-at')) {
          const idx = clamp(Number(arg(3) ?? this.playlist.length), 0, this.playlist.length)
          this.playlist.splice(idx, 0, entry)
        }
        this.notifyProp('playlist')
        this.notifyProp('playlist-count')
        this.notifyProp('playlist-pos')
        return this.reply(requestId, 'success', null)
      }
      case 'loadlist': {
        // demo: interpreta el nombre como una colección
        const url = String(arg(1))
        const entry = this.makeEntryFromUrl(url)
        this.playlist.push(entry)
        if (this.playlistPos < 0) this.playIndex(this.playlist.length - 1, true)
        this.notifyProp('playlist')
        this.notifyProp('playlist-count')
        return this.reply(requestId, 'success', null)
      }
      case 'playlist-next':
      case 'playlist-prev': {
        const dir = cmd === 'playlist-next' ? 1 : -1
        const weak = String(arg(1) ?? 'weak') === 'weak'
        const next = this.playlistPos + dir
        if (next < 0 || next >= this.playlist.length) {
          if (weak) return this.reply(requestId, 'success', null)
          this.stop(true)
          return this.reply(requestId, 'success', null)
        }
        this.playIndex(next, true)
        return this.reply(requestId, 'success', null)
      }
      case 'playlist-play-index': {
        const a = arg(1)
        if (a === 'none' || a === -1) { this.stop(true); return this.reply(requestId, 'success', null) }
        if (a === 'current') { this.playIndex(this.playlistPos, true); return this.reply(requestId, 'success', null) }
        const idx = clamp(Number(a), 0, this.playlist.length - 1)
        this.playIndex(idx, true)
        return this.reply(requestId, 'success', null)
      }
      case 'playlist-clear': {
        const keepCur = this.playlist[this.playlistPos]
        this.playlist = keepCur ? [keepCur] : []
        this.playlistPos = keepCur ? 0 : -1
        this.notifyProp('playlist')
        this.notifyProp('playlist-count')
        return this.reply(requestId, 'success', null)
      }
      case 'playlist-remove': {
        const a = arg(1)
        const idx = a === 'current' || a === undefined ? this.playlistPos : clamp(Number(a), 0, this.playlist.length - 1)
        if (idx < 0 || !this.playlist[idx]) return this.reply(requestId, 'invalid parameter', null)
        this.playlist.splice(idx, 1)
        if (idx < this.playlistPos) this.playlistPos--
        if (this.playlist.length === 0) this.stop(true)
        else if (this.playlistPos >= this.playlist.length) this.playIndex(this.playlist.length - 1, false)
        else this.playlistPos = clamp(this.playlistPos, 0, this.playlist.length - 1)
        this.notifyProp('playlist')
        this.notifyProp('playlist-count')
        this.notifyProp('playlist-pos')
        return this.reply(requestId, 'success', null)
      }
      case 'playlist-move': {
        const from = Number(arg(1)), to = Number(arg(2))
        if (from < 0 || from >= this.playlist.length || to < 0 || to >= this.playlist.length) return this.reply(requestId, 'invalid parameter', null)
        const [moved] = this.playlist.splice(from, 1)
        this.playlist.splice(to, 0, moved)
        this.notifyProp('playlist')
        this.notifyProp('playlist-pos')
        return this.reply(requestId, 'success', null)
      }
      case 'playlist-shuffle': {
        const current = this.playlist[this.playlistPos]
        const rest = this.playlist.filter((_, i) => i !== this.playlistPos)
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[rest[i], rest[j]] = [rest[j], rest[i]]
        }
        this.playlist = current ? [current, ...rest] : rest
        this.playlistPos = current ? 0 : -1
        this.notifyProp('playlist')
        this.notifyProp('playlist-pos')
        return this.reply(requestId, 'success', null)
      }
      case 'playlist-unshuffle': return this.reply(requestId, 'success', null)
      case 'stop': {
        this.stop(String(arg(1)) !== 'keep-playlist')
        return this.reply(requestId, 'success', null)
      }
      case 'quit': case 'quit-watch-later': {
        this.stop(true)
        return this.reply(requestId, 'success', null)
      }
      case 'seek': {
        const cur = this.cur()
        if (!cur) return this.reply(requestId, 'property unavailable', null)
        const target = Number(arg(1))
        const flags = String(arg(2) ?? 'relative')
        let t: number
        if (flags.includes('absolute-percent')) t = (target / 100) * cur.duration
        else if (flags.includes('relative-percent')) t = this.timePos + (target / 100) * cur.duration
        else if (flags.includes('absolute')) t = target
        else t = this.timePos + target
        this.doSeek(clamp(t, 0, cur.duration), !flags.includes('keyframes'))
        return this.reply(requestId, 'success', null)
      }
      case 'revert-seek': {
        if (this.undoSeekMark !== null) {
          const m = this.undoSeekMark
          this.undoSeekMark = null
          this.doSeek(m, true)
        }
        return this.reply(requestId, 'success', null)
      }
      case 'frame-step': {
        const n = Number(arg(1) ?? 1)
        this.timePos = clamp(this.timePos + 1 / 60 * Math.max(1, n), 0, this.cur()?.duration ?? 0)
        this.paused = true
        this.notifyProp('pause')
        this.notifyProp('time-pos')
        return this.reply(requestId, 'success', null)
      }
      case 'frame-back-step': {
        this.timePos = clamp(this.timePos - 1 / 60, 0, this.cur()?.duration ?? 0)
        this.paused = true
        this.notifyProp('pause')
        this.notifyProp('time-pos')
        return this.reply(requestId, 'success', null)
      }
      case 'cycle': {
        const prop = String(arg(1))
        const curV = this.getProp(prop)
        const nextVal = arg(2) === 'down' ? -1 : 1
        if (typeof curV === 'boolean') this.setProp(prop, !curV)
        else if (typeof curV === 'number') {
          const step = prop === 'volume' ? 5 : prop.includes('delay') ? 0.05 : prop === 'speed' ? 0.25 : 1
          this.setProp(prop, Number(curV) + step * nextVal)
        } else this.setProp(prop, curV)
        return this.reply(requestId, 'success', null)
      }
      case 'add': case 'multiply': {
        const prop = String(arg(1))
        const curV = this.getProp(prop)
        if (typeof curV === 'number') {
          const delta = Number(arg(2)) * (cmd === 'multiply' ? 1 : 1)
          this.setProp(prop, cmd === 'multiply' ? Number(curV) * delta : Number(curV) + delta)
        }
        return this.reply(requestId, 'success', null)
      }
      case 'ab-loop': {
        const cur = this.cur()
        if (!cur) return this.reply(requestId, 'property unavailable', null)
        if (this.abLoopA === 'no' || typeof this.abLoopA === 'string' && this.abLoopA === 'no') {
          this.abLoopA = Number(this.timePos.toFixed(3))
        } else if (this.abLoopB === 'no' || typeof this.abLoopB === 'string' && this.abLoopB === 'no') {
          this.abLoopB = Number(this.timePos.toFixed(3))
        } else {
          this.abLoopA = 'no'; this.abLoopB = 'no'
        }
        this.notifyProp('ab-loop-a'); this.notifyProp('ab-loop-b')
        return this.reply(requestId, 'success', null)
      }
      case 'screenshot': {
        const stamp = new Date()
        const fn = `/home/usuario/Imágenes/mpv-shot${String(this.entrySeq).padStart(4, '0')}.jpg`
        this.entrySeq++
        setTimeout(() => this.reply(requestId, 'success', { filename: fn, stamp: stamp.toISOString() }), 350)
        return
      }
      case 'screenshot-to-file': {
        const fn = String(arg(1))
        setTimeout(() => this.reply(requestId, 'success', { filename: fn }), 350)
        return
      }
      case 'sub-add': case 'audio-add': case 'video-add': {
        const cur = this.cur()
        if (!cur) return this.reply(requestId, 'property unavailable', null)
        const url = String(arg(1))
        const type = cmd.split('-')[0] as 'sub' | 'audio' | 'video'
        const isSub = type === 'sub'
        const maxId = Math.max(0, ...cur.tracks.filter((t) => t.type === type).map((t) => t.id))
        const fname = url.split('/').pop() ?? url
        const langMatch = fname.match(/[\._-](spa|es|eng|en|deu|ger|fra|fre|por|ita)[\._-]/i)
        const langMap: Record<string, string> = { spa: 'spa', es: 'spa', eng: 'eng', en: 'eng', deu: 'deu', ger: 'deu', fra: 'fra', fre: 'fra', por: 'por', ita: 'ita' }
        const lang = langMatch ? langMap[langMatch[1].toLowerCase()] : undefined
        cur.tracks.push({
          id: maxId + 1, type, title: fname.replace(/\.[^.]+$/, ''), lang, codec: isSub ? 'subrip' : 'aac',
          codecDesc: isSub ? 'SubRip (externo)' : 'AAC (externo)', default: false, forced: false, selected: false,
          external: true, externalFilename: url,
        })
        this.refreshTracks()
        this.notifyProp('track-list')
        return this.reply(requestId, 'success', null)
      }
      case 'sub-remove': case 'audio-remove': {
        const cur = this.cur()
        if (!cur) return this.reply(requestId, 'property unavailable', null)
        const type = (cmd.split('-')[0] as 'sub' | 'audio') + ''
        const idArg = arg(1)
        const sel = cur.tracks.filter((t) => t.type === type)
        const target = idArg === undefined ? sel.find((t) => t.selected) : sel.find((t) => t.id === Number(idArg))
        if (target && target.external) {
          cur.tracks = cur.tracks.filter((t) => t !== target)
          this.refreshTracks()
          this.notifyProp('track-list')
        }
        return this.reply(requestId, 'success', null)
      }
      case 'apply-profile': {
        const p = String(arg(1))
        if (p === 'high-quality') { this.scaler = 'ewa_lanczossharp'; this.toneMapping = 'bt.2390'; this.interpolation = true; this.hwdec = 'auto' }
        else if (p === 'fast') { this.scaler = 'bilinear'; this.interpolation = false; this.hwdec = 'auto-copy' }
        else if (p === 'low-latency') { this.videoSync = 'display-desync'; this.interpolation = false }
        else if (p !== 'pseudo-gui') return this.reply(requestId, 'invalid parameter', null)
        ;['scale', 'tone-mapping', 'interpolation', 'hwdec', 'video-sync'].forEach((k) => this.notifyProp(k))
        return this.reply(requestId, 'success', null)
      }
      case 'write-watch-later-config': return this.reply(requestId, 'success', null)
      case 'show-text': case 'show-progress': case 'keypress': case 'keybind':
      case 'enable-section': case 'disable-section': case 'define-section':
      case 'script-message': case 'script-message-to':
      case 'rescan-external-files': case 'sub-reload': case 'audio-reload':
        return this.reply(requestId, 'success', null)
      case 'set': {
        const err = this.setProp(String(arg(1)), arg(2))
        return this.reply(requestId, err ?? 'success', null)
      }
      case 'get': {
        const v = this.getProp(String(arg(1)))
        return this.reply(requestId, v === null ? 'property unavailable' : 'success', v)
      }
      default:
        return this.reply(requestId, 'invalid parameter', null)
    }
  }

  private reply(requestId: number, error: string, data: unknown) {
    this.emit({ requestId, error, data })
  }

  private makeEntryFromUrl(url: string): DemoEntry {
    const fname = url.split('/').pop() ?? url
    const clean = decodeURIComponent(fname.replace(/\.[^.]+$/, ''))
    const duration = rnd(120, 900)
    const palettes: [string, string, string][] = [
      ['#134e4a', '#2dd4bf', '#f0fdfa'], ['#4c1d95', '#a78bfa', '#f5f3ff'],
      ['#7f1d1d', '#f87171', '#fef2f2'], ['#365314', '#a3e635', '#fefce8'],
    ]
    const isAudio = /\.(mp3|flac|ogg|opus|wav|m4a)$/i.test(url)
    return {
      id: this.nextEntryId++,
      filename: url,
      title: clean,
      duration: Math.round(duration),
      chapters: [
        { title: 'Parte 1', time: 0 },
        { title: 'Parte 2', time: duration * 0.4 },
        { title: 'Parte 3', time: duration * 0.75 },
      ],
      tracks: isAudio
        ? mkTracks([{ type: 'audio', codec: 'flac', codecDesc: 'FLAC estéreo', demuxChannels: 'stereo', demuxSamplerate: 44100, demuxBitrate: 900000, default: true }])
        : mkTracks([
            { type: 'video', codec: 'h264', codecDesc: 'H.264 High', demuxW: 1920, demuxH: 1080, demuxFps: 24, default: true, selected: true },
            { type: 'audio', codec: 'aac', codecDesc: 'AAC LC', lang: 'und', demuxChannels: 'stereo', demuxSamplerate: 48000, demuxBitrate: 160000, default: true },
          ]),
      metadata: { title: clean },
      palette: palettes[Math.floor(Math.random() * palettes.length)],
      kind: isAudio ? 'audio' : 'video',
      subScript: subScript(duration, [
        `«${clean}» — archivo añadido por el usuario.`,
        'Los subtítulos externos se detectan automáticamente con --sub-auto=fuzzy.',
        'Este contenido se está reproduciendo desde la cola de demostración.',
        'AdA Player: interfaz moderna para el motor mpv.',
      ]),
    }
  }

  // ---------- reproducción ----------
  private playIndex(idx: number, emitStart: boolean) {
    const entry = this.playlist[idx]
    if (!entry) return
    this.playlistPos = idx
    this.playingId = entry.id
    this.idle = false
    this.timePos = 0
    this.paused = false
    this.buffering = true
    this.bufferState = 0
    this.cacheRanges = [{ start: 0, end: 4 }]
    this.vid = 'auto'; this.aid = 'auto'; this.sid = 'auto'
    if (emitStart) this.emit({ event: 'start-file', playlist_entry_id: entry.id })
    setTimeout(() => {
      if (this.cur()?.id !== entry.id) return
      this.buffering = false
      this.bufferState = 100
      this.emit({ event: 'file-loaded' })
      this.emit({ event: 'playback-restart' })
      this.notifyAllObserved()
    }, 420)
    this.notifyProp('idle-active')
    this.notifyProp('playlist')
    this.notifyProp('playlist-pos')
    this.notifyProp('playlist-playing-pos')
    this.notifyProp('pause')
  }

  private stop(idle: boolean) {
    this.emit({ event: 'end-file', reason: 'stop', playlist_entry_id: this.playingId })
    this.playingId = -1
    if (idle) {
      this.playlistPos = -1
      this.idle = true
      this.paused = true
      this.timePos = 0
      this.cacheRanges = []
    }
    this.notifyAllObserved()
  }

  private doSeek(t: number, _exact: boolean) {
    const cur = this.cur()
    if (!cur) return
    this.undoSeekMark = this.timePos
    this.timePos = t
    this.seeking = true
    this.notifyProp('time-pos'); this.notifyProp('percent-pos'); this.notifyProp('playback-time')
    this.emit({ event: 'seek' })
    // simular rebuffering en saltos grandes
    const jump = Math.abs(t - (this.cacheRanges.at(-1)?.end ?? 0))
    if (jump > 30) {
      this.buffering = true
      this.bufferState = 0
      this.notifyProp('paused-for-cache')
    }
    setTimeout(() => {
      this.seeking = false
      this.buffering = false
      this.bufferState = 100
      this.emit({ event: 'playback-restart' })
      this.notifyProp('seeking'); this.notifyProp('paused-for-cache'); this.notifyProp('cache-buffering-state')
    }, 180)
  }

  // ---------- bucle de simulación ----------
  tick() {
    const now = Date.now()
    const dt = (now - this.lastTick) / 1000
    this.lastTick = now
    const cur = this.cur()
    if (cur && !this.paused && !this.buffering && !this.idle) {
      this.timePos += dt * this.speed
      // A-B loop
      const a = typeof this.abLoopA === 'number' ? this.abLoopA : null
      const b = typeof this.abLoopB === 'number' ? this.abLoopB : null
      if (a !== null && b !== null && this.timePos >= b) { this.timePos = a }
      // EOF
      if (this.timePos >= cur.duration) {
        if (this.loopFile === 'inf' || (typeof this.loopFile === 'number' && this.loopFile > 0)) {
          this.timePos = 0
          if (typeof this.loopFile === 'number') this.loopFile--
        } else if (this.keepOpen === 'yes' || this.keepOpen === 'always') {
          this.timePos = cur.duration
          this.paused = true
          this.notifyProp('pause'); this.notifyProp('eof-reached')
        } else {
          const next = this.playlistPos + 1
          if (next < this.playlist.length) {
            this.emit({ event: 'end-file', reason: 'eof', playlist_entry_id: cur.id })
            this.playIndex(next, true)
          } else {
            this.stop(true)
          }
          return
        }
      }
    }
    // caché creciente
    if (cur && !this.idle) {
      const cacheEnd = this.cacheRanges.at(-1)
      if (cacheEnd && cacheEnd.end < cur.duration && !this.paused) {
        cacheEnd.end = Math.min(cur.duration, cacheEnd.end + dt * 45 * this.speed)
      }
      if (this.timePos > (cacheEnd?.end ?? 0) + 2 && !this.buffering) {
        this.buffering = true; this.bufferState = 0
        this.notifyProp('paused-for-cache'); this.notifyProp('cache-buffering-state')
        setTimeout(() => { this.buffering = false; this.bufferState = 100; this.notifyProp('paused-for-cache'); this.notifyProp('cache-buffering-state') }, 600)
      }
    }
    // notificaciones limitadas
    if (now - this.lastTimeNotify > 200) {
      this.lastTimeNotify = now
      if (!this.paused && !this.buffering && cur) {
        this.notifyProp('time-pos'); this.notifyProp('percent-pos'); this.notifyProp('playback-time'); this.notifyProp('time-remaining')
        this.notifyProp('sub-text'); this.notifyProp('sub-start')
      }
    }
    if (now - this.lastCacheNotify > 1500) {
      this.lastCacheNotify = now
      this.notifyProp('demuxer-cache-state')
      if (cur && !this.paused) {
        const base = this.selectedTrack('video')?.demuxBitrate ?? 4000000
        this.videoBitrate = base * rnd(0.92, 1.08)
        this.audioBitrate = (this.selectedTrack('audio')?.demuxBitrate ?? 192000) * rnd(0.95, 1.05)
        this.notifyProp('video-bitrate'); this.notifyProp('audio-bitrate')
        if (!this.paused) { this.frameDrops += Math.random() < 0.08 ? 1 : 0; this.voDropped += Math.random() < 0.05 ? 1 : 0 }
      }
    }
  }
}
