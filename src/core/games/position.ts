// 位置（Kedudukan）：上面、下面、里面、外面、旁边、前面、后面
//
// 两种玩法：
//   pick（哪一只小猫在箱子上面？）：几张图，参考的东西一样、在同一个地方，东西放的位置不一样，点对的那一张
//   place（把小猫放到箱子上面）：一个大画面，参考的东西旁边有几个空位，把东西拖到对的空位
//                               （也可以先点东西再点空位，或者直接点空位）
//
// 难度 1：pick，2 张图，差很多的一对：上面/下面（箱子），里面/外面（箱子、篮子）
// 难度 2：pick 3 张图，或 place 2–3 个空位；加上"旁边"，也会用桌子（上面、下面、旁边）
// 难度 3：pick 或 place，3–4 个；加上"前面"（挡在参考的东西前面）、"后面"（躲在后面，只露出一部分），
//         每一题至少有一个"前面"或"后面"
//
// 只出画得清楚、只有一个答案的组合：
//   - 桌子：上面、下面、旁边（没有里面外面；前面、后面跟"下面"画出来分不清楚）
//   - 篮子是开着的：没有"上面"
//   - 箱子：题目有"里面"就画开着的箱子，没有就画盖着的箱子（才可以坐在上面）；"上面"和"里面"不一起出
//   - "外面"只跟"里面"一对出：在上面、旁边、前面……其实也都在外面，一起出会有两个答案
//   - "后面"画成从旁边探出头（一部分被挡住），也算在旁边，所以"旁边"和"后面"不一起出

import { pick, shuffle, type Rng } from '../rng'
import type { BaseQuestion, Difficulty, ObjectKind, Position, RefKind } from '../types'

export interface PositionQuestion extends BaseQuestion {
  engine: 'position'
  /** pick：选东西在对的位置的那张图；place：把东西放到对的位置 */
  mode: 'pick' | 'place'
  /** 要找 / 要放的东西 */
  kind: ObjectKind
  /** 参考的东西（箱子、桌子、篮子） */
  ref: RefKind
  /** pick：每张图里东西的位置；place：可以放的位置 */
  options: Position[]
  /** 对的位置 */
  answer: Position
  /** 旁边、外面放在参考的东西哪一边，"后面"从哪一边探出头。没有这些位置的题不写 */
  side?: 'left' | 'right'
}

/** 位置题用的东西：可爱、一看就认得，放在箱子里、桌子上都合理 */
export const POSITION_KINDS: ObjectKind[] = ['cat', 'duck', 'ball', 'apple', 'star', 'car', 'flower']

/** 每种参考的东西可以用的位置 */
export const REF_POSITIONS: Record<RefKind, readonly Position[]> = {
  box: ['on', 'under', 'in', 'outside', 'nextTo', 'front', 'behind'],
  basket: ['under', 'in', 'outside', 'nextTo', 'front', 'behind'],
  table: ['on', 'under', 'nextTo'],
}

/** 有这些位置的题要决定放哪一边 */
export const SIDED: readonly Position[] = ['nextTo', 'outside', 'behind']

/** 箱子要不要画成开着的（看得到里面）：题目里有"里面"或"外面"就开着 */
export function boxIsOpen(options: readonly Position[]): boolean {
  return options.includes('in') || options.includes('outside')
}

/** 这一组位置能不能一起出：每个位置都画得出来，而且不会有两张图（两个空位）都对 */
export function isSensible(ref: RefKind, options: readonly Position[]): boolean {
  if (new Set(options).size !== options.length || options.length < 2) return false
  if (!options.every((p) => REF_POSITIONS[ref].includes(p))) return false
  // 外面：只跟里面一对
  if (options.includes('outside') && (options.length !== 2 || !options.includes('in'))) return false
  // 箱子：开着的才有里面，盖着的才可以坐在上面
  if (ref === 'box' && options.includes('on') && options.includes('in')) return false
  // 从旁边探出头的"后面"也在旁边
  if (options.includes('nextTo') && options.includes('behind')) return false
  return true
}

interface Level {
  refs: RefKind[]
  /** 这个难度可以用的位置 */
  positions: Position[]
}

const LEVELS: Record<Difficulty, Level> = {
  1: { refs: ['box', 'basket'], positions: ['on', 'under', 'in', 'outside'] },
  2: { refs: ['box', 'basket', 'table'], positions: ['on', 'under', 'in', 'outside', 'nextTo'] },
  // 桌子没有前面、后面，难度 3 每一题都要有其中一个，所以不用桌子
  3: { refs: ['box', 'basket'], positions: ['on', 'under', 'in', 'nextTo', 'front', 'behind'] },
}

/** 难度 1 只出差很多的一对 */
const EASY_PAIRS: Position[][] = [
  ['on', 'under'],
  ['in', 'outside'],
]

/** list 里拿 n 个的所有组合（照 list 的顺序） */
function combinations<T>(list: readonly T[], n: number): T[][] {
  if (n === 0) return [[]]
  if (list.length < n) return []
  const [first, ...rest] = list
  return [...combinations(rest, n - 1).map((c) => [first, ...c]), ...combinations(rest, n)]
}

/** 这个难度、这个参考的东西、这么多个选项：可以出的位置组合 */
export function positionSets(d: Difficulty, ref: RefKind, n: number): Position[][] {
  if (d === 1) return n === 2 ? EASY_PAIRS.filter((set) => isSensible(ref, set)) : []
  const pool = LEVELS[d].positions.filter((p) => REF_POSITIONS[ref].includes(p))
  return combinations(pool, n).filter(
    (set) => isSensible(ref, set) && (d !== 3 || set.includes('front') || set.includes('behind')),
  )
}

/** 每个难度：玩法和几个选项 */
function pickShape(d: Difficulty, rng: Rng): { mode: PositionQuestion['mode']; n: number } {
  if (d === 1) return { mode: 'pick', n: 2 }
  if (d === 2) return rng() < 0.5 ? { mode: 'pick', n: 3 } : { mode: 'place', n: rng() < 0.5 ? 2 : 3 }
  return { mode: rng() < 0.5 ? 'pick' : 'place', n: rng() < 0.5 ? 3 : 4 }
}

export function positionQuestion(d: Difficulty, rng: Rng): PositionQuestion {
  const { mode, n } = pickShape(d, rng)
  // 先选参考的东西；万一这个东西没有这么多个选项的组合（现在不会发生），换下一个
  const refs = shuffle(rng, LEVELS[d].refs)
  let ref = refs[0]
  let sets = positionSets(d, ref, n)
  for (const r of refs.slice(1)) {
    if (sets.length > 0) break
    ref = r
    sets = positionSets(d, r, n)
  }
  const options = shuffle(rng, pick(rng, sets))
  const answer = pick(rng, options)
  const kind = pick(rng, POSITION_KINDS)
  const side: PositionQuestion['side'] = options.some((p) => SIDED.includes(p))
    ? pick(rng, ['left', 'right'] as const)
    : undefined
  const prompt =
    mode === 'pick'
      ? ({ key: 'whereIs', pos: answer, kind, ref } as const)
      : ({ key: 'putIt', pos: answer, kind, ref } as const)
  return {
    engine: 'position',
    skill: 'position',
    difficulty: d,
    // 玩法、东西、参考的东西、选项的顺序、答案（还有放哪一边）全部一样才算同一题
    signature: `position:${mode}:${kind}:${ref}:${options.join(',')}:${answer}${side ? `:${side}` : ''}`,
    prompt,
    mode,
    kind,
    ref,
    options,
    answer,
    ...(side ? { side } : {}),
  }
}
