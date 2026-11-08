// 题目生成器：每个技能一个，难度 1–3。题目是随机生成的，所以可以一直练、不会练完。

import { pick, randInt, sample, shuffle, type Rng } from './rng'
import type {
  ChoiceOption,
  ChoiceQuestion,
  ColorName,
  CountQuestion,
  Difficulty,
  Item,
  ObjectKind,
  Question,
  ShapeKind,
  SkillId,
  SortQuestion,
  TraceQuestion,
} from './types'

export const OBJECTS: ObjectKind[] = ['apple', 'fish', 'star', 'ball', 'car', 'duck', 'flower', 'balloon', 'cat']
/** 可以换颜色、看起来还是合理的东西（分类、规律用） */
export const RECOLORABLE: ObjectKind[] = ['ball', 'balloon', 'car', 'flower', 'fish', 'star']
/** 很容易分辨的颜色 */
const CLEAR_COLORS: ColorName[] = ['red', 'blue', 'yellow', 'green']
const MORE_COLORS: ColorName[] = ['red', 'blue', 'yellow', 'green', 'purple', 'orange']
const ALL_COLORS: ColorName[] = ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'pink']

/** 数字选项：包括正确答案，其他选项靠近答案，全部不重复 */
export function numberOptions(rng: Rng, answer: number, count: number, min: number, max: number): number[] {
  const candidates: number[] = []
  for (let v = min; v <= max; v++) if (v !== answer) candidates.push(v)
  // 先按距离排，再从最近的几个里随机拿
  const near = shuffle(rng, candidates).sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer))
  const pool = near.slice(0, Math.max(count + 1, 4))
  return shuffle(rng, [answer, ...sample(rng, pool, count - 1)])
}

