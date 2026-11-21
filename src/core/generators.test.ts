import { describe, expect, it } from 'vitest'
import { generateQuestion, numberOptions, repeatKey } from './generators'
import { promptText } from './i18n'
import { seededRng } from './rng'
import { SKILLS } from './skills'
import type { ChoiceQuestion, Difficulty, Lang, Question } from './types'

const DIFFS: Difficulty[] = [1, 2, 3]
const LANGS: Lang[] = ['zh', 'ms', 'en']

function itemKey(o: ChoiceQuestion['options'][number]): string {
  if (o.type === 'numeral') return `n${o.value}`
  if (o.type === 'group') return `g${o.item.kind}${o.count}`
  return `i${o.item.kind}${o.item.color ?? ''}${o.item.scale ?? ''}`
}

function checkQuestion(q: Question) {
  for (const lang of LANGS) expect(promptText(q.prompt, lang).length).toBeGreaterThan(2)
  switch (q.engine) {
    case 'count': {
      expect(q.options).toContain(q.count)
      expect(new Set(q.options).size).toBe(q.options.length)
      expect(q.count).toBeGreaterThanOrEqual(1)
      expect(q.count).toBeLessThanOrEqual(q.skill === 'count5' ? 5 : 10)
      break
    }
    case 'choice': {
      expect(q.answerIndex).toBeGreaterThanOrEqual(0)
      expect(q.answerIndex).toBeLessThan(q.options.length)
      // 选项不能重复，不然有两个"正确答案"
      expect(new Set(q.options.map(itemKey)).size).toBe(q.options.length)
      break
    }
    case 'sort': {
      expect(q.bins.length).toBeGreaterThanOrEqual(2)
      for (const it of q.items) {
        const bin = q.bins[it.bin]
        expect(bin).toBeDefined()
        if (bin.type === 'color') expect(it.item.color).toBe(bin.color)
        else expect(it.item.kind).toBe(bin.shape)
      }
      // 每个篮子都有东西
      for (let b = 0; b < q.bins.length; b++) expect(q.items.some((i) => i.bin === b)).toBe(true)
      break
    }
    case 'trace':
      expect(q.digit).toBeGreaterThanOrEqual(0)
      expect(q.digit).toBeLessThanOrEqual(9)
      break
    case 'order': {
      // rank 要刚好是 0..n-1，每个东西有图或数字
      const ranks = q.items.map((i) => i.rank).sort((a, b) => a - b)
      expect(q.items.length).toBeGreaterThanOrEqual(2)
      expect(ranks).toEqual(q.items.map((_, i) => i))
      for (const it of q.items) expect(it.item !== undefined || it.numeral !== undefined).toBe(true)
      break
    }
    case 'position': {
      // 对的位置一定在选项里，选项不重复
      expect(q.options).toContain(q.answer)
      expect(new Set(q.options).size).toBe(q.options.length)
      expect(q.options.length).toBeGreaterThanOrEqual(2)
      break
    }
    case 'arith': {
      expect(q.answer).toBe(q.op === '+' ? q.a + q.b : q.a - q.b)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBeLessThanOrEqual(10)
      expect(q.options.filter((v) => v === q.answer).length).toBe(1)
      expect(new Set(q.options).size).toBe(q.options.length)
      break
    }
    case 'match': {
      // 每张数字卡刚好对一堆，数量不重复
      expect(q.groups.length).toBeGreaterThanOrEqual(2)
      expect(new Set(q.groups).size).toBe(q.groups.length)
      expect([...q.numerals].sort((a, b) => a - b)).toEqual([...q.groups].sort((a, b) => a - b))
      break
    }
  }
}

describe('generators', () => {
  for (const skill of SKILLS) {
    for (const d of DIFFS) {
      it(`${skill.id} 难度 ${d} 生成正确的题目`, () => {
        const rng = seededRng(skill.id.length * 100 + d)
        for (let i = 0; i < 300; i++) {
          const q = generateQuestion(skill.id, d, rng)
          expect(q.skill).toBe(skill.id)
          expect(q.difficulty).toBe(d)
          checkQuestion(q)
        }
      })
    }
  }

  it('比多少：答案真的是多/少的那一边', () => {
    const rng = seededRng(7)
    for (let i = 0; i < 300; i++) {
      const q = generateQuestion('moreLess', 3, rng) as ChoiceQuestion
      const counts = q.options.map((o) => (o.type === 'group' ? o.count : -1))
      const ans = counts[q.answerIndex]
      const other = counts[1 - q.answerIndex]
      if (q.prompt.key === 'whichMore') expect(ans).toBeGreaterThan(other)
      else expect(ans).toBeLessThan(other)
    }
  })

  it('比大小：答案真的是最大/最小的', () => {
    const rng = seededRng(9)
    for (let i = 0; i < 300; i++) {
      const q = generateQuestion('size', (1 + (i % 3)) as Difficulty, rng) as ChoiceQuestion
      const scales = q.options.map((o) => (o.type === 'item' ? (o.item.scale ?? 1) : 0))
      const ans = scales[q.answerIndex]
      const big = q.prompt.key === 'whichBigger' || q.prompt.key === 'whichBiggest'
      expect(ans).toBe(big ? Math.max(...scales) : Math.min(...scales))
    }
  })

  it('规律：答案跟规律一致', () => {
    const rng = seededRng(11)
    for (let i = 0; i < 300; i++) {
      const q = generateQuestion('pattern', (1 + (i % 3)) as Difficulty, rng) as ChoiceQuestion
      expect(q.sequence).toBeDefined()
      const seq = q.sequence!.map((it) => `${it.kind}-${it.color ?? ''}`)
      const ans = q.options[q.answerIndex]
      expect(ans.type).toBe('item')
      if (ans.type !== 'item') continue
      const key = `${ans.item.kind}-${ans.item.color ?? ''}`
      // 找最短的重复单位，检查下一格
      let period = 1
      while (period < seq.length && !seq.every((v, j) => v === seq[j % period])) period++
      expect(key).toBe(seq[seq.length % period])
    }
  })

  it('避免重复最近出过的题', () => {
    const rng = seededRng(3)
    const recent: string[] = []
    let repeats = 0
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion('numeral5', 2, rng, recent)
      if (recent.includes(q.signature)) repeats++
      recent.push(q.signature)
      if (recent.length > 4) recent.shift()
    }
    expect(repeats).toBeLessThan(3)
  })

  it('加减法：换了东西也不会马上再出同一道算式', () => {
    for (const skill of ['addition', 'subtraction'] as const) {
      const rng = seededRng(21)
      const recent: string[] = []
      let repeats = 0
      for (let i = 0; i < 200; i++) {
        const q = generateQuestion(skill, 2, rng, recent)
        if (recent.includes(repeatKey(q))) repeats++
        recent.push(repeatKey(q))
        if (recent.length > 5) recent.shift()
      }
      expect(repeats).toBe(0)
    }
  })

  it('numberOptions 不重复、包括答案', () => {
    const rng = seededRng(5)
    for (let i = 0; i < 200; i++) {
      const opts = numberOptions(rng, 3, 3, 1, 5)
      expect(opts).toContain(3)
      expect(new Set(opts).size).toBe(3)
      for (const o of opts) expect(o >= 1 && o <= 5).toBe(true)
    }
  })
})
