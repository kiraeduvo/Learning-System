// 题型：描数字。照着笔顺，从绿色圆点开始，用手指沿着路线画。

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { TraceQuestion } from '../core/types'
import { DIGIT_BOX, DIGIT_STROKES } from '../ui/digits'
import { useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import type { EngineProps } from './types'

interface Sample {
  x: number
  y: number
  len: number
}

const STEP = 2.5
const RADIUS = 13
const LOOKAHEAD = 7

export function TraceEngine({ q, onSolved }: EngineProps<TraceQuestion>) {
  const { w, h } = useViewport()
  const strokes = DIGIT_STROKES[q.digit]
  const measureRefs = useRef<(SVGPathElement | null)[]>([])
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [samples, setSamples] = useState<Sample[][]>([])
  const [active, setActive] = useState(0)
  const [hit, setHit] = useState(0)
  const [idle, setIdle] = useState(false)
  const [hintPos, setHintPos] = useState(0)
  const drawing = useRef(false)
  const solvedRef = useRef(false)
  const lastProgress = useRef(Date.now())

  // 量出每一笔的长度，每隔一小段取一个点
  useLayoutEffect(() => {
    const all = strokes.map((_, i) => {
      const p = measureRefs.current[i]
      if (!p) return []
      const total = p.getTotalLength()
      const pts: Sample[] = []
      for (let l = 0; l <= total; l += STEP) {
        const pt = p.getPointAtLength(l)
        pts.push({ x: pt.x, y: pt.y, len: l })
      }
      const end = p.getPointAtLength(total)
      pts.push({ x: end.x, y: end.y, len: total })
      return pts
    })
    setSamples(all)
  }, [strokes])

  // 一阵子没进展：显示一个会动的小点，带着走
  useEffect(() => {
    const t = window.setInterval(() => {
      if (solvedRef.current) return
      setIdle(Date.now() - lastProgress.current > 4000)
    }, 500)
    return () => window.clearInterval(t)
  }, [])

  const cur = samples[active] ?? []
  useEffect(() => {
    if (!idle || cur.length === 0) return
    let i = hit
    const t = window.setInterval(() => {
      i = i + 2 >= cur.length ? hit : i + 2
      setHintPos(i)
    }, 40)
    return () => window.clearInterval(t)
  }, [idle, hit, cur])

  const toSvg = (e: ReactPointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return null
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: pt.x, y: pt.y }
  }

  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  /** 从 from 开始，看手指的位置可以把这一笔推进到哪里 */
  const reach = (from: number, p: { x: number; y: number }): number => {
    let best = from
    for (let j = from; j <= Math.min(from + LOOKAHEAD, cur.length - 1); j++) {
      if (Math.hypot(cur[j].x - p.x, cur[j].y - p.y) <= RADIUS) best = j
    }
    return best
  }

  const advance = (e: ReactPointerEvent, fresh = false) => {
    if (solvedRef.current || cur.length === 0) return
    const p = toSvg(e)
    if (!p) return
    // 手指移动很快时，中间补几个点，才不会"断掉"
    const prev = fresh ? null : lastPoint.current
    lastPoint.current = p
    let best = hit
    if (prev) {
      const dist = Math.hypot(p.x - prev.x, p.y - prev.y)
      const steps = Math.max(1, Math.ceil(dist / 3))
      for (let s = 1; s <= steps; s++) {
        best = reach(best, { x: prev.x + ((p.x - prev.x) * s) / steps, y: prev.y + ((p.y - prev.y) * s) / steps })
      }
    } else {
      best = reach(best, p)
    }
    if (best <= hit) return
    lastProgress.current = Date.now()
    setIdle(false)
    if (best >= cur.length - 2) {
      // 这一笔完成
      sfx.drop()
      if (active + 1 >= strokes.length) {
        solvedRef.current = true
        setHit(cur.length - 1)
        onSolved({ score: 1, firstTry: true })
      } else {
        setActive(active + 1)
        setHit(0)
      }
      drawing.current = false
      return
    }
    setHit(best)
  }

  const size = Math.min(h * 0.56, w * 0.72 * (DIGIT_BOX.height / DIGIT_BOX.width), 520)
  const start = cur[0]
  const arrowFrom = cur[Math.min(hit + 4, cur.length - 1)]
  const arrowTo = cur[Math.min(hit + 9, cur.length - 1)]
  const angle = arrowFrom && arrowTo ? (Math.atan2(arrowTo.y - arrowFrom.y, arrowTo.x - arrowFrom.x) * 180) / Math.PI : 0
  const drawnLen = cur[hit]?.len ?? 0
  const solved = solvedRef.current

  return (
    <div className="engine trace-engine">
      <svg
        ref={svgRef}
        className="trace-svg"
        width={size * (DIGIT_BOX.width / DIGIT_BOX.height)}
        height={size}
        viewBox={`0 0 ${DIGIT_BOX.width} ${DIGIT_BOX.height}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drawing.current = true
          advance(e, true)
        }}
        onPointerMove={(e) => {
          if (drawing.current) advance(e)
        }}
        onPointerUp={() => {
          drawing.current = false
        }}
        onPointerCancel={() => {
          drawing.current = false
        }}
        data-digit={q.digit}
      >
        {strokes.map((d, i) => (
          <path
            key={`m${i}`}
            ref={(el) => {
              measureRefs.current[i] = el
            }}
            d={d}
            fill="none"
            stroke="none"
          />
        ))}
        {/* 路线 */}
        {strokes.map((d, i) => (
          <path key={`g${i}`} d={d} className="trace-road" />
        ))}
        {strokes.map((d, i) => (
          <path key={`c${i}`} d={d} className="trace-center" />
        ))}
        {/* 已经画好的 */}
        {strokes.map((d, i) => {
          if (i < active || (solved && i === active)) return <path key={`i${i}`} d={d} className="trace-ink" />
          if (i === active && drawnLen > 0)
            return (
              <path
                key={`i${i}`}
                d={d}
                className="trace-ink"
                strokeDasharray={`${drawnLen} 9999`}
              />
            )
          return null
        })}
        {!solved && start && (
          <>
            {hit === 0 && (
              <g className="trace-start">
                <circle cx={start.x} cy={start.y} r="8" />
                <text x={start.x} y={start.y + 3.5} textAnchor="middle">
                  {active + 1}
                </text>
              </g>
            )}
            {arrowFrom && arrowTo && (
              <path
                className="trace-arrow"
                d="M-5 -5 L5 0 L-5 5"
                transform={`translate(${arrowTo.x} ${arrowTo.y}) rotate(${angle})`}
              />
            )}
            {hit > 0 && cur[hit] && <circle className="trace-pen" cx={cur[hit].x} cy={cur[hit].y} r="6" />}
            {idle && cur[hintPos] && <circle className="trace-hint" cx={cur[hintPos].x} cy={cur[hintPos].y} r="5" />}
          </>
        )}
      </svg>
    </div>
  )
}
