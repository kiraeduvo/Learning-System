// 存档：全部存在手机里（不需要上网）。也可以导出/还原备份。

import { Preferences } from '@capacitor/preferences'
import type { AppData, AvatarId, ChildProfile, ChildSettings, Lang } from '../core/types'

const KEY = 'learning-system-data-v1'
const BACKUP_TAG = 'learning-system-backup'

export const DEFAULT_SETTINGS: ChildSettings = {
  lang: 'zh',
  questionsPerSession: 8,
  dailySessionLimit: 0,
  speechRate: 0.9,
  sound: true,
  unlockAll: false,
}

export function emptyData(): AppData {
  return { version: 1, activeChildId: null, children: [] }
}

export function newChild(name: string, birthYear: number, avatar: AvatarId, lang: Lang): ChildProfile {
  return {
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name,
    birthYear,
    avatar,
    settings: { ...DEFAULT_SETTINGS, lang },
    reward: null,
    stars: 0,
    stickers: [],
    progress: {},
    sessions: [],
  }
}

const AVATARS: AvatarId[] = ['bear', 'bunny', 'chick', 'cat']
const LANGS: Lang[] = ['zh', 'ms', 'en']

/** 读进来的资料补齐缺少的栏位（以后加新功能时，旧资料也能用） */
function normalizeChild(raw: unknown): ChildProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Partial<ChildProfile>
  if (typeof c.id !== 'string' || typeof c.name !== 'string') return null
  const s = (c.settings ?? {}) as Partial<ChildSettings>
  return {
    id: c.id,
    name: c.name,
    birthYear: typeof c.birthYear === 'number' ? c.birthYear : new Date().getFullYear() - 4,
    avatar: AVATARS.includes(c.avatar as AvatarId) ? (c.avatar as AvatarId) : 'bear',
    settings: {
      ...DEFAULT_SETTINGS,
      ...s,
      lang: LANGS.includes(s.lang as Lang) ? (s.lang as Lang) : DEFAULT_SETTINGS.lang,
    },
    reward: c.reward && typeof c.reward.goalStars === 'number' ? c.reward : null,
    stars: typeof c.stars === 'number' ? c.stars : 0,
    stickers: Array.isArray(c.stickers) ? c.stickers.filter((x) => typeof x === 'string') : [],
    progress: c.progress && typeof c.progress === 'object' ? c.progress : {},
    sessions: Array.isArray(c.sessions) ? c.sessions.slice(-200) : [],
  }
}

export function normalizeData(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<AppData>
  if (d.version !== 1 || !Array.isArray(d.children)) return null
  const children = d.children.map(normalizeChild).filter((c): c is ChildProfile => c !== null)
  const activeChildId = children.some((c) => c.id === d.activeChildId) ? d.activeChildId! : (children[0]?.id ?? null)
  return { version: 1, activeChildId, children }
}

export async function loadData(): Promise<AppData> {
  try {
    const { value } = await Preferences.get({ key: KEY })
    if (value) return normalizeData(JSON.parse(value)) ?? emptyData()
  } catch {
    // 资料坏了就从头开始（家长可以用备份还原）
  }
  return emptyData()
}

export async function saveData(data: AppData): Promise<void> {
  try {
    await Preferences.set({ key: KEY, value: JSON.stringify(data) })
  } catch {
    // ignore
  }
}

export function makeBackup(data: AppData): string {
  return JSON.stringify({ app: BACKUP_TAG, exportedAt: new Date().toISOString(), data })
}

/** 还原备份；格式不对会丢出错误 */
export function parseBackup(text: string): AppData {
  const parsed = JSON.parse(text.trim()) as { app?: string; data?: unknown }
  if (parsed.app !== BACKUP_TAG) throw new Error('不是这个 app 的备份')
  const data = normalizeData(parsed.data)
  if (!data) throw new Error('备份资料不完整')
  return data
}
