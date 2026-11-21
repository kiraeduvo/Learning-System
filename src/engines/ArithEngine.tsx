// 题型：10 以内加减法。看图（或看算式），选答案。
//
// 加法：左边一堆（a 个）、大大的"+"、右边一堆（b 个）（直的手机：上面一堆、下面一堆）；
//       第二堆会"走进来"（再加几个）。下面是算式 a + b = ?，再下面是答案卡。
//       答对了：两堆合在一起变成一堆，算式的问号变成答案。
// 减法：a 个东西，过一下其中 b 个被拿走（变淡、轻轻打叉），一看就知道还剩几个；算式 a − b = ?。
//       答对了：拿走的飞走，剩下的跳一下。
// 难度 3（算式题）：大大的算式在上面，图先藏起来，按"👀"才出来（答错一次也会自动出来）。
//
// 点东西会一个一个数出来（加法全部都可以数，减法只数剩下的）；全部数完再点，就从头数。
// 答错一次：一起慢慢数一遍（加法数全部，减法数剩下的）。错两次：对的答案卡轻轻发亮。
// 点算式会把算式读出来（三加四等于几？）。
// 颜色：第一堆 / a 是蓝色，第二堆（拿走的）/ b 是橙色，答案是绿色，帮孩子把数字和图连起来。

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { numberWord, promptText, ui } from '../core/i18n'
import type { ArithQuestion } from '../core/types'
import { ItemArt } from '../ui/art'
import { scoreFor, useViewport } from '../ui/hooks'
import { sfx } from '../services/sfx'
import type { EngineProps } from './types'
import './arith.css'

// ---------- 排版（纯计算，方便测试） ----------

type Dir = 'row' | 'column'

/** 一堆东西的盘子 */
export interface TrayLayout {
  /** 每一行几个（空的盘子：[]） */
  rows: number[]
  /** 外框大小（包括边框） */
  w: number
  h: number
}

/** 图：加法两个盘子（中间一个 +），减法一个盘子 */
export interface SceneLayout {
  /** 两个盘子左右排（row）还是上下排（column） */
  dir: Dir
  /** 每个东西占的格子、画多大 */
  cell: number
  art: number
  /** 盘子的内边距 */
  pad: number
  /** 中间的 + 号（减法是 0）和它两边的空隙 */
  plus: number
  plusGap: number
  trays: TrayLayout[]
  w: number
  h: number
}

export interface ArithLayout {
  /** 上下几块之间的空隙 */
  gap: number
  /** 答案卡边长、卡片之间的空隙 */
  card: number
  cardGap: number
  /** 算式的字体大小、那一行的高度 */
  eqFont: number
  eqH: number
  /** 很矮的横画面：算式和答案卡排在同一行 */
  inline: boolean
  /** 难度 3 图还藏着：看图按钮的高度（不然是 0） */
  helper: number
  /** 图（还藏着就是 null） */
  scene: SceneLayout | null
}

/** 间距（画面也是照这些画的；测试用它检查放不放得下） */
export const ARITH_SPACING = {
  /** 盘子的边框 */
  border: 3,
  /** 答案卡下面的阴影 */
  shadow: 8,
  /** 算式那一行的高度（几个字高） */
  eqLine: 1.45,
  /** 答案卡最小、最大（小手指要按得到） */
  minCard: 64,
  maxCard: 132,
  /** 东西最小、最大的格子 */
  minCell: 22,
  maxCell: 124,
  /** 东西占格子的比例 */
  fill: 0.84,
}
const S = ARITH_SPACING

// 算式的宽度（以字体大小为单位）：Fredoka 的数字最宽 0.58，"10" 0.96；符号是自己画的 0.62
const DIGIT_EM = 0.6
const TEN_EM = 1
const SIGN_EM = 0.62
const ANSWER_EM = 1.3
const EQ_GAP_EM = 0.2
const EQ_PAD_EM = 0.3

