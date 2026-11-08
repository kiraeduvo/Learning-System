// 家长锁：要答对一题大人的算术才能进家长区（4 岁小孩打不开）

import { useState } from 'react'

function newQuestion() {
  const a = 11 + Math.floor(Math.random() * 15)
  const b = 6 + Math.floor(Math.random() * 9)
  return { a, b }
}

export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [q, setQ] = useState(newQuestion)
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)

  const press = (k: string) => {
    if (k === 'del') {
      setInput((s) => s.slice(0, -1))
      return
    }
    const next = (input + k).slice(0, 3)
    setInput(next)
    const answer = String(q.a + q.b)
    if (next.length >= answer.length) {
      if (next === answer) onPass()
      else {
        setShake(true)
        window.setTimeout(() => {
          setShake(false)
          setInput('')
          setQ(newQuestion())
        }, 500)
      }
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className={`gate ${shake ? 'shake' : ''}`} onClick={(e) => e.stopPropagation()}>
        <h2>家长验证</h2>
        <p className="gate-q">
          {q.a} + {q.b} = <span className="gate-input">{input || '?'}</span>
        </p>
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0'].map((k) => (
            <button key={k} type="button" className="key" onClick={() => press(k)}>
              {k === 'del' ? '⌫' : k}
            </button>
          ))}
          <button type="button" className="key cancel" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