function countQuestion(skill: 'count5' | 'count10', d: Difficulty, rng: Rng): CountQuestion {
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

const CONFUSABLE: Record<number, number> = { 6: 9, 9: 6, 1: 7, 7: 1, 2: 5, 5: 2, 3: 8, 8: 3, 10: 1 }

function numeralQuestion(skill: 'numeral5' | 'numeral10', d: Difficulty, rng: Rng): ChoiceQuestion {
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

function moreLessQuestion(d: Difficulty, rng: Rng): ChoiceQuestion {
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

function sizeQuestion(d: Difficulty, rng: Rng): ChoiceQuestion {
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

function shapeItem(rng: Rng, shape: ShapeKind, color: ColorName, d: Difficulty): Item {
  let rotate = 0
  if (d === 3 && shape === 'triangle') rotate = pick(rng, [0, 0, 90, 180, 270])
  if (shape === 'rectangle' && rng() < 0.4) rotate = 90
  return { kind: shape, color, scale: 0.8 + rng() * 0.2, rotate }
}

function shapesQuestion(d: Difficulty, rng: Rng): ChoiceQuestion {
  let shapes: ShapeKind[]
  let target: ShapeKind
  if (d === 1) {
    target = pick(rng, ['circle', 'triangle', 'square'] as ShapeKind[])
    shapes = [target, pick(rng, (['circle', 'triangle', 'square'] as ShapeKind[]).filter((s) => s !== target))]
  } else if (d === 2) {
    target = pick(rng, ['circle', 'triangle', 'square', 'rectangle'] as ShapeKind[])
    // 正方形和长方形太像，难度 2 不放在一起
    const similar: ShapeKind | null = target === 'square' ? 'rectangle' : target === 'rectangle' ? 'square' : null
    const others = (['circle', 'triangle', 'square', 'rectangle'] as ShapeKind[]).filter(
      (s) => s !== target && s !== similar,
    )
    shapes = [target, ...sample(rng, others, 2)]
  } else {
    target = pick(rng, ['circle', 'triangle', 'square', 'rectangle'] as ShapeKind[])
    shapes = ['circle', 'triangle', 'square', 'rectangle']
  }
  shapes = shuffle(rng, shapes)
  const colors = sample(rng, ALL_COLORS, shapes.length)
  return {
    engine: 'choice',
    skill: 'shapes',
    difficulty: d,
    signature: `shapes:${target}:${shapes.join(',')}`,
    prompt: { key: 'findShape', shape: target },
    options: shapes.map((shape, i) => ({ type: 'item', item: shapeItem(rng, shape, colors[i], d) })),
    answerIndex: shapes.indexOf(target),
  }
}

function sortColorQuestion(d: Difficulty, rng: Rng): SortQuestion {
  const binCount = d === 3 ? 3 : 2
  const perBin = d === 1 ? 2 : d === 2 ? 3 : 2
  const colors = sample(rng, d === 3 ? MORE_COLORS : CLEAR_COLORS, binCount)
  const oneKind = pick(rng, RECOLORABLE)
  const items: SortQuestion['items'] = []
  colors.forEach((color, bin) => {
    for (let i = 0; i < perBin; i++) {
      const kind = d === 1 ? oneKind : pick(rng, RECOLORABLE)
      items.push({ item: { kind, color }, bin })
    }
  })
  return {
    engine: 'sort',
    skill: 'sortColor',
    difficulty: d,
    signature: `sortColor:${colors.join(',')}:${items.map((i) => i.item.kind).join(',')}`,
    prompt: { key: 'sortByColor' },
    bins: colors.map((color) => ({ type: 'color', color })),
    items: shuffle(rng, items),
  }
}

function sortShapeQuestion(d: Difficulty, rng: Rng): SortQuestion {
  const shapes: ShapeKind[] =
    d === 1
      ? ['circle', 'triangle']
      : d === 2
        ? sample(rng, ['circle', 'triangle', 'square'] as ShapeKind[], 2)
        : ['circle', 'triangle', 'square']
  const perBin = d === 2 ? 3 : 2
  const items: SortQuestion['items'] = []
  shapes.forEach((shape, bin) => {
    for (let i = 0; i < perBin; i++) {
      items.push({ item: shapeItem(rng, shape, pick(rng, ALL_COLORS), d), bin })
    }
  })
  return {
    engine: 'sort',
    skill: 'sortShape',
    difficulty: d,
    signature: `sortShape:${shapes.join(',')}:${items.map((i) => i.item.color).join(',')}`,
    prompt: { key: 'sortByShape' },
    bins: shapes.map((shape) => ({ type: 'shape', shape })),
    items: shuffle(rng, items),
  }
}

function itemKey(item: Item): string {
  return `${item.kind}-${item.color ?? ''}`
}

function patternQuestion(d: Difficulty, rng: Rng): ChoiceQuestion {
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

function traceQuestion(d: Difficulty, rng: Rng): TraceQuestion {
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

function generateOnce(skill: SkillId, d: Difficulty, rng: Rng): Question {
  switch (skill) {
    case 'count5':
    case 'count10':
      return countQuestion(skill, d, rng)
    case 'numeral5':
    case 'numeral10':
      return numeralQuestion(skill, d, rng)
    case 'moreLess':
      return moreLessQuestion(d, rng)
    case 'size':
      return sizeQuestion(d, rng)
    case 'shapes':
      return shapesQuestion(d, rng)
    case 'sortColor':
      return sortColorQuestion(d, rng)
    case 'sortShape':
      return sortShapeQuestion(d, rng)
    case 'pattern':
      return patternQuestion(d, rng)
    case 'trace':
      return traceQuestion(d, rng)
  }
}

/** 生成一题；尽量不跟最近出过的题一样 */
export function generateQuestion(
  skill: SkillId,
  d: Difficulty,
  rng: Rng,
  recentSignatures: readonly string[] = [],
): Question {
  let q = generateOnce(skill, d, rng)
  for (let i = 0; i < 12 && recentSignatures.includes(q.signature); i++) {
    q = generateOnce(skill, d, rng)
  }
  return q
}
