'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BridgeStatus, UiPrefs } from './mpv/types'

// ---------------- Store del reproductor (estado vivo del motor) ----------------
interface PlayerStore {
  status: BridgeStatus | null
  props: Record<string, unknown>
  lastPropAt: number
  eventLog: { event: string; at: number }[]
  setPropValue: (name: string, value: unknown) => void
  setManyProps: (entries: [string, unknown][]) => void
  setStatus: (s: BridgeStatus) => void
  pushEvent: (e: string) => void
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  status: null,
  props: {},
  lastPropAt: 0,
  eventLog: [],
  setPropValue: (name, value) =>
    set((s) => ({ props: { ...s.props, [name]: value }, lastPropAt: Date.now() })),
  setManyProps: (entries) =>
    set((s) => {
      const p = { ...s.props }
      for (const [k, v] of entries) p[k] = v
      return { props: p, lastPropAt: Date.now() }
    }),
  setStatus: (status) => set({ status }),
  pushEvent: (event) =>
    set((s) => ({ eventLog: [...s.eventLog.slice(-40), { event, at: Date.now() }] })),
}))

// Selectores tipados cómodos
export const useProp = <T,>(name: string, fallback: T): T =>
  usePlayerStore((s) => (s.props[name] === undefined || s.props[name] === null ? fallback : (s.props[name] as T)))

export const usePropRaw = <T,>(name: string): T | null =>
  usePlayerStore((s) => (s.props[name] === undefined ? null : (s.props[name] as T)))

// ---------------- Store de preferencias de interfaz (persistido) ----------------
interface UiStore extends UiPrefs {
  setUi: (p: Partial<UiPrefs>) => void
  // opciones solo-config (no runtime del motor): capturas, plantillas...
  confOnly: Record<string, string | number | boolean>
  setConfOnly: (k: string, v: string | number | boolean) => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      accent: 'amber',
      playlistOpen: true,
      showRemaining: true,
      autoHideSecs: 3,
      lastSocketPath: '/tmp/mpvsocket',
      statsVisible: false,
      confOnly: {
        'screenshot-format': 'jpg',
        'screenshot-template': 'mpv-shot%n',
        'screenshot-jpeg-quality': 90,
        'screenshot-directory': '',
      },
      setUi: (p) => set(p as Partial<UiStore>),
      setConfOnly: (k, v) => set((s) => ({ confOnly: { ...s.confOnly, [k]: v } })),
    }),
    { name: 'ada-ui-prefs' },
  ),
)
