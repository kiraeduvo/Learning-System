// 位置（Kedudukan）：上面、下面、里面、外面、旁边、前面、后面
// （先放一个简单可用的版本；完整版由负责这个游戏的 agent 完成）

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
}

export function positionQuestion(d: Difficulty, rng: Rng): PositionQuestion {
  const kind: ObjectKind = pick(rng, ['cat', 'ball', 'duck'] as ObjectKind[])
  const ref: RefKind = 'box'
  const options = shuffle(rng, ['on', 'under'] as Position[])
  const answer = pick(rng, options)
  return {
    engine: 'position',
    skill: 'position',
    difficulty: d,
    signature: `position:pick:${kind}:${ref}:${options.join(',')}:${answer}`,
    prompt: { key: 'whereIs', pos: answer, kind, ref },
    mode: 'pick',
    kind,
    ref,
    options,
    answer,
  }
}
