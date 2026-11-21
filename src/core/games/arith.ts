// 10 以内加减法（Operasi Nombor：tambah dan tolak dalam lingkungan 10）
//
// 跟学前常用的 CPA 教法一样，从具体、图像慢慢到抽象（算式）：
//   难度 1：总数 5 以内。听故事（有两个苹果，再加一个……），每个东西都画出来，3 个答案选
//   难度 2：总数 10 以内。听故事，每个东西都画出来，3–4 个答案选（数目越大选项越多）
//   难度 3：10 以内。听算式（三加四等于几？），画面上是大大的算式，图先藏起来
//          （按"看图"按钮才出来，答错也会自动出来），4 个答案选
// 规则：
//   - 答案不会是负数
//   - 难度 1、2：加的、拿走的、答案都不会是 0（故事里"再加零个"很奇怪）
//   - 难度 3：偶尔有 0（4 + 0、0 + 3、6 − 0、5 − 5 = 0），认识"零"
//   - a、b 分散在整个范围：不会老是 +1、−1，也不会老是 1 + 1 这种太简单的题
// 加法的"总数"是 a + b；减法的"总数"是 a（一开始有几个，也是画面上东西最多的时候）。

import { pick, type Rng } from '../rng'
import type { BaseQuestion, ColorName, Difficulty, Item, ObjectKind, Prompt } from '../types'
import { itemKey, MORE_COLORS, numberOptions, OBJECTS, RECOLORABLE } from './common'

export interface ArithQuestion extends BaseQuestion {
  engine: 'arith'
  op: '+' | '-'
  a: number
  b: number
  /** a + b 或 a − b */
  answer: number
  /** 数字选项，包括答案（只有一个），不重复，已经打乱 */
  options: number[]
  /** 图里用的东西（同一题都一样） */
  item: Item
  /** 一开始就有图（难度 1、2）；false = 先只看算式，图藏起来，可以按"看图"（难度 3） */
  pictures: boolean
}

type Op = ArithQuestion['op']

/** 每个难度：总数（没有 0 的题）从几到几、答案选项最小是几 */
export const ARITH_LEVELS: Record<Difficulty, { minTotal: number; maxTotal: number; optionMin: number }> = {
  1: { minTotal: 2, maxTotal: 5, optionMin: 1 },
  2: { minTotal: 4, maxTotal: 10, optionMin: 1 },
  3: { minTotal: 2, maxTotal: 10, optionMin: 0 },
}

/** 难度 3 有 0 的题大概占多少（加法：一边是 0；减法：拿走 0 个，或全部拿走） */
export const ZERO_SHARE: Record<Op, number> = { '+': 0.1, '-': 0.12 }

interface Pair {
  a: number
  b: number
  w: number
}

/** 总数（加法 a + b、减法 a）的权重：太小的（1 + 1、2 − 1）少出；难度 2 主要练 6–10 */
function totalWeight(d: Difficulty, total: number): number {
  if (d === 1) return [0, 0, 0.1, 0.5, 1, 1.3][total]
  if (d === 2) return total === 4 ? 0.3 : total === 5 ? 0.5 : 1
  return total <= 5 ? [0, 0, 0.2, 0.4, 0.6, 0.8][total] : 1
}

/**
 * 同一个总数里，每一种拆法的权重：+1、1 + …、−1、只剩一个，这些比较简单的少出一点。
 * 难度 1 的数字本来就小（很多题都有 1），少得不多，不然 2 + 2 这种会出太多次
 */
function splitWeight(op: Op, d: Difficulty, a: number, b: number): number {
  const one = d === 1 ? 0.7 : 0.5
  if (op === '+') return (a === 1 ? one : 1) * (b === 1 ? one : 1)
  return (b === 1 ? one : 1) * (a - b === 1 ? (d === 1 ? 0.75 : 0.6) : 1)
}

