import { describe, expect, it } from 'vitest'
import { layoutMatch, MATCH_SPACING, type MatchLayout } from '../../engines/MatchEngine'
import { generateQuestion } from '../generators'
import { promptText } from '../i18n'
import { seededRng } from '../rng'
import type { Difficulty, Lang } from '../types'
import { OBJECTS, RECOLORABLE } from './common'
import { MATCH_RANGE, matchQuestion, type MatchQuestion } from './match'

const DIFFS: Difficulty[] = [1, 2, 3]
const LANGS: Lang[] = ['zh', 'ms', 'en']
const N = 400

/** 用固定的种子出 N 题 */
function batch(d: Difficulty, seed = 1000 + d): MatchQuestion[] {
  const rng = seededRng(seed)
  return Array.from({ length: N }, () => matchQuestion(d, rng))
}

const sorted = (list: number[]) => [...list].sort((a, b) => a - b)

describe('数字配对 matchQuestion', () => {
  for (const d of DIFFS) {
    describe(`难度 ${d}`, () => {
      const qs = batch(d)
      const { min, max } = MATCH_RANGE[d]

      it('题目的基本资料正确', () => {
        for (const q of qs) {
          expect(q.engine).toBe('match')
          expect(q.skill).toBe('matchNumber')
          expect(q.difficulty).toBe(d)
          expect(q.prompt).toEqual({ key: 'matchNumbers' })
          for (const lang of LANGS) expect(promptText(q.prompt, lang).length).toBeGreaterThan(2)
        }
      })

      it('堆数对这个难度', () => {
        const sizes = new Set(qs.map((q) => q.groups.length))
        if (d === 1) expect([...sizes]).toEqual([2])
        if (d === 2) expect([...sizes]).toEqual([3])
        if (d === 3) expect(sorted([...sizes])).toEqual([3, 4])
      })

      it(`数量不重复，都在 ${min}–${max} 之间`, () => {
        for (const q of qs) {
          expect(new Set(q.groups).size).toBe(q.groups.length)
          for (const g of q.groups) {
            expect(Number.isInteger(g)).toBe(true)
            expect(g).toBeGreaterThanOrEqual(min)
            expect(g).toBeLessThanOrEqual(max)
          }
        }
        // 范围里的每个数都会出现
        const seen = new Set(qs.flatMap((q) => q.groups))
        for (let v = min; v <= max; v++) expect(seen.has(v)).toBe(true)
      })

      it('数字卡刚好是每一堆的数量（打乱的）', () => {
        for (const q of qs) {
          expect(q.numerals).toHaveLength(q.groups.length)
          expect(sorted(q.numerals)).toEqual(sorted(q.groups))
        }
      })

      it('同一题用同一种东西，换颜色的只有可以换颜色的东西', () => {
        for (const q of qs) {
          expect(OBJECTS).toContain(q.item.kind)
          if (q.item.color !== undefined) expect(RECOLORABLE).toContain(q.item.kind)
          expect(q.item.scale ?? 1).toBe(1)
        }
        // 有原来颜色的，也有换颜色的
        expect(qs.some((q) => q.item.color === undefined)).toBe(true)
        expect(qs.some((q) => q.item.color !== undefined)).toBe(true)
        expect(new Set(qs.map((q) => q.item.kind)).size).toBe(OBJECTS.length)
      })

      it('题目有变化：数量、顺序、数字卡顺序都不会一直一样', () => {
        const sets = new Set(qs.map((q) => sorted(q.groups).join(',')))
        const orders = new Set(qs.map((q) => q.groups.join(',')))
        const numeralOrders = new Set(qs.map((q) => q.numerals.join(',')))
        expect(sets.size).toBeGreaterThanOrEqual(3)
        expect(orders.size).toBeGreaterThan(sets.size)
        expect(numeralOrders.size).toBeGreaterThan(sets.size)
        // 每一堆不是永远从少排到多
        const ascending = qs.filter((q) => q.groups.join(',') === sorted(q.groups).join(',')).length
        expect(ascending).toBeLessThan(N * 0.6)
        // 第一堆不会老是同一个数量
        const firsts = new Set(qs.map((q) => q.groups[0]))
        expect(firsts.size).toBe(max - min + 1)
      })

      it('signature 会变，而且能分辨题目（东西、数量、顺序）', () => {
        const sigs = qs.map((q) => q.signature)
        // 难度 1 本来就只有 6 种顺序 × 2 种数字卡顺序 × 几十种东西
        expect(new Set(sigs).size).toBeGreaterThan(N / 3)
        let sameAsPrev = 0
        for (let i = 1; i < sigs.length; i++) if (sigs[i] === sigs[i - 1]) sameAsPrev++
        expect(sameAsPrev).toBeLessThan(N * 0.05)
        // 同一个 signature 一定是同一题
        const bySig = new Map<string, MatchQuestion>()
        for (const q of qs) {
          const prev = bySig.get(q.signature)
          if (prev) {
            expect(q.item).toEqual(prev.item)
            expect(q.groups).toEqual(prev.groups)
            expect(q.numerals).toEqual(prev.numerals)
            expect(q.layout).toEqual(prev.layout)
          } else bySig.set(q.signature, q)
        }
        for (const q of qs) {
          expect(q.signature.startsWith('matchNumber:')).toBe(true)
          expect(q.signature).toContain(q.item.kind)
          expect(q.signature).toContain(q.groups.join(','))
        }
      })

      it('同样的种子出同样的题', () => {
        expect(batch(d, 77)).toEqual(batch(d, 77))
        expect(batch(d, 77).map((q) => q.signature)).not.toEqual(batch(d, 78).map((q) => q.signature))
      })
    })
  }

  it('难度 1、2 都排整齐；难度 3 有整齐也有散开', () => {
    for (const d of [1, 2] as Difficulty[]) for (const q of batch(d)) expect(q.layout ?? 'rows').toBe('rows')
    const layouts = batch(3).map((q) => q.layout)
    const scatter = layouts.filter((l) => l === 'scatter').length
    expect(scatter).toBeGreaterThan(N * 0.3)
    expect(scatter).toBeLessThan(N * 0.7)
    expect(layouts.every((l) => l === 'rows' || l === 'scatter')).toBe(true)
  })

  it('难度 2 至少有一堆要数到 4 或 5', () => {
    for (const q of batch(2)) expect(Math.max(...q.groups)).toBeGreaterThanOrEqual(4)
  })

  it('难度 3 三堆的时候，至少两堆有 4 个以上；四堆、三堆都有散开的', () => {
    const qs = batch(3)
    for (const q of qs) if (q.groups.length === 3) expect(q.groups.filter((g) => g >= 4).length).toBeGreaterThanOrEqual(2)
    for (const n of [3, 4]) {
      expect(qs.some((q) => q.groups.length === n && q.layout === 'scatter')).toBe(true)
      expect(qs.some((q) => q.groups.length === n && q.layout === 'rows')).toBe(true)
    }
  })

  it('三堆以上：数字卡不会刚好跟每一堆的顺序一样', () => {
    for (const d of [2, 3] as Difficulty[]) {
      for (const q of batch(d)) expect(q.numerals.join(',')).not.toBe(q.groups.join(','))
    }
    // 两堆的时候两种顺序都会有（不然孩子会发现"永远是交叉的"）
    const two = batch(1)
    const same = two.filter((q) => q.numerals.join(',') === q.groups.join(',')).length
    expect(same).toBeGreaterThan(N * 0.3)
    expect(same).toBeLessThan(N * 0.7)
  })

  it('generateQuestion 会避开最近出过的题', () => {
    for (const d of DIFFS) {
      const rng = seededRng(40 + d)
      const recent: string[] = []
      let repeats = 0
      for (let i = 0; i < 300; i++) {
        const q = generateQuestion('matchNumber', d, rng, recent)
        expect(q.engine).toBe('match')
        if (recent.includes(q.signature)) repeats++
        recent.push(q.signature)
        if (recent.length > 5) recent.shift()
      }
      expect(repeats).toBe(0)
    }
  })
})

