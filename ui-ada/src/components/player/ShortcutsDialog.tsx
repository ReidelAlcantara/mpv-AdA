'use client'
// Ayuda de atajos de teclado
import { Keyboard } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Reproducción',
    items: [
      ['Espacio · K', 'Reproducir / pausar'],
      ['← · →', 'Saltar 5 s'],
      ['Shift + ← · →', 'Saltar 1 s'],
      ['↑ · ↓', 'Volumen ±5'],
      ['RePág · AvPág', 'Capítulo anterior / siguiente'],
      ['0 – 9', 'Saltar al 0–90 % de la duración'],
      ['< · >', 'Fotograma anterior / siguiente'],
    ],
  },
  {
    title: 'Cola',
    items: [
      ['N · P', 'Siguiente / anterior en la cola'],
      ['L', 'Repetir archivo sí/no'],
      ['Retroceso', 'Deshacer último salto'],
      ['O', 'Abrir medio / URL'],
      ['Q', 'Mostrar / ocultar cola'],
    ],
  },
  {
    title: 'Herramientas',
    items: [
      ['M', 'Silencio'],
      ['F', 'Pantalla completa'],
      ['S', 'Captura de pantalla'],
      ['A', 'Marcar bucle A-B'],
      ['Z · X', 'Retardo de subtítulos ±0,5 s'],
      ['C', 'Ciclar pistas de subtítulos'],
      ['I', 'Estadísticas del motor'],
      ['H · ?', 'Esta ayuda'],
      ['O Ctrl', 'Configuración (desde atajo O)'],
    ],
  },
]

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="bg-zinc-950 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 ui-accent" /> Atajos de teclado
          </DialogTitle>
          <DialogDescription>
            Espejo de las asociaciones clásicas de mpv — personalizables en el motor vía <code>input.conf</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-3 gap-5">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2.5">{g.title}</h3>
              <div className="space-y-1.5">
                {g.items.map(([k, d]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <kbd className="rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 whitespace-nowrap">{k}</kbd>
                    <span className="text-[11px] text-zinc-500 text-right">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
