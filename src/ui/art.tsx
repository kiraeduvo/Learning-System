// 所有图案都是自己画的 SVG：可以换颜色、离线也能用

import type { ReactElement } from 'react'
import type { AvatarId, ColorName, Item, ObjectKind, ShapeKind } from '../core/types'

export const PALETTE: Record<ColorName, { fill: string; dark: string; light: string }> = {
  red: { fill: '#F2545B', dark: '#C93C43', light: '#FF9A9E' },
  blue: { fill: '#4A90E2', dark: '#2F6FBF', light: '#8DBDF3' },
  yellow: { fill: '#FFC93C', dark: '#D9A21B', light: '#FFE08A' },
  green: { fill: '#4CC66B', dark: '#2E9E4C', light: '#95E3A9' },
  purple: { fill: '#9B6BDF', dark: '#7446B8', light: '#C7AEF2' },
  orange: { fill: '#FF8C42', dark: '#DE6A1D', light: '#FFB989' },
  pink: { fill: '#FF7EB6', dark: '#DB5596', light: '#FFB3D4' },
}

const DEFAULT_COLOR: Record<ObjectKind, ColorName> = {
  apple: 'red',
  fish: 'orange',
  star: 'yellow',
  ball: 'red',
  car: 'blue',
  duck: 'yellow',
  flower: 'pink',
  balloon: 'red',
  cat: 'orange',
}

const INK = '#2B2B2B'

type Paint = { fill: string; dark: string; light: string }

