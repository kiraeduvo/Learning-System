// 题型：位置（上面、下面、里面、外面、旁边、前面、后面）
// pick：几张图，参考的东西都一样、在同一个地方，点东西在对的位置的那一张。
// place：一个大画面，参考的东西旁边有几个虚线圆圈（空位）。把东西拖到对的圆圈；
//        也可以先点东西再点圆圈，或者直接点圆圈。放对了东西会飞过去（放进箱子的会被箱子挡住下半部）。
// 点错：摇一摇、"再试一次"，点过的变淡；错两次以后，对的那张图 / 那个圆圈会轻轻发亮。

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { POSITION_WORDS, wrongPosition } from '../core/i18n'
import type { Position, PositionQuestion } from '../core/types'
import { ItemArt } from '../ui/art'
import { scoreFor, useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import { buildScene, OBJ, RefArt, ZONE, type Layer, type Scene, type Spot } from './positionArt'
import type { EngineProps } from './types'
import './position.css'

// ---------- 排版（纯计算，方便测试） ----------

/** 间距（画面也是照这些画的；测试用它检查放不放得下） */
export const POS_SPACING = {
  /** 图卡里面留的边 */
  pad: 10,
  /** 图卡之间 */
  gap: 14,
  /** 卡片下面的阴影（6px），再留一点 */
  shadow: 8,
  /** 放东西：画面和东西那张卡之间 */
  trayGap: 16,
}
/** 画面最多放大几倍（大平板上不要大得夸张） */
const MAX_SCALE = 3.6
/** 放东西：东西那张卡最小、最大（小手指要按得到） */
export const TOKEN_MIN = 96
const TOKEN_MAX = 200

export interface PickLayout {
  cols: number
  rows: number
  /** 1 单位 = 几 px */
  scale: number
  cardW: number
  cardH: number
}

/** 选图：卡片排一排、排一直行、或者两个两个排，选画面可以画最大的那种 */
export function layoutPick(boxW: number, boxH: number, n: number, sceneW: number, sceneH: number): PickLayout {
  const W = Math.max(160, boxW)
  const H = Math.max(160, boxH)
  const { pad, gap, shadow } = POS_SPACING
  const grids: [number, number][] = [
    [n, 1],
    [1, n],
  ]
  if (n > 2) grids.push([2, Math.ceil(n / 2)])
  let best: PickLayout | null = null
  let bestScore = 0
  for (const [cols, rows] of grids) {
    const cw = (W - gap * (cols - 1)) / cols
    const ch = (H - shadow - gap * (rows - 1)) / rows
    const scale = Math.min((cw - 2 * pad) / sceneW, (ch - 2 * pad) / sceneH, MAX_SCALE)
    // 三张卡排成 2+1 不太整齐（不好一眼比较）：要大很多才用
    const score = scale * (cols * rows > n ? 0.8 : 1)
    if (!best || score > bestScore + 0.01) {
      best = { cols, rows, scale, cardW: 0, cardH: 0 }
      bestScore = score
    }
  }
  const b = best!
  return { ...b, cardW: Math.floor(sceneW * b.scale + 2 * pad), cardH: Math.floor(sceneH * b.scale + 2 * pad) }
}

export interface PlaceLayout {
  /** 东西那张卡在画面下面（true），还是在右边 */
  stacked: boolean
  scale: number
  stageW: number
  stageH: number
  /** 东西那张卡的边长 */
  token: number
  /** 卡片上的东西画多大 */
  tokenArt: number
}

/** 放东西：一个大画面 + 一张放东西的卡（在下面或右边，看哪一种画面比较大） */
export function layoutPlace(boxW: number, boxH: number, sceneW: number, sceneH: number): PlaceLayout {
  const W = Math.max(160, boxW)
  const H = Math.max(160, boxH)
  const { trayGap: g, shadow: s } = POS_SPACING
  // 卡片上的东西尽量跟画面上一样大（飞过去差不多不用变大小）；卡片在 TOKEN_MIN 到 TOKEN_MAX 之间
  const tokenFor = (k: number) => Math.round(Math.min(TOKEN_MAX, Math.max(TOKEN_MIN, OBJ * k * 1.3)))
  const fits = (stacked: boolean, k: number) => {
    const t = tokenFor(k)
    return stacked
      ? sceneW * k <= W && t <= W && sceneH * k + s + g + t + s <= H
      : sceneW * k + g + t <= W && Math.max(sceneH * k, t) + s <= H
  }
  // 卡片的大小跟着画面变，所以用二分法找放得下的最大倍数
  const largest = (stacked: boolean) => {
    if (fits(stacked, MAX_SCALE)) return MAX_SCALE
    let lo = 0.3
    let hi = MAX_SCALE
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (fits(stacked, mid)) lo = mid
      else hi = mid
    }
    return lo
  }
  const below = largest(true)
  const right = largest(false)
  // 直的画面通常放下面、横的放右边；另一种要大很多才换
  const stacked = H >= W ? below * 1.1 >= right : below > right * 1.1
  const scale = stacked ? below : right
  const token = tokenFor(scale)
  return {
    stacked,
    scale,
    token,
    stageW: Math.floor(sceneW * scale),
    stageH: Math.floor(sceneH * scale),
    tokenArt: Math.floor(Math.min(OBJ * scale, token * 0.84)),
  }
}

