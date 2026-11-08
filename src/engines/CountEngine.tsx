// 题型：数数。点一下东西会数出来，然后选有几个。

import { useEffect, useMemo, useRef, useState } from 'react'
import { numberWord, ui } from '../core/i18n'
import { seededRng } from '../core/rng'
import type { CountQuestion } from '../core/types'
import { Dots, ItemArt } from '../ui/art'
import { scoreFor, useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import type { EngineProps } from './types'

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function CountEngine({ q, lang, say, onSolved }: EngineProps<CountQuestion>) {
  const { w, h } = useViewport()
  const [counted, setCounted] = useState<number[]>([])
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const [demoIndex, setDemoIndex] = useState<number | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  // 每行几个：直的手机每行少一点，东西才能画大
  const portrait = h > w
  const perRow = portrait ? (q.count <= 3 ? q.count : q.count <= 6 ? 3 : 4) : q.count <= 5 ? q.count : 5
  const rows = Math.ceil(q.count / perRow)
  const size = Math.round(Math.min((Math.min(w, 760) - 72) / (perRow + 0.5), (h * 0.4) / (rows + 0.3), 130))

  // 散开的排法：每题固定（不会每次重画都乱跳）
  const scatter = useMemo(() => {
    if (q.layout !== 'scatter') return null
    const rng = seededRng(hash(q.signature))
    const cols = perRow
    return Array.from({ length: q.count }, (_, i) => {
      const c = i % cols
      const r = Math.floor(i / cols)
      return {
        left: ((c + 0.5) / cols) * 100 + (rng() - 0.5) * (40 / cols),
        top: ((r + 0.5) / rows) * 100 + (rng() - 0.5) * (30 / rows),
        rot: (rng() - 0.5) * 30,
      }
    })
  }, [q.layout, q.count, q.signature, perRow, rows])

  const tapItem = (i: number) => {
    if (solved || demoIndex !== null || counted.includes(i)) return
    const next = [...counted, i]
    setCounted(next)
    sfx.tap()
    say(numberWord(next.length, lang), 1)
  }

  // 答错一次后，一起慢慢数一遍
  const runDemo = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    setCounted([])
    say(ui('letsCountTogether', lang))
    for (let i = 0; i < q.count; i++) {
      timers.current.push(
        window.setTimeout(
          () => {
            setDemoIndex(i)
            setCounted(Array.from({ length: i + 1 }, (_, k) => k))
            say(numberWord(i + 1, lang), 1)
          },
          1400 + i * 900,
        ),
      )
    }
    timers.current.push(window.setTimeout(() => setDemoIndex(null), 1400 + q.count * 900))
  }

  const choose = (value: number) => {
    if (solved || demoIndex !== null || wrong.includes(value)) return
    if (value === q.count) {
      setSolved(true)
      onSolved(scoreFor(wrong.length))
      return
    }
    const nextWrong = [...wrong, value]
    setWrong(nextWrong)
    sfx.wrong()
    if (nextWrong.length === 1) runDemo()
    else say(ui('tryAgain', lang))
  }

  const optSize = Math.round(Math.min(w / (q.options.length + 1), h * 0.17, 150))
  const showHint = wrong.length >= 2

  return (
    <div className="engine count-engine">
      <div
        className={`count-tray ${q.layout}`}
        style={
          q.layout === 'scatter'
            ? { height: rows * size * 1.35 + 28 }
            : { gridTemplateColumns: `repeat(${perRow}, ${size}px)` }
        }
      >
        {Array.from({ length: q.count }, (_, i) => {
          const order = counted.indexOf(i)
          const pos = scatter?.[i]
          return (
            <button
              key={i}
              type="button"
              className={`count-item ${order >= 0 ? 'counted' : ''} ${demoIndex === i ? 'demo' : ''}`}
              style={
                pos
                  ? {
                      position: 'absolute',
                      left: `${pos.left}%`,
                      top: `${pos.top}%`,
                      transform: `translate(-50%, -50%) rotate(${pos.rot}deg)`,
                    }
                  : undefined
              }
              onClick={() => tapItem(i)}
              aria-label={`item ${i + 1}`}
            >
              <ItemArt item={q.item} size={size} />
              {order >= 0 && <span className="count-badge">{order + 1}</span>}
            </button>
          )
        })}
      </div>
      <div className="options-row">
        {q.options.map((v) => (
          <button
            key={v}
            type="button"
            className={`option-card numeral ${wrong.includes(v) ? 'wrong' : ''} ${solved && v === q.count ? 'right' : ''} ${showHint && v === q.count && !solved ? 'hint' : ''}`}
            style={{ width: optSize, height: optSize * (q.showDots ? 1.15 : 1) }}
            onClick={() => choose(v)}
            data-value={v}
            data-correct={v === q.count ? 'true' : undefined}
          >
            <span className="numeral-text" style={{ fontSize: optSize * 0.56 }}>
              {v}
            </span>
            {q.showDots && <Dots n={v} size={Math.max(6, Math.round(optSize / 14))} />}
          </button>
        ))}
      </div>
    </div>
  )
}