/** 引擎可以用的大小（在真的画面上量的 .engine-wrap：画面减掉上面的按钮、题目那一行） */
const BOXES: Record<string, [number, number]> = {
  '手机直放 390×844': [358, 682],
  '平板横放 1280×800': [1248, 638],
  'Android 412×915': [380, 753],
  '小手机 360×640': [328, 478],
  '平板直放 800×1280': [768, 1118],
  'iPad 横放 1024×768': [992, 606],
  '手机横放 844×390': [812, 228],
}

/** 检查一种排法：整个放得下、按得到、卡片里面放得下、东西不叠在一起 */
function checkLayout(L: MatchLayout, q: MatchQuestion, [bw, bh]: [number, number]) {
  const S = MATCH_SPACING
  const n = q.groups.length
  const rows = Math.ceil(n / L.cols)
  // 整个画面
  expect(L.cols * L.cardW + (L.cols - 1) * S.gap).toBeLessThanOrEqual(bw)
  expect(n * L.numeral + (n - 1) * S.numGap).toBeLessThanOrEqual(bw)
  const height = S.rowTop + L.numeral + S.rowBottom + S.engineGap + rows * L.cardH + (rows - 1) * S.gap + S.shadow
  expect(height).toBeLessThanOrEqual(bh)
  // 小手指按得到
  expect(L.numeral).toBeGreaterThanOrEqual(64)
  expect(Math.min(L.cardW, L.cardH)).toBeGreaterThanOrEqual(64)
  // 卡片里面：数字格子 + 东西
  const innerW = L.cardW - 2 * S.pad
  const innerH = L.cardH - 2 * S.pad
  if (L.slotSide === 'left') {
    expect(L.slot + S.inner + L.areaW).toBeLessThanOrEqual(innerW + 0.5)
    expect(Math.max(L.slot, L.areaH)).toBeLessThanOrEqual(innerH + 0.5)
  } else {
    expect(Math.max(L.slot, L.areaW)).toBeLessThanOrEqual(innerW + 0.5)
    expect(L.slot + S.inner + L.areaH).toBeLessThanOrEqual(innerH + 0.5)
  }
  expect(L.item).toBeLessThanOrEqual(L.cell)
  // 每一堆：个数对、都在区域里面、不叠在一起
  const scatter = q.layout === 'scatter'
  L.spots.forEach((spots, gi) => {
    expect(spots).toHaveLength(q.groups[gi])
    for (const s of spots) {
      expect(s.x - L.item / 2).toBeGreaterThanOrEqual(-0.01)
      expect(s.y - L.item / 2).toBeGreaterThanOrEqual(-0.01)
      expect(s.x + L.item / 2).toBeLessThanOrEqual(L.areaW + 0.01)
      expect(s.y + L.item / 2).toBeLessThanOrEqual(L.areaH + 0.01)
      if (!scatter) expect(s.rot).toBe(0)
    }
    for (let i = 0; i < spots.length; i++)
      for (let j = i + 1; j < spots.length; j++)
        expect(Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y)).toBeGreaterThanOrEqual(
          L.item * (scatter ? 0.9 : 1) - 0.01,
        )
  })
}

