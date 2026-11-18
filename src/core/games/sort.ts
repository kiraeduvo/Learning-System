// 按颜色分类、按形状分类

import { pick, sample, shuffle, type Rng } from '../rng'
import type { Difficulty, ShapeKind, SortQuestion } from '../types'
import { ALL_COLORS, CLEAR_COLORS, MORE_COLORS, RECOLORABLE, shapeItem } from './common'

export function sortColorQuestion(d: Difficulty, rng: Rng): SortQuestion {
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

export function sortShapeQuestion(d: Difficulty, rng: Rng): SortQuestion {
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
