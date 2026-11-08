// 练习做完：星星 + 新贴纸 + （家长设的）奖励

import { useEffect } from 'react'
import { ui } from '../core/i18n'
import { speak } from '../services/speech'
import { sfx } from '../services/sfx'
import { useStore } from '../state/store'
import { ItemArt, Mascot, StarIcon } from '../ui/art'
import { limitReached } from './Home'
import type { SessionSummary } from './Session'

export function Reward({
  summary,
  onAgain,
  onHome,
}: {
  summary: SessionSummary
  onAgain: () => void
  onHome: () => void
}) {
  const { child } = useStore()
  const lang = child?.settings.lang ?? 'zh'
  const rate = child?.settings.speechRate ?? 0.9

  useEffect(() => {
    sfx.win()
    const lines = [ui('sessionStars', lang, { n: summary.stars })]
    if (summary.sticker) lines.push(ui('newSticker', lang))
    else if (summary.allCollected) lines.push(ui('allStickers', lang))
    if (summary.rewardReached)
      lines.push(ui('rewardReached', lang, { n: summary.rewardReached.goal, reward: summary.rewardReached.label }))
    const t = window.setTimeout(() => speak(lines.join(' '), lang, rate), 600)
    return () => window.clearTimeout(t)
  }, [summary, lang, rate])

  if (!child) return null
  const canAgain = !limitReached(child)

  return (
    <div className="screen reward">
      <Mascot size={150} mood="cheer" />
      <h1 className="reward-title">{ui('sessionStars', lang, { n: summary.stars })}</h1>
      <div className="reward-stars">
        {Array.from({ length: Math.min(summary.stars, 12) }, (_, i) => (
          <span key={i} className="pop-star" style={{ animationDelay: `${0.15 * i}s` }}>
            <StarIcon size={Math.min(44, Math.floor((window.innerWidth - 48) / Math.min(summary.stars, 12)) - 4)} />
          </span>
        ))}
      </div>
      {summary.sticker && (
        <div className="new-sticker">
          <span className="sticker-disc" style={{ background: summary.sticker.bg }}>
            <ItemArt item={{ kind: summary.sticker.kind, color: summary.sticker.color }} size={96} />
          </span>
          <p>{ui('newSticker', lang)}</p>
        </div>
      )}
      {summary.allCollected && <p className="note">{ui('allStickers', lang)}</p>}
      {summary.rewardReached && (
        <div className="reward-reached">
          <span className="big-gift">🎁</span>
          <p>{ui('rewardReached', lang, { n: summary.rewardReached.goal, reward: summary.rewardReached.label })}</p>
        </div>
      )}
      <div className="reward-actions">
        {canAgain && (
          <button type="button" className="btn primary big" onClick={onAgain}>
            ▶ {ui('playAgain', lang)}
          </button>
        )}
        <button type="button" className="btn ghost big" onClick={onHome}>
          ⌂ {ui('goHome', lang)}
        </button>
      </div>
    </div>
  )
}
