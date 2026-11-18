// 各个游戏共用的东西：物件、颜色、数字选项

import { pick, sample, shuffle, type Rng } from '../rng'
import type { ColorName, Difficulty, Item, ObjectKind, ShapeKind } from '../types'

export const OBJECTS: ObjectKind[] = ['apple', 'fish', 'star', 'ball', 'car', 'duck', 'flower', 'balloon', 'cat']
/** 可以换颜色、看起来还是合理的东西（分类、规律用） */
export const RECOLORABLE: ObjectKind[] = ['ball', 'balloon', 'car', 'flower', 'fish', 'star']
/** 很容易分辨的颜色 */
export const CLEAR_COLORS: ColorName[] = ['red', 'blue', 'yellow', 'green']
export const MORE_COLORS: ColorName[] = ['red', 'blue', 'yellow', 'green', 'purple', 'orange']
export const ALL_COLORS: ColorName[] = ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'pink']

/** 数字选项：包括正确答案，其他选项靠近答案，全部不重复 */
export function numberOptions(rng: Rng, answer: number, count: number, min: number, max: number): number[] {
  const candidates: number[] = []
  for (let v = min; v <= max; v++) if (v !== answer) candidates.push(v)
  // 先按距离排，再从最近的几个里随机拿
  const near = shuffle(rng, candidates).sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer))
  const pool = near.slice(0, Math.max(count + 1, 4))
  return shuffle(rng, [answer, ...sample(rng, pool, count - 1)])
}

export function shapeItem(rng: Rng, shape: ShapeKind, color: ColorName, d: Difficulty): Item {
  let rotate = 0
  if (d === 3 && shape === 'triangle') rotate = pick(rng, [0, 0, 90, 180, 270])
  if (shape === 'rectangle' && rng() < 0.4) rotate = 90
  return { kind: shape, color, scale: 0.8 + rng() * 0.2, rotate }
}

export function itemKey(item: Item): string {
  return `${item.kind}-${item.color ?? ''}`
}
