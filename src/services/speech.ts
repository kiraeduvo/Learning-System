// 语音读题：Android 用手机内建的"文字转语音"，浏览器用 speechSynthesis

import { Capacitor } from '@capacitor/core'
import { QueueStrategy, TextToSpeech } from '@capacitor-community/text-to-speech'
import { VOICE_LANGS } from '../core/i18n'
import type { Lang } from '../core/types'

const isNative = Capacitor.isNativePlatform()
const resolved = new Map<Lang, string | null>()
let seq = 0

export type VoiceStatus = 'ok' | 'fallback' | 'missing'

async function resolveLang(lang: Lang): Promise<string | null> {
  if (resolved.has(lang)) return resolved.get(lang) ?? null
  for (const code of VOICE_LANGS[lang]) {
    try {
      const { supported } = await TextToSpeech.isLanguageSupported({ lang: code })
      if (supported) {
        resolved.set(lang, code)
        return code
      }
    } catch {
      // 继续试下一个
    }
  }
  // 浏览器里语音列表可能还没载入，直接用第一个试试看
  const fallback = isNative ? null : VOICE_LANGS[lang][0]
  resolved.set(lang, fallback)
  return fallback
}

/** 读出一句话（会打断上一句） */
export async function speak(text: string, lang: Lang, rate = 0.9): Promise<void> {
  const my = ++seq
  const code = await resolveLang(lang)
  if (my !== seq || !code) return
  try {
    await TextToSpeech.speak({
      text,
      lang: code,
      rate,
      pitch: 1.1,
      volume: 1,
      queueStrategy: QueueStrategy.Flush,
    })
  } catch {
    // 没有语音也可以继续玩
  }
}

export function stopSpeaking(): void {
  seq++
  TextToSpeech.stop().catch(() => {})
}

/** 家长区用：检查这种语言有没有语音 */
export async function voiceStatus(lang: Lang): Promise<VoiceStatus> {
  resolved.delete(lang)
  for (const [i, code] of VOICE_LANGS[lang].entries()) {
    try {
      const { supported } = await TextToSpeech.isLanguageSupported({ lang: code })
      if (supported) return i === 0 ? 'ok' : 'fallback'
    } catch {
      // ignore
    }
  }
  return 'missing'
}

/** 打开 Android 的语音资料安装画面 */
export async function openVoiceInstall(): Promise<boolean> {
  if (!isNative) return false
  try {
    await TextToSpeech.openInstall()
    return true
  } catch {
    return false
  }
}
