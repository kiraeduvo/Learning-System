// 技能地图：学前数学（Matematik Awal）
//
// 分类参考 KSPK / KP2027 学前课纲的 Matematik Awal：
//   Pranombor（数前概念）、Konsep Nombor（数的概念）、Bentuk dan Ruang（形状与空间）
// 注意：建议年龄是大概的，官方 Standard Pembelajaran 编号还没有对照官方 DSKP 文件，之后补上。

import type { SkillId } from './types'

export type Strand = 'pranombor' | 'konsepNombor' | 'bentukRuang'

export interface SkillDef {
  id: SkillId
  strand: Strand
  /** 建议年龄（马来西亚学前按出生年份分 4+、5+、6+） */
  age: 4 | 5 | 6
  /** 要先学到一定程度才会开放 */
  prerequisites: SkillId[]
  /** 家长区显示的名字 */
  nameZh: string
  /** 主页游戏图示 */
  icon: 'count' | 'numeral' | 'moreLess' | 'size' | 'shapes' | 'sortColor' | 'sortShape' | 'pattern' | 'trace'
  /** 每次练习最多出几题（比较花时间的题型） */
  maxPerSession?: number
}

export const STRAND_NAMES: Record<Strand, { zh: string; ms: string }> = {
  pranombor: { zh: '数前概念', ms: 'Pranombor' },
  konsepNombor: { zh: '数的概念', ms: 'Konsep Nombor' },
  bentukRuang: { zh: '形状与空间', ms: 'Bentuk dan Ruang' },
}

export const SKILLS: SkillDef[] = [
  { id: 'count5', strand: 'konsepNombor', age: 4, prerequisites: [], nameZh: '数数 1–5', icon: 'count' },
  { id: 'size', strand: 'pranombor', age: 4, prerequisites: [], nameZh: '比大小', icon: 'size' },
  { id: 'shapes', strand: 'bentukRuang', age: 4, prerequisites: [], nameZh: '认识形状', icon: 'shapes' },
  {
    id: 'sortColor',
    strand: 'pranombor',
    age: 4,
    prerequisites: [],
    nameZh: '按颜色分类',
    icon: 'sortColor',
    maxPerSession: 2,
  },
  { id: 'numeral5', strand: 'konsepNombor', age: 4, prerequisites: ['count5'], nameZh: '认数字 1–5', icon: 'numeral' },
  { id: 'moreLess', strand: 'pranombor', age: 4, prerequisites: ['count5'], nameZh: '比多少', icon: 'moreLess' },
  {
    id: 'sortShape',
    strand: 'pranombor',
    age: 4,
    prerequisites: ['shapes'],
    nameZh: '按形状分类',
    icon: 'sortShape',
    maxPerSession: 2,
  },
  { id: 'pattern', strand: 'pranombor', age: 4, prerequisites: ['sortColor'], nameZh: '找规律', icon: 'pattern' },
  { id: 'count10', strand: 'konsepNombor', age: 5, prerequisites: ['count5'], nameZh: '数数 1–10', icon: 'count' },
  {
    id: 'numeral10',
    strand: 'konsepNombor',
    age: 5,
    prerequisites: ['numeral5', 'count10'],
    nameZh: '认数字 1–10',
    icon: 'numeral',
  },
  {
    id: 'trace',
    strand: 'konsepNombor',
    age: 5,
    prerequisites: ['numeral5'],
    nameZh: '描数字',
    icon: 'trace',
    maxPerSession: 2,
  },
]

export const SKILL_BY_ID: Record<SkillId, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<
  SkillId,
  SkillDef
>
