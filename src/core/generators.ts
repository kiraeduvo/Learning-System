// 题目生成器：每个技能一个，难度 1–3。题目是随机生成的，所以可以一直练、不会练完。
// 每个游戏的生成器放在 games/ 里自己的文件。

import type { Rng } from './rng'
import type { Difficulty, Question, SkillId } from './types'
import { arithQuestion } from './games/arith'
import { moreLessQuestion, sizeQuestion } from './games/compare'
import { countQuestion } from './games/count'
import { matchQuestion } from './games/match'
import { numeralQuestion } from './games/numeral'
import { orderQuestion } from './games/order'
import { patternQuestion } from './games/pattern'
import { positionQuestion } from './games/position'
import { shapesQuestion } from './games/shapes'
import { sortColorQuestion, sortShapeQuestion } from './games/sort'
import { traceQuestion } from './games/trace'

export { numberOptions, OBJECTS, RECOLORABLE } from './games/common'

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
    case 'orderSize':
    case 'orderNumber':
      return orderQuestion(skill, d, rng)
    case 'matchNumber':
      return matchQuestion(d, rng)
    case 'position':
      return positionQuestion(d, rng)
    case 'addition':
    case 'subtraction':
      return arithQuestion(skill, d, rng)
  }
}

/**
 * 用来判断"是不是同一题"的 key：
 * 加减法只看算式（4 − 2 换成别的东西，孩子还是觉得是同一题），其他游戏看 signature。
 */
export function repeatKey(q: Question): string {
  return q.engine === 'arith' ? `${q.skill}:${q.a}${q.op}${q.b}` : q.signature
}

/** 最近出过吗？recent 里可以是 repeatKey，也可以是完整的 signature */
function seenRecently(q: Question, recent: readonly string[]): boolean {
  const key = repeatKey(q)
  return recent.some((s) => s === key || (q.engine === 'arith' && s.startsWith(`${key}:`)))
}

/** 生成一题；尽量不跟最近出过的题一样 */
export function generateQuestion(
  skill: SkillId,
  d: Difficulty,
  rng: Rng,
  recent: readonly string[] = [],
): Question {
  let q = generateOnce(skill, d, rng)
  for (let i = 0; i < 12 && seenRecently(q, recent); i++) {
    q = generateOnce(skill, d, rng)
  }
  return q
}
