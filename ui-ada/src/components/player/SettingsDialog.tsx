'use client'
// Panel de configuración avanzada: cada control mapea una opción real del motor mpv
import { useState } from 'react'
import {
  Settings2, Clapperboard, AudioLines, Subtitles, ListVideo, Palette, Camera, Database, Wand2, Download, RotateCcw, Type,
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { actions } from '@/lib/mpv/useMpv'
import { useProp, useUiStore, usePlayerStore } from '@/lib/store'
import { ACCENTS } from '@/lib/mpv/types'
import { cn } from '@/lib/utils'

// ---------- Controles reutilizables ----------
function Row({ label, hint, option, children, stack }: { label: string; hint?: string; option?: string; children: React.ReactNode; stack?: boolean }) {
  return (
    <div className={cn('py-3.5 border-b border-zinc-800/60 last:border-0', stack ? 'space-y-2.5' : 'flex items-center justify-between gap-6')}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-zinc-200">{label}</span>
          {option && <code className="text-[10px] text-zinc-500 bg-zinc-800/80 border border-zinc-700/60 rounded px-1 py-px">{option}</code>}
        </div>
        {hint && <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div className={cn(stack ? '' : 'shrink-0')}>{children}</div>
    </div>
  )
}

function Sel({ value, options, onChange, w = 'w-40' }: { value: string; options: [string, string][]; onChange: (v: string) => void; w?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(w, 'h-9 bg-zinc-900 border-zinc-700 text-xs')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-700 max-h-72">
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Sld({ value, min, max, step, onChange, fmt }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  return (
    <div className="flex items-center gap-3 w-56">
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="flex-1" aria-hidden />
      <span className="text-[11px] font-mono tabular-nums text-zinc-300 w-14 text-right">{fmt ? fmt(value) : value}</span>
    </div>
  )
}

function Col({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = value?.length >= 7 ? value.slice(0, 7) : '#ffffff'
  return (
    <label className="flex items-center gap-2 cursor-pointer" title="Elegir color">
      <span className="h-7 w-10 rounded-md border border-zinc-600" style={{ background: hex }} />
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value + 'ff')} className="sr-only" />
      <span className="text-[11px] font-mono text-zinc-500">{hex}</span>
    </label>
  )
}

// ---------- Diálogo principal ----------
export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="bg-zinc-950/97 border-zinc-800 max-w-3xl p-0 gap-0 overflow-hidden max-h-[88vh] flex flex-col [&>button]:z-50">
        <DialogHeader className="p-5 pb-3 border-b border-zinc-800/80 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4.5 w-4.5 ui-accent" />
            Configuración del motor
            <span className="ml-2 text-[11px] font-normal text-zinc-500">cada ajuste se aplica en vivo vía IPC y puede exportarse a mpv.conf</span>
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="video" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="mx-5 my-3 bg-zinc-900/80 border border-zinc-800 h-auto p-1 flex-wrap justify-start shrink-0">
            {[
              ['video', 'Vídeo', Clapperboard], ['audio', 'Audio', AudioLines], ['subs', 'Subtítulos', Subtitles],
              ['playback', 'Reproducción', ListVideo], ['interface', 'Interfaz', Palette],
              ['shots', 'Capturas', Camera], ['cache', 'Caché', Database], ['advanced', 'Avanzado', Wand2],
            ].map(([v, l, I]) => {
              const Icon = I as typeof Clapperboard
              return (
                <TabsTrigger key={v as string} value={v as string} className="text-xs gap-1.5 data-[state=active]:bg-ui-accent data-[state=active]:text-ui-accent-fg px-3 py-1.5">
                  <Icon className="h-3.5 w-3.5" /> {l as string}
                </TabsTrigger>
              )
            })}
          </TabsList>
          <ScrollArea className="flex-1 min-h-0 px-5">
            <TabsContent value="video" className="mt-0"><VideoTab /></TabsContent>
            <TabsContent value="audio" className="mt-0"><AudioTab /></TabsContent>
            <TabsContent value="subs" className="mt-0"><SubsTab /></TabsContent>
            <TabsContent value="playback" className="mt-0"><PlaybackTab /></TabsContent>
            <TabsContent value="interface" className="mt-0"><InterfaceTab /></TabsContent>
            <TabsContent value="shots" className="mt-0"><ShotsTab /></TabsContent>
            <TabsContent value="cache" className="mt-0"><CacheTab /></TabsContent>
            <TabsContent value="advanced" className="mt-0"><AdvancedTab /></TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Vídeo ----------
const SCALERS: [string, string][] = [
  ['bilinear', 'Bilineal (rápido)'], ['lanczos', 'Lanczos (predet.)'], ['ewa_lanczossharp', 'EWA Lanczos Sharp'],
  ['catmull_rom', 'Catmull-Rom'], ['mitchell', 'Mitchell'], ['oversample', 'Oversample'], ['spline36', 'Spline36'],
]
const TONEMAPS: [string, string][] = [
  ['auto', 'Auto'], ['bt.2390', 'BT.2390 (recomendado)'], ['bt.2446a', 'BT.2446a'], ['bt.1886', 'BT.1886'],
  ['clip', 'Clip'], ['reinhard', 'Reinhard'], ['hable', 'Hable'], ['mobius', 'Mobius'], ['spline', 'Spline'],
]
function VideoTab() {
  const hwdec = useProp<string>('hwdec', 'auto-safe')
  const hwdecCur = useProp<string>('hwdec-current', '')
  const deinterlace = useProp<string>('deinterlace', 'auto')
  const scale = useProp<string>('scale', 'lanczos')
  const toneMapping = useProp<string>('tone-mapping', 'auto')
  const videoSync = useProp<string>('video-sync', 'audio')
  const interpolation = useProp<boolean>('interpolation', false)

  return (
    <div>
      <Row label="Decodificación por hardware" hint={hwdecCur ? `activa: ${hwdecCur}` : 'deja que el motor elija el mejor decodificador'} option="--hwdec">
        <Sel value={hwdec} options={[
          ['no', 'No (software)'], ['auto', 'Auto'], ['auto-safe', 'Auto seguro'], ['auto-copy', 'Auto + copia'],
          ['vaapi', 'VAAPI'], ['nvdec', 'NVDEC'], ['vulkan', 'Vulkan'], ['d3d11va', 'D3D11VA'], ['mediacodec', 'MediaCodec'],
        ]} onChange={(v) => actions.set('hwdec', v)} />
      </Row>
      <Row label="Desentrelazado" option="--deinterlace">
        <Sel value={deinterlace} options={[['auto', 'Auto'], ['yes', 'Sí'], ['no', 'No']]} onChange={(v) => actions.set('deinterlace', v)} w="w-32" />
      </Row>
      <Row label="Escalador" hint="algoritmo de reescalado del vídeo a la resolución de pantalla" option="--scale">
        <Sel value={scale} options={SCALERS} onChange={(v) => actions.set('scale', v)} />
      </Row>
      <Row label="Mapa tonal HDR→SDR" option="--tone-mapping">
        <Sel value={toneMapping} options={TONEMAPS} onChange={(v) => actions.set('tone-mapping', v)} />
      </Row>
      <Row label="Sincronía de vídeo" hint="referencia maestra para el reloj de reproducción" option="--video-sync">
        <Sel value={videoSync} options={[
          ['audio', 'Audio (predet.)'], ['display-resync', 'Pantalla (resync)'], ['display-desync', 'Pantalla (desync)'], ['desync', 'Sin sincronizar'],
        ]} onChange={(v) => actions.set('video-sync', v)} />
      </Row>
      <Row label="Interpolación temporal" hint="suaviza el movimiento a la tasa de refresco (más carga de GPU)" option="--interpolation">
        <Switch checked={interpolation} onCheckedChange={(v) => actions.set('interpolation', v)} />
      </Row>
    </div>
  )
}

// ---------- Audio ----------
function AudioTab() {
  const devices = useProp<{ name: string; description: string }[]>('audio-device-list', [])
  const audioDevice = useProp<string>('audio-device', 'auto')
  const channels = useProp<string>('audio-channels', 'auto-safe')
  const gapless = useProp<string>('gapless-audio', 'weak')
  const replaygain = useProp<string>('replaygain', 'no')
  const pitch = useProp<boolean>('audio-pitch-correction', true)
  const audioDelay = useProp<number>('audio-delay', 0)
  const volumeMax = useProp<number>('volume-max', 130)

  return (
    <div>
      <Row label="Dispositivo de salida" hint="lista provista por el motor (audio-device-list)" option="--audio-device">
        <Sel value={audioDevice} options={[['auto', 'Auto'], ...devices.map((d) => [d.name, d.description ?? d.name] as [string, string])]} onChange={(v) => actions.set('audio-device', v)} w="w-52" />
      </Row>
      <Row label="Canales de salida" option="--audio-channels">
        <Sel value={channels} options={[['auto-safe', 'Auto seguro'], ['auto', 'Auto'], ['stereo', 'Estéreo'], ['mono', 'Mono'], ['5.1', '5.1'], ['7.1', '7.1']]} onChange={(v) => actions.set('audio-channels', v)} />
      </Row>
      <Row label="Sin pausas entre pistas" option="--gapless-audio">
        <Sel value={gapless} options={[['weak', 'Débil (predet.)'], ['yes', 'Sí'], ['no', 'No']]} onChange={(v) => actions.set('gapless-audio', v)} w="w-36" />
      </Row>
      <Row label="ReplayGain" option="--replaygain">
        <Sel value={replaygain} options={[['no', 'No'], ['track', 'Pista'], ['album', 'Álbum']]} onChange={(v) => actions.set('replaygain', v)} w="w-28" />
      </Row>
      <Row label="Corrección de tono" hint="conserva el tono al cambiar la velocidad" option="--audio-pitch-correction">
        <Switch checked={pitch} onCheckedChange={(v) => actions.set('audio-pitch-correction', v)} />
      </Row>
      <Row label="Retardo de audio" hint="desplaza el audio ± segundos" option="--audio-delay">
        <Sld value={audioDelay} min={-5} max={5} step={0.05} onChange={(v) => actions.set('audio-delay', v)} fmt={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} s`} />
      </Row>
      <Row label="Volumen máximo" hint="límite del control de volumen" option="--volume-max">
        <Sld value={volumeMax} min={100} max={200} step={5} onChange={(v) => actions.set('volume-max', v)} fmt={(v) => String(v)} />
      </Row>
    </div>
  )
}

// ---------- Subtítulos (con vista previa en vivo) ----------
function SubsTab() {
  const font = useProp<string>('sub-font', 'sans-serif')
  const size = useProp<number>('sub-font-size', 38)
  const color = useProp<string>('sub-color', '#ffffffff')
  const outlineSize = useProp<number>('sub-outline-size', 1.65)
  const outlineColor = useProp<string>('sub-outline-color', '#000000ff')
  const shadowOffset = useProp<number>('sub-shadow-offset', 0)
  const shadowColor = useProp<string>('sub-shadow-color', '#000000ff')
  const bold = useProp<boolean>('sub-bold', false)
  const italic = useProp<boolean>('sub-italic', false)
  const pos = useProp<number>('sub-pos', 100)
  const marginX = useProp<number>('sub-margin-x', 19)
  const marginY = useProp<number>('sub-margin-y', 34)
  const borderStyle = useProp<string>('sub-border-style', 'outline-and-shadow')
  const assOverride = useProp<string>('sub-ass-override', 'yes')
  const delay = useProp<number>('sub-delay', 0)
  const visibility = useProp<boolean>('sub-visibility', true)
  const subText = useProp<string>('sub-text', '')
  const scale = useProp<number>('sub-scale', 1)

  const sample = subText || 'Así se verán tus subtítulos'
  const strip = (c: string) => (c?.length >= 7 ? c.slice(0, 7) : c)
  const boxStyle = borderStyle === 'opaque-box' || borderStyle === 'background-box'

  return (
    <div>
      {/* vista previa */}
      <div className="my-3 rounded-xl overflow-hidden border border-zinc-800 relative h-28 bg-[radial-gradient(ellipse_at_50%_60%,#27272a_0%,#0a0a0a_85%)] stage-grain flex items-end justify-center">
        <span
          className="pb-4 px-4 text-center"
          style={{
            color: strip(color),
            fontFamily: font.includes('mono') ? 'var(--font-geist-mono)' : font.includes('serif') ? 'Georgia, serif' : 'var(--font-geist-sans)',
            fontSize: size * 0.55 * scale * 0.01 + 'rem',
            fontWeight: bold ? 700 : 500,
            fontStyle: italic ? 'italic' : 'normal',
            textShadow: outlineSize > 0 ? `${outlineSize * 0.8}px 0 0 ${strip(outlineColor)}, -${outlineSize * 0.8}px 0 0 ${strip(outlineColor)}, 0 ${outlineSize * 0.8}px 0 ${strip(outlineColor)}, 0 -${outlineSize * 0.8}px 0 ${strip(outlineColor)}` : 'none',
            background: boxStyle ? strip(outlineColor) + 'cc' : undefined,
            padding: boxStyle ? '2px 8px' : undefined,
            borderRadius: boxStyle ? 4 : undefined,
            marginBottom: `${Math.max(0, 100 - pos) * 0.1}%`,
            filter: shadowOffset > 0 ? `drop-shadow(${shadowOffset * 0.8}px ${shadowOffset * 0.8}px ${shadowOffset}px ${strip(shadowColor)})` : undefined,
            transition: 'all .25s ease',
          }}
        >
          {sample}
        </span>
      </div>

      <Row label="Tipografía" option="--sub-font">
        <Sel value={font} options={[['sans-serif', 'Sans (sistema)'], ['serif', 'Serif (Georgia)'], ['monospace', 'Monoespaciada']]} onChange={(v) => actions.set('sub-font', v)} w="w-44" />
      </Row>
      <Row label="Tamaño base" hint="píxeles referidos a vídeo de 720p" option="--sub-font-size">
        <Sld value={size} min={10} max={100} step={1} onChange={(v) => actions.set('sub-font-size', v)} />
      </Row>
      <Row label="Escala" option="--sub-scale">
        <Sld value={scale} min={0.5} max={3} step={0.05} onChange={(v) => actions.set('sub-scale', v)} fmt={(v) => v.toFixed(2) + '×'} />
      </Row>
      <Row label="Color del texto" option="--sub-color">
        <Col value={color} onChange={(v) => actions.set('sub-color', v)} />
      </Row>
      <Row label="Grosor del contorno" option="--sub-outline-size">
        <Sld value={outlineSize} min={0} max={8} step={0.15} onChange={(v) => actions.set('sub-outline-size', v)} fmt={(v) => v.toFixed(1) + ' px'} />
      </Row>
      <Row label="Color del contorno" option="--sub-outline-color">
        <Col value={outlineColor} onChange={(v) => actions.set('sub-outline-color', v)} />
      </Row>
      <Row label="Sombra" hint="desplazamiento del desenfoque de sombra (0 = sin sombra)" option="--sub-shadow-offset">
        <Sld value={shadowOffset} min={0} max={8} step={0.5} onChange={(v) => actions.set('sub-shadow-offset', v)} fmt={(v) => v.toFixed(1) + ' px'} />
      </Row>
      <Row label="Estilo de caja" option="--sub-border-style">
        <Sel value={borderStyle} options={[
          ['outline-and-shadow', 'Contorno + sombra'], ['opaque-box', 'Caja opaca'], ['background-box', 'Caja de fondo'],
        ]} onChange={(v) => actions.set('sub-border-style', v)} w="w-48" />
      </Row>
      <Row label="Negrita / Cursiva" option="--sub-bold · --sub-italic">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs"><Switch checked={bold} onCheckedChange={(v) => actions.set('sub-bold', v)} /> <Type className="h-3.5 w-3.5 font-bold" /></label>
          <label className="flex items-center gap-2 text-xs"><Switch checked={italic} onCheckedChange={(v) => actions.set('sub-italic', v)} /> <Type className="h-3.5 w-3.5 italic" /></label>
        </div>
      </Row>
      <Row label="Posición vertical" hint="0 = arriba, 100 = abajo (escala de vídeo)" option="--sub-pos">
        <Sld value={pos} min={0} max={150} step={5} onChange={(v) => actions.set('sub-pos', v)} fmt={(v) => String(Math.round(v))} />
      </Row>
      <Row label="Márgenes" option="--sub-margin-x · -y">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2"><Label className="text-[10px] text-zinc-500">X</Label><Sld value={marginX} min={0} max={150} step={1} onChange={(v) => actions.set('sub-margin-x', v)} /></div>
          <div className="flex items-center gap-2"><Label className="text-[10px] text-zinc-500">Y</Label><Sld value={marginY} min={0} max={150} step={1} onChange={(v) => actions.set('sub-margin-y', v)} /></div>
        </div>
      </Row>
      <Row label="Anular estilos ASS" hint="fuerza tus estilos sobre los del archivo de subtítulos" option="--sub-ass-override">
        <Sel value={assOverride} options={[['yes', 'Sí (predet.)'], ['no', 'No (respetar)'], ['scale', 'Escalar'], ['force', 'Forzar todo'], ['strip', 'Eliminar']]} onChange={(v) => actions.set('sub-ass-override', v)} w="w-40" />
      </Row>
      <Row label="Retardo de subtítulos" option="--sub-delay">
        <Sld value={delay} min={-10} max={10} step={0.1} onChange={(v) => actions.set('sub-delay', v)} fmt={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} s`} />
      </Row>
      <Row label="Visibilidad" option="--sub-visibility">
        <Switch checked={visibility} onCheckedChange={(v) => actions.set('sub-visibility', v)} />
      </Row>
    </div>
  )
}

// ---------- Reproducción ----------
function PlaybackTab() {
  const loopFile = useProp<string | number>('loop-file', 'no')
  const keepOpen = useProp<string>('keep-open', 'no')

  return (
    <div>
      <Row label="Repetir archivo" hint="repite el archivo actual indefinidamente" option="--loop-file">
        <Sel value={String(loopFile)} options={[['no', 'No'], ['inf', 'Infinito']]} onChange={(v) => actions.set('loop-file', v === 'inf' ? 'inf' : 'no')} w="w-32" />
      </Row>
      <Row label="Mantener ventana al terminar" option="--keep-open">
        <Sel value={keepOpen} options={[['no', 'No (siguiente)'], ['yes', 'Sí (pausa)'], ['always', 'Siempre']]} onChange={(v) => actions.set('keep-open', v)} w="w-44" />
      </Row>
      <div className="pt-4 text-[11px] text-zinc-600 leading-relaxed">
        <p>La velocidad de reproducción (<code className="text-zinc-500">--speed</code>), el bucle A-B y la navegación por capítulos se controlan desde la
          barra de reproducción. La reanudación de posición (<code className="text-zinc-500">--save-position-on-quit</code>) se activa al cerrar el motor con
          <code className="text-zinc-500 ml-1">quit-watch-later</code>.</p>
      </div>
    </div>
  )
}

// ---------- Interfaz (preferencias locales) ----------
function InterfaceTab() {
  const ui = useUiStore()
  return (
    <div>
      <Row label="Color de acento" hint="identidad visual de la interfaz (no afecta al motor)" stack>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ACCENTS).map(([key, a]) => (
            <button
              key={key}
              onClick={() => ui.setUi({ accent: key })}
              className={cn(
                'h-9 px-3 rounded-lg text-xs font-medium border-2 transition-all flex items-center gap-2',
                ui.accent === key ? 'border-zinc-100 scale-105' : 'border-transparent hover:border-zinc-700',
              )}
              style={{ background: a.css + '22', color: a.css }}
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: a.css }} />
              {a.label}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Mostrar tiempo restante" hint="formato −MM:SS junto al total">
        <Switch checked={ui.showRemaining} onCheckedChange={(v) => ui.setUi({ showRemaining: v })} />
      </Row>
      <Row label="Ocultar controles tras" hint="segundos de inactividad del ratón sobre el vídeo">
        <Sld value={ui.autoHideSecs} min={1} max={10} step={1} onChange={(v) => ui.setUi({ autoHideSecs: v })} fmt={(v) => v + ' s'} />
      </Row>
      <Row label="Panel de cola visible" hint="panel lateral de la cola de reproducción">
        <Switch checked={ui.playlistOpen} onCheckedChange={(v) => ui.setUi({ playlistOpen: v })} />
      </Row>
    </div>
  )
}

// ---------- Capturas ----------
function ShotsTab() {
  const format = useProp<string>('screenshot-format', 'jpg')
  const template = useProp<string>('screenshot-template', 'mpv-shot%n')
  const jpegQ = useProp<number>('screenshot-jpeg-quality', 90)

  return (
    <div>
      <Row label="Formato" option="--screenshot-format">
        <Sel value={format} options={[['jpg', 'JPEG'], ['png', 'PNG'], ['webp', 'WebP'], ['jxl', 'JPEG XL'], ['avif', 'AVIF']]} onChange={(v) => actions.set('screenshot-format', v)} w="w-36" />
      </Row>
      <Row label="Plantilla de nombre" hint="%n numeración · %f nombre · %p HH:MM:SS · %w ancho/alto" option="--screenshot-template">
        <Input value={template} onChange={(e) => actions.set('screenshot-template', e.target.value)} className="w-56 h-9 bg-zinc-900 border-zinc-700 text-xs font-mono" />
      </Row>
      {format === 'jpg' && (
        <Row label="Calidad JPEG" option="--screenshot-jpeg-quality">
          <Sld value={jpegQ} min={50} max={100} step={1} onChange={(v) => actions.set('screenshot-jpeg-quality', v)} fmt={(v) => String(v)} />
        </Row>
      )}
      <div className="pt-4 text-[11px] text-zinc-600 leading-relaxed">
        <p>Las capturas las ejecuta el propio motor con el comando <code className="text-zinc-500">screenshot</code>; la interfaz muestra una
          notificación con la ruta resultante. Se incluye el vídeo renderizado y, opcionalmente, subtítulos y OSD.</p>
      </div>
    </div>
  )
}

// ---------- Caché ----------
function CacheTab() {
  const cacheSecs = useProp<number>('cache-secs', 180)
  const maxBytesMiB = Math.round((useProp<number>('demuxer-max-bytes', 157286400) || 157286400) / (1024 * 1024))

  return (
    <div>
      <Row label="Antelación de caché" hint="segundos que el motor intenta mantener por delante de la reproducción" option="--cache-secs">
        <Sld value={cacheSecs} min={10} max={600} step={10} onChange={(v) => actions.set('cache-secs', v)} fmt={(v) => v + ' s'} />
      </Row>
      <Row label="Memoria máxima de demuxer" option="--demuxer-max-bytes">
        <Sld value={maxBytesMiB} min={16} max={1024} step={16} onChange={(v) => actions.set('demuxer-max-bytes', v * 1024 * 1024)} fmt={(v) => v + ' MiB'} />
      </Row>
      <div className="pt-4 text-[11px] text-zinc-600 leading-relaxed">
        <p>Ajusta la lectura anticipada para flujos de red o archivos de bitrate muy alto. El panel de estadísticas (tecla <code className="text-zinc-500">I</code>)
          muestra la ocupación real del búfer en tiempo real.</p>
      </div>
    </div>
  )
}

// ---------- Avanzado: perfiles + exportación ----------
const PROFILES: [string, string, string][] = [
  ['high-quality', 'Alta calidad', 'ewa_lanczossharp + antiring + bt.2390'],
  ['fast', 'Rápido', 'bilinear + auto-copy'],
  ['low-latency', 'Baja latencia', 'display-desync'],
  ['pseudo-gui', 'Pseudo-GUI', 'ventana persistente + capturas'],
]

function AdvancedTab() {
  const [conf, setConf] = useState('')

  const buildConf = () => {
    const cur = usePlayerStore.getState().props
    const get = (n: string, fallback: unknown) =>
      cur[n] !== undefined && cur[n] !== null && cur[n] !== '' ? cur[n] : fallback
    const lines: string[] = ['# mpv.conf generado por AdA Player', '']
    const add = (opt: string, val: unknown, comment?: string) => {
      if (comment) lines.push('# ' + comment)
      lines.push(`${opt}=${typeof val === 'boolean' ? (val ? 'yes' : 'no') : val}`)
    }
    add('hwdec', get('hwdec', 'auto-safe'), 'decodificación por hardware')
    add('deinterlace', get('deinterlace', 'auto'))
    add('scale', get('scale', 'lanczos'))
    add('tone-mapping', get('tone-mapping', 'auto'))
    add('video-sync', get('video-sync', 'audio'))
    add('interpolation', get('interpolation', false))
    add('audio-channels', get('audio-channels', 'auto-safe'))
    add('gapless-audio', get('gapless-audio', 'weak'))
    add('replaygain', get('replaygain', 'no'))
    add('volume-max', get('volume-max', 130))
    add('sub-font', get('sub-font', 'sans-serif'))
    add('sub-font-size', get('sub-font-size', 38))
    add('sub-color', get('sub-color', '#ffffffff'))
    add('sub-outline-size', get('sub-outline-size', 1.65))
    add('sub-outline-color', get('sub-outline-color', '#000000ff'))
    add('sub-pos', get('sub-pos', 100))
    add('sub-ass-override', get('sub-ass-override', 'yes'))
    add('loop-file', get('loop-file', 'no'))
    add('keep-open', get('keep-open', 'no'))
    add('cache-secs', get('cache-secs', 180))
    add('demuxer-max-bytes', get('demuxer-max-bytes', 157286400))
    add('screenshot-format', get('screenshot-format', 'jpg'))
    add('screenshot-template', get('screenshot-template', 'mpv-shot%n'))
    add('input-ipc-server', useUiStore.getState().lastSocketPath, 'activa el control IPC para esta interfaz')
    return lines.join('\n')
  }

  const download = () => {
    const text = buildConf()
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mpv.conf'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('mpv.conf exportado', { description: 'Aplica los ajustes actuales del motor' })
  }

  return (
    <div>
      <Row label="Perfiles del motor" hint="colecciones de opciones predefinidas (apply-profile)" stack>
        <div className="grid grid-cols-2 gap-2">
          {PROFILES.map(([name, label, desc]) => (
            <button
              key={name}
              onClick={async () => {
                const r = await actions.applyProfile(name)
                if (r.error === 'success') toast.success(`Perfil aplicado: ${label}`, { description: desc })
                else toast.error('No se pudo aplicar el perfil', { description: r.error })
              }}
              className="text-left rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-ui-accent/50 hover:bg-zinc-800/60 transition-colors p-3"
            >
              <div className="text-xs font-medium text-zinc-200">{label}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">{desc}</div>
            </button>
          ))}
        </div>
      </Row>

      <Row label="Exportar configuración" hint="genera un mpv.conf con los valores actuales del motor" stack>
        <div className="flex flex-wrap gap-2">
          <Button onClick={download} className="bg-ui-accent text-ui-accent-fg hover:brightness-110 gap-1.5 text-xs h-9">
            <Download className="h-3.5 w-3.5" /> Descargar mpv.conf
          </Button>
          <Button variant="outline" className="border-zinc-700 text-xs h-9 gap-1.5" onClick={() => setConf(buildConf())}>
            Previsualizar
          </Button>
          <Button variant="outline" className="border-zinc-700 text-xs h-9 gap-1.5 text-zinc-400" onClick={() => {
            navigator.clipboard?.writeText(buildConf())
            toast.success('Configuración copiada al portapapeles')
          }}>
            Copiar
          </Button>
        </div>
      </Row>

      {conf && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900/60">
            <span className="text-[11px] font-mono text-zinc-500">mpv.conf</span>
            <button className="text-[10px] text-zinc-500 hover:text-zinc-300" onClick={() => setConf('')}>cerrar</button>
          </div>
          <pre className="p-3 text-[11px] font-mono text-zinc-400 max-h-60 overflow-auto leading-relaxed">{conf}</pre>
        </div>
      )}
      <div className="py-3">
        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Restablecer revierte la interfaz a sus valores de fábrica (no modifica el estado del motor en ejecución).
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200 gap-1.5 text-xs h-8"
          onClick={() => {
            useUiStore.getState().setUi({ accent: 'amber', showRemaining: true, autoHideSecs: 3, playlistOpen: true, statsVisible: false })
            toast.info('Interfaz restablecida')
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restablecer interfaz
        </Button>
      </div>
    </div>
  )
}
