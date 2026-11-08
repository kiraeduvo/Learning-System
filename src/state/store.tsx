import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, ChildProfile } from '../core/types'
import { setSoundEnabled } from '../services/sfx'
import { loadData, saveData } from '../services/storage'

interface Store {
  data: AppData
  child: ChildProfile | null
  setData: (fn: (d: AppData) => AppData) => void
  updateChild: (fn: (c: ChildProfile) => ChildProfile) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    void loadData().then(setDataState)
  }, [])

  // 资料一改就存（稍微等一下，把连续的改动合在一起存）
  useEffect(() => {
    if (!data) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void saveData(data), 300)
  }, [data])

  // app 被切到后台时马上存
  useEffect(() => {
    if (!data) return
    const flush = () => {
      if (document.visibilityState === 'hidden') void saveData(data)
    }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [data])

  const setData = useCallback((fn: (d: AppData) => AppData) => {
    setDataState((d) => (d ? fn(d) : d))
  }, [])

  const updateChild = useCallback((fn: (c: ChildProfile) => ChildProfile) => {
    setDataState((d) => {
      if (!d || !d.activeChildId) return d
      return { ...d, children: d.children.map((c) => (c.id === d.activeChildId ? fn(c) : c)) }
    })
  }, [])

  const child = useMemo(() => data?.children.find((c) => c.id === data.activeChildId) ?? null, [data])

  useEffect(() => {
    setSoundEnabled(child?.settings.sound ?? true)
  }, [child?.settings.sound])

  if (!data) return <div className="loading" />
  return <Ctx.Provider value={{ data, child, setData, updateChild }}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}