// ---------- 小工具 ----------

/** 量引擎实际可以用多大（题目换行、手机状态栏都会影响）；量到之前先用估计的 */
function useBoxSize(ref: RefObject<HTMLElement | null>, estimate: { w: number; h: number }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w > 0 && h > 0) setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size ?? estimate
}

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-10px)' },
  { transform: 'translateX(10px)' },
  { transform: 'translateX(-6px)' },
  { transform: 'translateX(6px)' },
  { transform: 'translateX(0)' },
]

/** 摇一摇（用 Web Animations，连续错也会重新摇） */
function shake(el: HTMLElement | null | undefined) {
  if (!el || reducedMotion() || typeof el.animate !== 'function') return
  el.animate(SHAKE, { duration: 450, easing: 'ease-in-out' })
}

/** 东西没放对：滑回原来的位置 */
function glideBack(el: HTMLElement) {
  el.style.transition = 'transform 0.22s ease-out'
  el.style.transform = ''
  window.setTimeout(() => {
    el.style.transition = ''
  }, 260)
}

/** 放对了以后等一下再庆祝：让孩子看到东西放好 */
const SOLVE_DELAY = 700
/** 手指移动超过这么多像素才算拖，不然算点一下 */
const DRAG_START = 10

// ---------- 引擎 ----------

export function PositionEngine(props: EngineProps<PositionQuestion>) {
  return props.q.mode === 'place' ? <PlaceGame {...props} /> : <PickGame {...props} />
}

/** 一张图：参考的东西 + 东西放在 spot（照前后顺序画：后面的先画） */
function SceneSvg({ q, scene, spot, scale }: { q: PositionQuestion; scene: Scene; spot: Spot; scale: number }) {
  const obj = (
    <g transform={`translate(${spot.x} ${spot.y})`}>
      <g className="pos-obj">
        <ItemArt item={{ kind: q.kind }} size={OBJ} />
      </g>
    </g>
  )
  return (
    <svg
      className="pos-scene"
      width={Math.round(scene.w * scale)}
      height={Math.round(scene.h * scale)}
      viewBox={`${scene.x} ${scene.y} ${scene.w} ${scene.h}`}
      aria-hidden="true"
    >
      {spot.layer === 'back' && obj}
      <RefArt kind={q.ref} open={scene.open} part="back" />
      {spot.layer === 'mid' && obj}
      <RefArt kind={q.ref} open={scene.open} part="front" />
      {spot.layer === 'top' && obj}
    </svg>
  )
}

