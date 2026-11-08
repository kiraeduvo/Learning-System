// 题型：分类。把东西拖进对的篮子（拖不动的话：先点东西，再点篮子）。

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { COLOR_WORDS, SHAPE_WORDS, ui } from '../core/i18n'
import type { SortQuestion } from '../core/types'
import { Basket, ItemArt } from '../ui/art'
import { scoreFor, useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import type { EngineProps } from './types'

interface Drag {
  index: number
  pointerId: number
  startX: number
  startY: number
  dx: number
  dy: number
}

export function SortEngine({ q, lang, say, onSolved }: EngineProps<SortQuestion>) {
  const { w, h } = useViewport()
  const [placed, setPlaced] = useState<boolean[]>(() => q.items.map(() => false))
  const [selected, setSelected] = useState<number | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [shaking, setShaking] = useState<number | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [hoverBin, setHoverBin] = useState<number | null>(null)
  const binRefs = useRef<(HTMLDivElement | null)[]>([])
  const solvedRef = useRef(false)

  const itemSize = Math.round(Math.min(w / (q.items.length + 1.5), h * 0.14, 100))
  const binWidth = Math.round(Math.min(w / (q.bins.length + 0.6), h * 0.3, 240))

  const binAt = (x: number, y: number): number | null => {
    for (let b = 0; b < q.bins.length; b++) {
      const r = binRefs.current[b]?.getBoundingClientRect()
      if (r && x >= r.left - 12 && x <= r.right + 12 && y >= r.top - 24 && y <= r.bottom + 12) return b
    }
    return null
  }

  const binWord = (b: number) => {
    const bin = q.bins[b]
    return bin.type === 'color' ? COLOR_WORDS[bin.color][lang] : SHAPE_WORDS[bin.shape][lang]
  }

  const tryPlace = (index: number, bin: number) => {
    if (solvedRef.current || placed[index]) return
    if (q.items[index].bin === bin) {
      const next = placed.map((p, i) => (i === index ? true : p))
      setPlaced(next)
      setSelected(null)
      sfx.drop()
      if (next.every(Boolean)) {
        solvedRef.current = true
        onSolved(scoreFor(mistakes))
      } else {
        say(binWord(bin), 1)
      }
    } else {
      setMistakes((m) => m + 1)
      setShaking(index)
      window.setTimeout(() => setShaking(null), 500)
      setSelected(null)
      sfx.wrong()
      say(ui('tryAgain', lang))
    }
  }

  const onPointerDown = (e: ReactPointerEvent, index: number) => {
    if (placed[index] || solvedRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ index, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 })
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    setDrag({ ...drag, dx: e.clientX - drag.startX, dy: e.clientY - drag.startY })
    setHoverBin(binAt(e.clientX, e.clientY))
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    const moved = Math.hypot(drag.dx, drag.dy)
    const index = drag.index
    setDrag(null)
    setHoverBin(null)
    if (moved < 12) {
      // 当作"点一下"：选起来，再点篮子
      setSelected(selected === index ? null : index)
      sfx.tap()
      return
    }
    const bin = binAt(e.clientX, e.clientY)
    if (bin !== null) tryPlace(index, bin)
  }

  const tapBin = (b: number) => {
    if (selected !== null) tryPlace(selected, b)
  }

  return (
    <div className="engine sort-engine">
      <div className="sort-items">
        {q.items.map((it, i) =>
          placed[i] ? (
            <span key={i} className="sort-item ghost" style={{ width: itemSize, height: itemSize }} />
          ) : (
            <button
              key={i}
              type="button"
              className={`sort-item ${selected === i ? 'selected' : ''} ${shaking === i ? 'shake' : ''} ${drag?.index === i ? 'dragging' : ''}`}
              style={{
                width: itemSize,
                height: itemSize,
                transform: drag?.index === i ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.15)` : undefined,
              }}
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setDrag(null)}
              data-bin={it.bin}
            >
              <ItemArt item={it.item} size={itemSize * 0.9} />
            </button>
          ),
        )}
      </div>
      <div className="sort-bins">
        {q.bins.map((bin, b) => (
          <div
            key={b}
            ref={(el) => {
              binRefs.current[b] = el
            }}
            className={`sort-bin ${hoverBin === b ? 'hover' : ''} ${selected !== null ? 'ready' : ''}`}
            onClick={() => tapBin(b)}
            data-bin-index={b}
          >
            <div className="bin-contents" style={{ minHeight: itemSize * 0.5 }}>
              {q.items.map((it, i) =>
                placed[i] && it.bin === b ? <ItemArt key={i} item={it.item} size={itemSize * 0.5} /> : null,
              )}
            </div>
            <Basket
              width={binWidth}
              color={bin.type === 'color' ? bin.color : undefined}
              shape={bin.type === 'shape' ? bin.shape : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
