'use client'
// Panel de cola: reordenar por arrastre, buscar, acciones por entrada
import { useMemo, useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ListMusic, Plus, Shuffle, Trash2, X, Search, Play, GripVertical, Repeat1, Music4, FileVideo2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { actions } from '@/lib/mpv/useMpv'
import { useProp, useUiStore } from '@/lib/store'
import type { PlaylistEntry } from '@/lib/mpv/types'
import { cn } from '@/lib/utils'

function EqIcon({ playing }: { playing: boolean }) {
  if (!playing) return <Music4 className="h-4 w-4 text-zinc-600" />
  return (
    <span className="flex items-end gap-[2px] h-4" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm bg-ui-accent animate-[eq_1s_ease-in-out_infinite]"
          style={{ height: '40%', animationDelay: `${i * 0.18}s` }}
        />
      ))}
      <style jsx>{`@keyframes eq { 0%,100% { transform: scaleY(0.4);} 50% { transform: scaleY(1);} }`}</style>
    </span>
  )
}

function PlaylistRow({ entry, index, onPlay, onRemove }: { entry: PlaylistEntry; index: number; onPlay: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })
  const isCurrent = entry.playing || entry.current
  const title = entry.title || entry.filename.split('/').pop() || entry.filename
  const isAudio = /\.(mp3|flac|ogg|opus|wav|m4a)$/i.test(entry.filename)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group/row relative flex items-center gap-2 rounded-xl px-2.5 py-2.5 cursor-pointer transition-colors',
        isDragging ? 'z-50 bg-zinc-800/95 shadow-2xl ring-1 ring-ui-accent/40' : 'hover:bg-zinc-800/60',
        isCurrent && 'bg-ui-accent-soft',
      )}
      onClick={onPlay}
      role="option"
      aria-selected={isCurrent}
    >
      <button
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover/row:opacity-100 p-1 -ml-1 rounded cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-300"
        onClick={(e) => e.stopPropagation()}
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <span className="w-6 shrink-0 flex justify-center">
        {isCurrent ? <EqIcon playing /> : isAudio ? <Music4 className="h-4 w-4 text-zinc-600" /> : <FileVideo2 className="h-4 w-4 text-zinc-600" />}
      </span>

      <span className="flex-1 min-w-0">
        <span className={cn('block text-[13px] font-medium truncate', isCurrent ? 'text-zinc-50' : 'text-zinc-300')}>
          {title}
        </span>
        <span className="block text-[10px] text-zinc-500 truncate font-mono">{entry.filename}</span>
      </span>

      <span className="text-[10px] text-zinc-600 tabular-nums w-5 text-right shrink-0 hidden sm:block">{index + 1}</span>

      <span className="flex gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400"
              onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(entry.filename); toast.success('Ruta copiada', { description: entry.filename }) }}
              aria-label="Copiar ruta"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs bg-zinc-900 border-zinc-700">Copiar ruta</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              aria-label="Quitar de la cola"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="text-xs bg-zinc-900 border-zinc-700">Quitar</TooltipContent>
        </Tooltip>
      </span>

      {isCurrent && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-full bg-ui-accent" />}
    </div>
  )
}

