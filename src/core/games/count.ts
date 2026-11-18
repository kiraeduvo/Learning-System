// 数数 1–5、1–10

import { pick, randInt, type Rng } from '../rng'
import type { CountQuestion, Difficulty } from '../types'
import { numberOptions, OBJECTS } from './common'

export function countQuestion(skill: 'count5' | 'count10', d: Difficulty, rng: Rng): CountQuestion {
  const kind = pick(rng, OBJECTS)
  let count: number
  let optionCount = 3
  let showDots: boolean
  let layout: CountQuestion['layout'] = 'rows'
  let min = 1
  let max: number
  if (skill === 'count5') {
    max = 5
    if (d === 1) {
      count = randInt(rng, 1, 3)
      showDots = true
    } else if (d === 2) {
      count = randInt(rng, 1, 5)
      showDots = true
    } else {
      count = randInt(rng, 2, 5)
      showDots = false
      layout = 'scatter'
      max = 6
    }
  } else {
    max = 10
    if (d === 1) {
      count = randInt(rng, 4, 6)
      showDots = true
    } else if (d === 2) {
      count = randInt(rng, 5, 8)
      showDots = false
    } else {
      count = randInt(rng, 6, 10)
      showDots = false
      optionCount = 4
      layout = 'scatter'
      min = 3
    }
  }
  return {
    engine: 'count',
    skill,
    difficulty: d,
    signature: `${skill}:${kind}:${count}`,
    prompt: { key: 'countHowMany', kind },
    item: { kind },
    count,
    options: numberOptions(rng, count, optionCount, min, max),
    showDots,
    layout,
  }
}
