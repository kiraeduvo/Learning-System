// 家长区：设定、进度、奖励、语音、备份（只有中文介面）

import { Share } from '@capacitor/share'
import { useEffect, useState, type ReactNode } from 'react'
import { dateKey, preschoolLevel } from '../core/dates'
import { LANG_LABEL } from '../core/i18n'
import { isUnlocked, MASTERY_LABEL_ZH, masteryLevel } from '../core/learning'
import { SKILLS, STRAND_NAMES, type Strand } from '../core/skills'
import type { ChildProfile, ChildSettings, Lang } from '../core/types'
import { openVoiceInstall, speak, voiceStatus, type VoiceStatus } from '../services/speech'
import { makeBackup, newChild, parseBackup } from '../services/storage'
import { useStore } from '../state/store'
import { Avatar } from '../ui/art'
import { ChildForm } from './Setup'
import { sessionsToday } from './Home'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="p-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Seg<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button type="button" className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on}>
        <span />
      </button>
    </label>
  )
}

function formatDate(ts: number): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function ProgressSection({ child }: { child: ChildProfile }) {
  const sessions = child.sessions
  const totalQ = sessions.reduce((a, s) => a + s.questions, 0)
  const totalFirst = sessions.reduce((a, s) => a + s.firstTryCorrect, 0)
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000
  const daysThisWeek = new Set(sessions.filter((s) => s.startedAt >= weekAgo).map((s) => s.date)).size
  const minutes = Math.round(sessions.reduce((a, s) => a + s.durationSec, 0) / 60)
  const weak = SKILLS.filter((s) => {
    const p = child.progress[s.id]
    return p && p.attempts >= 3 && p.score < 0.5
  })
  const strands = Object.keys(STRAND_NAMES) as Strand[]

  return (
    <Section title="学习进度">
      <div className="stats">
        <div>
          <b>{sessions.length}</b>
          <span>练习次数</span>
        </div>
        <div>
          <b>{totalQ}</b>
          <span>做过的题</span>
        </div>
        <div>
          <b>{totalQ ? Math.round((totalFirst / totalQ) * 100) : 0}%</b>
          <span>第一次就对</span>
        </div>
        <div>
          <b>{daysThisWeek}</b>
          <span>这 7 天练习天数</span>
        </div>
        <div>
          <b>{minutes}</b>
          <span>总分钟</span>
        </div>
        <div>
          <b>{sessionsToday(child)}</b>
          <span>今天练习次数</span>
        </div>
      </div>
      {weak.length > 0 && (
        <p className="advice">
          建议多练：{weak.map((s) => s.nameZh).join('、')}
          （可以在主页点那个游戏单独练）
        </p>
      )}
      {strands.map((strand) => (
        <div key={strand} className="strand">
          <h3>
            {STRAND_NAMES[strand].zh} <small>{STRAND_NAMES[strand].ms}</small>
          </h3>
          {SKILLS.filter((s) => s.strand === strand).map((s) => {
            const p = child.progress[s.id]
            const level = masteryLevel(p)
            const open = isUnlocked(s, child.progress, child.settings.unlockAll)
            return (
              <div key={s.id} className="skill-row">
                <div className="skill-name">
                  {s.nameZh}
                  <small>
                    建议 {s.age}+{!open && ' · 未开放'}
                  </small>
                </div>
                <div className={`mastery m${level}`}>
                  {[1, 2, 3].map((i) => (
                    <span key={i} className={level >= i ? 'on' : ''} />
                  ))}
                  <em>{MASTERY_LABEL_ZH[level]}</em>
                </div>
                <div className="skill-meta">
                  {p ? (
                    <>
                      {Math.round((p.firstTryCorrect / Math.max(p.attempts, 1)) * 100)}% · {p.attempts} 题 · 难度{' '}
                      {p.difficulty}/3 · {formatDate(p.lastPracticed)}
                    </>
                  ) : (
                    '还没练过'
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
      {sessions.length > 0 && (
        <div className="recent">
          <h3>最近练习</h3>
          {sessions
            .slice(-7)
            .reverse()
            .map((s) => (
              <div key={s.startedAt} className="recent-row">
                <span>{s.date}</span>
                <span>
                  {s.firstTryCorrect}/{s.questions} 第一次就对
                </span>
                <span>{Math.max(1, Math.round(s.durationSec / 60))} 分钟</span>
              </div>
            ))}
        </div>
      )}
    </Section>
  )
}

function VoiceSection({ lang, rate }: { lang: Lang; rate: number }) {
  const [status, setStatus] = useState<VoiceStatus | 'checking'>('checking')
  useEffect(() => {
    setStatus('checking')
    void voiceStatus(lang).then(setStatus)
  }, [lang])
  const sample: Record<Lang, string> = {
    zh: '你好！我们来数一数：一、二、三。',
    ms: 'Hai! Jom kira: satu, dua, tiga.',
    en: "Hi! Let's count: one, two, three.",
  }
  return (
    <Section title="语音">
      <p>
        现在的语言：{LANG_LABEL[lang]} ·{' '}
        {status === 'checking'
          ? '检查中…'
          : status === 'ok'
            ? '✅ 手机有这种语音'
            : status === 'fallback'
              ? '⚠️ 用相近的语音代替（例如马来文用印尼文语音）'
              : '❌ 手机没有这种语音'}
      </p>
      <div className="row-actions">
        <button type="button" className="btn" onClick={() => speak(sample[lang], lang, rate)}>
          🔊 测试语音
        </button>
        <button type="button" className="btn ghost" onClick={() => void openVoiceInstall()}>
          下载语音资料
        </button>
      </div>
      <p className="hint">
        没有声音的话：到手机的「设置 → 系统 → 语言和输入法 → 文字转语音（TTS）」，选 Google 语音服务，下载中文 / 马来文 /
        英文的语音资料。手机音量也要打开。
      </p>
    </Section>
  )
}

function BackupSection() {
  const { data, setData } = useStore()
  const [text, setText] = useState('')
  const [shown, setShown] = useState('')
  const [msg, setMsg] = useState('')

  const exportIt = async () => {
    const backup = makeBackup(data)
    try {
      await Share.share({ title: '学习乐园备份', text: backup, dialogTitle: '把备份存到 WhatsApp / Google Drive' })
      setMsg('已打开分享。可以发给自己的 WhatsApp 或存到 Google Drive。')
    } catch {
      setShown(backup)
      try {
        await navigator.clipboard.writeText(backup)
        setMsg('已复制备份文字，也显示在下面。')
      } catch {
        setMsg('请复制下面的备份文字，存到安全的地方。')
      }
    }
  }

  return (
    <Section title="资料备份">
      <p className="hint">所有资料只存在这台手机里。换手机或重装前，先导出备份。</p>
      <div className="row-actions">
        <button type="button" className="btn" onClick={() => void exportIt()}>
          导出备份
        </button>
      </div>
      {shown && <textarea readOnly value={shown} rows={4} onFocus={(e) => e.currentTarget.select()} />}
      <p>还原备份（会取代现在的资料）：</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="把备份文字贴在这里" />
      <div className="row-actions">
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            try {
              const restored = parseBackup(text)
              if (!window.confirm('确定要用备份取代现在的资料吗？')) return
              setData(() => restored)
              setText('')
              setMsg('还原好了。')
            } catch (e) {
              setMsg(e instanceof Error ? e.message : '备份格式不对')
            }
          }}
        >
          还原
        </button>
      </div>
      {msg && <p className="note">{msg}</p>}
    </Section>
  )
}

export function Parent({ onBack }: { onBack: () => void }) {
  const { data, child, setData, updateChild } = useStore()
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [goal, setGoal] = useState(child?.reward?.goalStars ?? 30)
  const [label, setLabel] = useState(child?.reward?.label ?? '')

  if (!child) return null
  const s = child.settings
  const set = (patch: Partial<ChildSettings>) => updateChild((c) => ({ ...c, settings: { ...c.settings, ...patch } }))
  const level = preschoolLevel(child.birthYear, Date.now())
  const rewardProgress = child.reward ? Math.max(0, child.stars - child.reward.startStars) : 0

  return (
    <div className="screen parent">
      <header className="parent-top">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← 返回
        </button>
        <h1>家长区</h1>
        <span />
      </header>

      <div className="parent-body">
        <Section title="孩子">
          <div className="children-row">
            {data.children.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`child-tab ${c.id === child.id ? 'on' : ''}`}
                onClick={() => setData((d) => ({ ...d, activeChildId: c.id }))}
              >
                <Avatar id={c.avatar} size={36} />
                {c.name}
              </button>
            ))}
            <button type="button" className="child-tab add" onClick={() => setAdding(true)}>
              ＋ 添加
            </button>
          </div>
          {adding && (
            <ChildForm
              submitLabel="添加"
              onCancel={() => setAdding(false)}
              onSubmit={(v) => {
                const c = newChild(v.name, v.birthYear, v.avatar, v.lang)
                setData((d) => ({ ...d, children: [...d.children, c], activeChildId: c.id }))
                setAdding(false)
              }}
            />
          )}
          {!adding &&
            (editing ? (
              <ChildForm
                initial={{ name: child.name, birthYear: child.birthYear, avatar: child.avatar, lang: s.lang }}
                submitLabel="保存"
                onCancel={() => setEditing(false)}
                onSubmit={(v) => {
                  updateChild((c) => ({
                    ...c,
                    name: v.name,
                    birthYear: v.birthYear,
                    avatar: v.avatar,
                    settings: { ...c.settings, lang: v.lang },
                  }))
                  setEditing(false)
                }}
              />
            ) : (
              <div className="profile-line">
                <Avatar id={child.avatar} size={56} />
                <div>
                  <b>{child.name}</b>
                  <div>
                    {child.birthYear} 年出生 · 今年 {level}+{level <= 6 ? '（学前班）' : ''}
                  </div>
                </div>
                <button type="button" className="btn ghost" onClick={() => setEditing(true)}>
                  修改
                </button>
              </div>
            ))}
        </Section>

        <Section title="学习设置">
          <div className="field">
            <span>孩子听的语言</span>
            <Seg<Lang>
              value={s.lang}
              options={(['zh', 'ms', 'en'] as Lang[]).map((l) => ({ value: l, label: LANG_LABEL[l] }))}
              onChange={(lang) => set({ lang })}
            />
          </div>
          <div className="field">
            <span>每次练习几题</span>
            <Seg<number>
              value={s.questionsPerSession}
              options={[6, 8, 10, 12].map((n) => ({ value: n, label: `${n} 题` }))}
              onChange={(questionsPerSession) => set({ questionsPerSession })}
            />
          </div>
          <div className="field">
            <span>每天最多练习</span>
            <Seg<number>
              value={s.dailySessionLimit}
              options={[0, 1, 2, 3, 5].map((n) => ({ value: n, label: n === 0 ? '不限' : `${n} 次` }))}
              onChange={(dailySessionLimit) => set({ dailySessionLimit })}
            />
          </div>
          <div className="field">
            <span>说话速度</span>
            <Seg<number>
              value={s.speechRate}
              options={[
                { value: 0.75, label: '慢' },
                { value: 0.9, label: '正常' },
                { value: 1.05, label: '快' },
              ]}
              onChange={(speechRate) => set({ speechRate })}
            />
          </div>
          <Toggle label="音效" on={s.sound} onChange={(sound) => set({ sound })} />
          <Toggle
            label="全部游戏都开放（不用按顺序）"
            on={s.unlockAll}
            onChange={(unlockAll) => set({ unlockAll })}
          />
          {s.dailySessionLimit > 0 && sessionsToday(child) >= s.dailySessionLimit && (
            <p className="note">今天的次数已经用完。想让孩子多玩一次，可以把上限改成"不限"。</p>
          )}
        </Section>

        <Section title="奖励目标">
          {child.reward ? (
            <>
              <p>
                集满 <b>{child.reward.goalStars}</b> 颗星星 → <b>{child.reward.label}</b>
              </p>
              <p>
                现在：{Math.min(rewardProgress, child.reward.goalStars)}/{child.reward.goalStars}
                {rewardProgress >= child.reward.goalStars && ' · ✅ 已经达到，可以给奖励了！'}
              </p>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    updateChild((c) => ({ ...c, reward: c.reward ? { ...c.reward, startStars: c.stars } : null }))
                  }
                >
                  奖励给了，重新开始算
                </button>
                <button type="button" className="btn ghost" onClick={() => updateChild((c) => ({ ...c, reward: null }))}>
                  取消目标
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <span>要集几颗星星</span>
                <Seg<number>
                  value={goal}
                  options={[10, 20, 30, 50, 100].map((n) => ({ value: n, label: String(n) }))}
                  onChange={setGoal}
                />
              </div>
              <label>
                奖励是什么
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例如：去公园玩、一个小礼物" maxLength={30} />
              </label>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn primary"
                  disabled={!label.trim()}
                  onClick={() =>
                    updateChild((c) => ({ ...c, reward: { goalStars: goal, label: label.trim(), startStars: c.stars } }))
                  }
                >
                  设定目标
                </button>
              </div>
            </>
          )}
        </Section>

        <ProgressSection child={child} />
        <VoiceSection lang={s.lang} rate={s.speechRate} />
        <BackupSection />

        <Section title="关于">
          <p className="hint">
            学习乐园 · 学前数学（Matematik Awal）。技能按马来西亚学前课纲的三个部分分类：Pranombor、Konsep Nombor、Bentuk dan
            Ruang。建议年龄是大概的，官方 DSKP 的编号之后再对照补上。
          </p>
          <p className="hint">今天：{dateKey(Date.now())}</p>
          {data.children.length > 1 && (
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                if (!window.confirm(`确定删除 ${child.name} 的所有资料？`)) return
                setData((d) => {
                  const children = d.children.filter((c) => c.id !== child.id)
                  return { ...d, children, activeChildId: children[0]?.id ?? null }
                })
              }}
            >
              删除这个孩子的资料
            </button>
          )}
        </Section>
      </div>
    </div>
  )
}
