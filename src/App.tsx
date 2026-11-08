import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect, useRef, useState } from 'react'
import type { SkillId } from './core/types'
import { Home } from './screens/Home'
import { Parent } from './screens/Parent'
import { PickChild } from './screens/PickChild'
import { Reward } from './screens/Reward'
import { Session, type SessionSummary } from './screens/Session'
import { Setup } from './screens/Setup'
import { Stickers } from './screens/Stickers'
import { stopSpeaking } from './services/speech'
import { useStore } from './state/store'

type Screen =
  | { name: 'home' }
  | { name: 'session'; focusSkill?: SkillId; run: number }
  | { name: 'reward'; summary: SessionSummary }
  | { name: 'stickers' }
  | { name: 'parent' }
  | { name: 'pick' }

export default function App() {
  const { data, child } = useStore()
  const [screen, setScreen] = useState<Screen>(() => (data.children.length > 1 ? { name: 'pick' } : { name: 'home' }))
  const runs = useRef(0)
  const screenRef = useRef(screen)
  screenRef.current = screen

  // Android 返回键：回主页；在主页就把 app 放到后台（不会关掉，也不会丢资料）
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const sub = CapApp.addListener('backButton', () => {
      if (screenRef.current.name === 'home') void CapApp.minimizeApp()
      else {
        stopSpeaking()
        setScreen({ name: 'home' })
      }
    })
    return () => {
      void sub.then((s) => s.remove())
    }
  }, [])

  if (!child) return <Setup />

  const startSession = (focusSkill?: SkillId) => setScreen({ name: 'session', focusSkill, run: ++runs.current })
  const home = () => setScreen({ name: 'home' })

  switch (screen.name) {
    case 'pick':
      return <PickChild onPicked={home} />
    case 'session':
      return (
        <Session
          key={screen.run}
          focusSkill={screen.focusSkill}
          onExit={home}
          onDone={(summary) => setScreen({ name: 'reward', summary })}
        />
      )
    case 'reward':
      return (
        <Reward
          summary={screen.summary}
          onAgain={() => startSession(screen.summary.focusSkill)}
          onHome={home}
        />
      )
    case 'stickers':
      return <Stickers onBack={home} />
    case 'parent':
      return <Parent onBack={home} />
    default:
      return (
        <Home
          onPlay={startSession}
          onStickers={() => setScreen({ name: 'stickers' })}
          onParent={() => setScreen({ name: 'parent' })}
          onPickChild={() => setScreen({ name: 'pick' })}
        />
      )
  }
}
