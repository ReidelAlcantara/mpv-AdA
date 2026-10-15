'use client'
// Diálogo de conexión: explica y gestiona el enlace con el motor real (JSON IPC)
import { useState } from 'react'
import { Plug, PlugZap, Copy, Check, Terminal, Info, CircleCheck, CircleX } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getMpvClient } from '@/lib/mpv/client'
import { usePlayerStore, useUiStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function ConnectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const status = usePlayerStore((s) => s.status)
  const lastSocketPath = useUiStore((s) => s.lastSocketPath)
  const setUi = useUiStore((s) => s.setUi)
  const [path, setPath] = useState(lastSocketPath)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const cmd = `mpv --idle=once --force-window \\n  --input-ipc-server=${path} \\n  --title="AdA Player · motor"`

  const doConnect = async () => {
    setBusy(true)
    const r = await getMpvClient().connectLive(path)
    setBusy(false)
    if (r.ok) {
      setUi({ lastSocketPath: path })
      toast.success('Conectado al motor mpv', { description: path })
      onOpenChange(false)
    } else {
      toast.error('No se pudo conectar', { description: r.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="h-4 w-4 ui-accent" /> Conexión con el motor
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            La interfaz controla mpv a través de su protocolo JSON IPC (socket Unix). Lanza el motor con el servidor IPC activo y conéctalo aquí.
          </DialogDescription>
        </DialogHeader>

        {/* estado */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            {status?.mode === 'live' ? (
              <><CircleCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-emerald-300 font-medium">Conectado (LIVE)</span>
                <span className="ml-auto text-[11px] font-mono text-zinc-500">{status.mpvVersion}</span></>
            ) : (
              <><CircleX className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-amber-300 font-medium">Modo demostración</span>
                <span className="ml-auto text-[11px] text-zinc-500">{status?.error ?? 'motor no detectado'}</span></>
            )}
          </div>
          {status?.mode === 'live' && (
            <div className="text-[11px] text-zinc-500 font-mono truncate">socket: {status.socketPath}</div>
          )}
        </div>

        {/* ruta del socket */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300" htmlFor="sockpath">Ruta del socket IPC</label>
          <div className="flex gap-2">
            <Input
              id="sockpath"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="font-mono text-xs bg-zinc-900 border-zinc-700"
              placeholder="/tmp/mpvsocket"
            />
            <Button onClick={doConnect} disabled={busy} className={cn('gap-1.5 text-xs shrink-0', status?.mode === 'live' ? '' : 'bg-ui-accent text-ui-accent-fg hover:brightness-110')}>
              <PlugZap className={cn('h-3.5 w-3.5', busy && 'animate-pulse')} />
              {status?.mode === 'live' ? 'Reconectar' : 'Conectar'}
            </Button>
          </div>
        </div>

        {/* comando de arranque */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-zinc-500" /> Comando de arranque del motor
            </span>
            <button
              className="text-[10px] text-zinc-500 hover:text-zinc-200 flex items-center gap-1"
              onClick={() => { navigator.clipboard?.writeText(cmd.replace('\\\\n  ', ' ')); setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success('Comando copiado') }}
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />} copiar
            </button>
          </div>
          <pre className="rounded-lg border border-zinc-800 bg-black/70 p-3 text-[11px] font-mono text-zinc-400 overflow-x-auto leading-relaxed">
{cmd}
          </pre>
        </div>

        <div className="flex gap-2 text-[11px] text-zinc-600 leading-relaxed">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-zinc-500" />
          <p>
            En Windows usa <code className="text-zinc-500">--input-ipc-server=\\\\.\\pipe\\mpvsocket</code> (el puente actual soporta sockets Unix).
            El protocolo IPC no está cifrado: úsalo en local. Mientras no haya motor, la interfaz funciona con el <span className="text-amber-300/80">motor de demostración</span>.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
