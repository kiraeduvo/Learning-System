import { describe, expect, it } from 'vitest'
import { layoutPick, layoutPlace, POS_SPACING, TOKEN_MIN } from '../../engines/PositionEngine'
import {
  artRect,
  buildScene,
  OBJ,
  refBounds,
  refEdges,
  refGeometry,
  ZONE,
  zoneRect,
  type Rect,
} from '../../engines/positionArt'
import { generateQuestion } from '../generators'
import { promptText } from '../i18n'
import { seededRng } from '../rng'
import type { Difficulty, Lang, Position, RefKind } from '../types'
import { POSITION_KINDS, positionQuestion, type PositionQuestion } from './position'

const DIFFS: Difficulty[] = [1, 2, 3]
const LANGS: Lang[] = ['zh', 'ms', 'en']
const N = 400

/** 用固定的种子出 N 题 */
function batch(d: Difficulty, seed = 500 + d, n = N): PositionQuestion[] {
  const rng = seededRng(seed)
  return Array.from({ length: n }, () => positionQuestion(d, rng))
}

const sorted = (list: readonly string[]) => [...list].sort()
const has = (q: PositionQuestion, p: Position) => q.options.includes(p)

// ---------- 什么组合是合理的（照游戏的规则另外写一次，不直接用生成器里的函数） ----------

/** 每种参考的东西画得出来的位置 */
const DRAWABLE: Record<RefKind, Position[]> = {
  box: ['on', 'under', 'in', 'outside', 'nextTo', 'front', 'behind'],
  // 篮子开着，不能坐在上面
  basket: ['under', 'in', 'outside', 'nextTo', 'front', 'behind'],
  // 桌子没有里面外面；前面后面跟下面分不清楚
  table: ['on', 'under', 'nextTo'],
}

/** 一题的选项不会有两个都对、每个位置都画得出来 */
function expectSensible(q: PositionQuestion) {
  for (const p of q.options) expect(DRAWABLE[q.ref]).toContain(p)
  // 外面只跟里面一对（在上面、旁边、前面……也都在外面）
  if (has(q, 'outside')) expect(sorted(q.options)).toEqual(['in', 'outside'])
  // 箱子：开着才有里面，盖着才可以坐在上面
  if (q.ref === 'box') expect(has(q, 'on') && has(q, 'in')).toBe(false)
  // 从旁边探出头的"后面"也在旁边
  expect(has(q, 'nextTo') && has(q, 'behind')).toBe(false)
}

/** 每个难度：可以用的参考的东西、位置 */
const LEVEL: Record<Difficulty, { refs: RefKind[]; positions: Position[] }> = {
  1: { refs: ['box', 'basket'], positions: ['on', 'under', 'in', 'outside'] },
  2: { refs: ['box', 'basket', 'table'], positions: ['on', 'under', 'in', 'outside', 'nextTo'] },
  3: { refs: ['box', 'basket'], positions: ['on', 'under', 'in', 'nextTo', 'front', 'behind'] },
}