/** 算式 a + b = [?] 有几个字宽 */
export function equationEm(a: number, b: number): number {
  const num = (n: number) => (n >= 10 ? TEN_EM : DIGIT_EM)
  return num(a) + num(b) + 2 * SIGN_EM + ANSWER_EM + 4 * EQ_GAP_EM + 2 * EQ_PAD_EM
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** 每种数量最好看的排法（像十格框：一行最多 5 个） */
const PREFERRED: Record<number, number[]> = {
  1: [1],
  2: [2],
  3: [3],
  4: [2, 2],
  5: [3, 2],
  6: [3, 3],
  7: [4, 3],
  8: [4, 4],
  9: [5, 4],
  10: [5, 5],
}

/** n 个东西可以怎么排（每一行几个）：最好看的先，再来是其他行数（平均分，前面的行多一个） */
export function patternsFor(n: number): { rows: number[]; pref: number }[] {
  if (n <= 0) return [{ rows: [], pref: 1 }]
  const out = [{ rows: PREFERRED[n] ?? [n], pref: 1 }]
  for (let r = Math.ceil(n / 5); r <= Math.max(1, Math.ceil(n / 2)); r++) {
    const base = Math.floor(n / r)
    const extra = n % r
    const rows = Array.from({ length: r }, (_, i) => base + (i < extra ? 1 : 0))
    if (!out.some((o) => o.rows.join() === rows.join())) out.push({ rows, pref: 0.95 })
  }
  return out
}

function sceneAt(dir: Dir, patterns: number[][], cell: number): SceneLayout {
  const pad = Math.round(clamp(cell * 0.12, 5, 14))
  const edge = 2 * (pad + S.border)
  const trays = patterns.map((rows) => ({
    rows,
    // 空的盘子（4 + 0）也有一格大
    w: Math.max(1, ...rows) * cell + edge,
    h: Math.max(1, rows.length) * cell + edge,
  }))
  const art = Math.round(cell * S.fill)
  if (trays.length === 1) return { dir, cell, art, pad, plus: 0, plusGap: 0, trays, w: trays[0].w, h: trays[0].h }
  const plus = Math.round(clamp(cell * 0.62, 30, 76))
  const plusGap = Math.round(clamp(cell * 0.1, 4, 12))
  // 两个盘子一样高（左右排）或一样宽（上下排）：合起来的时候刚好是一个长方形
  if (dir === 'row') {
    const h = Math.max(trays[0].h, trays[1].h)
    for (const t of trays) t.h = h
    return { dir, cell, art, pad, plus, plusGap, trays, w: trays[0].w + trays[1].w + plus + 2 * plusGap, h }
  }
  const w = Math.max(trays[0].w, trays[1].w)
  for (const t of trays) t.w = w
  return { dir, cell, art, pad, plus, plusGap, trays, w, h: trays[0].h + trays[1].h + plus + 2 * plusGap }
}

/** 减法：剩下的刚好是前面几整行（被拿走的自己成一行或几行），一眼就分得出来 */
export function cleanSplit(rows: number[], remaining: number): boolean {
  let sum = 0
  for (const k of rows) {
    if (sum === remaining) return true
    sum += k
  }
  return sum === remaining
}

/**
 * 图怎么排：试每一种排法（左右 / 上下、每一堆几行），选东西可以画最大的。
 * 两堆的东西一样大（孩子才会一起数）。natural：画面的方向（直的手机上下排比较大）
 */
export function fitScene(op: '+' | '-', a: number, b: number, sw: number, sh: number, natural: Dir): SceneLayout {
  const groups = op === '+' ? [a, b] : [a]
  const dirs: Dir[] = op === '+' ? [natural, natural === 'row' ? 'column' : 'row'] : ['row']
  const fits = (s: SceneLayout) => s.w <= sw && s.h <= sh
  let best: { score: number; scene: SceneLayout } | null = null
  for (const dir of dirs) {
    // 减法只有一个盘子，没有方向的问题
    const dirPref = op === '-' || dir === natural ? 1 : 0.85
    const combos =
      groups.length === 1
        ? patternsFor(a).map((p) => [p])
        : patternsFor(a).flatMap((pa) => patternsFor(b).map((pb) => [pa, pb]))
    for (const combo of combos) {
      const patterns = combo.map((p) => p.rows)
      let pref = combo.reduce((acc, p) => acc * p.pref, dirPref)
      if (op === '-' && cleanSplit(patterns[0], a - b)) pref *= 1.15
      let lo = S.minCell
      let hi = S.maxCell
      if (!fits(sceneAt(dir, patterns, lo))) hi = lo
      // 最大的格子（越大越好）
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2)
        if (fits(sceneAt(dir, patterns, mid))) lo = mid
        else hi = mid - 1
      }
      const scene = sceneAt(dir, patterns, lo)
      // 最小的格子也放不下：分数很低（只有全部都放不下才会用）
      const score = lo * pref * (fits(scene) ? 1 : 0.01)
      if (!best || score > best.score) best = { score, scene }
    }
  }
  return best!.scene
}