const OBJECT_ART: Record<ObjectKind, (p: Paint) => ReactElement> = {
  apple: (p) => (
    <>
      <path
        d="M50 30C38 20 14 24 14 50c0 24 18 40 28 40 4 0 6-2 8-2s4 2 8 2c10 0 28-16 28-40 0-26-24-30-36-20Z"
        fill={p.fill}
      />
      <path d="M50 30c0-8 2-16 6-20" stroke="#7A4B2A" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M54 18c8-10 22-8 24-4-6 8-18 10-24 4Z" fill="#4CC66B" />
      <ellipse cx="32" cy="46" rx="6" ry="10" fill="#fff" opacity="0.35" transform="rotate(20 32 46)" />
    </>
  ),
  fish: (p) => (
    <>
      <path d="M70 50 92 30v40Z" fill={p.dark} strokeLinejoin="round" stroke={p.dark} strokeWidth="4" />
      <path d="M38 31c5-9 17-10 22-1Z" fill={p.dark} />
      <ellipse cx="45" cy="52" rx="32" ry="22" fill={p.fill} />
      <path d="M52 39c6 8 6 18 0 26" stroke={p.light} strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="28" cy="47" r="6.5" fill="#fff" />
      <circle cx="27" cy="47" r="3.5" fill={INK} />
      <path d="M20 60c4 3 8 3 11 0" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  star: (p) => (
    <>
      <polygon
        points="50,10 61.2,36.6 89.9,39 68.1,57.9 74.7,86 50,71 25.3,86 31.9,57.9 10.1,39 38.8,36.6"
        fill={p.fill}
        stroke={p.fill}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <circle cx="42" cy="51" r="3.5" fill={INK} />
      <circle cx="58" cy="51" r="3.5" fill={INK} />
      <path d="M44 59c4 4 8 4 12 0" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  ball: (p) => (
    <>
      <circle cx="50" cy="50" r="40" fill={p.fill} />
      <path d="M11 44c22-10 56-10 78 0" stroke="#fff" strokeWidth="7" fill="none" />
      <path d="M44 11c-12 22-12 56 0 78" stroke="#fff" strokeWidth="7" fill="none" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={p.dark} strokeWidth="3" />
      <ellipse cx="32" cy="28" rx="8" ry="5" fill="#fff" opacity="0.5" transform="rotate(-30 32 28)" />
    </>
  ),
  car: (p) => (
    <>
      <path
        d="M14 62V51c0-4 3-7 7-8l13-1 9-13c2-3 5-4 8-4h15c3 0 6 2 8 5l7 12 4 1c4 1 6 4 6 8v11c0 3-2 5-5 5H19c-3 0-5-2-5-5Z"
        fill={p.fill}
      />
      <path d="M45 33l5-4h8v13H39Z" fill="#DDF1FF" />
      <path d="M62 29h5c2 0 3 1 4 3l4 10H62Z" fill="#DDF1FF" />
      <circle cx="32" cy="68" r="10" fill="#333" />
      <circle cx="32" cy="68" r="4" fill="#BBB" />
      <circle cx="74" cy="68" r="10" fill="#333" />
      <circle cx="74" cy="68" r="4" fill="#BBB" />
      <circle cx="88" cy="53" r="3" fill="#FFE08A" />
    </>
  ),
  duck: (p) => (
    <>
      <path d="M16 62c0-12 14-16 28-12l8 2c8 2 18 0 26-6 8 4 10 14 6 22-6 14-24 18-40 18-16 0-28-10-28-24Z" fill={p.fill} />
      <circle cx="38" cy="36" r="17" fill={p.fill} />
      <path d="M22 37c-8-1-13 3-11 7 4 2 10 2 13-1Z" fill="#FF8C42" />
      <circle cx="34" cy="32" r="3.5" fill={INK} />
      <circle cx="35" cy="31" r="1.2" fill="#fff" />
      <path d="M48 64c8-4 20-2 22 4-6 6-16 6-22-4Z" fill={p.dark} />
    </>
  ),
  flower: (p) => (
    <>
      <path d="M50 58v34" stroke="#3FAE5A" strokeWidth="6" strokeLinecap="round" />
      <path d="M50 80c8-10 20-10 24-6-6 8-16 10-24 6Z" fill="#4CC66B" />
      {[
        [50, 22],
        [65, 33],
        [59, 51],
        [41, 51],
        [35, 33],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="13" fill={p.fill} />
      ))}
      <circle cx="50" cy="38" r="9" fill="#FFC93C" />
    </>
  ),
  balloon: (p) => (
    <>
      <path d="M50 74c-4 8 4 14-2 22" stroke="#888" strokeWidth="2" fill="none" />
      <ellipse cx="50" cy="40" rx="27" ry="32" fill={p.fill} />
      <path d="M45 72h10l-5 5Z" fill={p.dark} />
      <ellipse cx="40" cy="28" rx="6" ry="10" fill="#fff" opacity="0.45" transform="rotate(25 40 28)" />
    </>
  ),
  cat: (p) => (
    <>
      <path d="M20 44 24 12l24 20Z" fill={p.fill} />
      <path d="M80 44 76 12 52 32Z" fill={p.fill} />
      <path d="M27 34l2-12 10 9Z" fill="#FFB3C7" />
      <path d="M73 34l-2-12-10 9Z" fill="#FFB3C7" />
      <ellipse cx="50" cy="56" rx="35" ry="30" fill={p.fill} />
      <ellipse cx="38" cy="53" rx="4" ry="5.5" fill={INK} />
      <ellipse cx="62" cy="53" rx="4" ry="5.5" fill={INK} />
      <path d="M46 63h8l-4 4Z" fill="#FF7EB6" />
      <path
        d="M50 67c-2 4-6 4-8 2m8-2c2 4 6 4 8 2M22 60l12 2m-12 6 12-2m44-6-12 2m12 6-12-2"
        stroke={INK}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
}

function shapeArt(shape: ShapeKind, p: Paint): ReactElement {
  const common = { fill: p.fill, stroke: p.dark, strokeWidth: 4, strokeLinejoin: 'round' as const }
  switch (shape) {
    case 'circle':
      return <circle cx="50" cy="50" r="40" {...common} />
    case 'triangle':
      return <path d="M50 12 91 84H9Z" {...common} />
    case 'square':
      return <rect x="14" y="14" width="72" height="72" rx="5" {...common} />
    case 'rectangle':
      return <rect x="5" y="28" width="90" height="44" rx="5" {...common} />
  }
}

export function isShape(kind: Item['kind']): kind is ShapeKind {
  return kind === 'circle' || kind === 'triangle' || kind === 'square' || kind === 'rectangle'
}

export function paintFor(item: Item): Paint {
  const color = item.color ?? (isShape(item.kind) ? 'blue' : DEFAULT_COLOR[item.kind])
  return PALETTE[color]
}

/** 画一个东西。size 是像素，item.scale 会再乘上去 */
export function ItemArt({ item, size, className }: { item: Item; size: number; className?: string }) {
  const s = size * (item.scale ?? 1)
  const p = paintFor(item)
  const art = isShape(item.kind) ? shapeArt(item.kind, p) : OBJECT_ART[item.kind](p)
  return (
    <svg className={className} width={s} height={s} viewBox="0 0 100 100" aria-hidden="true">
      <g transform={item.rotate ? `rotate(${item.rotate} 50 50)` : undefined}>{art}</g>
    </svg>
  )
}

/** 圆点（数字下面的提示） */
export function Dots({ n, size = 10, color = '#7A5C3E' }: { n: number; size?: number; color?: string }) {
  return (
    <span className="dots" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="dot" style={{ width: size, height: size, background: color }} />
      ))}
    </span>
  )
}

/** 篮子：颜色篮子 / 形状篮子 */
export function Basket({
  color,
  shape,
  width,
}: {
  color?: ColorName
  shape?: ShapeKind
  width: number
}) {
  const p = color ? PALETTE[color] : { fill: '#E9B97A', dark: '#B9864A', light: '#F5D7A8' }
  const h = width * 0.72
  return (
    <svg width={width} height={h} viewBox="0 0 120 86" aria-hidden="true">
      <path d="M10 26h100l-11 54c-1 3-3 4-6 4H27c-3 0-5-1-6-4Z" fill={color ? p.light : p.fill} />
      <path
        d="M20 40h80M23 54h74M26 68h68M40 28l5 54M60 28v54M80 28l-5 54"
        stroke={p.dark}
        strokeWidth="3"
        opacity="0.35"
        strokeLinecap="round"
      />
      <rect x="4" y="16" width="112" height="16" rx="8" fill={color ? p.fill : p.dark} />
      {shape && (
        <g transform="translate(36 34) scale(0.48)">
          {shapeArt(shape, { fill: '#FFFFFF', dark: '#8A5A2B', light: '#fff' })}
        </g>
      )}
    </svg>
  )
}

