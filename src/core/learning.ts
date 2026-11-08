// 学习流程：掌握度、自动调难度、开放新技能、每次练习选哪些技能

import { SKILLS, SKILL_BY_ID, type SkillDef } from './skills'
import type { Rng } from './rng'
import type { QuestionResult, SkillId, SkillProgress } from './types'

/** 每一题对掌握度的影响（越大变化越快） */
export const ALPHA = 0.25
const DAY = 24 * 60 * 60 * 1000

export function emptyProgress(): SkillProgress {
  return { attempts: 0, firstTryCorrect: 0, score: 0, difficulty: 1, streak: 0, wrongStreak: 0, lastPracticed: 0 }
}

/** 做完一题后更新这个技能的进度 */
export function applyResult(prev: SkillProgress | undefined, r: QuestionResult, now: number): SkillProgress {
  const p = prev ?? emptyProgress()
  const score = p.score * (1 - ALPHA) + r.score * ALPHA
  let streak = r.firstTry ? p.streak + 1 : 0
  let wrongStreak = r.firstTry ? 0 : r.score === 0 ? p.wrongStreak + 1 : p.wrongStreak
  let difficulty = p.difficulty
  // 连续 3 题第一次就对 → 升级；连续 2 题错很多 → 降级
  if (streak >= 3 && difficulty < 3) {
    difficulty = (difficulty + 1) as SkillProgress['difficulty']
    streak = 0
  }
  if (wrongStreak >= 2 && difficulty > 1) {
    difficulty = (difficulty - 1) as SkillProgress['difficulty']
    wrongStreak = 0
  }
  return {
    attempts: p.attempts + 1,
    firstTryCorrect: p.firstTryCorrect + (r.firstTry ? 1 : 0),
    score,
    difficulty,
    streak,
    wrongStreak,
    lastPracticed: now,
  }
}

/** 0 未开始 · 1 刚开始 · 2 进步中 · 3 掌握了 */
export type MasteryLevel = 0 | 1 | 2 | 3

export function masteryLevel(p: SkillProgress | undefined): MasteryLevel {
  if (!p || p.attempts === 0) return 0
  if (p.score >= 0.85 && p.attempts >= 8 && p.difficulty === 3) return 3
  if (p.score >= 0.5) return 2
  return 1
}

export const MASTERY_LABEL_ZH: Record<MasteryLevel, string> = {
  0: '未开始',
  1: '刚开始',
  2: '进步中',
  3: '掌握了',
}

type ProgressMap = Partial<Record<SkillId, SkillProgress>>

/** 前置技能练到一定程度，就开放这个技能 */
export function isUnlocked(skill: SkillDef, progress: ProgressMap, unlockAll: boolean): boolean {
  if (unlockAll) return true
  return skill.prerequisites.every((id) => {
    const p = progress[id]
    return !!p && p.attempts >= 5 && p.score >= 0.6
  })
}

export function unlockedSkills(progress: ProgressMap, unlockAll: boolean): SkillDef[] {
  return SKILLS.filter((s) => isUnlocked(s, progress, unlockAll))
}

/** 选技能的权重：还没学会的比较常出现，学会了的偶尔复习，很久没练的加分 */
export function skillWeight(p: SkillProgress | undefined, now: number): number {
  if (!p || p.attempts === 0) return 1.6
  const base = masteryLevel(p) === 3 ? 0.35 : 1.2 - p.score
  const days = p.lastPracticed ? Math.min((now - p.lastPracticed) / DAY, 7) : 7
  return base * (1 + days * 0.1)
}

function weightedPick<T>(rng: Rng, items: T[], weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return items.length - 1
}

export interface PlanOptions {
  questionsPerSession: number
  unlockAll: boolean
  now: number
  rng: Rng
  /** 只玩某一个游戏 */
  focusSkill?: SkillId
}

/**
 * 安排这次练习：返回每一题是哪个技能（题目本身做到那一题时才生成，这样可以用最新的难度）。
 * 一次选 3 个技能左右，同一个技能连着出几题，小小孩比较不会乱。
 */
export function planSession(progress: ProgressMap, opts: PlanOptions): SkillId[] {
  const n = Math.max(1, opts.questionsPerSession)
  if (opts.focusSkill) {
    const def = SKILL_BY_ID[opts.focusSkill]
    const len = def.maxPerSession ? Math.min(n, 4) : n
    return Array.from({ length: len }, () => opts.focusSkill as SkillId)
  }

  const candidates = unlockedSkills(progress, opts.unlockAll)
  const pool = [...candidates]
  const weights = pool.map((s) => skillWeight(progress[s.id], opts.now))
  const chosen: SkillDef[] = []
  const k = Math.min(3, pool.length)
  let newPicked = false
  while (chosen.length < k && pool.length > 0) {
    const idx = weightedPick(opts.rng, pool, weights)
    const skill = pool[idx]
    pool.splice(idx, 1)
    weights.splice(idx, 1)
    const isNew = !progress[skill.id] || progress[skill.id]!.attempts === 0
    // 每次最多介绍一个新技能（除非全部都是新的）
    const hasPracticedLeft = pool.some((s) => (progress[s.id]?.attempts ?? 0) > 0)
    if (isNew && newPicked && hasPracticedLeft) continue
    if (isNew) newPicked = true
    chosen.push(skill)
  }

  // 分配题数：平均分，比较花时间的题型有上限，多出来的给其他技能
  const counts = chosen.map(() => 0)
  let remaining = n
  let guard = 0
  while (remaining > 0 && guard++ < 1000) {
    let placed = false
    for (let i = 0; i < chosen.length && remaining > 0; i++) {
      const cap = chosen[i].maxPerSession ?? Infinity
      if (counts[i] < cap) {
        counts[i]++
        remaining--
        placed = true
      }
    }
    if (!placed) break
  }

  // 先做比较有把握的（热身），再做比较难的
  const order = chosen
    .map((s, i) => ({ s, count: counts[i], score: progress[s.id]?.score ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.score - a.score)

  return order.flatMap((x) => Array.from({ length: x.count }, () => x.s.id))
}
