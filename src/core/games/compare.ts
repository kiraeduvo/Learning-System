// 比多少、比大小

import { pick, randInt, shuffle, type Rng } from '../rng'
import type { ChoiceOption, ChoiceQuestion, Difficulty } from '../types'
import { ALL_COLORS, OBJECTS, RECOLORABLE } from './common'

export function moreLessQuestion(d: Difficulty, rng: Rng): ChoiceQuestion {
  const kind = pick(rng, OBJECTS)
  const [lo, hi, minDiff] = d === 1 ? [1, 5, 2] : d === 2 ? [1, 7, 2] : [2, 9, 1]
  let a: number
  let b: number
  do {
    a = randInt(rng, lo, hi)
    b = randInt(rng, lo, hi)
  } while (Math.abs(a - b) < minDiff)
  const askMore = d === 1 ? true : rng() < 0.5
  // 难度 3：少的那一边东西画得比较大，不能只看"哪边看起来多"
  const scaleFor = (n: number, other: number) => (d === 3 ? (n < other ? 1.2 : 0.8) : 1)
  const options: ChoiceOption[] = [
    { type: 'group', item: { kind, scale: scaleFor(a, b) }, count: a },
    { type: 'group', item: { kind, scale: scaleFor(b, a) }, count: b },
  ]
  const answerIndex = askMore ? (a > b ? 0 : 1) : a < b ? 0 : 1
  return {
    engine: 'choice',
    skill: 'moreLess',
    difficulty: d,
    signature: `moreLess:${kind}:${a}:${b}:${askMore}`,
    prompt: { key: askMore ? 'whichMore' : 'whichLess' },
    options,
    answerIndex,
  }
}

export function sizeQuestion(d: Difficulty, rng: Rng): ChoiceQuestion {
  const kind = pick(rng, OBJECTS)
  const color = RECOLORABLE.includes(kind) ? pick(rng, ALL_COLORS) : undefined
  const scales = shuffle(rng, d === 1 ? [1, 0.5] : d === 2 ? [1, 0.68] : [1, 0.74, 0.5])
  let key: 'whichBigger' | 'whichSmaller' | 'whichBiggest' | 'whichSmallest'
  if (d === 3) key = rng() < 0.5 ? 'whichBiggest' : 'whichSmallest'
  else if (d === 2) key = rng() < 0.5 ? 'whichBigger' : 'whichSmaller'
  else key = 'whichBigger'
  const wantBig = key === 'whichBigger' || key === 'whichBiggest'
  const target = wantBig ? Math.max(...scales) : Math.min(...scales)
  return {
    engine: 'choice',
    skill: 'size',
    difficulty: d,
    signature: `size:${kind}:${scales.join(',')}:${key}`,
    prompt: { key },
    options: scales.map((scale) => ({ type: 'item', item: { kind, color, scale } })),
    answerIndex: scales.indexOf(target),
  }
}
