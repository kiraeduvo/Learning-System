// 位置游戏的图：箱子（开着 / 盖着）、篮子、桌子，还有"东西放在某个位置时画在哪里"的计算。
//
// 单位：参考的东西宽 100（下面都叫"单位"），整个画面再按比例放大。
// 东西用 ItemArt（100×100 的方框）画，在画面上是 OBJ 单位大。
// 每个东西放好以后在哪一层：
//   back：在参考的东西后面（后面：躲在箱子后面，只露出一部分）
//   mid：夹在参考的东西中间（里面：被箱子前面那片挡住下半部；桌子下面：在前后的桌脚中间）
//   top：在最前面（上面、下面、旁边、外面、前面）
// 放东西的玩法：每个位置有一个虚线圆圈（空位）。圆圈的位置只看参考的东西、位置、哪一边，
// 跟东西的样子没有关系，所以同一组位置的圆圈一定不会叠在一起（测试会检查）。

import type { ObjectKind, Position, RefKind } from '../core/types'

/** 东西（ItemArt 的方框）多大 */
export const OBJ = 66
/** 空位（虚线圆圈）的直径 */
export const ZONE = 50
/** 画面四周留的边 */
const MARGIN = 4
/** 下面（箱子、篮子）：圆圈离参考的东西底部多远 */
const UNDER_GAP = 8
/** 前面：脚比参考的东西底部低一点（比较靠近我们） */
const FRONT_DROP = 4
/** 旁边、外面：圆圈离参考的东西多远 */
const NEXT_GAP = 5
const OUT_GAP = 14
/** 后面：脚比参考的东西底部高一点（比较远） */
const BEHIND_LIFT = 8
/** 后面：东西露出来的部分 = 一半 + 这个比例（其他的被挡住） */
const BEHIND_SHOW = 0.12
/** 后面的圆圈露出来的部分 = 一半 + 这个比例 */
const BEHIND_ZONE_SHOW = 0.2
/** 里面的圆圈：下面这个比例被箱子前面挡住 */
const IN_ZONE_HIDE = 0.3

export type Layer = 'back' | 'mid' | 'top'
export type Side = 'left' | 'right'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * 每种东西的图在 100×100 方框里实际画到哪里（上下左右），
 * cut：放进箱子 / 篮子时，边缘切在哪个高度（上面露出来：小猫露出整张脸，花露出花朵）
 */
const ART: Record<ObjectKind, { top: number; bottom: number; left: number; right: number; cut: number }> = {
  cat: { top: 12, bottom: 86, left: 15, right: 85, cut: 72 },
  duck: { top: 19, bottom: 86, left: 11, right: 86, cut: 60 },
  ball: { top: 9, bottom: 91, left: 9, right: 91, cut: 56 },
  apple: { top: 8, bottom: 90, left: 14, right: 86, cut: 60 },
  star: { top: 6, bottom: 90, left: 6, right: 94, cut: 66 },
  car: { top: 25, bottom: 78, left: 14, right: 91, cut: 63 },
  flower: { top: 9, bottom: 95, left: 22, right: 78, cut: 64 },
  fish: { top: 30, bottom: 74, left: 13, right: 94, cut: 60 },
  balloon: { top: 8, bottom: 96, left: 23, right: 77, cut: 60 },
}

interface RefGeom {
  /** 地面：参考的东西的底部 */
  floor: number
  /** 里面：前面那片的上缘（挡住东西的下半部） */
  rim: number
  /** 上面：东西的脚踩在哪里 */
  surface: number
  /** 在某个高度，左右两边的位置（篮子上宽下窄） */
  edges: (y: number) => [number, number]
}

const GEOM: Record<RefKind, RefGeom> = {
  box: { floor: 84, rim: 20, surface: 10, edges: () => [0, 100] },
  basket: {
    floor: 80,
    rim: 17,
    surface: 12,
    edges: (y) => {
      const t = Math.max(0, Math.min(1, (y - 12) / 68))
      return [3 + 9 * t, 97 - 9 * t]
    },
  },
  table: { floor: 80, rim: 8, surface: 4, edges: () => [0, 100] },
}

