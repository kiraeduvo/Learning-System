import { describe, expect, it } from 'vitest'
import {
  ARITH_SPACING,
  cleanSplit,
  equationEm,
  layoutArith,
  patternsFor,
  type ArithLayout,
} from '../../engines/ArithEngine'
import { generateQuestion } from '../generators'
import { numberWord, promptText } from '../i18n'
import { seededRng } from '../rng'
import type { Difficulty, Lang } from '../types'
import { OBJECTS, RECOLORABLE } from './common'
import { ARITH_LEVELS, arithQuestion, optionRange, type ArithQuestion } from './arith'

const DIFFS: Difficulty[] = [1, 2, 3]
const SKILLS = ['addition', 'subtraction'] as const
type Skill = (typeof SKILLS)[number]
const LANGS: Lang[] = ['zh', 'ms', 'en']
const N = 400

/** 用固定的种子出 N 题 */
function batch(skill: Skill, d: Difficulty, seed = (skill === 'addition' ? 3000 : 4000) + d * 31): ArithQuestion[] {
  const rng = seededRng(seed)
  return Array.from({ length: N }, () => arithQuestion(skill, d, rng))
}

/** 加法的总数 a + b、减法一开始有几个 a（画面上东西最多的时候） */
const totalOf = (q: ArithQuestion) => (q.op === '+' ? q.a + q.b : q.a)
const hasZero = (q: ArithQuestion) => q.a === 0 || q.b === 0 || q.answer === 0
const share = (qs: ArithQuestion[], f: (q: ArithQuestion) => boolean) => qs.filter(f).length / qs.length
const distinct = (qs: ArithQuestion[], f: (q: ArithQuestion) => number) => new Set(qs.map(f))
const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i)

