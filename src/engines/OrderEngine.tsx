// 题型：排顺序。按顺序点东西，它们会依次放进上面的格子。
// （先放一个简单可用的版本；完整版由负责这个游戏的 agent 完成）

import { useRef, useState } from 'react'
import { ui } from '../core/i18n'
import type { OrderItem, OrderQuestion } from '../core/types'
import { ItemArt } from '../ui/art'
import { scoreFor, useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import type { EngineProps } from './types'

export function OrderEngine({ q, lang, say, onSolved }: EngineProps<OrderQuestion>) {
  const { w, h } = useViewport()
  const [placed, setPlaced] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const solvedRef = useRef(false)
  const n = q.items.length
  const size = Math.round(Math.min((w - 60) / (n + 0.6), h * 0.2, 150))

  const tap = (rank: number) => {
    if (solvedRef.current || placed.includes(rank)) return
    if (rank === placed.length) {
      const next = [...placed, rank]
      setPlaced(next)
      sfx.drop()
      if (next.length === n) {
        solvedRef.current = true
        onSolved(scoreFor(mistakes))
      }
    } else {
      setMistakes((m) => m + 1)
      sfx.wrong()
      say(ui('tryAgain', lang))
    }
  }

  const render = (o: OrderItem) =>
    o.item ? (
      <ItemArt item={o.item} size={size * 0.8} />
    ) : (
      <span className="numeral-text" style={{ fontSize: size * 0.6 }}>
        {o.numeral}
      </span>
    )

  const byRank = [...q.items].sort((a, b) => a.rank - b.rank)
  return (
    <div className="engine order-engine">
      <div className="options-row">
        {byRank.map((o, i) => (
          <span key={i} className="option-card" style={{ width: size, height: size }}>
            {i < placed.length ? render(o) : null}
          </span>
        ))}
      </div>
      <div className="options-row">
        {q.items.map((o) =>
          placed.includes(o.rank) ? null : (
            <button
              key={o.rank}
              type="button"
              className="option-card"
              style={{ width: size, height: size }}
              onClick={() => tap(o.rank)}
              data-rank={o.rank}
            >
              {render(o)}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
