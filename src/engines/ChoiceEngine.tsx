// 题型：选择题（认数字、比多少、比大小、认形状、找规律）

import { useState } from 'react'
import { ui } from '../core/i18n'
import type { ChoiceOption, ChoiceQuestion, Item } from '../core/types'
import { ItemArt } from '../ui/art'
import { scoreFor, useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import type { EngineProps } from './types'

function GroupArt({ item, count, width, height }: { item: Item; count: number; width: number; height: number }) {
  const cols = count <= 3 ? count : count <= 4 ? 2 : 3
  const rows = Math.ceil(count / cols)
  const cell = Math.min(width / (cols + 0.4), height / (rows + 0.3))
  // 大小由 item.scale 决定（难度 3 故意让少的那边画大一点）
  const base = Math.min(cell / Math.max(item.scale ?? 1, 1), cell)
  return (
    <span className="group-grid" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)` }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="group-cell" style={{ width: cell, height: cell }}>
          <ItemArt item={item} size={base * 0.92} />
        </span>
      ))}
    </span>
  )
}

export function ChoiceEngine({ q, lang, say, onSolved }: EngineProps<ChoiceQuestion>) {
  const { w, h } = useViewport()
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)

  const n = q.options.length
  const isGroup = q.options[0]?.type === 'group'
  const portrait = h > w
  // 直的手机：四个选项排成 2×2；"比多少"的两堆上下排，东西可以画大一点
  const perRow = isGroup ? (portrait ? 1 : 2) : n === 4 && portrait ? 2 : n
  const rows = Math.ceil(n / perRow)
  const groupW = Math.round(portrait ? Math.min(w - 48, 480) : Math.min(w * 0.4, 420))
  const groupH = Math.round(portrait ? Math.min(h * 0.27, 260) : Math.min(h * 0.5, 320))
  const card = Math.round(
    Math.min((w - 40) / (perRow + 0.35), (h * (q.sequence ? 0.3 : 0.48)) / rows, 230),
  )

  const choose = (i: number) => {
    if (solved || wrong.includes(i)) return
    if (i === q.answerIndex) {
      setSolved(true)
      onSolved(scoreFor(wrong.length))
      return
    }
    setWrong([...wrong, i])
    sfx.wrong()
    say(ui('tryAgain', lang))
  }

  const renderOption = (o: ChoiceOption) => {
    if (o.type === 'numeral')
      return (
        <span className="numeral-text" style={{ fontSize: card * 0.62 }}>
          {o.value}
        </span>
      )
    if (o.type === 'group') return <GroupArt item={o.item} count={o.count} width={groupW * 0.9} height={groupH * 0.84} />
    return <ItemArt item={o.item} size={card * 0.74} />
  }

  const answer = q.options[q.answerIndex]
  // 规律：一整排（包括问号）要放得下一行
  const cells = (q.sequence?.length ?? 0) + 1
  const seqSize = q.sequence ? Math.floor(Math.min((w - 56 - 6 * (cells - 1)) / cells, h * 0.15, 110)) : 0

  return (
    <div className="engine choice-engine">
      {q.sequence && (
        <div className="sequence-row">
          {q.sequence.map((it, i) => (
            <span key={i} className="sequence-cell" style={{ width: seqSize, height: seqSize }}>
              <ItemArt item={it} size={seqSize * 0.86} />
            </span>
          ))}
          <span className={`sequence-cell slot ${solved ? 'filled' : ''}`} style={{ width: seqSize, height: seqSize }}>
            {solved && answer.type === 'item' ? <ItemArt item={answer.item} size={seqSize * 0.86} /> : '?'}
          </span>
        </div>
      )}
      <div
        className={`options-grid ${isGroup ? 'groups' : ''}`}
        style={{ gridTemplateColumns: `repeat(${perRow}, auto)` }}
      >
        {q.options.map((o, i) => (
          <button
            key={i}
            type="button"
            className={`option-card ${o.type} ${wrong.includes(i) ? 'wrong' : ''} ${solved && i === q.answerIndex ? 'right' : ''} ${wrong.length >= 2 && !solved && i === q.answerIndex ? 'hint' : ''}`}
            style={isGroup ? { width: groupW, height: groupH } : { width: card, height: card }}
            onClick={() => choose(i)}
            data-index={i}
            data-correct={i === q.answerIndex ? 'true' : undefined}
          >
            {renderOption(o)}
          </button>
        ))}
      </div>
    </div>
  )
}