describe('加减法 arithQuestion：每个难度都要遵守的规则', () => {
  for (const skill of SKILLS) {
    const op = skill === 'addition' ? '+' : '-'
    for (const d of DIFFS) {
      describe(`${skill} 难度 ${d}`, () => {
        const qs = batch(skill, d)

        it('基本资料、答案算对、没有负数', () => {
          for (const q of qs) {
            expect(q.engine).toBe('arith')
            expect(q.skill).toBe(skill)
            expect(q.difficulty).toBe(d)
            expect(q.op).toBe(op)
            for (const v of [q.a, q.b, q.answer]) {
              expect(Number.isInteger(v)).toBe(true)
              expect(v).toBeGreaterThanOrEqual(0)
              expect(v).toBeLessThanOrEqual(10)
            }
            expect(q.answer).toBe(op === '+' ? q.a + q.b : q.a - q.b)
            // 东西：同一题一种，换颜色的只有可以换颜色的东西
            expect(OBJECTS).toContain(q.item.kind)
            if (q.item.color !== undefined) expect(RECOLORABLE).toContain(q.item.kind)
          }
        })

        it('数目在这个难度的范围里', () => {
          const { minTotal, maxTotal } = ARITH_LEVELS[d]
          for (const q of qs) {
            expect(totalOf(q)).toBeLessThanOrEqual(maxTotal)
            if (!hasZero(q)) expect(totalOf(q)).toBeGreaterThanOrEqual(minTotal)
          }
          // 难度 1 总数 5 以内；难度 2、3 真的会到 10
          const totals = distinct(qs, totalOf)
          if (d === 1) expect([...totals].sort()).toEqual([2, 3, 4, 5])
          else expect(totals.has(10)).toBe(true)
          // 难度 2 主要练 6–10
          if (d === 2) expect(share(qs, (q) => totalOf(q) >= 6)).toBeGreaterThan(0.75)
        })

        it('0 的规则：难度 1、2 没有 0；难度 3 偶尔有（不会 0 + 0）', () => {
          if (d < 3) {
            for (const q of qs) {
              expect(q.a).toBeGreaterThanOrEqual(1)
              expect(q.b).toBeGreaterThanOrEqual(1)
              expect(q.answer).toBeGreaterThanOrEqual(1)
              expect(q.options).not.toContain(0)
            }
            return
          }
          const zeros = share(qs, hasZero)
          expect(zeros).toBeGreaterThan(0.03)
          expect(zeros).toBeLessThan(0.2)
          for (const q of qs) expect(q.a + q.b).toBeGreaterThan(0)
          if (op === '+') {
            expect(qs.some((q) => q.b === 0)).toBe(true)
            expect(qs.some((q) => q.a === 0)).toBe(true)
          } else {
            // 拿走 0 个，也有全部拿走（答案是 0）
            expect(qs.some((q) => q.b === 0)).toBe(true)
            expect(qs.some((q) => q.answer === 0)).toBe(true)
          }
        })

        it('答案选项：个数对、不重复、答案只有一个、靠近答案、在 0–10 里', () => {
          const { min, max } = optionRange(op, d)
          let dist = 0
          for (const q of qs) {
            if (d === 1) expect(q.options).toHaveLength(3)
            else if (d === 3) expect(q.options).toHaveLength(4)
            else expect([3, 4]).toContain(q.options.length)
            expect(new Set(q.options).size).toBe(q.options.length)
            expect(q.options.filter((v) => v === q.answer)).toHaveLength(1)
            for (const v of q.options) {
              expect(Number.isInteger(v)).toBe(true)
              expect(v).toBeGreaterThanOrEqual(Math.max(0, min))
              expect(v).toBeLessThanOrEqual(Math.min(10, max))
              expect(Math.abs(v - q.answer)).toBeLessThanOrEqual(5)
              dist += Math.abs(v - q.answer)
            }
          }
          // 大部分选项跟答案只差一两个（要真的算，不能用猜的）
          const avg = dist / qs.reduce((s, q) => s + q.options.length - 1, 0)
          expect(avg).toBeLessThan(2.6)
          // 答案不会老是在同一个位置
          const positions = distinct(qs, (q) => q.options.indexOf(q.answer))
          expect(positions.size).toBe(d === 1 ? 3 : 4)
        })

        it('题目（语音）跟难度、加减对得上，数字跟 a、b 一样', () => {
          const story = d < 3
          const key = story ? (op === '+' ? 'addStory' : 'subStory') : op === '+' ? 'addEquation' : 'subEquation'
          for (const q of qs) {
            expect(q.prompt.key).toBe(key)
            expect(q.pictures).toBe(story)
            const p = q.prompt as { a: number; b: number; kind?: string }
            expect(p.a).toBe(q.a)
            expect(p.b).toBe(q.b)
            if (story) expect(p.kind).toBe(q.item.kind)
            for (const lang of LANGS) expect(promptText(q.prompt, lang).length).toBeGreaterThan(5)
            // 英文读出来的句子里真的有这两个数字
            const en = promptText(q.prompt, 'en').toLowerCase()
            expect(en).toContain(numberWord(q.a, 'en'))
            expect(en).toContain(numberWord(q.b, 'en'))
          }
        })

        it('a、b 分散在整个范围，不会老是 +1 / −1 或同一题', () => {
          const as = distinct(qs, (q) => q.a)
          const bs = distinct(qs, (q) => q.b)
          if (d === 1) {
            expect(bs.size).toBe(4)
            expect(as.size).toBe(4)
          } else {
            expect(as.size).toBeGreaterThanOrEqual(op === '+' ? 9 : 7)
            expect(bs.size).toBeGreaterThanOrEqual(9)
          }
          // 难度 1 的数字小，很多题本来就有 1（平均 31%）；难度 2、3 少很多（平均 10–15%）
          const ones = d === 1 ? 0.42 : 0.25
          expect(share(qs, (q) => q.b === 1)).toBeLessThan(ones)
          expect(share(qs, (q) => q.a === 1)).toBeLessThan(ones)
          // 最常出的一题（a、b 一样）也不会太多
          const pairs = new Map<string, number>()
          for (const q of qs) pairs.set(`${q.a}${q.op}${q.b}`, (pairs.get(`${q.a}${q.op}${q.b}`) ?? 0) + 1)
          expect(Math.max(...pairs.values()) / N).toBeLessThan(d === 1 ? 0.2 : 0.08)
          // 答案也分散（难度 1 加法 2–5、减法 1–4；难度 2 加法 4–10、减法 1–9）
          const answers = distinct(qs, (q) => q.answer)
          const want = d === 1 ? (op === '+' ? range(2, 5) : range(1, 4)) : op === '+' ? range(4, 10) : range(1, 9)
          for (const v of want) expect(answers.has(v)).toBe(true)
          // 东西也会换
          expect(distinct(qs, (q) => OBJECTS.indexOf(q.item.kind as (typeof OBJECTS)[number])).size).toBe(
            OBJECTS.length,
          )
        })

        it('signature 能分辨题目，而且会变', () => {
          const sigs = qs.map((q) => q.signature)
          expect(new Set(sigs).size).toBeGreaterThan(N * 0.6)
          let sameAsPrev = 0
          for (let i = 1; i < sigs.length; i++) if (sigs[i] === sigs[i - 1]) sameAsPrev++
          expect(sameAsPrev).toBeLessThan(N * 0.02)
          // 同一个 signature 一定是同一题
          const bySig = new Map<string, string>()
          for (const q of qs) {
            const json = JSON.stringify(q)
            const prev = bySig.get(q.signature)
            if (prev) expect(json).toBe(prev)
            else bySig.set(q.signature, json)
            expect(q.signature.startsWith(`${skill}:`)).toBe(true)
            expect(q.signature).toContain(`${q.a}${q.op}${q.b}`)
            expect(q.signature).toContain(q.item.kind)
            expect(q.signature).toContain(q.options.join(','))
          }
        })

        it('同样的种子出同样的题', () => {
          expect(batch(skill, d, 77)).toEqual(batch(skill, d, 77))
          expect(batch(skill, d, 77).map((q) => q.signature)).not.toEqual(batch(skill, d, 78).map((q) => q.signature))
        })
      })
    }
  }

  it('难度 2：东西多（6 个以上）四个选项，少的三个选项；两种都有', () => {
    for (const skill of SKILLS) {
      const qs = batch(skill, 2)
      for (const q of qs) expect(q.options).toHaveLength(totalOf(q) >= 6 ? 4 : 3)
      expect(qs.some((q) => q.options.length === 3)).toBe(true)
      expect(qs.some((q) => q.options.length === 4)).toBe(true)
    }
  })

  it('难度 1 加法、减法的选项不会太大（加法最多 6，减法最多 5）', () => {
    for (const q of batch('addition', 1)) expect(Math.max(...q.options)).toBeLessThanOrEqual(6)
    for (const q of batch('subtraction', 1)) expect(Math.max(...q.options)).toBeLessThanOrEqual(5)
  })

  it('generateQuestion 会避开最近出过的题', () => {
    for (const skill of SKILLS) {
      for (const d of DIFFS) {
        const rng = seededRng(50 + d)
        const recent: string[] = []
        let repeats = 0
        for (let i = 0; i < 300; i++) {
          const q = generateQuestion(skill, d, rng, recent)
          expect(q.engine).toBe('arith')
          if (recent.includes(q.signature)) repeats++
          recent.push(q.signature)
          if (recent.length > 5) recent.shift()
        }
        expect(repeats).toBe(0)
      }
    }
  })
})

