// 音效：用 Web Audio 直接合成，不需要声音文件

let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean): void {
  enabled = on
}

function audio(): AudioContext | null {
  if (!enabled) return null
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number): void {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime + start
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(ac.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

export const sfx = {
  tap() {
    tone(660, 0, 0.09, 'sine', 0.12)
  },
  correct() {
    ;[784, 988, 1175].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.16))
  },
  wrong() {
    tone(330, 0, 0.16, 'sine', 0.1)
    tone(262, 0.14, 0.24, 'sine', 0.1)
  },
  drop() {
    tone(520, 0, 0.08, 'sine', 0.12)
    tone(780, 0.06, 0.12, 'sine', 0.1)
  },
  win() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.32, 'triangle', 0.16))
  },
  /** 第一次碰屏幕时叫醒声音（Android/浏览器规定要用户先点） */
  unlock() {
    audio()
  },
}
