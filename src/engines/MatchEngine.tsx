// 题型：数字配对。先点数字，再点数量一样的那一堆。
// （先放一个简单可用的版本；完整版由负责这个游戏的 agent 完成）

import { useRef, useState } from 'react'
import { ui } from '../core/i18n'
import type { MatchQuestion } from '../core/types'
import { ItemArt } from '../ui/art'
import { scoreFor, useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import type { EngineProps } from './types'

export function MatchEngine({ q, lang, say, onSolved }: EngineProps<MatchQuestion>) {
  const { w, h } = useViewport()
  const [selected, setSelected] = useState<number | null>(null)
  const [matched, setMatched] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const solvedRef = useRef(false)
  const card = Math.round(Math.min((w - 60) / (q.groups.length + 0.5), h * 0.25, 200))

  const tapGroup = (count: number) => {
    if (solvedRef.current || selected === null || matched.includes(count)) return
    if (selected === count) {
      const next = [...matched, count]
      setMatched(next)
      setSelected(null)
      sfx.drop()
      if (next.length === q.groups.length) {
        solvedRef.current = true
        onSolved(scoreFor(mistakes))
      }
    } else {
      setMistakes((m) => m + 1)
      setSelected(null)
      sfx.wrong()
      say(ui('tryAgain', lang))
    }
  }

  return (
    <div className="engine match-engine">
      <div className="options-row">
        {q.numerals.map((v) =>
          matched.includes(v) ? null : (
            <button
              key={v}
              type="button"
              className={`option-card numeral ${selected === v ? 'right' : ''}`}
              style={{ width: card * 0.6, height: card * 0.6 }}
              onClick={() => {
                sfx.tap()
                setSelected(v)
              }}
              data-value={v}
            >
              <span className="numeral-text" style={{ fontSize: card * 0.36 }}>
                {v}
              </span>
            </button>
          ),
        )}
      </div>
      <div className="options-row">
        {q.groups.map((count) => (
          <button
            key={count}
            type="button"
            className="option-card group"
            style={{ width: card, height: card }}
            onClick={() => tapGroup(count)}
            data-count={count}
          >
            <span className="group-grid" style={{ gridTemplateColumns: `repeat(${Math.min(count, 3)}, auto)` }}>
              {Array.from({ length: count }, (_, i) => (
                <ItemArt key={i} item={q.item} size={card / 4} />
              ))}
            </span>
            {matched.includes(count) && <span className="count-badge">{count}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
