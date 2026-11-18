// 题型：数字配对。把上面的数字卡拖到数量一样的那一堆（拖不动的话：先点数字卡，再点那一堆）。
// 不知道一堆有几个？手上没拿数字卡的时候点一下那一堆，会一个一个数给你听。
// 错两次以后，拿起数字卡时，对的那一堆会轻轻发亮。

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import { numberWord, ui } from '../core/i18n'
import { seededRng, type Rng } from '../core/rng'
import type { MatchQuestion } from '../core/types'
import { ItemArt } from '../ui/art'
import { scoreFor, useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import type { EngineProps } from './types'
import './match.css'

// ---------- 排版（纯计算，方便测试） ----------

/** 一个东西的位置：中心点（相对于放东西的区域，像素）和旋转角度 */
export interface Spot {
  x: number
  y: number
  rot: number
}

export interface MatchLayout {
  /** 数字卡边长 */
  numeral: number
  /** 一堆一张卡片：排成几栏 */
  cols: number
  cardW: number
  cardH: number
  /** 放数字的格子在卡片上面，还是左边 */
  slotSide: 'top' | 'left'
  slot: number
  /** 放东西的区域 */
  areaW: number
  areaH: number
  /** 每个东西占的格子、画多大 */
  cell: number
  item: number
  /** 每一堆的东西位置（照数数的顺序：一行一行、从左到右） */
  spots: Spot[][]
}

/** 间距（画面也是照这些画的；测试用它检查放不放得下） */
export const MATCH_SPACING = {
  /** 卡片内边距 */
  pad: 12,
  /** 数字格子和东西之间 */
  inner: 10,
  /** 卡片之间 */
  gap: 14,
  /** 数字卡之间 */
  numGap: 12,
  /** 数字卡那一行：上面留位置给"拿起来"往上跳，下面是阴影 */
  rowTop: 10,
  rowBottom: 6,
  /** .engine 的 gap（styles.css） */
  engineGap: 12,
  /** 卡片的阴影 */
  shadow: 6,
}
const { pad: PAD, inner: INNER, gap: GAP, numGap: NUM_GAP } = MATCH_SPACING
const MAX_CELL = 136 // 东西最多画多大（格子）
const NEAT_FILL = 0.84 // 排整齐：东西占格子的比例
const SCATTER_FILL = 0.78 // 散开：东西小一点，才有地方散开（再大就常常丢不下）

/** 排整齐的样子（每一行几个），越前面越好看：像骰子、十格框，一眼就数得清楚 */
const PATTERNS: Record<number, number[][]> = {
  1: [[1]],
  2: [[2], [1, 1]],
  3: [[3], [2, 1], [1, 1, 1]],
  4: [[2, 2], [4]],
  5: [[3, 2], [2, 1, 2], [5]],
  6: [[3, 3], [2, 2, 2], [6]],
}

function patternsFor(n: number): number[][] {
  if (PATTERNS[n]) return PATTERNS[n]
  // 更多的（备用）：平均分成几行，越接近方形越前面
  const out: number[][] = []
  for (let rows = 1; rows <= n; rows++) {
    const base = Math.floor(n / rows)
    const extra = n % rows
    out.push(Array.from({ length: rows }, (_, r) => base + (r < extra ? 1 : 0)))
  }
  return out.sort((a, b) => Math.abs(a[0] - a.length) - Math.abs(b[0] - b.length))
}

const widthOf = (p: number[]) => Math.max(...p)

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

interface NeatFit {
  cell: number
  patterns: number[][]
  areaW: number
  areaH: number
}

/** 所有堆用同一个大小（东西大小一样，孩子才只比"几个"）：由最难放的那一堆决定 */
function fitNeat(counts: number[], aw: number, ah: number): NeatFit {
  let cell = MAX_CELL
  for (const c of counts) {
    const best = Math.max(...patternsFor(c).map((p) => Math.min(aw / widthOf(p), ah / p.length)))
    cell = Math.min(cell, best)
  }
  cell = Math.max(16, Math.floor(cell))
  // 每一堆用放得下的、最好看的排法
  const patterns = counts.map((c) => {
    const list = patternsFor(c)
    return list.find((p) => widthOf(p) * cell <= aw + 0.5 && p.length * cell <= ah + 0.5) ?? list[list.length - 1]
  })
  return {
    cell,
    patterns,
    areaW: Math.max(...patterns.map(widthOf)) * cell,
    areaH: Math.max(...patterns.map((p) => p.length)) * cell,
  }
}

/** 卡片排成几栏几行：横的画面优先排一排 */
function gridOptions(n: number, landscape: boolean): [number, number][] {
  const side: [number, number] = [n, 1]
  const others: [number, number][] =
    n <= 1 ? [] : n === 2 ? [[1, 2]] : n === 3 ? [[1, 3]] : n === 4 ? [[2, 2], [1, 4]] : [[Math.ceil(n / 2), 2]]
  return landscape ? [side, ...others] : [...others, side]
}

function neatSpots(pattern: number[], cell: number, areaW: number, areaH: number): Spot[] {
  const top = (areaH - pattern.length * cell) / 2
  const out: Spot[] = []
  pattern.forEach((k, r) => {
    const left = (areaW - k * cell) / 2
    for (let i = 0; i < k; i++) out.push({ x: left + (i + 0.5) * cell, y: top + (r + 0.5) * cell, rot: 0 })
  })
  return out
}

/** 散开：随便丢，但是不能叠在一起；丢不下就退回排整齐 */
function scatterSpots(count: number, areaW: number, areaH: number, item: number, rng: Rng): Spot[] | null {
  if (areaW < item || areaH < item) return null
  for (const shrink of [1, 0.95, 0.9, 0.85]) {
    const minDist = item * 1.06 * shrink
    const pts: Spot[] = []
    for (let tries = 0; tries < 800 && pts.length < count; tries++) {
      const x = item / 2 + rng() * (areaW - item)
      const y = item / 2 + rng() * (areaH - item)
      if (pts.every((p) => Math.hypot(p.x - x, p.y - y) >= minDist)) pts.push({ x, y, rot: (rng() - 0.5) * 40 })
    }
    if (pts.length === count) return countingPath(pts)
  }
  return null
}

/** 数数的顺序：从左上角开始，每次数最近的那一个（手指不会跳来跳去） */
function countingPath(pts: Spot[]): Spot[] {
  const left = [...pts]
  const out: Spot[] = []
  let cur = left.reduce((a, b) => (b.x + b.y < a.x + a.y ? b : a))
  while (left.length > 0) {
    left.splice(left.indexOf(cur), 1)
    out.push(cur)
    if (left.length === 0) break
    const from = cur
    cur = left.reduce((a, b) =>
      Math.hypot(b.x - from.x, b.y - from.y) < Math.hypot(a.x - from.x, a.y - from.y) ? b : a,
    )
  }
  return out
}

/**
 * 算出整个画面怎么排：上面一排数字卡，下面每一堆一张卡片。
 * boxW、boxH 是引擎可以用的大小；会试几种排法，选东西可以画最大的那一种。
 */
export function layoutMatch(
  boxW: number,
  boxH: number,
  counts: number[],
  scatter: boolean,
  seed: string,
): MatchLayout {
  const n = counts.length
  // 用真正量到的大小（只防止算出负数）
  const W = Math.max(120, boxW)
  const H = Math.max(120, boxH)
  // 数字卡：最大 120，最小 64（小手指要按得到）
  const numeral = Math.floor(clamp(Math.min((W - NUM_GAP * (n - 1)) / n, H * 0.19, 120), 64, 120))
  const slot = Math.round(clamp(numeral * 0.78, 52, 92))
  const zone = slot + INNER
  const gridW = Math.min(W, 1180)
  // 扣掉数字卡那一行（上下留的位置）、间隔、卡片的阴影，再留一点保险
  const { rowTop, rowBottom, engineGap, shadow } = MATCH_SPACING
  const gridH = H - numeral - rowTop - rowBottom - engineGap - shadow - 6

  type Pick = {
    score: number
    cols: number
    cardW: number
    cardH: number
    side: 'top' | 'left'
    areaW: number
    areaH: number
    fit: NeatFit
  }
  let best: Pick | null = null
  for (const [cols, rows] of gridOptions(n, W >= H)) {
    const cw0 = Math.floor((gridW - GAP * (cols - 1)) / cols)
    const ch0 = Math.floor((gridH - GAP * (rows - 1)) / rows)
    // 宽的卡片：数字格子放左边；高的、方的：放上面。另一边要好很多才换（每一题的样子不要跳来跳去）
    const natural: 'top' | 'left' = cw0 > ch0 * 1.3 ? 'left' : 'top'
    for (const side of ['top', 'left'] as const) {
      const aw = Math.max(24, cw0 - 2 * PAD - (side === 'left' ? zone : 0))
      const ah = Math.max(24, ch0 - 2 * PAD - (side === 'top' ? zone : 0))
      const fit = fitNeat(counts, aw, ah)
      // 散开的话，整张卡能用的地方都可以放（但不要大得太夸张）
      const areaW = scatter ? Math.min(aw, Math.round(fit.areaW * 1.25 + fit.cell * 0.6)) : fit.areaW
      const areaH = scatter ? Math.min(ah, Math.round(fit.areaH * 1.25 + fit.cell * 0.6)) : fit.areaH
      // 卡片里面：数字格子 + 东西
      const contentW = side === 'left' ? zone + areaW : Math.max(areaW, slot)
      const contentH = side === 'top' ? zone + areaH : Math.max(areaH, slot)
      const fitW = Math.min(cw0, contentW + 2 * PAD)
      // 差不多满了就撑满（卡片跟上面的数字卡对齐）；差很多就照内容（大平板上不会一大片空白）
      const cardW = fitW >= cw0 * 0.75 ? cw0 : fitW
      const cardH = Math.min(ch0, contentH + 2 * PAD)
      // 太细长的卡片不好看，也不像"一堆"
      const ratio = cardW / cardH
      const score = fit.cell * (ratio < 0.5 || ratio > 3.4 ? 0.75 : 1) * (side === natural ? 1 : 0.8)
      if (!best || score > best.score + 0.5) best = { score, cols, cardW, cardH, side, areaW, areaH, fit }
    }
  }
  const pick = best!
  const { cell, patterns } = pick.fit
  const item = Math.floor(cell * (scatter ? SCATTER_FILL : NEAT_FILL))
  const spots = counts.map((c, gi) => {
    const neat = () => neatSpots(patterns[gi], cell, pick.areaW, pick.areaH)
    if (!scatter) return neat()
    return scatterSpots(c, pick.areaW, pick.areaH, item, seededRng(hash(`${seed}#${gi}`))) ?? neat()
  })
  return {
    numeral,
    cols: pick.cols,
    cardW: pick.cardW,
    cardH: pick.cardH,
    slotSide: pick.side,
    slot,
    areaW: pick.areaW,
    areaH: pick.areaH,
    cell,
    item,
    spots,
  }
}

// ---------- 小工具 ----------

/** 量引擎实际可以用多大（提示文字换行、手机状态栏都会影响）；量到之前先用估计的 */
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

/** 摇一摇（用 Web Animations，连续错两次也会重新摇） */
function shake(el: HTMLElement | null | undefined) {
  if (!el || reducedMotion() || typeof el.animate !== 'function') return
  el.animate(SHAKE, { duration: 450, easing: 'ease-in-out' })
}

/** 数字卡没放对：滑回原来的位置 */
function glideBack(el: HTMLElement) {
  el.style.transition = 'transform 0.22s ease-out'
  el.style.transform = ''
  window.setTimeout(() => {
    el.style.transition = ''
  }, 260)
}

interface Drag {
  value: number
  pointerId: number
  x0: number
  y0: number
  el: HTMLButtonElement
  /** 移动超过一点点才算拖（不然是"点一下"） */
  active: boolean
}

const DRAG_START = 10
const COUNT_STEP = 800

// ---------- 引擎 ----------

export function MatchEngine({ q, lang, say, onSolved }: EngineProps<MatchQuestion>) {
  const { w, h } = useViewport()
  const rootRef = useRef<HTMLDivElement | null>(null)
  // 估计：去掉画面边距、上面的按钮和题目那一行
  const box = useBoxSize(rootRef, { w: w - 32, h: h - 190 })
  const scatter = q.layout === 'scatter'
  const L = useMemo(
    () => layoutMatch(box.w, box.h, q.groups, scatter, q.signature),
    [box.w, box.h, q.groups, scatter, q.signature],
  )

  const [matched, setMatched] = useState<number[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [dragValue, setDragValue] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [missGroup, setMissGroup] = useState<number | null>(null)
  const [landing, setLanding] = useState<number | null>(null)
  const [mistakes, setMistakes] = useState(0)
  // 正在数哪一堆、数到第几个
  const [counting, setCounting] = useState<{ group: number; shown: number; done: boolean } | null>(null)

  const mistakesRef = useRef(0)
  const solvedRef = useRef(false)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const flyFrom = useRef<{ value: number; rect: DOMRect } | null>(null)
  const groupEls = useRef<(HTMLButtonElement | null)[]>([])
  const numeralEls = useRef(new Map<number, HTMLButtonElement>())
  const slotCards = useRef(new Map<number, HTMLSpanElement>())
  const timers = useRef<number[]>([])
  const countTimers = useRef<number[]>([])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
      countTimers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  // 放对了：数字卡从原来的地方飞进那一堆的格子（FLIP 动画）
  useLayoutEffect(() => {
    const f = flyFrom.current
    if (!f) return
    flyFrom.current = null
    const el = slotCards.current.get(f.value)
    if (!el || reducedMotion() || typeof el.animate !== 'function') return
    const to = el.getBoundingClientRect()
    if (!to.width) return
    el.animate(
      [
        {
          transform: `translate(${f.rect.left - to.left}px, ${f.rect.top - to.top}px) scale(${f.rect.width / to.width})`,
        },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.3, 1.3, 0.5, 1)' },
    )
  }, [matched])

  const stopCounting = () => {
    countTimers.current.forEach((t) => window.clearTimeout(t))
    countTimers.current = []
    setCounting(null)
  }

  /** 一个一个数给孩子听，数到的那个会亮起来 */
  const countAloud = (gi: number) => {
    if (counting && counting.group === gi && !counting.done) return // 正在数这一堆
    stopCounting()
    const n = q.groups[gi]
    const step = (i: number) => {
      setCounting({ group: gi, shown: i, done: i === n })
      say(numberWord(i, lang), 1)
    }
    sfx.tap()
    step(1)
    for (let i = 2; i <= n; i++) countTimers.current.push(window.setTimeout(() => step(i), (i - 1) * COUNT_STEP))
    countTimers.current.push(window.setTimeout(() => setCounting(null), (n - 1) * COUNT_STEP + 1600))
  }

  /** 把数字卡 value 放到第 gi 堆；from 是数字卡现在的位置（飞过去用）。放对了回传 true */
  const tryMatch = (value: number, gi: number, from: DOMRect | null): boolean => {
    if (solvedRef.current || matched.includes(value)) return false
    stopCounting()
    setSelected(null)
    if (q.groups[gi] === value) {
      if (from) flyFrom.current = { value, rect: from }
      const next = [...matched, value]
      setMatched(next)
      setLanding(gi)
      later(() => setLanding((g) => (g === gi ? null : g)), 600)
      sfx.drop()
      say(numberWord(value, lang), 1)
      if (next.length === q.groups.length) {
        solvedRef.current = true
        // 先让孩子看到最后一张卡放好、听到数字，再庆祝
        later(() => onSolved(scoreFor(mistakesRef.current)), 650)
      }
      return true
    }
    mistakesRef.current += 1
    setMistakes(mistakesRef.current)
    setMissGroup(gi)
    later(() => setMissGroup((g) => (g === gi ? null : g)), 700)
    shake(groupEls.current[gi])
    sfx.wrong()
    say(ui('tryAgain', lang))
    return false
  }

  /** 手指（或滑鼠）在哪一堆上面 */
  const groupAt = (x: number, y: number): number | null => {
    let found: number | null = null
    let bestDist = Infinity
    groupEls.current.forEach((el, gi) => {
      if (!el) return
      const r = el.getBoundingClientRect()
      const m = 10
      if (x < r.left - m || x > r.right + m || y < r.top - m || y > r.bottom + m) return
      const d = Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2)
      if (d < bestDist) {
        bestDist = d
        found = gi
      }
    })
    return found
  }

  const onNumeralDown = (e: ReactPointerEvent<HTMLButtonElement>, value: number) => {
    suppressClick.current = false
    if (solvedRef.current || drag.current) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // 不能 capture 也可以拖，只是手指跑太快可能会掉
    }
    drag.current = { value, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, el: e.currentTarget, active: false }
  }

  const onNumeralMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (!d.active) {
      if (Math.hypot(dx, dy) < DRAG_START) return
      d.active = true
      stopCounting()
      // 拿起来的时候读出这个数字（还不太认识数字的孩子也知道手上是几）
      if (selected !== d.value) {
        sfx.tap()
        say(numberWord(d.value, lang), 1)
      }
      setSelected(null)
      setDragValue(d.value)
      d.el.style.transition = 'none'
    }
    // 直接改 transform，拖的时候不用整个画面重画
    d.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`
    setHover(groupAt(e.clientX, e.clientY))
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
    setDragValue(null)
    setHover(null)
    const gi = drop ? groupAt(e.clientX, e.clientY) : null
    if (gi !== null && tryMatch(d.value, gi, d.el.getBoundingClientRect())) return
    glideBack(d.el)
  }

  const onNumeralClick = (value: number) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (solvedRef.current || matched.includes(value)) return
    stopCounting()
    if (selected === value) {
      // 再点一下：放下
      setSelected(null)
      return
    }
    setSelected(value)
    sfx.tap()
    say(numberWord(value, lang), 1)
  }

  const onGroupClick = (gi: number) => {
    if (solvedRef.current || drag.current?.active) return
    if (selected !== null) {
      tryMatch(selected, gi, numeralEls.current.get(selected)?.getBoundingClientRect() ?? null)
      return
    }
    // 手上没有数字卡：数给孩子听
    countAloud(gi)
  }

  const holding = dragValue ?? selected
  const badge = Math.round(clamp(L.cell * 0.4, 22, 40))
  // 每个东西的框比图大一点点（数到的数字贴在右上角）
  const objBox = Math.round(L.item * 1.12)

  return (
    <div ref={rootRef} className="engine match-engine">
      <div
        className="match-numerals"
        style={{ gap: NUM_GAP, paddingTop: MATCH_SPACING.rowTop, paddingBottom: MATCH_SPACING.rowBottom }}
      >
        {q.numerals.map((v) =>
          matched.includes(v) ? (
            <span key={v} className="match-numeral ghost" style={{ width: L.numeral, height: L.numeral }} />
          ) : (
            <button
              key={v}
              type="button"
              ref={(el) => {
                if (el) numeralEls.current.set(v, el)
                else numeralEls.current.delete(v)
              }}
              className={`match-numeral ${selected === v ? 'picked' : ''} ${dragValue === v ? 'dragging' : ''}`}
              style={{ width: L.numeral, height: L.numeral, fontSize: Math.round(L.numeral * 0.62) }}
              data-value={v}
              aria-pressed={selected === v}
              onPointerDown={(e) => onNumeralDown(e, v)}
              onPointerMove={onNumeralMove}
              onPointerUp={(e) => endDrag(e, true)}
              onPointerCancel={(e) => endDrag(e, false)}
              onLostPointerCapture={(e) => endDrag(e, false)}
              onClick={() => onNumeralClick(v)}
            >
              {v}
            </button>
          ),
        )}
      </div>

      <div
        className="match-groups"
        style={{
          gridTemplateColumns: `repeat(${L.cols}, ${L.cardW}px)`,
          gap: GAP,
          paddingBottom: MATCH_SPACING.shadow,
        }}
      >
        {q.groups.map((count, gi) => {
          const done = matched.includes(count)
          const isCounting = counting?.group === gi
          const classes = [
            'match-group',
            L.slotSide,
            done && 'matched',
            holding !== null && !done && 'ready',
            hover === gi && 'hover',
            holding === count && !done && mistakes >= 2 && 'hint',
            isCounting && 'counting',
            missGroup === gi && 'miss',
            landing === gi && 'landing',
          ]
          return (
            <button
              key={count}
              type="button"
              ref={(el) => {
                groupEls.current[gi] = el
              }}
              className={classes.filter(Boolean).join(' ')}
              style={{ width: L.cardW, height: L.cardH, padding: PAD, gap: INNER }}
              data-count={count}
              onClick={() => onGroupClick(gi)}
            >
              <span className={`match-slot ${done ? 'filled' : ''}`} style={{ width: L.slot, height: L.slot }}>
                {done ? (
                  <span
                    className="match-slot-card"
                    ref={(el) => {
                      if (el) slotCards.current.set(count, el)
                      else slotCards.current.delete(count)
                    }}
                    style={{ fontSize: Math.round(L.slot * 0.62) }}
                  >
                    {count}
                  </span>
                ) : (
                  <span className="match-slot-mark" style={{ fontSize: Math.round(L.slot * 0.48) }}>
                    ?
                  </span>
                )}
              </span>
              <span className="match-items" style={{ width: L.areaW, height: L.areaH }}>
                {L.spots[gi].map((s, i) => {
                  const counted = isCounting && i < counting.shown
                  const now = isCounting && i === counting.shown - 1
                  return (
                    <span
                      key={i}
                      className={`match-obj ${counted ? 'counted' : ''} ${now ? 'now' : ''}`}
                      style={{
                        left: s.x,
                        top: s.y,
                        width: objBox,
                        height: objBox,
                        transform: `translate(-50%, -50%)${s.rot ? ` rotate(${s.rot.toFixed(1)}deg)` : ''}`,
                      }}
                    >
                      <span className="match-obj-art">
                        <ItemArt item={q.item} size={L.item} />
                      </span>
                      {counted && (
                        // 外层转回来（散开的东西是斜的，数字要正的），里层跳出来
                        <span
                          className="match-count-badge"
                          style={{
                            width: badge,
                            height: badge,
                            transform: s.rot ? `rotate(${(-s.rot).toFixed(1)}deg)` : undefined,
                          }}
                        >
                          <span className="match-count-num" style={{ fontSize: Math.round(badge * 0.62) }}>
                            {i + 1}
                          </span>
                        </span>
                      )}
                    </span>
                  )
                })}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
