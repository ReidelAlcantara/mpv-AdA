'use client'
// Diálogo global: abrir medio/URL
import { useRef, useState } from 'react'
import { Plus, Play, FolderOpen, HardDrive } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { actions } from '@/lib/mpv/useMpv'
import { usePlayerStore } from '@/lib/store'
import { isDesktop, desktopApi } from '@/lib/desktop'
import { cn } from '@/lib/utils'

export function AddMediaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<'append+play' | 'append' | 'replace'>('append+play')
  const fileRef = useRef<HTMLInputElement>(null)
  const isDemo = usePlayerStore((s) => s.status?.mode !== 'live')

  const add = async () => {
    const u = url.trim()
    if (!u) return
    await actions.loadFile(u, mode)
    setUrl('')
    onOpenChange(false)
    toast.success(mode === 'replace' ? 'Reproduciendo' : 'Añadido a la cola', { description: u })
  }

  // En escritorio: resolver la ruta real del archivo con webUtils (Electron)
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const paths: string[] = []
    for (const f of Array.from(files)) {
      const p = isDesktop() ? desktopApi()?.getPathForFile?.(f) : ''
      paths.push(p || f.name)
    }
    for (const p of paths) await actions.loadFile(p, mode)
    onOpenChange(false)
    toast.success(paths.length > 1 ? `${paths.length} medios añadidos` : 'Reproduciendo', {
      description: paths.length > 1 ? paths.map((p) => p.split(/[\\/]/).pop()).join(', ') : paths[0],
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 ui-accent" /> Abrir medio
          </DialogTitle>
          <DialogDescription>
            {isDemo
              ? 'En modo demo cualquier ruta o URL genera contenido de prueba. Conecta el motor real para reproducir tus archivos.'
              : 'Ruta local, URL o formato especial (ytdl://, dvb://…). Se envía al motor con loadfile.'}
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="C:\\Videos\\pelicula.mkv o https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          className="font-mono text-sm"
          autoFocus
        />
        {isDesktop() && (
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              accept="video/*,audio/*,.mkv,.mp4,.avi,.webm,.mov,.flv,.ts,.m2ts,.mp3,.flac,.ogg,.opus,.wav,.aac,.m4a"
              onChange={(e) => { handleFiles(e.target.files); e.currentTarget.value = '' }}
            />
            <Button
              variant="outline"
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 gap-1.5"
              onClick={() => fileRef.current?.click()}
            >
              <HardDrive className="h-4 w-4" /> Examinar archivos…
            </Button>
          </>
        )}
        <div className="flex gap-1.5">
          {([
            ['append+play', 'Reproducir ahora'],
            ['append', 'Añadir a la cola'],
            ['replace', 'Reemplazar cola'],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setMode(val)}
              className={cn(
                'flex-1 h-9 rounded-lg text-xs transition-colors border',
                mode === val ? 'bg-ui-accent text-ui-accent-fg border-transparent font-medium' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button onClick={add} className="bg-ui-accent text-ui-accent-fg hover:brightness-110 gap-1.5">
          {mode === 'append' ? <Plus className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {mode === 'append' ? 'Añadir' : 'Reproducir'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