export function PlaylistPanel() {
  const playlist = useProp<PlaylistEntry[]>('playlist', [])
  const playlistPos = useProp<number>('playlist-pos', -1)
  const loopFile = useProp<string | number>('loop-file', 'no')
  const setUi = useUiStore((s) => s.setUi)
  const [filter, setFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addMode, setAddMode] = useState<'append+play' | 'append' | 'replace'>('append+play')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const filtered = useMemo(() => {
    if (!filter.trim()) return playlist
    const q = filter.toLowerCase()
    return playlist.filter((e) => (e.title ?? e.filename).toLowerCase().includes(q) || e.filename.toLowerCase().includes(q))
  }, [playlist, filter])

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id || filter.trim()) return
    const oldIndex = playlist.findIndex((x) => x.id === active.id)
    const newIndex = playlist.findIndex((x) => x.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    actions.moveEntry(oldIndex, newIndex)
  }

  const add = async () => {
    const url = addUrl.trim()
    if (!url) return
    await actions.loadFile(url, addMode)
    setAddOpen(false)
    setAddUrl('')
    toast.success(addMode === 'replace' ? 'Cola reemplazada' : 'Añadido a la cola', { description: url })
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border-l border-zinc-800/80 backdrop-blur-xl">
      {/* encabezado */}
      <div className="p-3 border-b border-zinc-800/80 space-y-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <ListMusic className="h-4 w-4 ui-accent" />
          <h2 className="text-sm font-semibold text-zinc-200">Cola de reproducción</h2>
          <span className="text-[10px] text-zinc-500 tabular-nums px-1.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
            {playlist.length}
          </span>
          {loopFile !== 'no' && (
            <span className="text-[10px] ui-accent flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-ui-accent-soft border border-ui-accent/30">
              <Repeat1 className="h-3 w-3" /> repetir
            </span>
          )}
          <button onClick={() => setUi({ playlistOpen: false })} className="ml-auto p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500" aria-label="Cerrar panel">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar…"
            className="h-8 pl-8 text-xs bg-zinc-900 border-zinc-800 focus-visible:ring-1 focus-visible:ring-ui-accent/50"
          />
        </div>

        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-8 flex-1 text-xs gap-1.5 border-zinc-800 hover:border-ui-accent/50 hover:text-zinc-100" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Añadir
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-zinc-800 hover:border-ui-accent/50 hover:text-zinc-100" onClick={() => actions.shuffle()}>
            <Shuffle className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-zinc-800 hover:border-red-500/40 hover:text-red-300" onClick={() => actions.clearPlaylist()}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* lista */}
      <div className="flex-1 min-h-0">
        {playlist.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">
              <ListMusic className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-[220px]">
              La cola está vacía. Añade medios con el botón <span className="text-zinc-300">Añadir</span> o pulsa
              <kbd className="mx-1 rounded border border-zinc-700 bg-zinc-800 px-1 text-[10px]">O</kbd>.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={filtered.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <ScrollArea className="h-full px-2 py-2">
                <div className="space-y-1">
                  {filtered.map((entry, i) => (
                    <PlaylistRow
                      key={entry.id}
                      entry={entry}
                      index={playlist.indexOf(entry)}
                      onPlay={() => actions.playIndex(playlist.indexOf(entry))}
                      onRemove={() => actions.removeEntry(playlist.indexOf(entry))}
                    />
                  ))}
                </div>
              </ScrollArea>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* pie */}
      <div className="p-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500 shrink-0">
        <span className="tabular-nums">
          {playlistPos >= 0 ? `${playlistPos + 1} de ${playlist.length}` : 'en espera'}
        </span>
        <span className="font-mono opacity-70">playlist · reorderable</span>
      </div>

      {/* diálogo añadir */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent aria-describedby={undefined} className="bg-zinc-900 border-zinc-700 max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir medio a la cola</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="/ruta/archivo.mkv · https://… · ytdl://…"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className="font-mono text-sm"
            autoFocus
          />
          <div className="flex gap-1.5">
            {([
              ['append+play', 'Añadir y reproducir'],
              ['append', 'Solo añadir'],
              ['replace', 'Reemplazar cola'],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setAddMode(val)}
                className={cn(
                  'flex-1 h-8 rounded-lg text-[11px] transition-colors border',
                  addMode === val ? 'bg-ui-accent text-ui-accent-fg border-transparent font-medium' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500 -mt-1 leading-relaxed">
            En modo LIVE el comando <code className="text-zinc-400">loadfile</code> se pasa directo al motor (soporta URLs, ytdl y rutas locales del host).
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={add} className="bg-ui-accent text-ui-accent-fg hover:brightness-110">
              <Play className="h-4 w-4" /> Añadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
