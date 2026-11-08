// 贴纸册

import { ui } from '../core/i18n'
import { STICKERS } from '../core/stickers'
import { useStore } from '../state/store'
import { ItemArt } from '../ui/art'
import { useViewport } from '../ui/hooks'

export function Stickers({ onBack }: { onBack: () => void }) {
  const { child } = useStore()
  const { w, h } = useViewport()
  if (!child) return null
  const lang = child.settings.lang
  const cols = w > h ? 8 : 4
  const cell = Math.floor(Math.min((w - 48) / cols - 10, 120))

  return (
    <div className="screen stickers">
      <header className="session-top">
        <button type="button" className="round-btn" onClick={onBack} aria-label="back">
          ⌂
        </button>
        <h1 className="screen-title">{ui('stickerBook', lang)}</h1>
        <span className="sticker-count">
          {child.stickers.length}/{STICKERS.length}
        </span>
      </header>
      <div className="sticker-grid" style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)` }}>
        {STICKERS.map((s) => {
          const owned = child.stickers.includes(s.id)
          return (
            <span
              key={s.id}
              className={`sticker-disc ${owned ? '' : 'locked'}`}
              style={{ width: cell, height: cell, background: owned ? s.bg : undefined }}
            >
              {owned ? <ItemArt item={{ kind: s.kind, color: s.color }} size={cell * 0.72} /> : '?'}
            </span>
          )
        })}
      </div>
    </div>
  )
}
