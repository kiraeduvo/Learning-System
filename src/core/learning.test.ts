import { describe, expect, it } from 'vitest'
import { applyResult, emptyProgress, isUnlocked, masteryLevel, planSession } from './learning'
import { seededRng } from './rng'
import { SKILL_BY_ID } from './skills'
import type { SkillId, SkillProgress } from './types'

const NOW = new Date('2026-11-08T10:00:00').getTime()
const right = { skill: 'count5' as const, score: 1, firstTry: true }
const wrong = { skill: 'count5' as const, score: 0, firstTry: false }

describe('applyResult', () => {
  it('连续答对 3 题升级难度', () => {
    let p: SkillProgress | undefined
    for (let i = 0; i < 3; i++) p = applyResult(p, right, NOW)
    expect(p!.difficulty).toBe(2)
    expect(p!.attempts).toBe(3)
    expect(p!.firstTryCorrect).toBe(3)
  })

  it('连续错 2 题降级难度，但不低于 1', () => {
    let p: SkillProgress = { ...emptyProgress(), difficulty: 2 }
    p = applyResult(p, wrong, NOW)
    p = applyResult(p, wrong, NOW)
    expect(p.difficulty).toBe(1)
    p = applyResult(p, wrong, NOW)
    p = applyResult(p, wrong, NOW)
    expect(p.difficulty).toBe(1)
  })

  it('一直答对最后会"掌握了"', () => {
    let p: SkillProgress | undefined
    for (let i = 0; i < 20; i++) p = applyResult(p, right, NOW)
    expect(masteryLevel(p)).toBe(3)
  })

  it('没练过是"未开始"', () => {
    expect(masteryLevel(undefined)).toBe(0)
  })
})

describe('isUnlocked', () => {
  it('没有前置技能的一开始就开放', () => {
    expect(isUnlocked(SKILL_BY_ID.count5, {}, false)).toBe(true)
    expect(isUnlocked(SKILL_BY_ID.numeral5, {}, false)).toBe(false)
  })

  it('前置技能练好了就开放', () => {
    let p: SkillProgress | undefined
    for (let i = 0; i < 6; i++) p = applyResult(p, right, NOW)
    expect(isUnlocked(SKILL_BY_ID.numeral5, { count5: p }, false)).toBe(true)
  })

  it('家长可以全部解锁', () => {
    expect(isUnlocked(SKILL_BY_ID.numeral10, {}, true)).toBe(true)
  })
})

describe('planSession', () => {
  it('题数正确，只用开放了的技能', () => {
    for (let seed = 0; seed < 50; seed++) {
      const plan = planSession({}, { questionsPerSession: 8, unlockAll: false, now: NOW, rng: seededRng(seed) })
      expect(plan.length).toBe(8)
      for (const id of plan) expect(isUnlocked(SKILL_BY_ID[id], {}, false)).toBe(true)
    }
  })

  it('花时间的题型（描红、分类）每次不超过上限', () => {
    for (let seed = 0; seed < 100; seed++) {
      const plan = planSession({}, { questionsPerSession: 10, unlockAll: true, now: NOW, rng: seededRng(seed) })
      const count = (id: SkillId) => plan.filter((x) => x === id).length
      expect(count('trace')).toBeLessThanOrEqual(2)
      expect(count('sortColor')).toBeLessThanOrEqual(2)
      expect(count('sortShape')).toBeLessThanOrEqual(2)
    }
  })

  it('同一个技能的题连在一起', () => {
    const plan = planSession({}, { questionsPerSession: 8, unlockAll: false, now: NOW, rng: seededRng(1) })
    const blocks = plan.filter((id, i) => i === 0 || plan[i - 1] !== id).length
    expect(blocks).toBeLessThanOrEqual(3)
  })

  it('只玩某一个游戏', () => {
    const plan = planSession(
      {},
      { questionsPerSession: 8, unlockAll: false, now: NOW, rng: seededRng(1), focusSkill: 'shapes' },
    )
    expect(plan).toEqual(Array(8).fill('shapes'))
    const trace = planSession(
      {},
      { questionsPerSession: 8, unlockAll: true, now: NOW, rng: seededRng(1), focusSkill: 'trace' },
    )
    expect(trace.length).toBe(4)
  })
})