describe('位置 positionQuestion', () => {
  for (const d of DIFFS) {
    describe(`难度 ${d}`, () => {
      const qs = batch(d)

      it('题目的基本资料正确', () => {
        for (const q of qs) {
          expect(q.engine).toBe('position')
          expect(q.skill).toBe('position')
          expect(q.difficulty).toBe(d)
          expect(POSITION_KINDS).toContain(q.kind)
          for (const lang of LANGS) expect(promptText(q.prompt, lang).length).toBeGreaterThan(2)
        }
      })

      it('玩法和选项个数对这个难度', () => {
        for (const q of qs) {
          if (d === 1) {
            expect(q.mode).toBe('pick')
            expect(q.options).toHaveLength(2)
          } else if (d === 2) {
            if (q.mode === 'pick') expect(q.options).toHaveLength(3)
            else expect([2, 3]).toContain(q.options.length)
          } else {
            expect([3, 4]).toContain(q.options.length)
          }
        }
        const shapes = new Set(qs.map((q) => `${q.mode}${q.options.length}`))
        if (d === 1) expect([...shapes]).toEqual(['pick2'])
        if (d === 2) expect(sorted([...shapes])).toEqual(['pick3', 'place2', 'place3'])
        if (d === 3) expect(sorted([...shapes])).toEqual(['pick3', 'pick4', 'place3', 'place4'])
        // 两种玩法都常常出现
        if (d > 1) {
          const place = qs.filter((q) => q.mode === 'place').length
          expect(place).toBeGreaterThan(N * 0.35)
          expect(place).toBeLessThan(N * 0.65)
        }
      })

      it('答案在选项里，选项不重复', () => {
        for (const q of qs) {
          expect(q.options).toContain(q.answer)
          expect(new Set(q.options).size).toBe(q.options.length)
        }
      })

      it('只出合理的位置和参考的东西的组合', () => {
        const { refs, positions } = LEVEL[d]
        for (const q of qs) {
          expectSensible(q)
          expect(refs).toContain(q.ref)
          for (const p of q.options) expect(positions).toContain(p)
          // 难度 1：只出差很多的一对
          if (d === 1) expect([['on', 'under'], ['in', 'outside']].map((s) => s.join())).toContain(sorted(q.options).join())
          // 难度 3：每一题都有前面或后面
          if (d === 3) expect(has(q, 'front') || has(q, 'behind')).toBe(true)
        }
      })

      it('题目（语音）跟玩法、答案、东西、参考的东西一致', () => {
        for (const q of qs) {
          expect(q.prompt).toEqual({ key: q.mode === 'pick' ? 'whereIs' : 'putIt', pos: q.answer, kind: q.kind, ref: q.ref })
        }
      })

      it('题目有变化：东西、参考的东西、答案、答案的位置、左右', () => {
        expect(new Set(qs.map((q) => q.kind)).size).toBe(POSITION_KINDS.length)
        expect(sorted([...new Set(qs.map((q) => q.ref))])).toEqual(sorted(LEVEL[d].refs))
        // 这个难度的每个位置都会当答案
        expect(sorted([...new Set(qs.map((q) => q.answer))])).toEqual(
          sorted(LEVEL[d].positions.filter((p) => d !== 3 || p !== 'outside')),
        )
        // 对的那张不会老是在同一个地方
        const maxN = Math.max(...qs.map((q) => q.options.length))
        expect(new Set(qs.map((q) => q.options.indexOf(q.answer))).size).toBe(maxN)
        const first = qs.filter((q) => q.options[0] === q.answer).length
        expect(first).toBeLessThan(N * 0.6)
        // 旁边、外面、后面：左右两边都有；没有这些位置的题不写哪一边
        for (const q of qs) {
          const sided = has(q, 'nextTo') || has(q, 'outside') || has(q, 'behind')
          if (sided) expect(['left', 'right']).toContain(q.side)
          else expect(q.side).toBeUndefined()
        }
        if (qs.some((q) => q.side)) expect(new Set(qs.map((q) => q.side).filter(Boolean)).size).toBe(2)
      })

      it('signature 会变，而且能分辨题目（玩法、东西、参考的东西、选项顺序、答案）', () => {
        const sigs = qs.map((q) => q.signature)
        expect(new Set(sigs).size).toBeGreaterThan(N / 4)
        let sameAsPrev = 0
        for (let i = 1; i < sigs.length; i++) if (sigs[i] === sigs[i - 1]) sameAsPrev++
        expect(sameAsPrev).toBeLessThan(N * 0.05)
        // 同一个 signature 一定是同一题；不一样的题 signature 一定不一样
        const bySig = new Map<string, string>()
        const byContent = new Map<string, string>()
        for (const q of qs) {
          const content = JSON.stringify([q.mode, q.kind, q.ref, q.options, q.answer, q.side ?? null])
          const prev = bySig.get(q.signature)
          if (prev !== undefined) expect(content).toBe(prev)
          else bySig.set(q.signature, content)
          const prevSig = byContent.get(content)
          if (prevSig !== undefined) expect(q.signature).toBe(prevSig)
          else byContent.set(content, q.signature)
        }
        for (const q of qs) {
          expect(q.signature.startsWith('position:')).toBe(true)
          for (const part of [q.mode, q.kind, q.ref, q.options.join(','), q.answer]) expect(q.signature).toContain(part)
        }
      })

      it('同样的种子出同样的题', () => {
        expect(batch(d, 77, 60)).toEqual(batch(d, 77, 60))
        expect(batch(d, 77, 60).map((q) => q.signature)).not.toEqual(batch(d, 78, 60).map((q) => q.signature))
      })
    })
  }

  it('难度 2 会出"旁边"和桌子；难度 3 前面、后面都会出，"外面"只在难度 1、2', () => {
    const d2 = batch(2)
    expect(d2.some((q) => has(q, 'nextTo'))).toBe(true)
    expect(d2.some((q) => q.ref === 'table')).toBe(true)
    for (const q of d2) expect(has(q, 'front') || has(q, 'behind')).toBe(false)
    const d3 = batch(3)
    expect(d3.filter((q) => has(q, 'front')).length).toBeGreaterThan(N * 0.3)
    expect(d3.filter((q) => has(q, 'behind')).length).toBeGreaterThan(N * 0.3)
    expect(d3.filter((q) => q.answer === 'front' || q.answer === 'behind').length).toBeGreaterThan(N * 0.25)
    for (const q of d3) expect(has(q, 'outside')).toBe(false)
  })

  it('generateQuestion 会避开最近出过的题', () => {
    for (const d of DIFFS) {
      const rng = seededRng(60 + d)
      const recent: string[] = []
      let repeats = 0
      for (let i = 0; i < 300; i++) {
        const q = generateQuestion('position', d, rng, recent)
        expect(q.engine).toBe('position')
        if (recent.includes(q.signature)) repeats++
        recent.push(q.signature)
        if (recent.length > 5) recent.shift()
      }
      expect(repeats).toBe(0)
    }
  })
})

