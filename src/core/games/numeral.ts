// 认数字 1–5、1–10

import { randInt, sample, shuffle, type Rng } from '../rng'
import type { ChoiceQuestion, Difficulty } from '../types'

export const CONFUSABLE: Record<number, number> = { 6: 9, 9: 6, 1: 7, 7: 1, 2: 5, 5: 2, 3: 8, 8: 3, 10: 1 }

export function numeralQuestion(skill: 'numeral5' | 'numeral10', d: Difficulty, rng: Rng): ChoiceQuestion {
  const max = skill === 'numeral5' ? 5 : 10
  const target = skill === 'numeral10' && rng() < 0.6 ? randInt(rng, 6, 10) : randInt(rng, 1, 5)
  const optionCount = d === 1 ? 2 : d === 2 ? 3 : 4
  let values: number[]
  const twin = CONFUSABLE[target]
  if (skill === 'numeral10' && d === 3 && twin !== undefined) {
    const rest = sample(
      rng,
      Array.from({ length: max }, (_, i) => i + 1).filter((v) => v !== target && v !== twin),
      optionCount - 2,
    )
    values = shuffle(rng, [target, twin, ...rest])
  } else {
    values = shuffle(rng, [
      target,
      ...sample(
        rng,
        Array.from({ length: max }, (_, i) => i + 1).filter((v) => v !== target),
        optionCount - 1,
      ),
    ])
  }
  return {
    engine: 'choice',
    skill,
    difficulty: d,
    signature: `${skill}:${target}:${values.join(',')}`,
    prompt: { key: 'findNumber', n: target },
    options: values.map((value) => ({ type: 'numeral', value })),
    answerIndex: values.indexOf(target),
  }
}
