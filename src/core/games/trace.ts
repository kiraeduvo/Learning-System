// 描数字

import { randInt, type Rng } from '../rng'
import type { Difficulty, TraceQuestion } from '../types'

export function traceQuestion(d: Difficulty, rng: Rng): TraceQuestion {
  let digit: number
  if (d === 1) digit = randInt(rng, 1, 3)
  else if (d === 2) digit = randInt(rng, 1, 5)
  else digit = rng() < 0.6 ? randInt(rng, 6, 9) : randInt(rng, 0, 5)
  return {
    engine: 'trace',
    skill: 'trace',
    difficulty: d,
    signature: `trace:${digit}`,
    prompt: { key: 'traceNumber', n: digit },
    digit,
  }
}
