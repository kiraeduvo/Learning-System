// 贴纸册：每完成一次练习得到一张新贴纸

import type { Rng } from './rng'
import type { ColorName, ObjectKind } from './types'

export interface StickerDef {
  id: string
  kind: ObjectKind
  color?: ColorName
  bg: string
}

const BGS = ['#FFE3E3', '#E3F0FF', '#FFF4CC', '#E2F7E8', '#F1E6FF', '#FFE9D6']

const COMBOS: [ObjectKind, ColorName | undefined][] = [
  ['apple', undefined],
  ['duck', undefined],
  ['cat', undefined],
  ['star', undefined],
  ['fish', 'orange'],
  ['ball', 'red'],
  ['balloon', 'pink'],
  ['car', 'blue'],
  ['flower', 'purple'],
  ['fish', 'blue'],
  ['ball', 'green'],
  ['balloon', 'yellow'],
  ['car', 'red'],
  ['flower', 'red'],
  ['star', 'pink'],
  ['fish', 'green'],
  ['ball', 'purple'],
  ['balloon', 'blue'],
  ['car', 'yellow'],
  ['flower', 'orange'],
  ['star', 'blue'],
  ['fish', 'purple'],
  ['balloon', 'green'],
  ['car', 'green'],
]

export const STICKERS: StickerDef[] = COMBOS.map(([kind, color], i) => ({
  id: `${kind}-${color ?? 'base'}`,
  kind,
  color,
  bg: BGS[i % BGS.length],
}))

/** 随机拿一张还没有的贴纸；全部集齐了就返回 null */
export function pickNewSticker(owned: readonly string[], rng: Rng): StickerDef | null {
  const left = STICKERS.filter((s) => !owned.includes(s.id))
  if (left.length === 0) return null
  return left[Math.floor(rng() * left.length)]
}
