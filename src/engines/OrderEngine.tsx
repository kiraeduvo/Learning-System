// 题型：排顺序。上面是一排空格子，下面是打乱的东西。
// 按顺序点下面的东西（或把它拖上去），它会飞进上面下一个空格子；点错的会摇一摇。
// 找数字题：大部分格子已经放好，只要放不见的数字；下面还有几个不属于这一排的数字。

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { numberWord, ui } from '../core/i18n'
import type { Item, OrderQuestion } from '../core/types'
import { Dots, ItemArt } from '../ui/art'
import { scoreFor, useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import type { EngineProps } from './types'
import './order.css'

/** 下面一个可以点的东西：要排的（有 rank）或不属于这一排的数字（rank 是 null，点了算错） */
interface Piece {
  key: string
  rank: number | null
  item?: Item
  numeral?: number
}

/** 飞进格子的动画：一开始在哪里（离格子中心多远）、多大 */
interface Flight {
  dx: number
  dy: number
  s: number
}

interface Drag {
  key: string
  pointerId: number
  startX: number
  startY: number
  moved: boolean
}

/** 手指移动超过这么多像素才算拖，不然算点一下 */
const DRAG_MIN = 12
/** 最后一个放好以后等一下再庆祝：让孩子看到排好的一排、听到最后一个数字 */
const SOLVE_DELAY = 650

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties

interface FaceProps {
  item?: Item
  numeral?: number
  /** 图的大小（scale = 1 的时候） */
  art: number
  /** 数字的字体大小 */
  font: number
  dots?: boolean
}

/** 东西的样子：图，或者数字（可以加圆点） */
function Face({ item, numeral, art, font, dots }: FaceProps) {
  if (item) return <ItemArt item={item} size={art} />
  return (
    <>
      <span className="numeral-text" style={{ fontSize: font }}>
        {numeral}
      </span>
      {dots && numeral !== undefined && <Dots n={numeral} size={Math.max(8, Math.round(font / 5))} />}
    </>
  )
}

/** 格子下面的方向提示：大小用一条越来越粗（或越来越细）的楔形，数字用箭头 */
function Guide({ width, height, kind }: { width: number; height: number; kind: 'up' | 'down' | 'arrow' }) {
  const m = height / 2
  const end = width - 4
  const head = height * 0.75
  return (
    <svg className="order-guide" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {kind === 'arrow' ? (
        <path d={`M4 ${m}H${end}M${end - head} ${m - head * 0.6}L${end} ${m}L${end - head} ${m + head * 0.6}`} />
      ) : (
        <polygon
          points={
            kind === 'up' ? `3,${m} ${width - 3},3 ${width - 3},${height - 3}` : `3,3 3,${height - 3} ${width - 3},${m}`
          }
        />
      )}
    </svg>
  )
}

export function OrderEngine({ q, lang, say, onSolved }: EngineProps<OrderQuestion>) {
  const { w, h } = useViewport()
  const byRank = useMemo(() => [...q.items].sort((a, b) => a.rank - b.rank), [q])
  const given = useMemo(() => new Set(q.given ?? []), [q])
  // 下面可以点的：找数字题用 choices（包括干扰的数字），不然就是还没放好的东西
  const pieces = useMemo<Piece[]>(() => {
    if (q.choices) {
      return q.choices.map((v) => {
        const o = q.items.find((it) => it.numeral === v && !given.has(it.rank))
        return o ? { key: `r${o.rank}`, rank: o.rank, numeral: v } : { key: `x${v}`, rank: null, numeral: v }
      })
    }
    return q.items
      .filter((o) => !given.has(o.rank))
      .map((o) => ({ key: `r${o.rank}`, rank: o.rank, item: o.item, numeral: o.numeral }))
  }, [q, given])

  /** 孩子放好的格子（rank → 飞进来的动画） */
  const [placed, setPlaced] = useState<Record<number, Flight | null>>({})
  const [mistakes, setMistakes] = useState(0)
  const [shake, setShake] = useState<{ key: string; n: number } | null>(null)
  const [dragView, setDragView] = useState<{ key: string; dx: number; dy: number } | null>(null)
  const [over, setOver] = useState(false)
  /** 这个题型实际可以用的大小（扣掉上面的按钮、题目、手机的安全区） */
  const [box, setBox] = useState({ w: 0, h: 0 })
  const rootRef = useRef<HTMLDivElement | null>(null)
  const slotRefs = useRef<(HTMLDivElement | null)[]>([])
  const boardRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const mistakesRef = useRef(0)
  const solvedRef = useRef(false)
  /** 这一次点/拖已经在 pointerup 处理好了：浏览器接着送的那个 click 不要再算一次 */
  const handled = useRef<{ key: string; at: number } | null>(null)
  const shakeTimer = useRef<number | undefined>(undefined)
  const solveTimer = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      window.clearTimeout(shakeTimer.current)
      window.clearTimeout(solveTimer.current)
    },
    [],
  )

  // 量出实际的空间（画面上的大小不受里面的东西影响），画之前就量好，不会闪一下
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => {
      const size = { w: el.clientWidth, h: el.clientHeight }
      setBox((b) => (b.w === size.w && b.h === size.h ? b : size))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = byRank.length
  const isFilled = (r: number) => given.has(r) || r in placed
  // 下一个要放的格子（rank 刚好是 0..n-1，所以格子的位置就是 rank）
  const next = byRank.findIndex((o) => !isFilled(o.rank))
  const done = next === -1

  // ---------- 大小：跟着画面算 ----------
  // 还没量到之前（第一次画）先用画面大小估计
  const portrait = h > w
  const W = Math.min(box.w || w - 32, 1040)
  const H = box.h || Math.max(200, h - 170)
  const narrow = W < 520
  const short = H < 400
  const isSize = byRank[0]?.item !== undefined
  const scales = byRank.map((o) => o.item?.scale ?? 1)
  const growing = scales[n - 1] >= scales[0]
  const showGuide = !q.given
  const pad = narrow || short ? 8 : 16
  const gap = narrow ? 6 : short ? 8 : 12
  const guideH = showGuide ? (short ? 10 : narrow ? 14 : 20) : 0
  const guideGap = showGuide ? (short ? 4 : narrow ? 6 : 10) : 0
  // 下面的东西：直的手机排两行，东西可以大一点
  const m = pieces.length
  const cols = portrait ? (m <= 3 ? m : m === 4 ? 2 : 3) : m
  const rows = Math.ceil(m / cols)
  const gapT = narrow || short ? 12 : 18
  // 高度：扣掉格子的边、方向提示、卡片之间的空隙和阴影，剩下的分给上面的格子和下面的卡片
  const free = H - 12 - pad * 2 - guideH - guideGap - gapT * (rows - 1) - 14
  const boardShare = isSize ? 0.44 : 0.38
  // 下面的卡片至少 64px，小手才点得到
  const T = Math.floor(
    Math.max(64, Math.min((W - gapT * (cols - 1)) / cols, (free * (1 - boardShare)) / rows, 172)),
  )
  // 上面的格子：排大小的格子跟东西一样一个比一个大（一看就知道方向）。
  // 很矮的画面卡片已经是最小了，格子就用剩下的高度
  const units = isSize ? scales.reduce((a, b) => a + b, 0) : n
  const S = Math.floor(
    Math.max(
      24,
      Math.min((W - pad * 2 - gap * (n - 1)) / units, free * boardShare, free - T * rows, isSize ? 210 : 150),
    ),
  )
  const slotSize = (r: number) => (isSize ? Math.round(S * scales[r]) : S)
  const rowW = byRank.reduce((sum, _, r) => sum + slotSize(r), 0) + gap * (n - 1)
  const dots = q.showDots === true
  const trayArt = T * 0.84
  const slotArt = S * 0.82
  const trayFont = T * (dots ? 0.46 : 0.56)
  const slotFont = S * (dots ? 0.46 : 0.58)
  const flyScale = isSize ? trayArt / slotArt : trayFont / slotFont

  // ---------- 放东西 ----------
  const place = (rank: number, from: DOMRect | null) => {
    const slot = slotRefs.current[rank]
    let flight: Flight | null = null
    if (from && slot) {
      const to = slot.getBoundingClientRect()
      flight = {
        dx: Math.round(from.left + from.width / 2 - (to.left + to.width / 2)),
        dy: Math.round(from.top + from.height / 2 - (to.top + to.height / 2)),
        s: Math.round(flyScale * 100) / 100,
      }
    }
    const nextPlaced = { ...placed, [rank]: flight }
    setPlaced(nextPlaced)
    sfx.drop()
    const numeral = byRank[rank].numeral
    if (numeral !== undefined) say(numberWord(numeral, lang), 1)
    if (byRank.every((o) => given.has(o.rank) || o.rank in nextPlaced)) {
      solvedRef.current = true
      solveTimer.current = window.setTimeout(() => onSolved(scoreFor(mistakesRef.current)), SOLVE_DELAY)
    }
  }

  const miss = (key: string) => {
    mistakesRef.current += 1
    setMistakes(mistakesRef.current)
    setShake((s) => ({ key, n: (s?.n ?? 0) + 1 }))
    window.clearTimeout(shakeTimer.current)
    shakeTimer.current = window.setTimeout(() => setShake(null), 500)
    sfx.wrong()
    say(ui('tryAgain', lang))
  }

  /** 点了（或拖上去）一个东西：是下一个就放进去，不然算错 */
  const attempt = (p: Piece, from: DOMRect | null) => {
    if (solvedRef.current) return
    if (p.rank !== null && isFilled(p.rank)) return
    if (p.rank === next) place(p.rank, from)
    else miss(p.key)
  }

  // 手指/鼠标点一下在 onPointerUp 就处理（触控有时候不会送 click）；
  // 这里只处理键盘或程序送来的 click
  const onClick = (e: ReactMouseEvent<HTMLButtonElement>, p: Piece) => {
    const prev = handled.current
    handled.current = null
    if (prev && prev.key === p.key && performance.now() - prev.at < 600) return
    attempt(p, e.currentTarget.getBoundingClientRect())
  }

  // ---------- 拖 ----------
  const overBoard = (x: number, y: number) => {
    const r = boardRef.current?.getBoundingClientRect()
    return !!r && x > r.left - 20 && x < r.right + 20 && y > r.top - 20 && y < r.bottom + 30
  }

  const endDrag = () => {
    dragRef.current = null
    setDragView(null)
    setOver(false)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, p: Piece) => {
    // 新的一次点/拖开始了：之前留下的记号不要了
    handled.current = null
    if (solvedRef.current || dragRef.current || e.button !== 0) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // 拿不到也没关系，点一下还是可以用
    }
    dragRef.current = { key: p.key, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) < DRAG_MIN) return
    d.moved = true
    setDragView({ key: d.key, dx, dy })
    setOver(overBoard(e.clientX, e.clientY))
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>, p: Piece) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId || d.key !== p.key) return
    // 现在的位置（拖的话包括位移），飞进格子的动画从这里开始
    const rect = e.currentTarget.getBoundingClientRect()
    endDrag()
    handled.current = { key: p.key, at: performance.now() }
    // 没有移动：点一下。拖的话，放在格子那一排上面才算；放在别的地方就回去原位，不算错
    if (!d.moved || overBoard(e.clientX, e.clientY)) attempt(p, rect)
  }

  const onPointerCancel = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current && e.pointerId === dragRef.current.pointerId) endDrag()
  }

  /** 点上面已经放好的数字：再读一次 */
  const tapSlot = (r: number) => {
    const numeral = byRank[r].numeral
    if (isFilled(r) && numeral !== undefined) say(numberWord(numeral, lang), 1)
  }

  const hint = mistakes >= 2 && !done

  return (
    <div
      ref={rootRef}
      className={`engine order-engine ${done ? 'solved' : ''}`}
      data-next={next}
      data-mistakes={mistakes}
    >
      <div ref={boardRef} className={`order-board ${over ? 'over' : ''}`} style={{ padding: pad, gap: guideGap }}>
        <div className="order-slots" style={{ gap }}>
          {byRank.map((o, r) => {
            const filled = isFilled(r)
            const flight = placed[r]
            const flyFrom = flight && cssVars({ '--fx': `${flight.dx}px`, '--fy': `${flight.dy}px`, '--fs': flight.s })
            const size = slotSize(r)
            const state = given.has(r) ? 'given' : filled ? 'filled' : r === next ? 'next' : 'empty'
            return (
              <div
                key={r}
                ref={(el) => {
                  slotRefs.current[r] = el
                }}
                className={`order-slot ${state}`}
                style={cssVars({ width: size, height: size, '--i': r })}
                onClick={() => tapSlot(r)}
                data-slot={r}
              >
                {filled ? (
                  <span className={`order-face ${flight ? 'fly' : ''}`} style={flyFrom ?? undefined}>
                    <Face item={o.item} numeral={o.numeral} art={slotArt} font={slotFont} dots={dots} />
                  </span>
                ) : q.given ? (
                  <span className="order-q" style={{ fontSize: Math.round(S * 0.5) }}>
                    ?
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
        {showGuide && <Guide width={rowW} height={guideH} kind={isSize ? (growing ? 'up' : 'down') : 'arrow'} />}
      </div>

      <div className="order-tray" style={{ gridTemplateColumns: `repeat(${cols}, ${T}px)`, gap: gapT }}>
        {pieces.map((p) => {
          if (p.rank !== null && isFilled(p.rank))
            return <span key={p.key} className="order-ghost" style={{ width: T, height: T }} />
          const dragging = dragView?.key === p.key
          const classes = [
            'order-card',
            hint && p.rank === next ? 'hinting' : '',
            shake?.key === p.key ? (shake.n % 2 ? 'shake-a' : 'shake-b') : '',
            dragging ? 'dragging' : '',
          ]
          return (
            <button
              key={p.key}
              type="button"
              className={classes.filter(Boolean).join(' ')}
              style={{
                width: T,
                height: T,
                transform: dragging ? `translate(${dragView.dx}px, ${dragView.dy}px) scale(1.08)` : undefined,
              }}
              onClick={(e) => onClick(e, p)}
              onPointerDown={(e) => onPointerDown(e, p)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, p)}
              onPointerCancel={onPointerCancel}
              data-rank={p.rank ?? undefined}
              data-distractor={p.rank === null ? p.numeral : undefined}
              aria-label={p.numeral !== undefined ? String(p.numeral) : undefined}
            >
              <Face item={p.item} numeral={p.numeral} art={trayArt} font={trayFont} dots={dots} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
