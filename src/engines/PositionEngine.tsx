// 题型：位置。选东西在对的位置的那张图。
// （先放一个简单可用的版本；完整版由负责这个游戏的 agent 完成）

import { useState } from 'react'
import { ui } from '../core/i18n'
import type { Position, PositionQuestion } from '../core/types'
import { ItemArt } from '../ui/art'
import { scoreFor, useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import type { EngineProps } from './types'

/** 很简单的场景：一个箱子，东西在上面或下面 */
function Scene({ q, pos, size }: { q: PositionQuestion; pos: Position; size: number }) {
  const item = size * 0.34
  const top = pos === 'on' ? size * 0.12 : pos === 'under' ? size * 0.66 : size * 0.4
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'block' }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
        <rect x="22" y="42" width="56" height="22" rx="3" fill="#C98B5A" stroke="#8A5A2B" strokeWidth="2" />
      </svg>
      <span style={{ position: 'absolute', left: (size - item) / 2, top }}>
        <ItemArt item={{ kind: q.kind }} size={item} />
      </span>
    </span>
  )
}

export function PositionEngine({ q, lang, say, onSolved }: EngineProps<PositionQuestion>) {
  const { w, h } = useViewport()
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const card = Math.round(Math.min((w - 40) / (q.options.length + 0.4), h * 0.4, 240))

  const choose = (i: number) => {
    if (solved || wrong.includes(i)) return
    if (q.options[i] === q.answer) {
      setSolved(true)
      onSolved(scoreFor(wrong.length))
      return
    }
    setWrong([...wrong, i])
    sfx.wrong()
    say(ui('tryAgain', lang))
  }

  return (
    <div className="engine position-engine">
      <div className="options-row">
        {q.options.map((pos, i) => (
          <button
            key={pos}
            type="button"
            className={`option-card ${wrong.includes(i) ? 'wrong' : ''} ${solved && pos === q.answer ? 'right' : ''}`}
            style={{ width: card, height: card }}
            onClick={() => choose(i)}
            data-pos={pos}
            data-correct={pos === q.answer ? 'true' : undefined}
          >
            <Scene q={q} pos={pos} size={card * 0.9} />
          </button>
        ))}
      </div>
    </div>
  )
}