/** 参考的东西的地面、前面的边、上面（测试用） */
export function refGeometry(ref: RefKind): { floor: number; rim: number; surface: number } {
  const { floor, rim, surface } = GEOM[ref]
  return { floor, rim, surface }
}

/** 参考的东西在某个高度的左右两边（篮子上宽下窄） */
export function refEdges(ref: RefKind, y: number): [number, number] {
  return GEOM[ref].edges(y)
}

/** 参考的东西画到哪里（单位）。开着的箱子有打开的盖子 */
export function refBounds(ref: RefKind, open: boolean): Rect {
  if (ref === 'box') return open ? { x: -8, y: -15, w: 116, h: 99 } : { x: 0, y: 0, w: 100, h: 84 }
  if (ref === 'basket') return { x: 0, y: 3, w: 100, h: 77 }
  return { x: 0, y: 0, w: 100, h: 80 }
}

/** 东西放在一个位置：ItemArt 方框的左上角、在哪一层、空位圆圈的中心 */
export interface Spot {
  pos: Position
  x: number
  y: number
  layer: Layer
  zx: number
  zy: number
}

/** 图实际的大小、图的中心在方框里的位置（单位） */
function artSize(kind: ObjectKind) {
  const a = ART[kind]
  const k = OBJ / 100
  return {
    w: (a.right - a.left) * k,
    h: (a.bottom - a.top) * k,
    ox: ((a.left + a.right) / 2) * k,
    oy: ((a.top + a.bottom) / 2) * k,
    cut: a.cut * k,
  }
}

/** 空位圆圈的中心：只看参考的东西、位置、哪一边 */
export function zoneCenter(ref: RefKind, pos: Position, side: Side): { x: number; y: number } {
  const g = GEOM[ref]
  const z = ZONE / 2
  const dir = side === 'right' ? 1 : -1
  const beside = (gap: number) => {
    const y = g.floor - z
    const [l, r] = g.edges(y)
    return { x: (side === 'right' ? r : l) + dir * (gap + z), y }
  }
  switch (pos) {
    case 'on':
      return { x: 50, y: g.surface - z }
    case 'under':
      // 桌子：地上、两只桌脚中间；箱子、篮子：下面（离开一点，不会碰到"前面"的圆圈）
      return { x: 50, y: ref === 'table' ? g.floor - z : g.floor + UNDER_GAP + z }
    case 'in':
      return { x: 50, y: g.rim + ZONE * IN_ZONE_HIDE - z }
    case 'nextTo':
      return beside(NEXT_GAP)
    case 'outside':
      return beside(OUT_GAP)
    case 'front':
      return { x: 50, y: g.floor + FRONT_DROP - z }
    case 'behind': {
      const y = g.floor - BEHIND_LIFT - z
      const [l, r] = g.edges(y)
      return { x: (side === 'right' ? r : l) + dir * ZONE * BEHIND_ZONE_SHOW, y }
    }
  }
}

/** 东西放在 pos 的时候画在哪里 */
export function placeObject(ref: RefKind, pos: Position, kind: ObjectKind, side: Side): Spot {
  const g = GEOM[ref]
  const a = artSize(kind)
  const zone = zoneCenter(ref, pos, side)
  const at = (cx: number, cy: number, layer: Layer): Spot => ({
    pos,
    x: cx - a.ox,
    y: cy - a.oy,
    layer,
    zx: zone.x,
    zy: zone.y,
  })
  switch (pos) {
    case 'on':
      // 脚踩在上面
      return at(50, g.surface - a.h / 2, 'top')
    case 'under':
      return ref === 'table' ? at(50, g.floor - a.h / 2, 'mid') : at(50, zone.y, 'top')
    case 'in':
      // 前面那片的上缘刚好切在 cut 的高度
      return at(50, g.rim - a.cut + a.oy, 'mid')
    case 'nextTo':
    case 'outside': {
      // 站在地上，在圆圈的中间；很宽的东西往外移一点，不碰到参考的东西
      const cy = g.floor - a.h / 2
      const [l, r] = g.edges(cy)
      const gap = pos === 'nextTo' ? NEXT_GAP : OUT_GAP
      const cx = side === 'right' ? Math.max(zone.x, r + gap + a.w / 2) : Math.min(zone.x, l - gap - a.w / 2)
      return at(cx, cy, 'top')
    }
    case 'front':
      return at(50, g.floor + FRONT_DROP - a.h / 2, 'top')
    case 'behind': {
      const cy = g.floor - BEHIND_LIFT - a.h / 2
      const [l, r] = g.edges(cy)
      const dir = side === 'right' ? 1 : -1
      return at((side === 'right' ? r : l) + dir * a.w * BEHIND_SHOW, cy, 'back')
    }
  }
}