/**
 * 整个题型怎么排。boxW、boxH 是量到的大小（扣掉上面的按钮和题目）。
 * 一般：图 → 算式 → 答案卡（难度 3：算式 → 图 → 答案卡）；很矮的横画面：算式和答案卡同一行。
 * pictures：图有没有显示（难度 3 一开始藏着，只有看图按钮）。
 */
export function layoutArith(
  boxW: number,
  boxH: number,
  q: Pick<ArithQuestion, 'op' | 'a' | 'b' | 'options' | 'difficulty'>,
  { portrait, pictures }: { portrait: boolean; pictures: boolean },
): ArithLayout {
  const W = Math.max(160, boxW)
  const H = Math.max(160, boxH)
  const n = q.options.length
  const gap = Math.round(clamp(H * 0.024, 8, 18))
  const baseGap = W < 520 ? 12 : 18
  const eqByWidth = (W - 8) / equationEm(q.a, q.b)
  const card = Math.floor(clamp(Math.min((W - baseGap * (n - 1)) / n, H * 0.19, S.maxCard), S.minCard, S.maxCard))
  // 很窄的手机（320 宽）：卡片已经是最小了，就把卡片之间的空隙缩小
  const cardGap = Math.max(4, Math.min(baseGap, Math.floor((W - n * card) / Math.max(1, n - 1))))
  const cardsW = (c: number) => n * c + (n - 1) * cardGap

  if (!pictures) {
    // 图还藏着：大大的算式、看图按钮、答案卡
    const helper = Math.round(clamp(H * 0.15, 72, 104))
    const rest = H - card - S.shadow - helper - 2 * gap
    const eqFont = Math.floor(clamp(Math.min((rest / S.eqLine) * 0.8, eqByWidth), 32, 132))
    return { gap, card, cardGap, eqFont, eqH: Math.ceil(eqFont * S.eqLine), inline: false, helper, scene: null }
  }

  // 难度 3 看了图：算式还是比较大
  const eqShare = q.difficulty === 3 ? 0.11 : 0.1
  const eqMax = q.difficulty === 3 ? 88 : 76
  const eqFont = Math.floor(clamp(Math.min(H * eqShare, eqByWidth), 28, eqMax))
  const eqH = Math.ceil(eqFont * S.eqLine)
  const sceneH = H - card - S.shadow - eqH - 2 * gap
  const natural: Dir = portrait ? 'column' : 'row'

  // 很矮的横画面（手机横放）：算式跟答案卡排一行，图才有地方
  if (sceneH < H * 0.5 && W >= H * 1.6) {
    const c = Math.floor(clamp(Math.min(H * 0.32, S.maxCard), S.minCard, S.maxCard))
    const f = Math.floor(clamp(Math.min(c * 0.62, (W - cardsW(c) - gap - 8) / equationEm(q.a, q.b)), 24, eqMax))
    const fh = Math.ceil(f * S.eqLine)
    const rowH = Math.max(c, fh)
    const scene = fitScene(q.op, q.a, q.b, W - 4, H - rowH - S.shadow - gap, natural)
    return { gap, card: c, cardGap, eqFont: f, eqH: fh, inline: true, helper: 0, scene }
  }

  const scene = fitScene(q.op, q.a, q.b, W - 4, sceneH, natural)
  return { gap, card, cardGap, eqFont, eqH, inline: false, helper: 0, scene }
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

const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties

/** + − = ：自己画（字体里的符号大小、粗细都不一样） */
function Sign({ kind, className = 'arith-sign' }: { kind: '+' | '-' | '='; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      {kind === '+' && <path d="M50 18v64M18 50h64" />}
      {kind === '-' && <path d="M18 50h64" />}
      {kind === '=' && <path d="M20 35h60M20 65h60" />}
    </svg>
  )
}

/** 被拿走的东西：轻轻打个叉（一笔一笔画出来） */
function Cross() {
  return (
    <svg className="arith-cross" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M22 22 78 78" pathLength={100} />
      <path d="M78 22 22 78" pathLength={100} />
    </svg>
  )
}

/** 第二堆走进来（+ 号早一点跳出来）、被拿走的打叉：等孩子先看到第一堆 */
const ARRIVE_DELAY = 800
const TAKE_DELAY = 1400
/** 一起数：先说"再试一次"，再说"我们一起数一数"，然后一个一个数 */
const DEMO_INTRO = 1100
const DEMO_START = 2500
const DEMO_STEP = 900
/** 答对了等一下再庆祝：让孩子看到两堆合起来 / 拿走的飞走，听到答案 */
const SOLVE_DELAY = 700

// ---------- 引擎 ----------

export function ArithEngine({ q, lang, say, onSolved }: EngineProps<ArithQuestion>) {
  const { w, h } = useViewport()
  const rootRef = useRef<HTMLDivElement | null>(null)
  // 估计：去掉画面边距、上面的按钮和题目那一行
  const box = useBoxSize(rootRef, { w: w - 32, h: h - 190 })

  const [revealed, setRevealed] = useState(q.pictures)
  const [taken, setTaken] = useState(false)
  /** 数过的东西（照点的顺序） */
  const [counted, setCounted] = useState<number[]>([])
  /** 一起数：null = 没有在数；-1 = 刚开始（还没数到第一个）；不然是正在数第几个 */
  const [demo, setDemo] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)

  const mistakesRef = useRef(0)
  const solvedRef = useRef(false)
  const demoTimers = useRef<number[]>([])
  const solveTimer = useRef<number | undefined>(undefined)

  const plus = q.op === '+'
  const total = plus ? q.a + q.b : q.a
  // 可以数的：加法全部；减法只有剩下的（最后 b 个是被拿走的）
  const countable = plus ? total : q.a - q.b
  const L = useMemo(
    () => layoutArith(box.w, box.h, q, { portrait: h > w, pictures: revealed }),
    [box.w, box.h, q, h, w, revealed],
  )

  const clearDemo = () => {
    demoTimers.current.forEach((t) => window.clearTimeout(t))
    demoTimers.current = []
  }

  useEffect(
    () => () => {
      demoTimers.current.forEach((t) => window.clearTimeout(t))
      window.clearTimeout(solveTimer.current)
    },
    [],
  )

  // 减法：图出来一下以后，被拿走的那几个变淡、打叉
  useEffect(() => {
    if (plus || !revealed) return
    const t = window.setTimeout(() => setTaken(true), TAKE_DELAY)
    return () => window.clearTimeout(t)
  }, [plus, revealed])

  const later = (fn: () => void, ms: number) => {
    demoTimers.current.push(window.setTimeout(fn, ms))
  }

  /** 答错一次以后：一起慢慢数（加法全部，减法剩下的） */
  const runDemo = () => {
    clearDemo()
    setRevealed(true)
    setCounted([])
    setDemo(-1)
    later(() => say(ui('letsCountTogether', lang)), DEMO_INTRO)
    if (countable === 0) {
      // 全部拿走了：一个都没有剩，"零"
      later(() => {
        say(numberWord(0, lang), 1)
        setDemo(null)
      }, DEMO_START)
      return
    }
    for (let i = 0; i < countable; i++) {
      later(() => {
        setDemo(i)
        setCounted(Array.from({ length: i + 1 }, (_, k) => k))
        say(numberWord(i + 1, lang), 1)
      }, DEMO_START + i * DEMO_STEP)
    }
    later(() => setDemo(null), DEMO_START + countable * DEMO_STEP)
  }

  const choose = (v: number) => {
    if (solvedRef.current || wrong.includes(v)) return
    if (v === q.answer) {
      solvedRef.current = true
      clearDemo()
      setDemo(null)
      // 数到一半的数字拿掉（全部数完的留着：刚好是答案）
      if (counted.length !== countable) setCounted([])
      setSolved(true)
      sfx.drop()
      say(numberWord(q.answer, lang), 1)
      solveTimer.current = window.setTimeout(() => onSolved(scoreFor(mistakesRef.current)), SOLVE_DELAY)
      return
    }
    mistakesRef.current += 1
    setWrong([...wrong, v])
    sfx.wrong()
    say(ui('tryAgain', lang))
    if (mistakesRef.current === 1) runDemo()
  }

  /** 点一个东西：数下一个数字；全部数完了再点，从头数 */
  const tapObject = (i: number) => {
    if (solvedRef.current || demo !== null || i >= countable) return
    let next: number[]
    if (counted.includes(i)) {
      if (counted.length < countable) return
      next = [i]
    } else next = [...counted, i]
    setCounted(next)
    sfx.tap()
    say(numberWord(next.length, lang), 1)
  }

  const reveal = () => {
    if (revealed || solvedRef.current) return
    setRevealed(true)
    sfx.tap()
  }

  const readEquation = () => say(promptText({ key: plus ? 'addEquation' : 'subEquation', a: q.a, b: q.b }, lang))

  const mistakes = wrong.length
  const hint = mistakes >= 2 && !solved

  // ---------- 画面 ----------

  /** 第 i 个东西（加法：第一堆 0..a−1、第二堆 a..；减法：最后 b 个是被拿走的）；delay：什么时候跳出来 */
  const renderObject = (i: number, delay: number) => {
    const sc = L.scene!
    const gone = i >= countable
    const order = counted.indexOf(i)
    const classes = ['arith-obj', gone && 'gone', order >= 0 && 'counted', demo === i && 'now']
    const style = cssVars({ width: sc.cell, height: sc.cell, '--d': `${delay}ms`, '--k': i })
    const art = (
      <span className="arith-pop">
        <span className="arith-hop">
          <span className="arith-art">
            <ItemArt item={q.item} size={sc.art} />
          </span>
        </span>
      </span>
    )
    const badge = Math.round(clamp(sc.cell * 0.36, 20, 36))
    // 被拿走的不能数（不是按钮），一个接一个打叉（拿走很多个的时候快一点）
    if (gone)
      return (
        <span
          key={i}
          className={classes.filter(Boolean).join(' ')}
          style={{ ...style, ...cssVars({ '--g': `${(i - countable) * Math.min(160, Math.round(1000 / q.b))}ms` }) }}
          data-obj={i}
          data-gone="true"
        >
          {art}
          {taken && <Cross />}
        </span>
      )
    return (
      <button
        key={i}
        type="button"
        className={classes.filter(Boolean).join(' ')}
        style={style}
        onClick={() => tapObject(i)}
        data-obj={i}
        aria-label={`${i + 1}`}
      >
        {art}
        {order >= 0 && (
          <span
            className="arith-badge"
            style={{ minWidth: badge, height: badge, fontSize: Math.round(badge * 0.64) }}
          >
            {order + 1}
          </span>
        )}
      </button>
    )
  }

  /** 一个盘子：first 是第一个东西的编号，delay 是出来的时间 */
  const renderTray = (which: 'a' | 'b', tray: TrayLayout, first: number, delay: number) => {
    const sc = L.scene!
    let i = first
    return (
      <div
        className={`arith-tray ${which} ${tray.rows.length === 0 ? 'empty' : ''}`}
        style={cssVars({ width: tray.w, height: tray.h, '--pad': `${sc.pad}px` })}
        data-tray={which}
      >
        {tray.rows.map((k, r) => (
          <div key={r} className="arith-row">
            {Array.from({ length: k }, () => {
              const idx = i++
              return renderObject(idx, delay + (idx - first) * 60)
            })}
          </div>
        ))}
      </div>
    )
  }

  const scene = L.scene && (
    <div
      className={`arith-scene ${L.scene.dir} ${plus ? 'add' : 'sub'} ${taken ? 'taken' : ''} ${solved ? 'done' : ''}`}
      style={cssVars({ width: L.scene.w, height: L.scene.h, '--arrive': `${ARRIVE_DELAY}ms` })}
    >
      {renderTray('a', L.scene.trays[0], 0, 0)}
      {plus && (
        <>
          <span
            className="arith-plus"
            style={{
              width: L.scene.plus,
              height: L.scene.plus,
              margin: L.scene.dir === 'row' ? `0 ${L.scene.plusGap}px` : `${L.scene.plusGap}px 0`,
            }}
          >
            <Sign kind="+" className="arith-plus-sign" />
          </span>
          {renderTray('b', L.scene.trays[1], q.a, ARRIVE_DELAY + 150)}
        </>
      )}
    </div>
  )

  const helper = !L.scene && (
    <button
      type="button"
      className="arith-helper"
      style={{ height: L.helper, minWidth: Math.round(L.helper * 1.9), gap: Math.round(L.helper * 0.12) }}
      onClick={reveal}
      data-help="pictures"
    >
      <span className="arith-helper-eyes" style={{ fontSize: Math.round(L.helper * 0.44) }} aria-hidden="true">
        👀
      </span>
      <span className="arith-helper-items">
        {[0, 1, 2].map((k) => (
          <ItemArt key={k} item={q.item} size={Math.round(L.helper * 0.42)} />
        ))}
      </span>
    </button>
  )

  const equation = (
    <button
      type="button"
      className="arith-eq"
      style={{ fontSize: L.eqFont, height: L.eqH }}
      onClick={readEquation}
      data-equation={`${q.a}${q.op}${q.b}`}
    >
      <span className="arith-num a">{q.a}</span>
      <Sign kind={q.op} />
      <span className="arith-num b">{q.b}</span>
      <Sign kind="=" />
      <span className={`arith-ans ${solved ? 'filled' : ''}`}>{solved ? q.answer : '?'}</span>
    </button>
  )

  const cards = (
    <div className="arith-cards" style={{ gap: L.cardGap }}>
      {q.options.map((v) => {
        const classes = [
          'arith-card',
          wrong.includes(v) && 'wrong',
          solved && v === q.answer && 'right',
          hint && v === q.answer && 'hint',
        ]
        return (
          <button
            key={v}
            type="button"
            className={classes.filter(Boolean).join(' ')}
            style={{ width: L.card, height: L.card, fontSize: Math.round(L.card * 0.56) }}
            onClick={() => choose(v)}
            data-value={v}
            data-correct={v === q.answer ? 'true' : undefined}
          >
            {v}
          </button>
        )
      })}
    </div>
  )

  const stage = (
    <div className="arith-stage" style={{ minHeight: L.scene ? L.scene.h : L.helper }}>
      {scene || helper}
    </div>
  )

  // 算式题（难度 3）：算式在最上面
  const eqFirst = !q.pictures

  return (
    <div
      ref={rootRef}
      className="engine arith-engine"
      style={{ gap: L.gap }}
      data-op={q.op}
      data-a={q.a}
      data-b={q.b}
      data-answer={q.answer}
      data-mistakes={mistakes}
      data-demo={demo !== null ? 'on' : undefined}
      data-pictures={revealed ? 'shown' : 'hidden'}
      data-counted={counted.length}
    >
      {L.inline ? (
        <>
          {stage}
          <div className="arith-answer-row" style={{ gap: L.gap }}>
            {equation}
            {cards}
          </div>
        </>
      ) : eqFirst ? (
        <>
          {equation}
          {stage}
          {cards}
        </>
      ) : (
        <>
          {stage}
          {equation}
          {cards}
        </>
      )}
    </div>
  )
}
