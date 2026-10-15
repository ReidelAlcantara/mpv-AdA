'use client'
// Cliente del puente mpv: comandos + observaciones + eventos sobre WebSocket
import { io, type Socket } from 'socket.io-client'
import { OBSERVED_PROPS } from './properties'
import type { BridgeStatus, MpvEvent, PropertyMsg, Reply } from './types'

type Handlers = {
  onProperty?: (p: PropertyMsg) => void
  onEvent?: (e: MpvEvent) => void
  onStatus?: (s: BridgeStatus) => void
}

export class MpvClient {
  private socket: Socket | null = null
  private reqSeq = 1
  private pending = new Map<number, { resolve: (r: Reply) => void; timer: ReturnType<typeof setTimeout> }>()
  handlers: Handlers = {}

  connect() {
    if (this.socket?.connected) return
    // Modo escritorio (Electron): la UI la sirve el propio proceso local y el
    // socket.io vive en el mismo origen (path por defecto /socket.io).
    // Modo web (preview): se usa el gateway con XTransformPort=3030.
    const desktop = typeof window !== 'undefined' && window.__ADA_DESKTOP__ === true
    const s = desktop
      ? io('/', {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          reconnectionDelay: 800,
          reconnectionDelayMax: 4000,
        })
      : io('/?XTransformPort=3030', {
          path: '/',
          transports: ['websocket', 'polling'],
          reconnectionDelay: 800,
          reconnectionDelayMax: 4000,
        })
    this.socket = s

    s.on('mpv:property', (p: PropertyMsg) => this.handlers.onProperty?.(p))
    s.on('mpv:event', (e: MpvEvent) => this.handlers.onEvent?.(e))
    s.on('mpv:status', (st: BridgeStatus) => this.handlers.onStatus?.(st))
    s.on('connect', () => {
      // re-registrar observaciones tras cada (re)conexión
      for (const p of OBSERVED_PROPS) s.emit('mpv:observe', { property: p })
      s.emit('mpv:status-request')
    })
    s.on('disconnect', () => {
      // resolver pendientes con error para no colgar la UI
      for (const [, p] of this.pending) {
        clearTimeout(p.timer)
        p.resolve({ requestId: 0, error: 'bridge disconnected', data: null })
      }
      this.pending.clear()
    })
  }

  get connected() {
    return !!this.socket?.connected
  }

  command(cmd: (string | number | boolean | Record<string, unknown>)[]): Promise<Reply> {
    return new Promise((resolve) => {
      const s = this.socket
      if (!s || !s.connected) {
        resolve({ requestId: 0, error: 'bridge disconnected', data: null })
        return
      }
      const requestId = this.reqSeq++
      const timer = setTimeout(() => {
        this.pending.delete(requestId)
        resolve({ requestId, error: 'timeout', data: null })
      }, 8000)
      this.pending.set(requestId, { resolve, timer })
      s.emit('mpv:command', { requestId, command: cmd }, (r: Reply) => {
        // el puente solo acusa recibo en modo LIVE; la respuesta real llega por mpv:reply
        if (r && r.error === 'pending') return
        const p = this.pending.get(requestId)
        if (p) { clearTimeout(p.timer); this.pending.delete(requestId); resolve(r) }
      })
      // escuchar respuesta real
      const handler = (r: Reply) => {
        if (r.requestId === requestId) {
          s.off('mpv:reply', handler)
          const p = this.pending.get(requestId)
          if (p) { clearTimeout(p.timer); this.pending.delete(requestId); resolve(r) }
        }
      }
      s.on('mpv:reply', handler)
    })
  }

  async setProp(name: string, value: unknown): Promise<Reply> {
    return this.command(['set_property', name, value as any])
  }

  async getProp(name: string): Promise<Reply> {
    return this.command(['get_property', name])
  }

  async connectLive(socketPath: string): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      const s = this.socket
      if (!s || !s.connected) { resolve({ ok: false, error: 'sin conexión con el puente' }); return }
      s.timeout(6000).emit('mpv:connect', { socketPath }, (err: unknown, r?: { ok: boolean; error?: string }) => {
        if (err) resolve({ ok: false, error: 'tiempo de espera agotado' })
        else resolve(r ?? { ok: false, error: 'respuesta inválida' })
      })
    })
  }

  useDemo() {
    this.socket?.emit('mpv:demo')
  }

  destroy() {
    this.socket?.disconnect()
    this.socket = null
  }
}

let singleton: MpvClient | null = null
export const getMpvClient = () => {
  if (!singleton) singleton = new MpvClient()
  return singleton
}
