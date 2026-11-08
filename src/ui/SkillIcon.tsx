import type { SkillDef } from '../core/skills'
import { Basket, ItemArt } from './art'

/** 主页游戏格子上的小图 */
export function SkillIcon({ skill, size }: { skill: SkillDef; size: number }) {
  const s = size
  switch (skill.icon) {
    case 'count':
      return (
        <span className="skill-icon column">
          <span className="icon-row">
            {Array.from({ length: 3 }, (_, i) => (
              <ItemArt
                key={i}
                item={{ kind: skill.id === 'count10' ? 'fish' : 'apple' }}
                size={s * 0.27}
              />
            ))}
          </span>
          <span className="skill-icon-label">{skill.id === 'count10' ? '1–10' : '1–5'}</span>
        </span>
      )
    case 'numeral':
      return (
        <span className="skill-icon numeral-icon" style={{ fontSize: s * 0.5 }}>
          {skill.id === 'numeral10' ? '8' : '3'}
        </span>
      )
    case 'moreLess':
      return (
        <span className="skill-icon">
          <span className="mini-stack">
            <ItemArt item={{ kind: 'ball', color: 'blue' }} size={s * 0.26} />
          </span>
          <span className="mini-stack">
            {[0, 1, 2].map((i) => (
              <ItemArt key={i} item={{ kind: 'ball', color: 'blue' }} size={s * 0.26} />
            ))}
          </span>
        </span>
      )
    case 'size':
      return (
        <span className="skill-icon">
          <ItemArt item={{ kind: 'balloon', color: 'green' }} size={s * 0.52} />
          <ItemArt item={{ kind: 'balloon', color: 'green' }} size={s * 0.28} />
        </span>
      )
    case 'shapes':
      return (
        <span className="skill-icon">
          <ItemArt item={{ kind: 'triangle', color: 'yellow' }} size={s * 0.3} />
          <ItemArt item={{ kind: 'circle', color: 'red' }} size={s * 0.27} />
          <ItemArt item={{ kind: 'square', color: 'blue' }} size={s * 0.25} />
        </span>
      )
    case 'sortColor':
      return (
        <span className="skill-icon">
          <Basket width={s * 0.7} color="red" />
        </span>
      )
    case 'sortShape':
      return (
        <span className="skill-icon">
          <Basket width={s * 0.7} shape="triangle" />
        </span>
      )
    case 'pattern':
      return (
        <span className="skill-icon">
          <ItemArt item={{ kind: 'apple' }} size={s * 0.22} />
          <ItemArt item={{ kind: 'fish' }} size={s * 0.22} />
          <ItemArt item={{ kind: 'apple' }} size={s * 0.22} />
          <span className="skill-icon-q" style={{ fontSize: s * 0.24 }}>
            ?
          </span>
        </span>
      )
    case 'trace':
      return (
        <span className="skill-icon trace-icon" style={{ fontSize: s * 0.5 }}>
          2
        </span>
      )
  }
}
