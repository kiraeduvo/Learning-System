// 数字配对：把数字卡放到数量一样的那一堆（Konsep Nombor：数字和数量配对）
//
// 难度 1：两堆，每堆 1–3 个
// 难度 2：三堆，每堆 1–5 个（至少有一堆要数到 4 或 5）
// 难度 3：三堆或四堆，每堆 1–6 个；三堆的时候至少两堆有 4 个以上（要真的数，不能一眼看出来）；
//         一半的题东西是散开放的，不排整齐
// 同一题的每一堆都用同一种东西（原来的颜色，或者可以换颜色的东西换成同一个颜色），
// 这样孩子只要比"几个"，不会被东西的样子分心。

import { pick, sample, shuffle, type Rng } from '../rng'
import type { BaseQuestion, Difficulty, Item } from '../types'
import { itemKey, MORE_COLORS, OBJECTS, RECOLORABLE } from './common'

export interface MatchQuestion extends BaseQuestion {
  engine: 'match'
  /** 每一堆用的东西（同一题都一样） */
  item: Item
  /** 每一堆有几个（显示顺序），数量不重复 */
  groups: number[]
  /** 数字卡（已经打乱），每张刚好对一堆 */
  numerals: number[]
  /** 东西怎么排：rows = 排整齐（像骰子），scatter = 散开。没写就是排整齐 */
  layout?: 'rows' | 'scatter'
}

/** 每个难度：每堆最少、最多几个 */
export const MATCH_RANGE: Record<Difficulty, { min: number; max: number }> = {
  1: { min: 1, max: 3 },
  2: { min: 1, max: 5 },
  3: { min: 1, max: 6 },
}

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

/** 这组数量够不够这个难度（太容易的重抽） */
function fitsLevel(d: Difficulty, groups: number[]): boolean {
  if (d === 2) return Math.max(...groups) >= 4
  if (d === 3 && groups.length === 3) return groups.filter((g) => g >= 4).length >= 2
  return true
}

function pickQuantities(d: Difficulty, n: number, rng: Rng): number[] {
  const { min, max } = MATCH_RANGE[d]
  const all = range(min, max)
  for (let i = 0; i < 50; i++) {
    const groups = sample(rng, all, n)
    if (fitsLevel(d, groups)) return groups
  }
  // 理论上到不了这里；保险起见用最大的几个数（一定符合条件）
  return shuffle(rng, all.slice(-n))
}

/** 数字卡的顺序：三堆以上时不要刚好跟下面那几堆的顺序一样（不然照位置放就对了，不用数） */
function numeralOrder(groups: number[], rng: Rng): number[] {
  for (let i = 0; i < 20; i++) {
    const numerals = shuffle(rng, groups)
    if (groups.length < 3 || numerals.some((v, j) => v !== groups[j])) return numerals
  }
  return [...groups.slice(1), groups[0]]
}

function pickItem(rng: Rng): Item {
  const kind = pick(rng, OBJECTS)
  // 可以换颜色的东西：一半的题换成另一个颜色（同一题全部同一个颜色）
  if (RECOLORABLE.includes(kind) && rng() < 0.5) return { kind, color: pick(rng, MORE_COLORS) }
  return { kind }
}

export function matchQuestion(d: Difficulty, rng: Rng): MatchQuestion {
  const n = d === 1 ? 2 : d === 2 ? 3 : rng() < 0.5 ? 3 : 4
  const groups = pickQuantities(d, n, rng)
  const numerals = numeralOrder(groups, rng)
  const item = pickItem(rng)
  const layout: MatchQuestion['layout'] = d === 3 && rng() < 0.5 ? 'scatter' : 'rows'
  return {
    engine: 'match',
    skill: 'matchNumber',
    difficulty: d,
    // 东西、每堆的数量和顺序、数字卡顺序、排法：全部一样才算同一题
    signature: `matchNumber:${itemKey(item)}:${groups.join(',')}:${numerals.join(',')}:${layout}`,
    prompt: { key: 'matchNumbers' },
    item,
    groups,
    numerals,
    layout,
  }
}
