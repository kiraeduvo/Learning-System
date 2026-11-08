// 一次练习：按计划一题一题出，答对有星星，做完有贴纸

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dateKey } from '../core/dates'
import { generateQuestion } from '../core/generators'
import { praise, promptText } from '../core/i18n'
import { applyResult, planSession } from '../core/learning'
import { defaultRng } from '../core/rng'
import { pickNewSticker, type StickerDef } from '../core/stickers'
import type { ChildProfile, Question, SkillId } from '../core/types'
import { ChoiceEngine } from '../engines/ChoiceEngine'
import { CountEngine } from '../engines/CountEngine'
import { SortEngine } from '../engines/SortEngine'
import { TraceEngine } from '../engines/TraceEngine'
import { speak, stopSpeaking } from '../services/speech'
import { sfx } from '../services/sfx'
import { useStore } from '../state/store'
import { Mascot, StarIcon, type Mood } from '../ui/art'

export interface SessionSummary {
  stars: number
  sticker: StickerDef | null
  allCollected: boolean
  rewardReached: { goal: number; label: string } | null
  focusSkill?: SkillId
}

export function Session({
  focusSkill,
  onDone,
  onExit,
}: {
  focusSkill?: SkillId
  onDone: (s: SessionSummary) => void
  onExit: () => void
}) {
  const { child, updateChild } = useStore()
  const childRef = useRef<ChildProfile | null>(child)
  childRef.current = child
  const lang = child?.settings.lang ?? 'zh'
  const rate = child?.settings.speechRate ?? 0.9

  // 开始时安排好要练哪些技能（之后不再变）
  const plan = useMemo(
    () =>
      child
        ? planSession(child.progress, {
            questionsPerSession: child.settings.questionsPerSession,
            unlockAll: child.settings.unlockAll,
            now: Date.now(),
            rng: defaultRng,
            focusSkill,
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const startedAt = useRef(Date.now())
  const recent = useRef<Record<string, string[]>>({})
  const results = useRef<{ firstTry: boolean }[]>([])
  const [index, setIndex] = useState(0)
  const [question, setQuestion] = useState<Question | null>(null)
  const [mood, setMood] = useState<Mood>('happy')
  const [celebrate, setCelebrate] = useState(false)
  const [starsThisSession, setStarsThisSession] = useState(0)

  const say = useCallback((text: string, r?: number) => void speak(text, lang, r ?? rate), [lang, rate])

  // 做到这一题才生成，用最新的难度
  useEffect(() => {
    const c = childRef.current
    if (!c || index >= plan.length) return
    const skill = plan[index]
    const d = c.progress[skill]?.difficulty ?? 1
    const q = generateQuestion(skill, d, defaultRng, recent.current[skill] ?? [])
    recent.current[skill] = [...(recent.current[skill] ?? []), q.signature].slice(-5)
    setQuestion(q)
    setMood('happy')
    const t = window.setTimeout(() => say(promptText(q.prompt, lang)), 350)
    return () => window.clearTimeout(t)
  }, [index, plan, lang, say])

  useEffect(() => () => stopSpeaking(), [])

  const finish = useCallback(
    (completed: number) => {
      const c = childRef.current
      if (!c) return
      const firstTry = results.current.filter((r) => r.firstTry).length
      const now = Date.now()
      const fullSession = completed === plan.length
      const sticker = fullSession ? pickNewSticker(c.stickers, defaultRng) : null
      let rewardReached: SessionSummary['rewardReached'] = null
      if (c.reward) {
        const before = c.stars - completed - c.reward.startStars
        const after = c.stars - c.reward.startStars
        if (before < c.reward.goalStars && after >= c.reward.goalStars)
          rewardReached = { goal: c.reward.goalStars, label: c.reward.label }
      }
      updateChild((ch) => ({
        ...ch,
        stickers: sticker ? [...ch.stickers, sticker.id] : ch.stickers,
        sessions: [
          ...ch.sessions,
          {
            date: dateKey(startedAt.current),
            startedAt: startedAt.current,
            durationSec: Math.round((now - startedAt.current) / 1000),
            questions: completed,
            firstTryCorrect: firstTry,
            skills: [...new Set(plan.slice(0, completed))],
          },
        ].slice(-200),
      }))
      onDone({
        stars: completed,
        sticker,
        allCollected: fullSession && !sticker,
        rewardReached,
        focusSkill,
      })
    },
    [plan, updateChild, onDone, focusSkill],
  )

  const onSolved = useCallback(
    (r: { score: number; firstTry: boolean }) => {
      if (!question) return
      results.current.push({ firstTry: r.firstTry })
      sfx.correct()
      setMood('cheer')
      setCelebrate(true)
      setStarsThisSession((s) => s + 1)
      say(praise(lang))
      // 马上存进度（中途离开也不会丢）
      updateChild((ch) => ({
        ...ch,
        stars: ch.stars + 1,
        progress: {
          ...ch.progress,
          [question.skill]: applyResult(ch.progress[question.skill], { skill: question.skill, ...r }, Date.now()),
        },
      }))
      window.setTimeout(() => {
        setCelebrate(false)
        if (index + 1 >= plan.length) finish(index + 1)
        else setIndex(index + 1)
      }, 1600)
    },
    [question, index, plan.length, say, lang, updateChild, finish],
  )

  if (!child || !question) return <div className="screen session" />

  const engineProps = { lang, say, onSolved }
  return (
    <div className="screen session">
      <header className="session-top">
        <button
          type="button"
          className="round-btn"
          onClick={() => {
            stopSpeaking()
            if (index > 0) finish(index)
            else onExit()
          }}
          aria-label="home"
        >
          ⌂
        </button>
        <div className="progress-dots" aria-label="progress">
          {plan.map((_, i) => (
            <span key={i} className={`pdot ${i < index ? 'done' : i === index ? 'now' : ''}`} />
          ))}
        </div>
        <div className="session-stars">
          <StarIcon size={26} />
          <span>{starsThisSession}</span>
        </div>
      </header>

      <div className="prompt-row">
        <span className="mascot-small">
          <Mascot size={64} mood={mood} />
        </span>
        <button type="button" className="prompt-bubble" onClick={() => say(promptText(question.prompt, lang))}>
          <span className="speaker">🔊</span>
          <span className="prompt-text">{promptText(question.prompt, lang)}</span>
        </button>
      </div>

      <div className="engine-wrap" key={`${index}-${question.signature}`} data-engine={question.engine}>
        {question.engine === 'count' && <CountEngine q={question} {...engineProps} />}
        {question.engine === 'choice' && <ChoiceEngine q={question} {...engineProps} />}
        {question.engine === 'sort' && <SortEngine q={question} {...engineProps} />}
        {question.engine === 'trace' && <TraceEngine q={question} {...engineProps} />}
      </div>

      {celebrate && (
        <div className="celebrate" aria-hidden="true">
          <div className="burst">
            <StarIcon size={150} />
          </div>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className="confetti" style={{ ['--i' as string]: i }} />
          ))}
        </div>
      )}
    </div>
  )
}
