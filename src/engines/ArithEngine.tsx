// 题型：10 以内加减法。看图（或算式），选答案。
// （先放一个简单可用的版本；完整版由负责这个游戏的 agent 完成）

import { useState } from 'react'
import { ui } from '../core/i18n'
import type { ArithQuestion } from '../core/types'
import { ItemArt } from '../ui/art'
import { scoreFor, useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import type { EngineProps } from './types'

export function ArithEngine({ q, lang, say, onSolved }: EngineProps<ArithQuestion>) {
  const { w, h } = useViewport()
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const item = Math.round(Math.min(w / 9, h * 0.08, 64))
  const opt = Math.round(Math.min((w - 40) / (q.options.length + 0.6), h * 0.16, 140))

  const choose = (v: number) => {
    if (solved || wrong.includes(v)) return
    if (v === q.answer) {
      setSolved(true)
      onSolved(scoreFor(wrong.length))
      return
    }
    setWrong([...wrong, v])
    sfx.wrong()
    say(ui('tryAgain', lang))
  }

  const group = (n: number, crossed = 0) => (
    <span className="arith-group" style={{ display: 'flex', flexWrap: 'wrap', maxWidth: item * 3.2 }}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ opacity: i >= n - crossed ? 0.3 : 1 }}>
          <ItemArt item={q.item} size={item} />
        </span>
      ))}
    </span>
  )

  return (
    <div className="engine arith-engine">
      <div className="options-row" style={{ alignItems: 'center' }}>
        {q.op === '+' ? (
          <>
            {group(q.a)}
            <span className="numeral-text" style={{ fontSize: item }}>+</span>
            {group(q.b)}
          </>
        ) : (
          group(q.a, q.b)
        )}
      </div>
      <div className="numeral-text" style={{ fontSize: item * 0.9 }}>
        {q.a} {q.op === '+' ? '+' : '−'} {q.b} = {solved ? q.answer : '?'}
      </div>
      <div className="options-row">
        {q.options.map((v) => (
          <button
            key={v}
            type="button"
            className={`option-card numeral ${wrong.includes(v) ? 'wrong' : ''} ${solved && v === q.answer ? 'right' : ''}`}
            style={{ width: opt, height: opt }}
            onClick={() => choose(v)}
            data-value={v}
            data-correct={v === q.answer ? 'true' : undefined}
          >
            <span className="numeral-text" style={{ fontSize: opt * 0.56 }}>
              {v}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
