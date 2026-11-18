// 数字配对：把数字放到数量一样的那一堆
// （先放一个简单可用的版本；完整版由负责这个游戏的 agent 完成）

import { pick, sample, shuffle, type Rng } from '../rng'
import type { BaseQuestion, Difficulty, Item } from '../types'
import { OBJECTS } from './common'

export interface MatchQuestion extends BaseQuestion {
  engine: 'match'
  /** 每一堆用的东西 */
  item: Item
  /** 每一堆有几个（显示顺序），数量不重复 */
  groups: number[]
  /** 数字卡（已经打乱），每张刚好对一堆 */
  numerals: number[]
}

export function matchQuestion(d: Difficulty, rng: Rng): MatchQuestion {
  const kind = pick(rng, OBJECTS)
  const groups = sample(rng, [1, 2, 3], 2)
  return {
    engine: 'match',
    skill: 'matchNumber',
    difficulty: d,
    signature: `matchNumber:${kind}:${groups.join(',')}`,
    prompt: { key: 'matchNumbers' },
    item: { kind },
    groups,
    numerals: shuffle(rng, groups),
  }
}
