'use client'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'

export type NotifLevel = 'info' | 'success' | 'warning' | 'critical'

export interface Notification {
  id: string
  level: NotifLevel
  title: string
  message: string
  ts: number
  persistent: boolean
  dismissed: boolean
  action?: { label: string; onClick: () => void }
}

interface NotifStore {
  notifications: Notification[]
  push: (n: Omit<Notification, 'id' | 'ts' | 'dismissed'>) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}

export const useNotifStore = create<NotifStore>((set) => ({
  notifications: [],
  push: (n) => set((state) => ({
    notifications: [
      {
        ...n,
        id: Math.random().toString(36).slice(2),
        ts: Date.now(),
        dismissed: false,
      },
      ...state.notifications,
    ].slice(0, 50),
  })),
  dismiss: (id) => set((state) => ({
    notifications: state.notifications.map((notif) =>
      notif.id === id ? { ...notif, dismissed: true } : notif
    ),
  })),
  dismissAll: () => set((state) => ({
    notifications: state.notifications.map((notif) => ({
      ...notif,
      dismissed: true,
    })),
  })),
}))

const LEVEL_STYLES: Record<NotifLevel, string> = {
  info: 'border-blue-500/30 bg-blue-500/5',
  success: 'border-risk-safe/30 bg-risk-safe/5',
  warning: 'border-risk-warning/30 bg-risk-warning/5',
  critical: 'border-risk-danger/40 bg-risk-danger/8',
}

const LEVEL_DOT: Record<NotifLevel, string> = {
  info: 'bg-blue-400',
  success: 'bg-risk-safe',
  warning: 'bg-risk-warning animate-pulse',
  critical: 'bg-risk-danger animate-pulse',
}

const LEVEL_TITLE: Record<NotifLevel, string> = {
  info: 'text-blue-400',
  success: 'text-risk-safe',
  warning: 'text-risk-warning',
  critical: 'text-risk-danger',
}

function playAlertTone(level: NotifLevel) {
  if (typeof window === 'undefined' || !window.AudioContext) return
  try {
    const ctx = new window.AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = level === 'critical' ? 220 : level === 'warning' ? 440 : 660
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.16)
    setTimeout(() => ctx.close(), 200)
  } catch {
    // ignore audio failures in restricted environments
  }
}

function Toast({ notif }: { notif: Notification }) {
  const { dismiss } = useNotifStore()

  useEffect(() => {
    if (notif.persistent) return
    const timer = setTimeout(() => dismiss(notif.id), 6000)
    return () => clearTimeout(timer)
  }, [notif.id, notif.persistent, dismiss])

  return (
    <div className={`w-80 border rounded-xl p-4 space-y-1.5 transition-all duration-300 pointer-events-auto ${LEVEL_STYLES[notif.level]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${LEVEL_DOT[notif.level]}`} />
          <span className={`text-xs font-medium ${LEVEL_TITLE[notif.level]}`}>{notif.title}</span>
        </div>
        <button
          onClick={() => dismiss(notif.id)}
          className="text-gray-700 hover:text-gray-400 text-xs transition-colors leading-none"
        >
          ✕
        </button>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed pl-3.5">{notif.message}</p>
      {notif.action && (
        <button
          onClick={() => { notif.action!.onClick(); dismiss(notif.id) }}
          className={`text-2xs ml-3.5 underline underline-offset-2 ${LEVEL_TITLE[notif.level]} hover:opacity-70 transition-opacity`}
        >
          {notif.action.label}
        </button>
      )}
    </div>
  )
}

export function ToastContainer() {
  const { notifications, dismissAll } = useNotifStore()
  const visible = notifications.filter((n) => !n.dismissed).slice(0, 4)
  const persistent = notifications.filter((n) => n.persistent && !n.dismissed)
  const played = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!visible.length) return
    const latest = visible[0]
    if (played.current.has(latest.id)) return
    played.current.add(latest.id)
    playAlertTone(latest.level)
  }, [visible])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') useNotifStore.getState().dismissAll()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (visible.length === 0 && persistent.length === 0) return null

  return (
    <>
      {visible.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end pointer-events-none">
          {visible.map((notif) => (
            <div key={notif.id} className="pointer-events-auto">
              <Toast notif={notif} />
            </div>
          ))}
          {visible.length > 1 && (
            <button
              onClick={() => dismissAll()}
              className="pointer-events-auto text-2xs text-gray-700 hover:text-gray-500 transition-colors pr-1"
            >
              Dismiss all (Esc)
            </button>
          )}
        </div>
      )}
      {persistent.length > 0 && (
        <div className="fixed bottom-5 left-5 z-50 w-96 rounded-3xl border border-terminal-border bg-terminal-surface/95 p-4 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Persistent alerts</p>
              <p className="text-sm font-semibold text-white">Circuit critical events</p>
            </div>
            <button
              onClick={() => dismissAll()}
              className="text-2xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Dismiss all
            </button>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {persistent.map((notif) => (
              <div key={notif.id} className="rounded-2xl border border-terminal-border bg-slate-950/90 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-2xs font-medium ${LEVEL_TITLE[notif.level]}`}>{notif.title}</span>
                  <button
                    onClick={() => useNotifStore.getState().dismiss(notif.id)}
                    className="text-gray-500 hover:text-gray-400 text-2xs"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">{notif.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
