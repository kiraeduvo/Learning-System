// 主页：一个大大的"开始"按钮 + 游戏 + 贴纸册

import { useEffect, useState } from 'react'
import { dateKey } from '../core/dates'
import { ui } from '../core/i18n'
import { unlockedSkills } from '../core/learning'
import type { ChildProfile, SkillId } from '../core/types'
import { speak } from '../services/speech'
import { sfx } from '../services/sfx'
import { useStore } from '../state/store'
import { Avatar, Mascot, StarIcon } from '../ui/art'
import { useViewport } from '../ui/hooks'
import { SkillIcon } from '../ui/SkillIcon'
import { ParentGate } from './ParentGate'

let greeted = false

export function sessionsToday(child: ChildProfile, now = Date.now()): number {
  const today = dateKey(now)
  return child.sessions.filter((s) => s.date === today).length
}

export function limitReached(child: ChildProfile): boolean {
  const limit = child.settings.dailySessionLimit
  return limit > 0 && sessionsToday(child) >= limit
}

export function Home({
  onPlay,
  onStickers,
  onParent,
  onPickChild,
}: {
  onPlay: (focusSkill?: SkillId) => void
  onStickers: () => void
  onParent: () => void
  onPickChild: () => void
}) {
  const { child, data } = useStore()
  const { w, h } = useViewport()
  const [gate, setGate] = useState(false)
  const lang = child?.settings.lang ?? 'zh'
  const rate = child?.settings.speechRate ?? 0.9
  const name = child?.name ?? ''

  useEffect(() => {
    if (greeted || !name) return
    greeted = true
    const t = window.setTimeout(() => speak(ui('hello', lang, { name }), lang, rate), 500)
    return () => window.clearTimeout(t)
  }, [name, lang, rate])

  if (!child) return null
  const done = limitReached(child)
  const games = unlockedSkills(child.progress, child.settings.unlockAll)
  const reward = child.reward
  const rewardProgress = reward ? Math.max(0, Math.min(child.stars - reward.startStars, reward.goalStars)) : 0

  const play = (focus?: SkillId) => {
    sfx.unlock()
    if (done) {
      speak(ui('doneForToday', lang), lang, rate)
      return
    }
    sfx.tap()
    onPlay(focus)
  }

  const landscape = w > h
  const tile = Math.round(landscape ? Math.min((w * 0.55) / 4.4, h / 3.6, 140) : Math.min(w / 3.6, h / 5.8, 140))

  return (
    <div className={`screen home ${landscape ? 'landscape' : ''}`}>
      <header className="topbar">
        <button
          type="button"
          className="child-chip"
          onClick={() => (data.children.length > 1 ? onPickChild() : undefined)}
        >
          <Avatar id={child.avatar} size={44} />
          <span>{child.name}</span>
        </button>
        <div className="star-pill" aria-label="stars">
          <StarIcon size={30} />
          <span>{child.stars}</span>
        </div>
        <button type="button" className="parent-btn" onClick={() => setGate(true)} aria-label="家长区">
          ⚙︎
        </button>
      </header>

      <main className="home-main">
        <section className="hero">
          <button
            type="button"
            className="mascot-btn"
            onClick={() => {
              sfx.unlock()
              speak(ui('hello', lang, { name: child.name }), lang, rate)
            }}
            aria-label="mascot"
          >
            <Mascot size={Math.min(h * 0.22, w * 0.34, 190)} mood="happy" />
          </button>
          <button type="button" className={`play-btn ${done ? 'disabled' : ''}`} onClick={() => play()}>
            <span className="play-tri">▶</span>
            <span>{ui('play', lang)}</span>
          </button>
          {done && <p className="done-note">{ui('doneForToday', lang)}</p>}
          {reward && (
            <div className="reward-bar" aria-label="reward goal">
              <span className="reward-gift">🎁</span>
              <span className="reward-track">
                <span className="reward-fill" style={{ width: `${(rewardProgress / reward.goalStars) * 100}%` }} />
              </span>
              <span className="reward-count">
                {rewardProgress}/{reward.goalStars}
              </span>
            </div>
          )}
        </section>

        <section className="games">
          <div className="games-grid" style={{ gridTemplateColumns: `repeat(auto-fill, ${tile}px)` }}>
            {games.map((s) => (
              <button
                key={s.id}
                type="button"
                className="game-tile"
                style={{ width: tile, height: tile }}
                onClick={() => play(s.id)}
                data-skill={s.id}
              >
                <SkillIcon skill={s} size={tile} />
              </button>
            ))}
            <button
              type="button"
              className="game-tile sticker-tile"
              style={{ width: tile, height: tile }}
              onClick={() => {
                sfx.tap()
                onStickers()
              }}
            >
              <span className="sticker-tile-icon" style={{ fontSize: tile * 0.4 }}>
                📒
              </span>
              <span className="tile-label">{ui('stickers', lang)}</span>
            </button>
          </div>
        </section>
      </main>

      {gate && (
        <ParentGate
          onCancel={() => setGate(false)}
          onPass={() => {
            setGate(false)
            onParent()
          }}
        />
      )}
    </div>
  )
}
