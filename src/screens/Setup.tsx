// 第一次打开：设定孩子的资料

import { useState } from 'react'
import { preschoolLevel } from '../core/dates'
import { LANG_LABEL } from '../core/i18n'
import type { AvatarId, ChildProfile, Lang } from '../core/types'
import { newChild, parseBackup } from '../services/storage'
import { useStore } from '../state/store'
import { Avatar, Mascot } from '../ui/art'

const AVATARS: AvatarId[] = ['bear', 'bunny', 'chick', 'cat']

export function ChildForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Pick<ChildProfile, 'name' | 'birthYear' | 'avatar'> & { lang: Lang }
  submitLabel: string
  onSubmit: (v: { name: string; birthYear: number; avatar: AvatarId; lang: Lang }) => void
  onCancel?: () => void
}) {
  const thisYear = new Date().getFullYear()
  const [name, setName] = useState(initial?.name ?? '')
  const [birthYear, setBirthYear] = useState(initial?.birthYear ?? thisYear - 4)
  const [avatar, setAvatar] = useState<AvatarId>(initial?.avatar ?? 'bear')
  const [lang, setLang] = useState<Lang>(initial?.lang ?? 'zh')
  const years = Array.from({ length: 10 }, (_, i) => thisYear - 2 - i)
  const level = preschoolLevel(birthYear, Date.now())

  return (
    <form
      className="child-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name: name.trim() || '宝贝', birthYear, avatar, lang })
      }}
    >
      <label>
        孩子的名字
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：小明" maxLength={12} />
      </label>
      <label>
        出生年份
        <select value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <small>
          {thisYear} 年按出生年份算是 {level}+
          {level <= 6 ? `（学前班 ${level} 岁组）` : '（已经是小学年龄）'}
        </small>
      </label>
      <div className="field">
        <span>头像</span>
        <div className="avatar-row">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              className={`avatar-pick ${avatar === a ? 'on' : ''}`}
              onClick={() => setAvatar(a)}
              aria-label={a}
            >
              <Avatar id={a} size={56} />
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>孩子听的语言</span>
        <div className="seg">
          {(['zh', 'ms', 'en'] as Lang[]).map((l) => (
            <button key={l} type="button" className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </div>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            取消
          </button>
        )}
        <button type="submit" className="btn primary">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

export function Setup() {
  const { setData } = useStore()
  const [restoring, setRestoring] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="screen setup">
      <div className="setup-card">
        <div className="setup-head">
          <Mascot size={88} mood="cheer" />
          <div>
            <h1>欢迎来到学习乐园！</h1>
            <p>先设定孩子的资料（之后可以在家长区修改）。</p>
          </div>
        </div>
        {!restoring ? (
          <>
            <ChildForm
              submitLabel="开始"
              onSubmit={(v) => {
                const c = newChild(v.name, v.birthYear, v.avatar, v.lang)
                setData((d) => ({ ...d, children: [...d.children, c], activeChildId: c.id }))
              }}
            />
            <button type="button" className="link" onClick={() => setRestoring(true)}>
              我有备份，要还原
            </button>
          </>
        ) : (
          <div className="restore">
            <p>把之前导出的备份文字贴在这里：</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} />
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setRestoring(false)}>
                返回
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  try {
                    const data = parseBackup(text)
                    setData(() => data)
                  } catch (e) {
                    setError(e instanceof Error ? e.message : '备份格式不对')
                  }
                }}
              >
                还原
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