// ---------- 画面 ----------

const inside = (r: Rect, outer: Rect) =>
  r.x >= outer.x - 0.01 && r.y >= outer.y - 0.01 && r.x + r.w <= outer.x + outer.w + 0.01 && r.y + r.h <= outer.y + outer.h + 0.01

/** 每种题目的样子（每个难度都拿一些） */
const ALL = DIFFS.flatMap((d) => batch(d, 900 + d, 300))

describe('位置的画面 buildScene', () => {
  it('放东西：空位圆圈不会叠在一起，全部在画面里面', () => {
    for (const q of ALL.filter((x) => x.mode === 'place')) {
      const s = buildScene(q)
      const zones = s.spots.map(zoneRect)
      for (const z of zones) expect(inside(z, s)).toBe(true)
      for (let i = 0; i < zones.length; i++)
        for (let j = i + 1; j < zones.length; j++) {
          const apart = Math.abs(zones[i].x - zones[j].x) >= ZONE - 0.01 || Math.abs(zones[i].y - zones[j].y) >= ZONE - 0.01
          expect(apart, `${q.signature} ${s.spots[i].pos}/${s.spots[j].pos}`).toBe(true)
        }
    }
  })

  it('每个位置的东西和参考的东西都在画面里面', () => {
    for (const q of ALL) {
      const s = buildScene(q)
      expect(inside(refBounds(q.ref, s.open), s)).toBe(true)
      for (const spot of s.spots) expect(inside(artRect(q.kind, spot), s)).toBe(true)
    }
  })

  it('躲在后面：鸭子从头那一边（左边）、车子从车头那一边（右边）探出头；其他的照题目的左右', () => {
    let checked = 0
    for (const q of ALL.filter((x) => has(x, 'behind'))) {
      const s = buildScene(q)
      const a = artRect(q.kind, s.spots[q.options.indexOf('behind')])
      const peeksLeft = a.x < refEdges(q.ref, a.y + a.h / 2)[0]
      const expected = q.kind === 'duck' ? 'left' : q.kind === 'car' ? 'right' : q.side
      expect(peeksLeft ? 'left' : 'right', q.signature).toBe(expected)
      checked++
    }
    expect(checked).toBeGreaterThan(100)
  })

  it('有"里面"的题箱子是开着的；一样的题画面一样', () => {
    for (const q of ALL) {
      const s = buildScene(q)
      expect(s.open).toBe(has(q, 'in') || has(q, 'outside'))
      expect(buildScene(q)).toEqual(s)
      expect(s.spots.map((p) => p.pos)).toEqual(q.options)
    }
  })

  it('每个位置画在对的地方、对的那一层', () => {
    for (const q of ALL) {
      const s = buildScene(q)
      const { floor, rim, surface } = refGeometry(q.ref)
      for (const spot of s.spots) {
        const a = artRect(q.kind, spot)
        const cx = a.x + a.w / 2
        const foot = a.y + a.h
        const [left, right] = refEdges(q.ref, a.y + a.h / 2)
        const msg = `${q.signature} ${spot.pos}`
        switch (spot.pos) {
          case 'on':
            // 脚踩在上面，在中间
            expect(Math.abs(foot - surface), msg).toBeLessThan(0.5)
            expect(Math.abs(cx - 50), msg).toBeLessThan(1)
            expect(spot.layer).toBe('top')
            break
          case 'under':
            // 箱子、篮子：整个在下面；桌子：站在地上、两只桌脚中间、桌面下面
            if (q.ref === 'table') {
              expect(Math.abs(foot - floor), msg).toBeLessThan(0.5)
              expect(a.y, msg).toBeGreaterThan(16 + 3)
              expect(a.x, msg).toBeGreaterThan(12)
              expect(a.x + a.w, msg).toBeLessThan(88)
              expect(spot.layer).toBe('mid')
            } else {
              expect(a.y, msg).toBeGreaterThan(floor + 3)
              expect(spot.layer).toBe('top')
            }
            break
          case 'in':
            // 露出上面一大半，下面一部分被前面那片挡住；在开口的中间，比开口窄
            expect(spot.layer).toBe('mid')
            expect(rim - a.y, msg).toBeGreaterThan(a.h * 0.45)
            expect(foot - rim, msg).toBeGreaterThan(a.h * 0.12)
            expect(Math.abs(cx - 50), msg).toBeLessThan(1)
            expect(a.w, msg).toBeLessThan(right - left - 20)
            break
          case 'nextTo':
          case 'outside':
            // 站在地上，在旁边，不碰到参考的东西
            expect(Math.abs(foot - floor), msg).toBeLessThan(0.5)
            expect(a.x >= right + 2 || a.x + a.w <= left - 2, msg).toBe(true)
            expect(spot.layer).toBe('top')
            break
          case 'front':
            // 挡在前面：跟参考的东西叠在一起（脚比较低，比较靠近我们），画在最前面
            expect(spot.layer).toBe('top')
            expect(foot, msg).toBeGreaterThan(floor)
            expect(a.y, msg).toBeLessThan(floor - a.h * 0.6)
            expect(Math.abs(cx - 50), msg).toBeLessThan(1)
            break
          case 'behind': {
            // 躲在后面：从旁边探出头，一半多一点露出来，其他的被挡住
            expect(spot.layer).toBe('back')
            const shown = Math.max(a.x + a.w - right, left - a.x) / a.w
            expect(shown, msg).toBeGreaterThan(0.5)
            expect(shown, msg).toBeLessThan(0.75)
            expect(foot, msg).toBeLessThan(floor)
            break
          }
        }
      }
    }
  })
})

