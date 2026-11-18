// 找规律

import { pick, randInt, sample, shuffle, type Rng } from '../rng'
import type { ChoiceQuestion, Difficulty, Item } from '../types'
import { itemKey, MORE_COLORS, OBJECTS, RECOLORABLE } from './common'

export function patternQuestion(d: Difficulty, rng: Rng): ChoiceQuestion {
  const units: number[][] =
    d === 1
      ? [[0, 1]]
      : d === 2
        ? [
            [0, 1],
            [0, 0, 1],
            [0, 1, 1],
          ]
        : [
            [0, 1, 2],
            [0, 0, 1, 1],
            [0, 1, 1],
          ]
  const unit = pick(rng, units)
  const distinct = Math.max(...unit) + 1
  // 元素：难度 1 用不同的东西（最明显）；难度 2 用同一种东西、不同颜色；难度 3 随机
  let elements: Item[]
  const useColors = d === 2 || (d === 3 && rng() < 0.5)
  if (useColors) {
    const kind = pick(rng, RECOLORABLE)
    elements = sample(rng, MORE_COLORS, distinct + 1).map((color) => ({ kind, color }))
  } else {
    elements = sample(rng, OBJECTS, distinct + 1).map((kind) => ({ kind }))
  }
  // 显示的长度：至少重复两次，下一格可以是规律里的任何位置
  const length = unit.length * 2 + randInt(rng, 0, unit.length - 1)
  const sequence = Array.from({ length }, (_, i) => elements[unit[i % unit.length]])
  const answer = elements[unit[length % unit.length]]
  const optionItems = d === 1 ? elements.slice(0, distinct) : elements.slice(0, Math.max(3, distinct))
  const options = shuffle(rng, optionItems)
  return {
    engine: 'choice',
    skill: 'pattern',
    difficulty: d,
    signature: `pattern:${unit.join('')}:${sequence.map(itemKey).join(',')}`,
    prompt: { key: 'whatNext' },
    sequence,
    options: options.map((item) => ({ type: 'item', item })),
    answerIndex: options.findIndex((o) => itemKey(o) === itemKey(answer)),
  }
}
