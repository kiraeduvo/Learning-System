// 日期小工具（用手机的本地时间）

export function dateKey(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/**
 * 马来西亚学前班按出生年份分班：今年减出生年份。
 * 例：2022 年出生，2026 年是 4+，2027 年是 5+。
 */
export function preschoolLevel(birthYear: number, now: number): number {
  return new Date(now).getFullYear() - birthYear
}