// ---------- 排版 ----------

/** 引擎可以用的大小（在真的画面上量的 .engine-wrap：画面减掉上面的按钮、题目那一行） */
const BOXES: Record<string, { box: [number, number]; portrait: boolean }> = {
  '手机直放 390×844（中文题目）': { box: [358, 682], portrait: true },
  '手机直放 390×844（英文题目三行）': { box: [358, 664], portrait: true },
  '平板横放 1280×800': { box: [1248, 638], portrait: false },
  '小手机 360×640': { box: [328, 438], portrait: true },
  '很窄的手机 320×568': { box: [288, 360], portrait: true },
  'Android 412×915': { box: [380, 735], portrait: true },
  '平板直放 800×1280': { box: [768, 1100], portrait: true },
  'iPad 横放 1024×768': { box: [992, 590], portrait: false },
  '手机横放 844×390': { box: [812, 208], portrait: false },
}

/** 检查一种排法：整个放得下、按得到、每个盘子的东西个数对 */
function checkLayout(L: ArithLayout, q: ArithQuestion, [bw, bh]: [number, number], pictures: boolean) {
  const S = ARITH_SPACING
  // 答案卡：小手指按得到，一排放得下
  expect(L.card).toBeGreaterThanOrEqual(S.minCard)
  const cardsW = q.options.length * L.card + (q.options.length - 1) * L.cardGap
  const eqW = L.eqFont * equationEm(q.a, q.b)
  expect(cardsW).toBeLessThanOrEqual(bw)
  expect(eqW).toBeLessThanOrEqual(bw)
  expect(L.eqH).toBeGreaterThanOrEqual(L.eqFont * S.eqLine - 0.01)
  if (!pictures) {
    expect(L.scene).toBeNull()
    expect(L.helper).toBeGreaterThanOrEqual(S.minCard)
    expect(L.eqH + L.helper + L.card + S.shadow + 2 * L.gap).toBeLessThanOrEqual(bh)
    return
  }
  const sc = L.scene!
  expect(sc).not.toBeNull()
  expect(sc.w).toBeLessThanOrEqual(bw)
  if (L.inline) {
    expect(eqW + L.gap + cardsW).toBeLessThanOrEqual(bw)
    expect(sc.h + Math.max(L.card, L.eqH) + S.shadow + L.gap).toBeLessThanOrEqual(bh)
  } else {
    expect(sc.h + L.eqH + L.card + S.shadow + 2 * L.gap).toBeLessThanOrEqual(bh)
  }
  // 东西不会太小（还数得清楚、点得到）
  expect(sc.cell).toBeGreaterThanOrEqual(S.minCell)
  expect(sc.art).toBeLessThanOrEqual(sc.cell)
  // 每个盘子：东西个数对，一行最多 5 个，盘子装得下
  const groups = q.op === '+' ? [q.a, q.b] : [q.a]
  expect(sc.trays).toHaveLength(groups.length)
  sc.trays.forEach((t, i) => {
    expect(t.rows.reduce((s, k) => s + k, 0)).toBe(groups[i])
    for (const k of t.rows) expect(k).toBeLessThanOrEqual(5)
    const inner = 2 * (sc.pad + S.border)
    expect(Math.max(1, ...t.rows) * sc.cell + inner).toBeLessThanOrEqual(t.w + 0.01)
    expect(Math.max(1, t.rows.length) * sc.cell + inner).toBeLessThanOrEqual(t.h + 0.01)
  })
  if (q.op === '+') {
    // 两个盘子：左右排一样高、上下排一样宽（合起来是一个长方形）
    const [ta, tb] = sc.trays
    if (sc.dir === 'row') {
      expect(ta.h).toBe(tb.h)
      expect(ta.w + tb.w + sc.plus + 2 * sc.plusGap).toBe(sc.w)
    } else {
      expect(ta.w).toBe(tb.w)
      expect(ta.h + tb.h + sc.plus + 2 * sc.plusGap).toBe(sc.h)
    }
  }
}