/** 选图：哪一只小猫在箱子上面？ */
function PickGame({ q, lang, say, onSolved }: EngineProps<PositionQuestion>) {
  const { w, h } = useViewport()
  const rootRef = useRef<HTMLDivElement | null>(null)
  // 估计：去掉画面边距、上面的按钮和题目那一行
  const box = useBoxSize(rootRef, { w: w - 32, h: h - 190 })
  const scene = useMemo(() => buildScene(q), [q])
  const L = useMemo(
    () => layoutPick(box.w, box.h, q.options.length, scene.w, scene.h),
    [box.w, box.h, q.options.length, scene.w, scene.h],
  )
  const [tried, setTried] = useState<Position[]>([])
  const [solved, setSolved] = useState(false)
  const triedRef = useRef<Position[]>([])
  const solvedRef = useRef(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const choose = (pos: Position) => {
    if (solvedRef.current || triedRef.current.includes(pos)) return
    if (pos === q.answer) {
      solvedRef.current = true
      setSolved(true)
      const mistakes = triedRef.current.length
      // 先让孩子看到对的那一张亮起来，再庆祝
      timer.current = window.setTimeout(() => onSolved(scoreFor(mistakes)), SOLVE_DELAY)
      return
    }
    triedRef.current = [...triedRef.current, pos]
    setTried(triedRef.current)
    sfx.wrong()
    say(wrongPosition('pick', q.kind, pos, q.ref, lang))
  }

  const hint = tried.length >= 2 && !solved
  const { gap } = POS_SPACING

  return (
    <div ref={rootRef} className="engine pos-engine pick" data-mistakes={tried.length}>
      <div
        className={`pos-cards ${solved ? 'solved' : ''}`}
        style={{ width: L.cols * L.cardW + (L.cols - 1) * gap, gap }}
      >
        {q.options.map((pos, i) => {
          const classes = [
            'option-card',
            'pos-card',
            tried.includes(pos) && 'wrong',
            solved && pos === q.answer && 'right',
            hint && pos === q.answer && 'hint',
          ]
          return (
            <button
              key={pos}
              type="button"
              className={classes.filter(Boolean).join(' ')}
              style={{ width: L.cardW, height: L.cardH }}
              onClick={() => choose(pos)}
              data-pos={pos}
              data-correct={pos === q.answer ? 'true' : undefined}
              aria-label={POSITION_WORDS[pos][lang]}
            >
              <SceneSvg q={q} scene={scene} spot={scene.spots[i]} scale={L.scale} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface Drag {
  pointerId: number
  x0: number
  y0: number
  el: HTMLButtonElement
  /** 开始拖的时候，东西的图在哪里（算现在图的中心用） */
  art: DOMRect | null
  /** 移动超过一点点才算拖（不然是"点一下"） */
  active: boolean
}

/** 每一层在画面里的前后（参考的东西：后面那部分 2、前面那部分 4） */
const Z: Record<Layer, number> = { back: 1, mid: 3, top: 5 }

/** 放东西：把小猫放到箱子上面 */
function PlaceGame({ q, lang, say, onSolved }: EngineProps<PositionQuestion>) {
  const { w, h } = useViewport()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const box = useBoxSize(rootRef, { w: w - 32, h: h - 190 })
  const scene = useMemo(() => buildScene(q), [q])
  const L = useMemo(() => layoutPlace(box.w, box.h, scene.w, scene.h), [box.w, box.h, scene.w, scene.h])
  const k = L.scale

  const [placed, setPlaced] = useState<Position | null>(null)
  const [tried, setTried] = useState<Position[]>([])
  const [picked, setPicked] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [hover, setHover] = useState<Position | null>(null)
  const [missed, setMissed] = useState<Position | null>(null)

  const triedRef = useRef<Position[]>([])
  const solvedRef = useRef(false)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const flyFrom = useRef<DOMRect | null>(null)
  const zoneEls = useRef(new Map<Position, HTMLButtonElement>())
  const tokenArtEl = useRef<HTMLSpanElement | null>(null)
  const placedEl = useRef<HTMLSpanElement | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  // 放对了：东西从卡片（或手指放开的地方）飞到那个位置（FLIP 动画）
  useLayoutEffect(() => {
    const from = flyFrom.current
    const el = placedEl.current
    flyFrom.current = null
    if (!placed || !from || !el || reducedMotion() || typeof el.animate !== 'function') return
    const to = el.getBoundingClientRect()
    if (!to.width) return
    el.animate(
      [
        {
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`,
        },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: 450, easing: 'cubic-bezier(0.3, 1.2, 0.5, 1)' },
    )
  }, [placed])

  const tokenRect = () => tokenArtEl.current?.getBoundingClientRect() ?? null

  /** 把东西放到 pos；from 是东西现在在哪里（飞过去用）。放对了回传 true */
  const attempt = (pos: Position, from: DOMRect | null): boolean => {
    if (solvedRef.current || triedRef.current.includes(pos)) return false
    setPicked(false)
    if (pos === q.answer) {
      solvedRef.current = true
      flyFrom.current = from
      setPlaced(pos)
      sfx.drop()
      const mistakes = triedRef.current.length
      later(() => onSolved(scoreFor(mistakes)), SOLVE_DELAY)
      return true
    }
    triedRef.current = [...triedRef.current, pos]
    setTried(triedRef.current)
    setMissed(pos)
    later(() => setMissed((m) => (m === pos ? null : m)), 700)
    shake(zoneEls.current.get(pos))
    sfx.wrong()
    say(wrongPosition('place', q.kind, pos, q.ref, lang))
    return false
  }

  /** (x, y) 在哪一个空位上（离圆心最近的那个；点过的不算） */
  const zoneAt = (x: number, y: number): Position | null => {
    let found: Position | null = null
    let best = Infinity
    zoneEls.current.forEach((el, pos) => {
      if (triedRef.current.includes(pos)) return
      const r = el.getBoundingClientRect()
      const d = Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2)
      if (d <= r.width * 0.75 && d < best) {
        best = d
        found = pos
      }
    })
    return found
  }

  /** 拖到哪一个空位：先看东西的图的中心（孩子看的是东西），没有再看手指 */
  const dropTarget = (d: Drag, x: number, y: number): Position | null => {
    if (d.art) {
      const cx = d.art.left + d.art.width / 2 + (x - d.x0)
      const cy = d.art.top + d.art.height / 2 + (y - d.y0)
      const z = zoneAt(cx, cy)
      if (z) return z
    }
    return zoneAt(x, y)
  }

  const onTokenDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    suppressClick.current = false
    if (solvedRef.current || drag.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // 不能 capture 也可以拖，只是手指跑太快可能会掉
    }
    drag.current = {
      pointerId: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      el: e.currentTarget,
      art: tokenRect(),
      active: false,
    }
  }

  const onTokenMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (!d.active) {
      if (Math.hypot(dx, dy) < DRAG_START) return
      d.active = true
      setPicked(false)
      setDragging(true)
      d.el.style.transition = 'none'
    }
    // 直接改 transform，拖的时候不用整个画面重画
    d.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`
    setHover(dropTarget(d, e.clientX, e.clientY))
  }

  const endDrag = (e: ReactPointerEvent<HTMLButtonElement>, drop: boolean) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    drag.current = null
    if (!d.active) return // 只是点一下：交给 onClick
    // 拖完放开时浏览器可能还会送一个 click，不要把它当成"点一下"
    suppressClick.current = true
    window.setTimeout(() => {
      suppressClick.current = false
    }, 0)
    setDragging(false)
    setHover(null)
    const target = drop ? dropTarget(d, e.clientX, e.clientY) : null
    if (target && attempt(target, tokenRect())) {
      // 放对了：卡片变成空的虚线框，东西从手指放开的地方飞过去
      d.el.style.transition = 'none'
      d.el.style.transform = ''
      return
    }
    glideBack(d.el)
  }

  const onTokenClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (solvedRef.current) return
    // 点一下：拿起来（再点一下放下）；拿着的时候点空位就放过去
    setPicked((p) => !p)
    sfx.tap()
  }

  const onZoneClick = (pos: Position) => {
    if (solvedRef.current || drag.current?.active) return
    // 不用先拿起来：直接点空位，东西也会飞过去
    attempt(pos, tokenRect())
  }

  const hint = tried.length >= 2 && !placed
  const holding = picked || dragging
  const zonePx = ZONE * k
  const placedSpot = placed ? scene.spots[q.options.indexOf(placed)] : null

  return (
    <div ref={rootRef} className="engine pos-engine place" data-mistakes={tried.length}>
      <div className={`pos-place ${L.stacked ? 'stacked' : 'side'}`} style={{ gap: POS_SPACING.trayGap }}>
        <div
          className={`pos-stage ${placed ? 'solved' : ''} ${holding ? 'ready' : ''}`}
          style={{ width: L.stageW, height: L.stageH }}
        >
          {(['back', 'front'] as const).map((part) => (
            <svg
              key={part}
              className="pos-layer"
              style={{ zIndex: part === 'back' ? 2 : 4 }}
              width={L.stageW}
              height={L.stageH}
              viewBox={`${scene.x} ${scene.y} ${L.stageW / k} ${L.stageH / k}`}
              aria-hidden="true"
            >
              <RefArt kind={q.ref} open={scene.open} part={part} />
            </svg>
          ))}
          {scene.spots.map((s) => {
            const classes = [
              'pos-zone',
              hover === s.pos && 'hover',
              missed === s.pos && 'miss',
              tried.includes(s.pos) && 'tried',
              hint && s.pos === q.answer && 'hint',
            ]
            return (
              <button
                key={s.pos}
                type="button"
                ref={(el) => {
                  if (el) zoneEls.current.set(s.pos, el)
                  else zoneEls.current.delete(s.pos)
                }}
                className={classes.filter(Boolean).join(' ')}
                style={{
                  left: Math.round((s.zx - ZONE / 2 - scene.x) * k),
                  top: Math.round((s.zy - ZONE / 2 - scene.y) * k),
                  width: Math.round(zonePx),
                  height: Math.round(zonePx),
                  zIndex: Z[s.layer],
                }}
                onClick={() => onZoneClick(s.pos)}
                data-pos={s.pos}
                data-correct={s.pos === q.answer ? 'true' : undefined}
                aria-label={POSITION_WORDS[s.pos][lang]}
              />
            )
          })}
          {placedSpot && (
            <span
              ref={placedEl}
              className="pos-placed"
              style={{
                left: (placedSpot.x - scene.x) * k,
                top: (placedSpot.y - scene.y) * k,
                width: OBJ * k,
                height: OBJ * k,
                zIndex: Z[placedSpot.layer],
              }}
            >
              <ItemArt item={{ kind: q.kind }} size={OBJ * k} />
            </span>
          )}
        </div>

        <div className={`pos-tray ${dragging ? 'dragging' : ''}`} style={{ width: L.token, height: L.token }}>
          {placed ? (
            <span className="pos-token ghost" />
          ) : (
            <button
              type="button"
              className={`pos-token ${picked ? 'picked' : ''} ${dragging ? 'dragging' : ''}`}
              aria-pressed={picked}
              onPointerDown={onTokenDown}
              onPointerMove={onTokenMove}
              onPointerUp={(e) => endDrag(e, true)}
              onPointerCancel={(e) => endDrag(e, false)}
              onLostPointerCapture={(e) => endDrag(e, false)}
              onClick={onTokenClick}
            >
              <span className="pos-token-art" ref={tokenArtEl}>
                <ItemArt item={{ kind: q.kind }} size={L.tokenArt} />
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
