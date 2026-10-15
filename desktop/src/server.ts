// Servidor local de AdA Player Desktop.
// - Sirve la UI estática (Next.js export) en http://127.0.0.1:<puerto>
//   inyectando el modo escritorio (html.ada-desktop + window.__ADA_DESKTOP__).
// - Expone socket.io en /socket.io y traduce los mensajes del protocolo del
//   puente (mpv:command / observe / reply / property / event / status).
// - MODO LIVE: cliente del JSON IPC del motor (Windows: \\.\pipe\nombre;
//   Unix: socket de archivos), con spawn y auto-reinicio acotado del motor.
// - MODO DEMO: motor simulado con el mismo protocolo (degradación suave).
//
// Este archivo se compila a CJS con:
//   bun build desktop/src/server.ts --target=node --format=cjs \
//        --external:socket.io --outfile desktop/server.js
// (socket.io y sus dependencias se resuelven desde node_modules en runtime).
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { existsSync } from 'node:fs'
import net from 'node:net'
import { spawn, type ChildProcess } from 'node:child_process'
import { Server } from 'socket.io'
import { DemoEngine } from './demo-engine'
import type { BridgeStatus, CommandMsg, EventMsg, PropertyMsg, ReplyMsg } from './types'

const IS_WINDOWS = process.platform === 'win32'

export interface DesktopServerOptions {
  /** Directorio con el export estático de la UI (index.html, _next/…) */
  uiDir: string
  /** Puerto de escucha (0 = automático). Por defecto 0. */
  port?: number
  /** Interfaz de escucha. Por defecto 127.0.0.1 (nunca exponer en red). */
  host?: string
  /** Ruta IPC del motor. Por defecto: win32 \\.\pipe\mpv-ada-<pid>; unix /tmp/mpv-ada-<pid>.sock */
  pipePath?: string
  /** Ejecutable del motor (mpv.exe). Si se define, el servidor lo gestiona. */
  enginePath?: string
  /** Argumentos extra del motor (además de --input-ipc-server). */
  engineArgs?: string[]
  /** Directorio de trabajo del motor (donde está portable_config). */
  engineCwd?: string
  /** Inyectar modo escritorio en el HTML (por defecto true). */
  injectDesktop?: boolean
  /** Logger opcional. */
  log?: (line: string) => void
}

export interface DesktopServerHandle {
  port: number
  pipePath: string
  /** Estado actual del puente (misma forma que BridgeStatus de la UI). */
  getStatus(): BridgeStatus
  /** Carga un archivo en el motor (apertura desde argv/drag&drop en main). */
  loadFile(path: string, mode?: 'replace' | 'append-play'): void
  /** Cierra el motor de forma ordenada (quit por IPC + kill de respaldo). */
  stopEngine(opts?: { gracefulMs?: number }): Promise<void>
  /** Cierra el servidor HTTP y socket.io. */
  close(): Promise<void>
}

const logFn = (line: string) => console.log(`[ada-server] ${line}`)
const DESKTOP_INJECT =
  '<script>try{document.documentElement.classList.add("ada-desktop");window.__ADA_DESKTOP__=true}catch(e){}</script>'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.wasm': 'application/wasm',
}

function normalizePipe(p: string): string {
  if (!IS_WINDOWS) return p
  if (p.startsWith('\\\\')) return p
  return `\\\\.\\pipe\\${p.replace(/^\.?\\?pipe\\/, '')}`
}