export type Mood = 'happy' | 'cheer' | 'think'

/** 吉祥物：小熊 */
export function Mascot({ size, mood = 'happy' }: { size: number; mood?: Mood }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="26" cy="30" r="17" fill="#C98B5A" />
      <circle cx="94" cy="30" r="17" fill="#C98B5A" />
      <circle cx="26" cy="30" r="8" fill="#F2C9A0" />
      <circle cx="94" cy="30" r="8" fill="#F2C9A0" />
      <circle cx="60" cy="64" r="46" fill="#D99A66" />
      <ellipse cx="60" cy="82" rx="23" ry="17" fill="#F6D7B5" />
      {mood === 'think' ? (
        <>
          <path d="M38 58h12M70 58h12" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="44" cy="58" r="6" fill={INK} />
          <circle cx="76" cy="58" r="6" fill={INK} />
          <circle cx="46" cy="56" r="2" fill="#fff" />
          <circle cx="78" cy="56" r="2" fill="#fff" />
        </>
      )}
      <ellipse cx="60" cy="74" rx="8" ry="6" fill="#3A2A20" />
      {mood === 'cheer' ? (
        <path d="M48 84c4 12 20 12 24 0Z" fill="#B5473A" />
      ) : (
        <path d="M50 84c4 5 16 5 20 0" stroke="#3A2A20" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}
      <circle cx="34" cy="78" r="6" fill="#FF8FA3" opacity="0.5" />
      <circle cx="86" cy="78" r="6" fill="#FF8FA3" opacity="0.5" />
    </svg>
  )
}

const AVATAR_COLORS: Record<AvatarId, { head: string; ear: string; inner: string }> = {
  bear: { head: '#D99A66', ear: '#C98B5A', inner: '#F2C9A0' },
  bunny: { head: '#F4F0EC', ear: '#F4F0EC', inner: '#FFC1D3' },
  chick: { head: '#FFD54A', ear: '#FFD54A', inner: '#FFD54A' },
  cat: { head: '#FF9F5A', ear: '#FF9F5A', inner: '#FFC1D3' },
}

/** 孩子的头像 */
export function Avatar({ id, size }: { id: AvatarId; size: number }) {
  const c = AVATAR_COLORS[id]
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      {id === 'bear' && (
        <>
          <circle cx="28" cy="32" r="16" fill={c.ear} />
          <circle cx="92" cy="32" r="16" fill={c.ear} />
          <circle cx="28" cy="32" r="8" fill={c.inner} />
          <circle cx="92" cy="32" r="8" fill={c.inner} />
        </>
      )}
      {id === 'bunny' && (
        <>
          <ellipse cx="42" cy="26" rx="11" ry="26" fill={c.ear} stroke="#E2D9CF" strokeWidth="2" />
          <ellipse cx="78" cy="26" rx="11" ry="26" fill={c.ear} stroke="#E2D9CF" strokeWidth="2" />
          <ellipse cx="42" cy="28" rx="5" ry="17" fill={c.inner} />
          <ellipse cx="78" cy="28" rx="5" ry="17" fill={c.inner} />
        </>
      )}
      {id === 'cat' && (
        <>
          <path d="M22 50 26 14l26 22Z" fill={c.ear} />
          <path d="M98 50 94 14 68 36Z" fill={c.ear} />
        </>
      )}
      {id === 'chick' && <path d="M56 14c2-8 10-8 10 0-4-2-6-2-10 0Z" fill="#F2A900" />}
      <circle cx="60" cy="66" r="44" fill={c.head} stroke={id === 'bunny' ? '#E2D9CF' : 'none'} strokeWidth="2" />
      <circle cx="44" cy="62" r="6" fill={INK} />
      <circle cx="76" cy="62" r="6" fill={INK} />
      <circle cx="46" cy="60" r="2" fill="#fff" />
      <circle cx="78" cy="60" r="2" fill="#fff" />
      {id === 'chick' ? (
        <path d="M50 76h20l-10 10Z" fill="#FF8C42" />
      ) : (
        <>
          <ellipse cx="60" cy="76" rx="6" ry="4.5" fill={id === 'bear' ? '#3A2A20' : '#FF7EB6'} />
          <path d="M52 84c4 4 12 4 16 0" stroke="#3A2A20" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      <circle cx="34" cy="80" r="6" fill="#FF8FA3" opacity="0.45" />
      <circle cx="86" cy="80" r="6" fill="#FF8FA3" opacity="0.45" />
    </svg>
  )
}

/** 星星（奖励用） */
export function StarIcon({ size, filled = true }: { size: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <polygon
        points="50,10 61.2,36.6 89.9,39 68.1,57.9 74.7,86 50,71 25.3,86 31.9,57.9 10.1,39 38.8,36.6"
        fill={filled ? '#FFC93C' : '#E8E1D6'}
        stroke={filled ? '#F2A900' : '#D5CCBF'}
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  )
}