describe('数字配对排版 layoutMatch', () => {
  for (const [name, box] of Object.entries(BOXES)) {
    it(`${name}：每种题都放得下，东西不会叠在一起`, () => {
      for (const d of DIFFS) {
        for (const q of batch(d).slice(0, 150)) {
          checkLayout(layoutMatch(box[0], box[1], q.groups, q.layout === 'scatter', q.signature), q, box)
        }
      }
    })
  }

  it('主要的两种画面：东西画得够大', () => {
    for (const d of DIFFS) {
      for (const q of batch(d).slice(0, 150)) {
        const phone = layoutMatch(358, 682, q.groups, q.layout === 'scatter', q.signature)
        const tablet = layoutMatch(1248, 638, q.groups, q.layout === 'scatter', q.signature)
        expect(phone.item).toBeGreaterThanOrEqual(d === 1 ? 90 : 44)
        expect(tablet.item).toBeGreaterThanOrEqual(80)
      }
    }
  })

  it('散开的题真的散开（有转角度），同一题每次排得一样', () => {
    const q = batch(3).find((x) => x.layout === 'scatter' && x.groups.length === 4)!
    const a = layoutMatch(358, 682, q.groups, true, q.signature)
    expect(a.spots.flat().some((s) => s.rot !== 0)).toBe(true)
    expect(layoutMatch(358, 682, q.groups, true, q.signature)).toEqual(a)
  })
})
