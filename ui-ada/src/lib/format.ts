// Utilidades de formato
export function fmtTime(sec: number | null | undefined, ms = false): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return ms ? '--:--.-' : '--:--'
  const s = Math.max(0, sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = Math.floor(s % 60)
  const d = Math.floor((s % 1) * 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return ms ? `${h}:${pad(m)}:${pad(ss)}.${d}` : `${h}:${pad(m)}:${pad(ss)}`
  return ms ? `${pad(m)}:${pad(ss)}.${d}` : `${pad(m)}:${pad(ss)}`
}

export function fmtBitrate(b: number | null | undefined): string {
  if (b == null || !Number.isFinite(b) || b <= 0) return '—'
  if (b > 1e6) return (b / 1e6).toFixed(2) + ' Mb/s'
  return Math.round(b / 1e3) + ' kb/s'
}

export function fmtBytes(b: number | null | undefined): string {
  if (b == null || !Number.isFinite(b) || b <= 0) return '—'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let i = 0
  let v = b
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return v.toFixed(i === 0 ? 0 : 1) + ' ' + units[i]
}

export function fmtHz(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return '—'
  return Math.round(n / 1000) + ' kHz'
}

export function langName(code?: string): string {
  if (!code) return '—'
  const map: Record<string, string> = {
    spa: 'Español', es: 'Español', eng: 'Inglés', en: 'Inglés', deu: 'Alemán', ger: 'Alemán',
    fra: 'Francés', fre: 'Francés', por: 'Portugués', ita: 'Italiano', und: 'Indeterminado',
    jpn: 'Japonés', kor: 'Coreano', zho: 'Chino', rus: 'Ruso', cat: 'Catalán', glg: 'Gallego', euq: 'Euskera',
  }
  return map[code.toLowerCase()] ?? code.toUpperCase()
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}
