// 有两个以上的孩子时：点头像选是谁在玩

import { useStore } from '../state/store'
import { Avatar } from '../ui/art'

export function PickChild({ onPicked }: { onPicked: () => void }) {
  const { data, setData } = useStore()
  return (
    <div className="screen pick-child">
      <div className="pick-grid">
        {data.children.map((c) => (
          <button
            key={c.id}
            type="button"
            className="pick-card"
            onClick={() => {
              setData((d) => ({ ...d, activeChildId: c.id }))
              onPicked()
            }}
          >
            <Avatar id={c.avatar} size={120} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
