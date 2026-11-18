import { describe, expect, it } from 'vitest'
import { generateQuestion } from '../generators'
import { seededRng } from '../rng'
import type { Difficulty } from '../types'
import { RECOLORABLE } from './common'
import { orderQuestion, sizeSteps, type OrderItem, type OrderQuestion } from './order'

const DIFFS: Difficulty[] = [1, 2, 3]
const SKILLS = ['orderSize', 'orderNumber'] as const
const N = 400

/** 每个难度要排几个 */
const COUNT: Record<(typeof SKILLS)[number], Record<Difficulty, number>> = {
  orderSize: { 1: 3, 2: 4, 3: 5 },
  orderNumber: { 1: 3, 2: 5, 3: 5 },
}

function many(skill: (typeof SKILLS)[number], d: Difficulty): OrderQuestion[] {
  const rng = seededRng((skill === 'orderSize' ? 1000 : 2000) + d * 17)
  return Array.from({ length: N }, () => orderQuestion(skill, d, rng))
}

const byRank = (q: OrderQuestion): OrderItem[] => [...q.items].sort((a, b) => a.rank - b.rank)
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('排顺序：每个难度都要遵守的规则', () => {
  for (const skill of SKILLS) {
    for (const d of DIFFS) {
      it(`${skill} 难度 ${d}：rank 刚好是 0..n-1、个数对`, () => {
        for (const q of many(skill, d)) {
          expect(q.engine).toBe('order')
          expect(q.skill).toBe(skill)
          expect(q.difficulty).toBe(d)
          expect(q.items.length).toBe(COUNT[skill][d])
          expect(q.items.map((i) => i.rank).sort((a, b) => a - b)).toEqual(range(COUNT[skill][d]))
          for (const it of q.items) {
            if (skill === 'orderSize') expect(it.item).toBeDefined()
            else expect(it.numeral).toBeDefined()
          }
        }
      })

      it(`${skill} 难度 ${d}：签名一样的题目，内容也一样`, () => {
        const seen = new Map<string, string>()
        for (const q of many(skill, d)) {
          const json = JSON.stringify(q)
          const prev = seen.get(q.signature)
          if (prev === undefined) seen.set(q.signature, json)
          else expect(json).toBe(prev)
        }
      })

      it(`${skill} 难度 ${d}：题目有变化，不会一直一样`, () => {
        const qs = many(skill, d)
        const signatures = new Set(qs.map((q) => q.signature))
        // 数字 1–3 只有 5 种打乱的方法（排好的那种不算）
        expect(signatures.size).toBeGreaterThanOrEqual(skill === 'orderNumber' && d === 1 ? 5 : 60)
        // 第一个要放的东西不会总是在同一个位置
        const firstPos = new Set(qs.map((q) => q.items.findIndex((i) => i.rank === 0)))
        if (!(skill === 'orderNumber' && d === 3)) expect(firstPos.size).toBe(COUNT[skill][d])
      })
    }
  }
})