/** 引擎可以用的大小（真的画面上量的 .engine-wrap：画面减掉上面的按钮、题目那一行） */
const BOXES: Record<string, [number, number]> = {
  '手机直放 390×844': [358, 682],
  '平板横放 1280×800': [1248, 638],
  'Android 412×915': [380, 753],
  '小手机 360×640': [328, 478],
  '平板直放 800×1280': [768, 1118],
  'iPad 横放 1024×768': [992, 606],
}

describe('位置的排版 layoutPick / layoutPlace', () => {
  for (const [name, [bw, bh]] of Object.entries(BOXES)) {
    it(`${name}：放得下，按得到（至少 64px）`, () => {
      const { pad, gap, shadow, trayGap } = POS_SPACING
      for (const q of ALL) {
        const s = buildScene(q)
        if (q.mode === 'pick') {
          const L = layoutPick(bw, bh, q.options.length, s.w, s.h)
          const rows = Math.ceil(q.options.length / L.cols)
          expect(L.cols * L.cardW + (L.cols - 1) * gap).toBeLessThanOrEqual(bw)
          expect(rows * L.cardH + (rows - 1) * gap + shadow).toBeLessThanOrEqual(bh)
          expect(Math.min(L.cardW, L.cardH)).toBeGreaterThanOrEqual(64)
          // 画面放得进卡片
          expect(Math.round(s.w * L.scale) + 2 * pad).toBeLessThanOrEqual(L.cardW + 1)
          expect(Math.round(s.h * L.scale) + 2 * pad).toBeLessThanOrEqual(L.cardH + 1)
        } else {
          const L = layoutPlace(bw, bh, s.w, s.h)
          if (L.stacked) {
            expect(Math.max(L.stageW, L.token)).toBeLessThanOrEqual(bw)
            expect(L.stageH + shadow + trayGap + L.token + shadow).toBeLessThanOrEqual(bh)
          } else {
            expect(L.stageW + trayGap + L.token).toBeLessThanOrEqual(bw)
            expect(Math.max(L.stageH, L.token) + shadow).toBeLessThanOrEqual(bh)
          }
          expect(ZONE * L.scale).toBeGreaterThanOrEqual(64)
          expect(L.token).toBeGreaterThanOrEqual(TOKEN_MIN)
          expect(L.tokenArt).toBeLessThanOrEqual(L.token)
          expect(L.stageW).toBeLessThanOrEqual(Math.ceil(s.w * L.scale))
        }
      }
    })
  }

  it('主要的两种画面：东西画得够大', () => {
    for (const q of ALL) {
      const s = buildScene(q)
      for (const [bw, bh] of [BOXES['手机直放 390×844'], BOXES['平板横放 1280×800']]) {
        const scale =
          q.mode === 'pick' ? layoutPick(bw, bh, q.options.length, s.w, s.h).scale : layoutPlace(bw, bh, s.w, s.h).scale
        // 最难的（手机上四张图）东西也有 50px 以上
        expect(OBJ * scale).toBeGreaterThanOrEqual(bw > 1000 ? 100 : 50)
      }
    }
  })

  it('横的平板：三张图排一排；直的手机：两张图上下排', () => {
    const three = ALL.filter((q) => q.mode === 'pick' && q.options.length === 3)
    const two = ALL.filter((q) => q.mode === 'pick' && q.options.length === 2)
    for (const q of three) {
      const s = buildScene(q)
      expect(layoutPick(1248, 638, 3, s.w, s.h).cols).toBe(3)
    }
    for (const q of two) {
      const s = buildScene(q)
      expect(layoutPick(358, 682, 2, s.w, s.h).cols).toBe(1)
    }
  })
})
