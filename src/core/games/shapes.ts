// 认识形状

import { pick, sample, shuffle, type Rng } from '../rng'
import type { ChoiceQuestion, Difficulty, ShapeKind } from '../types'
import { ALL_COLORS, shapeItem } from './common'

export function shapesQuestion(d: Difficulty, rng: Rng): ChoiceQuestion {
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