describe('从小排到大（orderSize）', () => {
  for (const d of DIFFS) {
    it(`难度 ${d}：大小真的按照题目的方向一个一个变大/变小`, () => {
      for (const q of many('orderSize', d)) {
        const scales = byRank(q).map((o) => o.item!.scale!)
        const up = q.prompt.key === 'orderSmallToBig'
        expect(['orderSmallToBig', 'orderBigToSmall']).toContain(q.prompt.key)
        for (let r = 1; r < scales.length; r++) {
          if (up) expect(scales[r]).toBeGreaterThan(scales[r - 1])
          else expect(scales[r]).toBeLessThan(scales[r - 1])
          // 相邻两个要看得出差别（至少大 15%）
          const ratio = Math.max(scales[r], scales[r - 1]) / Math.min(scales[r], scales[r - 1])
          expect(ratio).toBeGreaterThanOrEqual(1.15)
        }
        for (const s of scales) {
          expect(s).toBeGreaterThanOrEqual(0.4)
          expect(s).toBeLessThanOrEqual(1)
        }
      }
    })

    it(`难度 ${d}：同一题的东西都是同一种、同一个颜色`, () => {
      for (const q of many('orderSize', d)) {
        const first = q.items[0].item!
        for (const o of q.items) {
          expect(o.item!.kind).toBe(first.kind)
          expect(o.item!.color).toBe(first.color)
        }
        // 只有可以换颜色的东西才换颜色（苹果、小猫、鸭子用原本的颜色）
        if (first.color !== undefined) expect(RECOLORABLE).toContain(first.kind)
      }
    })

    it(`难度 ${d}：下面的东西已经打乱（最多一个刚好在自己的位置上）`, () => {
      for (const q of many('orderSize', d)) expect(q.items.filter((o, i) => o.rank === i).length).toBeLessThanOrEqual(1)
    })
  }

  it('难度 1 一定是从小排到大；难度 2、3 两个方向都有', () => {
    expect(many('orderSize', 1).every((q) => q.prompt.key === 'orderSmallToBig')).toBe(true)
    for (const d of [2, 3] as const) {
      const keys = many('orderSize', d).map((q) => q.prompt.key)
      const up = keys.filter((k) => k === 'orderSmallToBig').length
      expect(up).toBeGreaterThan(N * 0.3)
      expect(up).toBeLessThan(N * 0.7)
    }
  })

  it('难度越高，大小越接近', () => {
    const minRatio = (d: Difficulty) => {
      const q = many('orderSize', d)[0]
      const scales = byRank(q)
        .map((o) => o.item!.scale!)
        .sort((a, b) => a - b)
      return Math.min(...scales.slice(1).map((v, i) => v / scales[i]))
    }
    expect(minRatio(1)).toBeGreaterThan(minRatio(2))
    expect(minRatio(2)).toBeGreaterThan(minRatio(3))
  })

  it('东西和颜色有变化', () => {
    const qs = [...many('orderSize', 1), ...many('orderSize', 3)]
    expect(new Set(qs.map((q) => q.items[0].item!.kind)).size).toBeGreaterThanOrEqual(8)
    expect(new Set(qs.map((q) => q.items[0].item!.color ?? 'default')).size).toBeGreaterThanOrEqual(6)
  })

  it('sizeSteps：从最小到 1，一直变大', () => {
    for (const [n, lo] of [
      [3, 0.45],
      [4, 0.42],
      [5, 0.5],
    ]) {
      const s = sizeSteps(n, lo)
      expect(s.length).toBe(n)
      expect(s[0]).toBe(lo)
      expect(s[n - 1]).toBe(1)
      for (let i = 1; i < n; i++) expect(s[i]).toBeGreaterThan(s[i - 1])
    }
  })
})