export function startDesktopServer(opts: DesktopServerOptions): Promise<DesktopServerHandle> {
  const log = opts.log ?? logFn
  const uiDir = opts.uiDir
  const host = opts.host ?? '127.0.0.1'
  const port = opts.port ?? 0
  const pipePath = normalizePipe(
    opts.pipePath ||
      process.env.MPV_IPC_SOCKET ||
      (IS_WINDOWS ? `mpv-ada-${process.pid}` : `/tmp/mpv-ada-${process.pid}.sock`),
  )
  const enginePath = opts.enginePath || process.env.MPV_ENGINE_PATH || ''
  const engineArgs = opts.engineArgs ?? []
  const engineCwd = opts.engineCwd
  const SPAWN = !!enginePath

  // ------------------------- servidor HTTP (UI estática) -------------------------
  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    serveStatic(req, res).catch((err) => {
      log(`error sirviendo ${req.url}: ${err}`)
      if (!res.headersSent) {
        res.statusCode = 500
        res.end('error interno')
      }
    })
  })

  async function serveStatic(req: IncomingMessage, res: ServerResponse) {
    const method = req.method ?? 'GET'
    if (method !== 'GET' && method !== 'HEAD') {
      res.statusCode = 405
      res.end()
      return
    }
    let pathname: string
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
    } catch {
      pathname = '/'
    }
    // SPA: la raíz (y rutas sin extensión) sirven index.html
    const isAsset = extname(pathname) !== ''
    let filePath = normalize(join(uiDir, pathname === '/' ? 'index.html' : pathname))
    if (!filePath.startsWith(normalize(uiDir))) {
      res.statusCode = 403
      res.end('prohibido')
      return
    }
    if (!existsSync(filePath)) {
      if (isAsset) {
        res.statusCode = 404
        res.end('no encontrado')
        return
      }
      filePath = join(uiDir, 'index.html')
    }

    let body = await readFile(filePath)
    const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    if (filePath.endsWith('index.html') && opts.injectDesktop !== false) {
      let html = body.toString('utf8')
      if (/<head>/i.test(html)) html = html.replace(/<head>/i, `<head>${DESKTOP_INJECT}`)
      else html = html.replace(/<\/head>/i, `${DESKTOP_INJECT}</head>`)
      body = Buffer.from(html, 'utf8')
    }
    res.setHeader('Content-Type', type)
    res.setHeader(
      'Cache-Control',
      pathname.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-store',
    )
    res.setHeader('Content-Length', body.length)
    res.end(method === 'HEAD' ? undefined : body)
  }

  const io = new Server(httpServer, {
    path: '/socket.io',
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 8e6,
  })

  // ------------------------- estado del puente -------------------------
  let mode: 'live' | 'demo' = 'demo'
  let liveError = ''
  let mpvVersion = ''
  let engineProc: ChildProcess | null = null
  let engineRestarts = 0
  let engineQuitRequested = false
  let shuttingDown = false
  const MAX_RESTARTS = 5

  const status = (): BridgeStatus => ({
    mode,
    socketPath: pipePath,
    connected: mode === 'live',
    error: mode === 'live' ? undefined : liveError || undefined,
    demoReason: mode === 'demo' ? 'Motor mpv no detectado — modo demostración activo' : undefined,
    mpvVersion: mode === 'live' ? mpvVersion : '0.41.0-AdA (demo)',
    clients: io.engine.clientsCount,
    engine: engineProc ? { spawned: true, pid: engineProc.pid } : undefined,
  })
  const broadcastStatus = () => io.emit('mpv:status', status())

  // ------------------------- cliente IPC real (LIVE) -------------------------
  let mpvSock: net.Socket | null = null
  let liveBuf = ''
  let liveLastThrottle: Record<string, number> = {}
  const THROTTLE: Record<string, number> = {
    'time-pos': 120, 'percent-pos': 120, 'playback-time': 120, 'time-remaining': 250,
    'video-bitrate': 1000, 'audio-bitrate': 1000, 'demuxer-cache-state': 1000, 'sub-text': 150,
  }

  function connectLive(socketPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection(socketPath)
      const timeout = setTimeout(() => {
        sock.destroy()
        reject(new Error(`Tiempo de espera agotado conectando a ${socketPath}`))
      }, 2500)
      sock.on('connect', () => {
        clearTimeout(timeout)
        mpvSock = sock
        liveBuf = ''
        mode = 'live'
        liveError = ''
        engineQuitRequested = false
        liveLastThrottle = {}
        io.emit('mpv:event', { event: 'bridge-connected', socketPath })
        broadcastStatus()
        const req = { command: ['get_property', 'mpv-version'], request_id: 999001 }
        sock.write(JSON.stringify(req) + '\n')
        resolve()
      })
      sock.on('data', (chunk) => {
        liveBuf += chunk.toString('utf8')
        let idx: number
        while ((idx = liveBuf.indexOf('\n')) >= 0) {
          const line = liveBuf.slice(0, idx).trim()
          liveBuf = liveBuf.slice(idx + 1)
          if (!line || line.startsWith('#')) continue
          let msg: any
          try { msg = JSON.parse(line) } catch { continue }
          handleMpvMessage(msg)
        }
      })
      sock.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
      sock.on('close', () => {
        if (mode === 'live') {
          mode = 'demo'
          liveError = 'Conexión con el motor perdida'
          mpvSock = null
          io.emit('mpv:event', { event: 'bridge-disconnected' })
          broadcastStatus()
        }
      })
    })
  }

  function handleMpvMessage(msg: any) {
    if (msg.event) {
      if (msg.event === 'property-change') {
        const name = String(msg.name)
        const throttleMs = THROTTLE[name]
        const now = Date.now()
        if (throttleMs) {
          if (liveLastThrottle[name] && now - liveLastThrottle[name] < throttleMs) return
          liveLastThrottle[name] = now
        }
        const p: PropertyMsg = { name, data: msg.data }
        io.emit('mpv:property', p)
      } else {
        const ev: EventMsg = { event: msg.event, ...msg }
        io.emit('mpv:event', ev)
        if (msg.event === 'shutdown') {
          engineQuitRequested = true
          mpvSock?.end()
          mpvSock = null
          mode = 'demo'
          liveError = 'El motor se cerró'
          broadcastStatus()
        }
      }
      return
    }
    if (typeof msg.request_id === 'number') {
      if (msg.request_id >= 900000) {
        if (msg.request_id === 999001 && typeof msg.data === 'string') mpvVersion = msg.data
        return
      }
      const reply: ReplyMsg = { requestId: msg.request_id, error: msg.error ?? 'success', data: msg.data }
      io.emit('mpv:reply', reply)
    }
  }

  // ------------------------- gestión del motor -------------------------
  function startEngine() {
    const exe = enginePath
    const args = [`--input-ipc-server=${pipePath}`, ...engineArgs]
    log(`lanzando motor: ${exe} ${args.join(' ')}`)
    engineQuitRequested = false
    engineProc = spawn(exe, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: engineCwd,
      windowsHide: true,
    })
    engineProc.stdout?.on('data', (d) => log(`[mpv] ${d}`))
    engineProc.stderr?.on('data', (d) => log(`[mpv] ${d}`))
    engineProc.on('error', (err) => {
      log(`no se pudo lanzar el motor: ${err.message}`)
      engineProc = null
    })
    engineProc.on('exit', (code, sig) => {
      log(`motor terminado (code=${code} sig=${sig})`)
      engineProc = null
      broadcastStatus()
      if (SPAWN && !engineQuitRequested && !shuttingDown && engineRestarts < MAX_RESTARTS) {
        engineRestarts += 1
        log(`reiniciando motor (intento ${engineRestarts}/${MAX_RESTARTS})...`)
        setTimeout(() => {
          if (shuttingDown || engineProc) return
          startEngine()
          retryConnect(30).catch(() => { /* el error se reporta via status */ })
        }, 1000)
      }
    })
    broadcastStatus()
  }

  async function retryConnect(attempts = 30, delayMs = 500): Promise<void> {
    let lastErr: any = null
    for (let i = 0; i < attempts; i++) {
      if (shuttingDown) throw new Error('puente cerrándose')
      try {
        await connectLive(pipePath)
        return
      } catch (e: any) {
        lastErr = e
        await new Promise((r) => setTimeout(r, delayMs))
      }
    }
    throw new Error(
      `No se pudo conectar al motor tras ${attempts} intentos (${pipePath}): ${lastErr?.message ?? lastErr}`,
    )
  }

  function liveSend(requestId: number, command: unknown[]) {
    if (!mpvSock || mode !== 'live') return
    const msg = { command, request_id: requestId }
    mpvSock.write(JSON.stringify(msg) + '\n')
  }

  // observaciones compartidas en LIVE (refcount entre clientes)
  const liveObserved = new Map<string, number>()
  const obsCounter = { n: 900100 }
  function liveObserve(prop: string) {
    if (liveObserved.has(prop)) {
      liveObserved.set(prop, (liveObserved.get(prop) ?? 0) + 1)
      return
    }
    liveObserved.set(prop, 1)
    obsCounter.n += 1
    liveSend(0, ['observe_property', obsCounter.n, prop])
  }
  function liveUnobserve(prop: string) {
    const n = liveObserved.get(prop) ?? 0
    if (n <= 1) {
      liveObserved.delete(prop)
      liveSend(0, ['unobserve_property', 0])
    } else {
      liveObserved.set(prop, n - 1)
    }
  }

  // ------------------------- motor demo -------------------------
  const demo = new DemoEngine()
  demo.emit = (m) => {
    if ('requestId' in m && typeof (m as any).requestId === 'number') {
      io.emit('mpv:reply', m as ReplyMsg)
    } else if ('event' in m) {
      io.emit('mpv:event', m as EventMsg)
    } else if ('name' in m) {
      io.emit('mpv:property', m as PropertyMsg)
    }
  }
  const demoTimer = setInterval(() => { if (mode === 'demo') demo.tick() }, 100)

  // ------------------------- clientes socket.io -------------------------
  io.on('connection', (socket) => {
    socket.emit('mpv:status', status())

    socket.on('mpv:command', (msg: CommandMsg, ack?: (r: ReplyMsg) => void) => {
      if (msg && Array.isArray(msg.command)) {
        if (mode === 'live') {
          liveSend(msg.requestId, msg.command)
          if (ack) ack({ requestId: msg.requestId, error: 'pending', data: null })
        } else {
          demo.handleCommand(msg.requestId, msg.command)
        }
      }
    })

    socket.on('mpv:observe', (msg: { property: string }) => {
      if (msg?.property) {
        if (mode === 'live') liveObserve(msg.property)
        else {
          const id = 500000 + Math.abs(hashCode(msg.property)) % 100000
          demo.handleCommand(id, ['observe_property', id, msg.property])
        }
      }
    })

    socket.on('mpv:unobserve', (msg: { property: string }) => {
      if (msg?.property && mode === 'live') liveUnobserve(msg.property)
    })

    socket.on('mpv:connect', async (msg: { socketPath?: string }, ack?: (r: { ok: boolean; error?: string }) => void) => {
      const path = normalizePipe(msg?.socketPath || pipePath)
      try {
        if (mpvSock) { mpvSock.removeAllListeners('close'); mpvSock.destroy(); mpvSock = null }
        if (SPAWN && path === pipePath && !engineProc) {
          engineRestarts = 0
          startEngine()
        }
        if (SPAWN && path === pipePath) {
          await retryConnect(20)
        } else {
          await connectLive(path)
        }
        for (const prop of liveObserved.keys()) {
          obsCounter.n += 1
          liveSend(0, ['observe_property', obsCounter.n, prop])
        }
        ack?.({ ok: true })
        socket.emit('mpv:status', status())
      } catch (e: any) {
        liveError = e?.message ?? String(e)
        mode = 'demo'
        broadcastStatus()
        ack?.({ ok: false, error: liveError })
      }
    })

    socket.on('mpv:demo', () => {
      if (mpvSock) { mpvSock.removeAllListeners('close'); mpvSock.destroy(); mpvSock = null }
      mode = 'demo'
      liveError = ''
      broadcastStatus()
    })

    socket.on('mpv:status-request', () => socket.emit('mpv:status', status()))
    socket.on('disconnect', () => broadcastStatus())
  })

  function hashCode(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0 }
    return h
  }

  // ------------------------- API programática -------------------------
  const handle: DesktopServerHandle = {
    get port() { return (httpServer.address() as any)?.port ?? 0 },
    pipePath,
    getStatus: () => status(),
    loadFile(path, mode2 = 'append-play') {
      const id = 950000 + Math.floor(Math.random() * 40000)
      if (mode === 'live') liveSend(id, ['loadfile', path, mode2])
      else demo.handleCommand(id, ['loadfile', path, mode2])
    },
    stopEngine(opts2) {
      const gracefulMs = opts2?.gracefulMs ?? 1200
      return new Promise<void>((resolve) => {
        engineQuitRequested = true
        shuttingDown = true
        const finish = () => {
          if (engineProc) {
            try { engineProc.kill() } catch { /* noop */ }
          }
          resolve()
        }
        if (mpvSock && mode === 'live') {
          try {
            mpvSock.write(JSON.stringify({ command: ['quit'], request_id: 999002 }) + '\n')
          } catch { /* noop */ }
          const t = setTimeout(finish, gracefulMs)
          mpvSock.once('close', () => { clearTimeout(t); finish() })
        } else {
          finish()
        }
      })
    },
    close() {
      return new Promise<void>((resolve) => {
        shuttingDown = true
        clearInterval(demoTimer)
        if (engineProc) { try { engineProc.kill() } catch { /* noop */ } }
        io.close()
        httpServer.close(() => resolve())
        setTimeout(resolve, 1500)
      })
    },
  }

  // ------------------------- arranque -------------------------
  return new Promise<DesktopServerHandle>((resolve, reject) => {
    httpServer.once('error', (err) => reject(err))
    httpServer.listen(port, host, () => {
      log(`UI en http://${host}:${handle.port} | IPC: ${pipePath}${SPAWN ? ' (motor gestionado)' : ''}`)
      // arranque del motor + conexión LIVE silenciosa
      ;(async () => {
        if (SPAWN) {
          try {
            startEngine()
            await retryConnect(40, 400)
            log(`LIVE: motor lanzado y conectado via ${pipePath}`)
          } catch (e: any) {
            liveError = `No se pudo arrancar/conectar el motor (${e?.message ?? e})`
            log(`DEMO: ${liveError}`)
          }
        } else {
          try {
            await connectLive(pipePath)
            log(`LIVE: conectado a ${pipePath}`)
          } catch (e: any) {
            liveError = `Sin motor en ${pipePath} (${e?.message ?? 'inaccesible'})`
            log(`DEMO: ${liveError}`)
          }
        }
      })()
      resolve(handle)
    })
  })
}

// Modo standalone (pruebas): node server.js --ui <dir> [--engine <exe>] ...
if (process.argv[1] && process.argv[1].endsWith('server.js') && !process.env.ADA_EMBEDDED) {
  const argv = process.argv.slice(2)
  const flag = (name: string) => {
    const i = argv.indexOf(name)
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined
  }
  const uiDir = flag('--ui') ?? join(process.cwd(), 'out')
  startDesktopServer({
    uiDir,
    port: Number(flag('--port')) || 0,
    enginePath: flag('--engine'),
    engineArgs: (flag('--engine-args') ?? '--idle=yes --force-window=yes --osc=no --no-terminal')
      .split(/\s+/).filter(Boolean),
    log: (l) => console.log(`[ada] ${l}`),
  })
    .then((h) => console.log(`[ada] servidor listo en http://127.0.0.1:${h.port}`))
    .catch((e) => { console.error('[ada] fallo:', e); process.exit(1) })
}
