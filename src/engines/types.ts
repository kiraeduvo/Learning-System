import type { Lang } from '../core/types'

export interface EngineProps<Q> {
  q: Q
  lang: Lang
  /** 读出一句话 */
  say: (text: string, rate?: number) => void
  /** 题目完成（答对了） */
  onSolved: (r: { score: number; firstTry: boolean }) => void
}
