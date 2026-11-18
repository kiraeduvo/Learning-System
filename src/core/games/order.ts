// 排顺序：从小排到大 / 从大排到小、数字排顺序、找出不见的数字
//
// 从小排到大（orderSize）：
//   难度 1：同一种东西 3 个，大小差很多，从小排到大
//   难度 2：4 个，从小排到大或从大排到小
//   难度 3：5 个，大小比较接近，两个方向都有
// 数字排顺序（orderNumber）：
//   难度 1：1–3（数字下面有圆点提示）
//   难度 2：1–5
//   难度 3：1–10 里面连续的 5 个数字（例如 4–8）；
//           或者"哪一个数字不见了"：3 4 _ 6 7，大部分格子已经放好，孩子只放不见的数字

import { pick, randInt, sample, shuffle, type Rng } from '../rng'
import type { BaseQuestion, ColorName, Difficulty, Item, ObjectKind } from '../types'
import { ALL_COLORS, OBJECTS, RECOLORABLE } from './common'

/** 要排的一个东西：图（item）或数字（numeral）。rank 0 是第一个要放的 */
export interface OrderItem {
  item?: Item
  numeral?: number
  rank: number
}

export interface OrderQuestion extends BaseQuestion {
  engine: 'order'
  /** 下面显示的顺序（已经打乱）。找数字题按 rank 排，下面显示的是 choices */
  items: OrderItem[]
  /** 一开始就已经放好的格子（rank），不会出现在下面给孩子点 */
  given?: number[]
  /** 找数字题：下面可以点的数字（已经打乱）= 不见的数字 + 几个不属于这一排的数字（点了算答错） */
  choices?: number[]
  /** 数字下面加圆点提示（给还不太认识数字的孩子） */
  showDots?: boolean
}

/** 每个难度排几个东西、最小的有多小（最大的是 1） */
const SIZE_LEVELS: Record<Difficulty, { n: number; smallest: number }> = {
  1: { n: 3, smallest: 0.45 },
  2: { n: 4, smallest: 0.42 },
  3: { n: 5, smallest: 0.5 },
}

/** n 个大小，从 smallest 到 1。每一级放大的倍数一样，看起来每一级差得一样多 */
export function sizeSteps(n: number, smallest: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.round(smallest ** (1 - i / (n - 1)) * 100) / 100)
}

/** 打乱，而且最多只有一个刚好在自己的位置上（不然差不多已经排好，不用想就做完了） */
function shuffleUnsorted<T extends { rank: number }>(rng: Rng, ranked: T[]): T[] {
  for (let i = 0; i < 50; i++) {
    const out = shuffle(rng, ranked)
    if (out.filter((o, j) => o.rank === j).length <= 1) return out
  }
  return [...ranked.slice(1), ranked[0]]
}

function orderSizeQuestion(d: Difficulty, rng: Rng): OrderQuestion {
  const kind: ObjectKind = pick(rng, OBJECTS)
  // 同一题的东西都是同一种、同一个颜色，只有大小不一样
  const color: ColorName | undefined = RECOLORABLE.includes(kind) ? pick(rng, ALL_COLORS) : undefined
  const smallToBig = d === 1 || rng() < 0.5
  const { n, smallest } = SIZE_LEVELS[d]
  const steps = sizeSteps(n, smallest)
  // rank 0 是第一个要放的：从小排到大就是最小的，从大排到小就是最大的
  const ranked: OrderItem[] = steps.map((_, rank) => ({
    item: { kind, ...(color ? { color } : {}), scale: smallToBig ? steps[rank] : steps[n - 1 - rank] },
    rank,
  }))
  const items = shuffleUnsorted(rng, ranked)
  return {
    engine: 'order',
    skill: 'orderSize',
    difficulty: d,
    signature: `orderSize:${kind}-${color ?? ''}:${smallToBig ? 'up' : 'down'}:${items.map((i) => i.rank).join('')}`,
    prompt: { key: smallToBig ? 'orderSmallToBig' : 'orderBigToSmall' },
    items,
  }
}

function orderNumberQuestion(d: Difficulty, rng: Rng): OrderQuestion {
  if (d === 3 && rng() < 0.5) return missingNumberQuestion(rng)
  // 难度 3 不从 1 开始，跟难度 2 不一样
  const [start, n] = d === 1 ? [1, 3] : d === 2 ? [1, 5] : [randInt(rng, 2, 6), 5]
  const ranked: OrderItem[] = Array.from({ length: n }, (_, rank) => ({ numeral: start + rank, rank }))
  const items = shuffleUnsorted(rng, ranked)
  return {
    engine: 'order',
    skill: 'orderNumber',
    difficulty: d,
    signature: `orderNumber:order:${items.map((i) => i.numeral).join(',')}`,
    prompt: { key: 'orderNumbers' },
    items,
    ...(d === 1 ? { showDots: true } : {}),
  }
}

/** 找出不见的数字：3 4 _ 6 7。下面给 3 个数字选，只有不见的那个（或那两个）是对的 */
function missingNumberQuestion(rng: Rng): OrderQuestion {
  const n = 5
  const start = randInt(rng, 1, 10 - n + 1)
  const end = start + n - 1
  const seq = Array.from({ length: n }, (_, i) => start + i)
  // 不见一个（在中间，两边都看得到）或两个（不相邻）。第一个不会不见：往回数对小小孩太难
  const gaps: number[] =
    rng() < 0.6
      ? [pick(rng, [1, 2, 3])]
      : pick(rng, [
          [1, 3],
          [2, 4],
          [1, 4],
        ])
  const given = seq.map((_, rank) => rank).filter((rank) => !gaps.includes(rank))
  // 干扰的数字：不在这一排里面、但离这一排很近（比较像答案，要想一想）
  const dist = (v: number) => (v < start ? start - v : v - end)
  const outside = Array.from({ length: 10 }, (_, i) => i + 1).filter((v) => v < start || v > end)
  const near = shuffle(rng, outside)
    .sort((a, b) => dist(a) - dist(b))
    .slice(0, 3)
  const distractors = sample(rng, near, 3 - gaps.length)
  const choices = shuffle(rng, [...gaps.map((rank) => seq[rank]), ...distractors])
  const shown = seq.map((v, rank) => (gaps.includes(rank) ? '_' : v))
  return {
    engine: 'order',
    skill: 'orderNumber',
    difficulty: 3,
    signature: `orderNumber:missing:${shown.join(',')}:${choices.join(',')}`,
    prompt: { key: gaps.length > 1 ? 'missingNumbers' : 'missingNumber' },
    items: seq.map((numeral, rank) => ({ numeral, rank })),
    given,
    choices,
  }
}

export function orderQuestion(skill: 'orderSize' | 'orderNumber', d: Difficulty, rng: Rng): OrderQuestion {
  return skill === 'orderSize' ? orderSizeQuestion(d, rng) : orderNumberQuestion(d, rng)
}