describe('数字排顺序（orderNumber）', () => {
  for (const d of DIFFS) {
    it(`难度 ${d}：数字是连续的，按照 rank 从小到大`, () => {
      for (const q of many('orderNumber', d)) {
        const nums = byRank(q).map((o) => o.numeral!)
        for (let r = 1; r < nums.length; r++) expect(nums[r]).toBe(nums[r - 1] + 1)
        expect(nums[0]).toBeGreaterThanOrEqual(1)
        expect(nums[nums.length - 1]).toBeLessThanOrEqual(10)
        if (d === 1) expect(nums).toEqual([1, 2, 3])
        if (d === 2) expect(nums).toEqual([1, 2, 3, 4, 5])
      }
    })
  }

  it('难度 1 有圆点提示，难度 2、3 没有', () => {
    expect(many('orderNumber', 1).every((q) => q.showDots === true)).toBe(true)
    expect(many('orderNumber', 2).some((q) => q.showDots)).toBe(false)
    expect(many('orderNumber', 3).some((q) => q.showDots)).toBe(false)
  })

  it('排顺序的题：全部要排，下面已经打乱', () => {
    for (const d of DIFFS) {
      for (const q of many('orderNumber', d)) {
        if (q.prompt.key !== 'orderNumbers') continue
        expect(q.given).toBeUndefined()
        expect(q.choices).toBeUndefined()
        expect(q.items.filter((o, i) => o.rank === i).length).toBeLessThanOrEqual(1)
      }
    }
  })

  it('难度 3 的排顺序不从 1 开始（跟难度 2 不一样），起点有变化', () => {
    const starts = new Set<number>()
    for (const q of many('orderNumber', 3)) {
      if (q.prompt.key !== 'orderNumbers') continue
      const first = byRank(q)[0].numeral!
      expect(first).toBeGreaterThanOrEqual(2)
      starts.add(first)
    }
    expect(starts.size).toBe(5)
  })

  it('只有难度 3 有"哪一个数字不见了"，而且两种题都常常出现', () => {
    for (const d of [1, 2] as const) {
      expect(many('orderNumber', d).every((q) => q.prompt.key === 'orderNumbers')).toBe(true)
    }
    const qs = many('orderNumber', 3)
    const missing = qs.filter((q) => q.prompt.key === 'missingNumber').length
    expect(missing).toBeGreaterThan(N * 0.3)
    expect(missing).toBeLessThan(N * 0.7)
  })

  it('不见的数字：至少放好一个、不会全部放好，大部分已经放好', () => {
    let oneGap = 0
    let twoGaps = 0
    for (const q of many('orderNumber', 3)) {
      if (q.prompt.key !== 'missingNumber') continue
      const n = q.items.length
      const given = q.given!
      expect(given).toBeDefined()
      expect(given.length).toBeGreaterThanOrEqual(1)
      expect(given.length).toBeLessThan(n)
      // "大部分格子已经放好"
      expect(given.length).toBeGreaterThan(n / 2)
      expect(new Set(given).size).toBe(given.length)
      for (const r of given) expect(r >= 0 && r < n).toBe(true)
      // 第一个一定看得到（不用往回数）
      expect(given).toContain(0)
      if (n - given.length === 1) oneGap++
      else twoGaps++
    }
    expect(oneGap).toBeGreaterThan(0)
    expect(twoGaps).toBeGreaterThan(0)
  })

  it('不见的数字：下面的选择包括每个不见的数字，干扰的数字不在这一排里面', () => {
    const answers = new Set<string>()
    for (const q of many('orderNumber', 3)) {
      if (q.prompt.key !== 'missingNumber') continue
      const nums = byRank(q).map((o) => o.numeral!)
      const missing = byRank(q)
        .filter((o) => !q.given!.includes(o.rank))
        .map((o) => o.numeral!)
      const choices = q.choices!
      expect(choices.length).toBe(3)
      expect(new Set(choices).size).toBe(choices.length)
      for (const m of missing) expect(choices).toContain(m)
      for (const c of choices) {
        expect(c >= 1 && c <= 10).toBe(true)
        if (!missing.includes(c)) expect(nums).not.toContain(c)
      }
      answers.add(missing.join(','))
    }
    // 不见的数字有变化
    expect(answers.size).toBeGreaterThanOrEqual(10)
  })

  it('不见的数字：答案在下面的位置有变化', () => {
    const positions = new Set<number>()
    for (const q of many('orderNumber', 3)) {
      if (q.prompt.key !== 'missingNumber' || q.given!.length !== 4) continue
      const missing = byRank(q).find((o) => !q.given!.includes(o.rank))!.numeral!
      positions.add(q.choices!.indexOf(missing))
    }
    expect(positions.size).toBe(3)
  })
})

describe('避免重复', () => {
  for (const skill of SKILLS) {
    it(`${skill}：最近出过的题不会马上再出`, () => {
      const rng = seededRng(42)
      const recent: string[] = []
      let repeats = 0
      for (let i = 0; i < 60; i++) {
        const q = generateQuestion(skill, (1 + (i % 3)) as Difficulty, rng, recent)
        if (recent.includes(q.signature)) repeats++
        recent.push(q.signature)
        if (recent.length > 5) recent.shift()
      }
      expect(repeats).toBe(0)
    })
  }
})
