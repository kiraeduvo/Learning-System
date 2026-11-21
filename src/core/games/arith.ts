// 10 以内加减法（Operasi Nombor：tambah dan tolak）
// （先放一个简单可用的版本；完整版由负责这个游戏的 agent 完成）

import { pick, randInt, type Rng } from '../rng'
import type { BaseQuestion, Difficulty, Item } from '../types'
import { numberOptions, OBJECTS } from './common'

export interface ArithQuestion extends BaseQuestion {
  engine: 'arith'
  op: '+' | '-'
  a: number
  b: number
  /** a + b 或 a − b */
  answer: number
  /** 数字选项，包括答案 */
  options: number[]
  /** 图里用的东西 */
  item: Item
  /** 有没有图帮忙（越难图越少） */
  pictures: boolean
}

export function arithQuestion(skill: 'addition' | 'subtraction', d: Difficulty, rng: Rng): ArithQuestion {
  const kind = pick(rng, OBJECTS)
  if (skill === 'addition') {
    const a = randInt(rng, 1, 3)
    const b = randInt(rng, 1, 5 - a)
    return {
      engine: 'arith',
      skill,
      difficulty: d,
      signature: `addition:${kind}:${a}+${b}`,
      prompt: { key: 'addStory', a, b, kind },
      op: '+',
      a,
      b,
      answer: a + b,
      options: numberOptions(rng, a + b, 3, 1, 6),
      item: { kind },
      pictures: true,
    }
  }
  const a = randInt(rng, 2, 5)
  const b = randInt(rng, 1, a - 1)
  return {
    engine: 'arith',
    skill,
    difficulty: d,
    signature: `subtraction:${kind}:${a}-${b}`,
    prompt: { key: 'subStory', a, b, kind },
    op: '-',
    a,
    b,
    answer: a - b,
    options: numberOptions(rng, a - b, 3, 1, 5),
    item: { kind },
    pictures: true,
  }
}