/** 东西的图实际占的地方 */
export function artRect(kind: ObjectKind, s: Spot): Rect {
  const a = artSize(kind)
  return { x: s.x + a.ox - a.w / 2, y: s.y + a.oy - a.h / 2, w: a.w, h: a.h }
}

/** 空位圆圈占的地方 */
export function zoneRect(s: Spot): Rect {
  return { x: s.zx - ZONE / 2, y: s.zy - ZONE / 2, w: ZONE, h: ZONE }
}

function union(rects: Rect[]): Rect {
  const x0 = Math.min(...rects.map((r) => r.x))
  const y0 = Math.min(...rects.map((r) => r.y))
  const x1 = Math.max(...rects.map((r) => r.x + r.w))
  const y1 = Math.max(...rects.map((r) => r.y + r.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

export interface SceneInput {
  mode: 'pick' | 'place'
  ref: RefKind
  kind: ObjectKind
  options: readonly Position[]
  side?: Side
}

/** 一题的画面：每个位置的东西画在哪里、整个画面的范围（单位） */
export interface Scene extends Rect {
  /** 箱子开着（有"里面"的题） */
  open: boolean
  /** 照 options 的顺序 */
  spots: Spot[]
}

/** 有方向的东西（鸭子、鱼的头在左边，车头在右边）：躲在后面时从脸那一边探出头，才认得出来 */
const FACING: Partial<Record<ObjectKind, Side>> = { duck: 'left', fish: 'left', car: 'right' }

export function buildScene(q: SceneInput): Scene {
  const open = q.options.includes('in') || q.options.includes('outside')
  const side: Side = q.side ?? 'right'
  // 后面从 side 那一边探出头（有方向的东西从脸那一边）。题目不会同时有旁边和后面（会有两个答案）；
  // 万一有，放东西的画面所有空位同时出现，后面就放另一边，圆圈才不会叠在一起
  const besideTaken = q.options.includes('nextTo') || q.options.includes('outside')
  let behindSide: Side = FACING[q.kind] ?? side
  if (q.mode === 'place' && besideTaken && behindSide === side) behindSide = side === 'right' ? 'left' : 'right'
  const spots = q.options.map((pos) => placeObject(q.ref, pos, q.kind, pos === 'behind' ? behindSide : side))
  // 选图：每张图只有一个东西，范围包括每个位置的图；放东西：再加上全部空位
  const parts = spots.map((s) => artRect(q.kind, s))
  if (q.mode === 'place') parts.push(...spots.map(zoneRect))
  const u = union([refBounds(q.ref, open), ...parts])
  return { open, spots, x: u.x - MARGIN, y: u.y - MARGIN, w: u.w + MARGIN * 2, h: u.h + MARGIN * 2 }
}

// ---------- 画参考的东西 ----------

const BOX = {
  face: '#EEAE68',
  top: '#F7CE95',
  flap: '#F3C283',
  line: '#BD7A3A',
  inside: '#9A5C2A',
  insideLight: '#B9783E',
  rim: '#FADCAA',
  tape: '#FCE6BF',
}
const BASKET = { body: '#EDBB7A', inside: '#A87232', rim: '#DDA35C', rimDark: '#BF8644', weave: '#C08A48' }
const TABLE = { top: '#F9C27A', edge: '#E9974C', highlight: '#F6B56C', leg: '#DB843F', backLeg: '#B8692F' }

const boxLine = { stroke: BOX.line, strokeWidth: 2, strokeLinejoin: 'round' as const }

/** 箱子前面那片（开着、盖着都一样，开着的多一个把手的洞） */
function BoxFace({ open }: { open: boolean }) {
  return (
    <>
      <path d="M0 20H100V79Q100 84 95 84H5Q0 84 0 79Z" fill={BOX.face} {...boxLine} />
      {open ? (
        <>
          <path d="M2.5 22H97.5" stroke={BOX.rim} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="38" y="32" width="24" height="8" rx="4" fill={BOX.inside} />
        </>
      ) : (
        <rect x="43.5" y="20" width="13" height="17" fill={BOX.tape} />
      )}
      {/* 底下一条深一点的线，看起来比较厚实 */}
      <path d="M4 79H96" stroke={BOX.line} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </>
  )
}

/** 参考的东西：part = back（东西后面那部分）或 front（挡在东西前面那部分） */
export function RefArt({ kind, open, part }: { kind: RefKind; open: boolean; part: 'back' | 'front' }) {
  if (kind === 'box') {
    if (part === 'back') {
      if (!open) return null
      return (
        <g>
          {/* 打开的盖子：后面一片立起来，左右两片往外翻 */}
          <path d="M8 0L14 -14H86L92 0Z" fill={BOX.flap} {...boxLine} />
          <path d="M0 20L8 0L-3 -9L-8 9Z" fill={BOX.flap} {...boxLine} />
          <path d="M100 20L92 0L103 -9L108 9Z" fill={BOX.flap} {...boxLine} />
          {/* 看得到里面：后面的墙亮一点 */}
          <path d="M8 0H92L100 20H0Z" fill={BOX.inside} {...boxLine} />
          <path d="M9.5 1.5H90.5L88 9H12Z" fill={BOX.insideLight} />
        </g>
      )
    }
    return (
      <g>
        {!open && (
          <>
            {/* 盖子：中间贴了胶带 */}
            <path d="M8 0H92L100 20H0Z" fill={BOX.top} {...boxLine} />
            <path d="M45.5 0.8H54.5L56.5 20H43.5Z" fill={BOX.tape} />
          </>
        )}
        <BoxFace open={open} />
      </g>
    )
  }
  if (kind === 'basket') {
    if (part === 'back') {
      return (
        <g>
          <ellipse cx="50" cy="12" rx="47" ry="8.5" fill={BASKET.inside} />
          <path d="M3 12A47 8.5 0 0 1 97 12" fill="none" stroke={BASKET.rim} strokeWidth="6" strokeLinecap="round" />
        </g>
      )
    }
    return (
      <g>
        <path d="M3 12A47 8.5 0 0 0 97 12L88.5 74Q87.5 80 81.5 80H18.5Q12.5 80 11.5 74Z" fill={BASKET.body} />
        {/* 编织的纹路 */}
        <path
          d="M6 35Q50 45 94 35M8 51Q50 60 92 51M10 66Q50 73 90 66M27 20L29.5 79M50 21V80M73 20L70.5 79"
          fill="none"
          stroke={BASKET.weave}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.45"
        />
        <path d="M3 12A47 8.5 0 0 0 97 12" fill="none" stroke={BASKET.rimDark} strokeWidth="8" strokeLinecap="round" />
        <path d="M3 12A47 8.5 0 0 0 97 12" fill="none" stroke={BASKET.rim} strokeWidth="4.5" strokeLinecap="round" />
      </g>
    )
  }
  // 桌子：后面两只桌脚比较短、比较暗（比较远）
  if (part === 'back') {
    return (
      <g>
        <rect x="15" y="12" width="7" height="60" rx="3" fill={TABLE.backLeg} />
        <rect x="78" y="12" width="7" height="60" rx="3" fill={TABLE.backLeg} />
      </g>
    )
  }
  return (
    <g>
      <path d="M6 0.5H94L100 8H0Z" fill={TABLE.top} stroke={TABLE.edge} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="3" y="13" width="9" height="67" rx="3.5" fill={TABLE.leg} />
      <rect x="88" y="13" width="9" height="67" rx="3.5" fill={TABLE.leg} />
      <rect x="0" y="7" width="100" height="9" rx="3.5" fill={TABLE.edge} />
      <path d="M3.5 9.5H96.5" stroke={TABLE.highlight} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}
