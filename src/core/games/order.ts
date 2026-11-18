// 排顺序：从小排到大、数字排顺序
// （先放一个简单可用的版本；完整版由负责这个游戏的 agent 完成）

import { pick, shuffle, type Rng } from '../rng'
import type { BaseQuestion, Difficulty, Item } from '../types'
import { OBJECTS } from './common'

/** 要排的一个东西：图（item）或数字（numeral）。rank 0 是第一个要放的 */
export interface OrderItem {
  item?: Item
  numeral?: number
  rank: number
}

export interface OrderQuestion extends BaseQuestion {
  engine: 'order'
  /** 显示的顺序（已经打乱） */
  items: OrderItem[]
}

export function orderQuestion(skill: 'orderSize' | 'orderNumber', d: Difficulty, rng: Rng): OrderQuestion {
  if (skill === 'orderSize') {
    const kind = pick(rng, OBJECTS)
    const items = shuffle(
      rng,
      [0.5, 0.75, 1].map((scale, rank) => ({ item: { kind, scale }, rank })),
    )
    return {
      engine: 'order',
      skill,
      difficulty: d,
      signature: `orderSize:${kind}:${items.map((i) => i.rank).join('')}`,
      prompt: { key: 'orderSmallToBig' },
      items,
    }
  }
  const items = shuffle(
    rng,
    [1, 2, 3].map((numeral, rank) => ({ numeral, rank })),
  )
  return {
    engine: 'order',
    skill,
    difficulty: d,
    signature: `orderNumber:${items.map((i) => i.numeral).join('')}`,
    prompt: { key: 'orderNumbers' },
    items,
  }
}