/** 所有可以出的 (a, b)（不包括有 0 的），连同权重。每个总数分到 totalWeight，再按拆法的权重分下去 */
function pairsFor(op: Op, d: Difficulty): Pair[] {
  const { minTotal, maxTotal } = ARITH_LEVELS[d]
  const out: Pair[] = []
  for (let total = minTotal; total <= maxTotal; total++) {
    const splits: Pair[] = []
    for (let x = 1; x < total; x++) {
      // 加法：x + (total − x)；减法：total − x
      const a = op === '+' ? x : total
      const b = op === '+' ? total - x : x
      splits.push({ a, b, w: splitWeight(op, d, a, b) })
    }
    const sum = splits.reduce((acc, p) => acc + p.w, 0)
    for (const p of splits) out.push({ ...p, w: (p.w / sum) * totalWeight(d, total) })
  }
  return out
}

const PAIRS: Record<Op, Record<Difficulty, Pair[]>> = {
  '+': { 1: pairsFor('+', 1), 2: pairsFor('+', 2), 3: pairsFor('+', 3) },
  '-': { 1: pairsFor('-', 1), 2: pairsFor('-', 2), 3: pairsFor('-', 3) },
}

function weightedPick(rng: Rng, list: Pair[]): Pair {
  const total = list.reduce((s, p) => s + p.w, 0)
  let r = rng() * total
  for (const p of list) {
    r -= p.w
    if (r < 0) return p
  }
  return list[list.length - 1]
}

/** 难度 3 有 0 的题：4 + 0、0 + 3、6 − 0、5 − 5（不会有 0 + 0） */
function zeroPair(op: Op, rng: Rng): { a: number; b: number } {
  const n = 2 + Math.floor(rng() * 8) // 2–9
  const first = rng() < 0.5
  if (op === '+') return first ? { a: n, b: 0 } : { a: 0, b: n }
  return first ? { a: n, b: 0 } : { a: n, b: n }
}

function pickNumbers(op: Op, d: Difficulty, rng: Rng): { a: number; b: number } {
  if (d === 3 && rng() < ZERO_SHARE[op]) return zeroPair(op, rng)
  const { a, b } = weightedPick(rng, PAIRS[op][d])
  return { a, b }
}

/** 答案选几个：难度 1 三个；难度 2 东西多（6 个以上）四个，不然三个；难度 3 四个 */
export function optionCount(op: Op, d: Difficulty, a: number, b: number): number {
  if (d === 1) return 3
  if (d === 3) return 4
  return (op === '+' ? a + b : a) >= 6 ? 4 : 3
}

/** 选项的范围：靠近答案；难度 1 不会太大（加法最多 6、减法最多 5），难度 3 才有 0 */
export function optionRange(op: Op, d: Difficulty): { min: number; max: number } {
  const max = d === 1 ? (op === '+' ? 6 : 5) : 10
  return { min: ARITH_LEVELS[d].optionMin, max }
}

function pickItem(rng: Rng): { kind: ObjectKind; color?: ColorName } {
  const kind = pick(rng, OBJECTS)
  // 可以换颜色的东西：一半的题换成另一个颜色（同一题全部同一个颜色）
  if (RECOLORABLE.includes(kind) && rng() < 0.5) return { kind, color: pick(rng, MORE_COLORS) }
  return { kind }
}

export function arithQuestion(skill: 'addition' | 'subtraction', d: Difficulty, rng: Rng): ArithQuestion {
  const op: Op = skill === 'addition' ? '+' : '-'
  const { a, b } = pickNumbers(op, d, rng)
  const answer = op === '+' ? a + b : a - b
  const item = pickItem(rng)
  const { min, max } = optionRange(op, d)
  const options = numberOptions(rng, answer, optionCount(op, d, a, b), min, max)
  const story = d < 3
  const prompt: Prompt = story
    ? { key: op === '+' ? 'addStory' : 'subStory', a, b, kind: item.kind }
    : { key: op === '+' ? 'addEquation' : 'subEquation', a, b }
  return {
    engine: 'arith',
    skill,
    difficulty: d,
    // 算式、东西（包括颜色）、选项顺序、故事还是算式：全部一样才算同一题
    signature: `${skill}:${a}${op}${b}:${itemKey(item)}:${options.join(',')}:${story ? 'story' : 'eq'}`,
    prompt,
    op,
    a,
    b,
    answer,
    options,
    item,
    pictures: story,
  }
}
