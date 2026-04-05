'use client'
import { useEffect } from 'react'
import { useMarqStore } from '@/store/useMarqStore'
import { useNotifStore } from '@/components/ui/NotificationSystem'

export function useKeyboardShortcuts() {
  const { setActiveTab } = useMarqStore()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      switch (e.key) {
        case '1': setActiveTab('STATE'); break
        case '2': setActiveTab('POSITIONS'); break
        case '3': setActiveTab('DECISIONS'); break
        case '4': setActiveTab('LOG'); break
        case '5': setActiveTab('NEWS'); break
        case '6': setActiveTab('INTEGRATIONS'); break
        case 'Escape':
          useNotifStore.getState().dismissAll()
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setActiveTab])
}