describe('加减法排版 layoutArith', () => {
  for (const [name, { box, portrait }] of Object.entries(BOXES)) {
    it(`${name}：每种题都放得下`, () => {
      for (const skill of SKILLS) {
        for (const d of DIFFS) {
          for (const q of batch(skill, d).slice(0, 150)) {
            checkLayout(layoutArith(box[0], box[1], q, { portrait, pictures: true }), q, box, true)
            if (!q.pictures) checkLayout(layoutArith(box[0], box[1], q, { portrait, pictures: false }), q, box, false)
          }
        }
      }
    })
  }

  it('主要的两种画面：10 个东西也画得够大，答案卡够大', () => {
    for (const skill of SKILLS) {
      for (const d of DIFFS) {
        for (const q of batch(skill, d).slice(0, 150)) {
          const phone = layoutArith(358, 664, q, { portrait: true, pictures: true })
          const tablet = layoutArith(1248, 638, q, { portrait: false, pictures: true })
          expect(phone.scene!.cell).toBeGreaterThanOrEqual(totalOf(q) >= 8 ? 70 : 80)
          expect(tablet.scene!.cell).toBeGreaterThanOrEqual(100)
          expect(phone.card).toBeGreaterThanOrEqual(78)
          expect(tablet.card).toBeGreaterThanOrEqual(110)
          expect(phone.inline || tablet.inline).toBe(false)
        }
      }
    }
  })

  it('难度 3 图还藏着：算式很大', () => {
    for (const skill of SKILLS) {
      for (const q of batch(skill, 3).slice(0, 100)) {
        expect(layoutArith(358, 664, q, { portrait: true, pictures: false }).eqFont).toBeGreaterThanOrEqual(60)
        expect(layoutArith(1248, 638, q, { portrait: false, pictures: false }).eqFont).toBeGreaterThanOrEqual(120)
      }
    }
  })

  it('直的手机上下排、横的平板左右排；很矮的横画面把算式和答案卡排一行', () => {
    const q = arithQuestion('addition', 2, seededRng(1))
    expect(layoutArith(358, 664, q, { portrait: true, pictures: true }).scene!.dir).toBe('column')
    expect(layoutArith(1248, 638, q, { portrait: false, pictures: true }).scene!.dir).toBe('row')
    expect(layoutArith(812, 208, q, { portrait: false, pictures: true }).inline).toBe(true)
  })

  it('减法：放得下的话，被拿走的自己排成一行（5 − 2 排成 3 + 2）', () => {
    const q = { op: '-' as const, a: 5, b: 2, options: [2, 3, 4], difficulty: 1 as Difficulty }
    expect(layoutArith(1248, 638, q, { portrait: false, pictures: true }).scene!.trays[0].rows).toEqual([3, 2])
    expect(layoutArith(358, 664, q, { portrait: true, pictures: true }).scene!.trays[0].rows).toEqual([3, 2])
    expect(cleanSplit([3, 2], 3)).toBe(true)
    expect(cleanSplit([2, 2, 1], 3)).toBe(false)
    expect(cleanSplit([4, 4], 0)).toBe(true)
    expect(cleanSplit([4, 4], 8)).toBe(true)
  })

  it('每种数量的排法：个数对、一行最多 5 个、最好看的排第一', () => {
    for (let n = 0; n <= 10; n++) {
      const list = patternsFor(n)
      expect(list[0].pref).toBe(1)
      for (const p of list) {
        expect(p.rows.reduce((s, k) => s + k, 0)).toBe(n)
        for (const k of p.rows) expect(k).toBeLessThanOrEqual(5)
      }
    }
    expect(patternsFor(10)[0].rows).toEqual([5, 5])
    expect(patternsFor(0)[0].rows).toEqual([])
  })
})
