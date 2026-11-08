// 三种语言的文字（孩子听到的语音也是用这些）

import type { ColorName, Lang, ObjectKind, Prompt, ShapeKind } from './types'

// 名字 + 量词（中文）/ penjodoh bilangan（马来文）/ 复数（英文）
const OBJECT_WORDS: Record<ObjectKind, { zh: [string, string]; ms: [string, string]; en: [string, string] }> = {
  apple: { zh: ['个', '苹果'], ms: ['biji', 'epal'], en: ['apple', 'apples'] },
  fish: { zh: ['条', '鱼'], ms: ['ekor', 'ikan'], en: ['fish', 'fish'] },
  star: { zh: ['颗', '星星'], ms: ['butir', 'bintang'], en: ['star', 'stars'] },
  ball: { zh: ['个', '球'], ms: ['biji', 'bola'], en: ['ball', 'balls'] },
  car: { zh: ['辆', '车子'], ms: ['buah', 'kereta'], en: ['car', 'cars'] },
  duck: { zh: ['只', '鸭子'], ms: ['ekor', 'itik'], en: ['duck', 'ducks'] },
  flower: { zh: ['朵', '花'], ms: ['kuntum', 'bunga'], en: ['flower', 'flowers'] },
  balloon: { zh: ['个', '气球'], ms: ['biji', 'belon'], en: ['balloon', 'balloons'] },
  cat: { zh: ['只', '小猫'], ms: ['ekor', 'kucing'], en: ['cat', 'cats'] },
}

export const COLOR_WORDS: Record<ColorName, Record<Lang, string>> = {
  red: { zh: '红色', ms: 'merah', en: 'red' },
  blue: { zh: '蓝色', ms: 'biru', en: 'blue' },
  yellow: { zh: '黄色', ms: 'kuning', en: 'yellow' },
  green: { zh: '绿色', ms: 'hijau', en: 'green' },
  purple: { zh: '紫色', ms: 'ungu', en: 'purple' },
  orange: { zh: '橙色', ms: 'oren', en: 'orange' },
  pink: { zh: '粉红色', ms: 'merah jambu', en: 'pink' },
}

export const SHAPE_WORDS: Record<ShapeKind, Record<Lang, string>> = {
  circle: { zh: '圆形', ms: 'bulatan', en: 'circle' },
  triangle: { zh: '三角形', ms: 'segi tiga', en: 'triangle' },
  square: { zh: '正方形', ms: 'segi empat sama', en: 'square' },
  rectangle: { zh: '长方形', ms: 'segi empat tepat', en: 'rectangle' },
}

const NUMBER_WORDS: Record<Lang, string[]> = {
  zh: ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'],
  ms: ['kosong', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'lapan', 'sembilan', 'sepuluh'],
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
}

/** 数数时读的数字（中文 "两个" 不用，单独数数读 "一、二、三"） */
export function numberWord(n: number, lang: Lang): string {
  return NUMBER_WORDS[lang][n] ?? String(n)
}

export function objectName(kind: ObjectKind, lang: Lang): string {
  const w = OBJECT_WORDS[kind]
  if (lang === 'zh') return w.zh[1]
  if (lang === 'ms') return w.ms[1]
  return w.en[1]
}

export function promptText(p: Prompt, lang: Lang): string {
  switch (p.key) {
    case 'countHowMany': {
      const w = OBJECT_WORDS[p.kind]
      if (lang === 'zh') return `数一数，有几${w.zh[0]}${w.zh[1]}？`
      if (lang === 'ms') return `Jom kira! Berapa ${w.ms[0]} ${w.ms[1]}?`
      return `Let's count! How many ${w.en[1]}?`
    }
    case 'findNumber':
      if (lang === 'zh') return `找出数字${numberWord(p.n, 'zh')}`
      if (lang === 'ms') return `Cari nombor ${numberWord(p.n, 'ms')}`
      return `Find the number ${numberWord(p.n, 'en')}`
    case 'whichMore':
      return { zh: '哪一边比较多？', ms: 'Yang mana lebih banyak?', en: 'Which side has more?' }[lang]
    case 'whichLess':
      return { zh: '哪一边比较少？', ms: 'Yang mana lebih sedikit?', en: 'Which side has fewer?' }[lang]
    case 'whichBigger':
      return { zh: '哪一个比较大？', ms: 'Yang mana lebih besar?', en: 'Which one is bigger?' }[lang]
    case 'whichSmaller':
      return { zh: '哪一个比较小？', ms: 'Yang mana lebih kecil?', en: 'Which one is smaller?' }[lang]
    case 'whichBiggest':
      return { zh: '哪一个最大？', ms: 'Yang mana paling besar?', en: 'Which one is the biggest?' }[lang]
    case 'whichSmallest':
      return { zh: '哪一个最小？', ms: 'Yang mana paling kecil?', en: 'Which one is the smallest?' }[lang]
    case 'findShape':
      if (lang === 'zh') return `找出${SHAPE_WORDS[p.shape].zh}`
      if (lang === 'ms') return `Cari ${SHAPE_WORDS[p.shape].ms}`
      return `Find the ${SHAPE_WORDS[p.shape].en}`
    case 'sortByColor':
      return {
        zh: '把它们放进一样颜色的篮子',
        ms: 'Masukkan ke dalam bakul yang sama warna',
        en: 'Put each one in the basket with the same colour',
      }[lang]
    case 'sortByShape':
      return {
        zh: '把形状放进一样形状的篮子',
        ms: 'Masukkan ke dalam bakul yang sama bentuk',
        en: 'Put each shape in the matching basket',
      }[lang]
    case 'whatNext':
      return { zh: '接下来是什么？', ms: 'Apa seterusnya?', en: 'What comes next?' }[lang]
    case 'traceNumber':
      if (lang === 'zh') return `用手指描一描数字${numberWord(p.n, 'zh')}`
      if (lang === 'ms') return `Surih nombor ${numberWord(p.n, 'ms')} dengan jari`
      return `Trace the number ${numberWord(p.n, 'en')} with your finger`
  }
}

const PRAISE: Record<Lang, string[]> = {
  zh: ['答对了！', '真棒！', '好厉害！', '太棒了！', '你做到了！'],
  ms: ['Betul!', 'Bagus!', 'Hebat!', 'Pandai!', 'Syabas!'],
  en: ['Correct!', 'Great job!', 'Awesome!', 'Well done!', 'You did it!'],
}

export function praise(lang: Lang, rng: () => number = Math.random): string {
  const list = PRAISE[lang]
  return list[Math.floor(rng() * list.length)]
}

type UiKey =
  | 'tryAgain'
  | 'letsCountTogether'
  | 'hello'
  | 'play'
  | 'stickers'
  | 'games'
  | 'doneForToday'
  | 'sessionStars'
  | 'newSticker'
  | 'allStickers'
  | 'playAgain'
  | 'goHome'
  | 'rewardReached'
  | 'stickerBook'
  | 'locked'

const UI: Record<UiKey, Record<Lang, string>> = {
  tryAgain: { zh: '再试一次', ms: 'Cuba lagi', en: 'Try again' },
  letsCountTogether: { zh: '我们一起数一数', ms: 'Jom kira bersama', en: "Let's count together" },
  hello: { zh: '你好，{name}！我们来玩数学吧！', ms: 'Hai {name}! Jom main matematik!', en: "Hi {name}! Let's play maths!" },
  play: { zh: '开始', ms: 'Main', en: 'Play' },
  stickers: { zh: '贴纸', ms: 'Pelekat', en: 'Stickers' },
  games: { zh: '游戏', ms: 'Permainan', en: 'Games' },
  doneForToday: {
    zh: '今天玩够了，明天再来玩吧！',
    ms: 'Cukuplah untuk hari ini. Jumpa esok!',
    en: "That's enough for today. See you tomorrow!",
  },
  sessionStars: { zh: '你得到了 {n} 颗星星！', ms: 'Kamu dapat {n} bintang!', en: 'You got {n} stars!' },
  newSticker: { zh: '你得到一张新贴纸！', ms: 'Kamu dapat pelekat baru!', en: 'You got a new sticker!' },
  allStickers: {
    zh: '贴纸全部集齐了，好厉害！',
    ms: 'Semua pelekat sudah dikumpul. Hebat!',
    en: 'You collected every sticker. Amazing!',
  },
  playAgain: { zh: '再玩一次', ms: 'Main lagi', en: 'Play again' },
  goHome: { zh: '回家', ms: 'Balik', en: 'Home' },
  rewardReached: {
    zh: '你集满了 {n} 颗星星！你的奖励是：{reward}',
    ms: 'Kamu kumpul {n} bintang! Hadiah kamu: {reward}',
    en: 'You collected {n} stars! Your reward: {reward}',
  },
  stickerBook: { zh: '我的贴纸册', ms: 'Buku pelekat saya', en: 'My sticker book' },
  locked: { zh: '先玩其他游戏，这个很快就开放', ms: 'Main permainan lain dulu', en: 'Play the other games first' },
}

export function ui(key: UiKey, lang: Lang, vars: Record<string, string | number> = {}): string {
  return UI[key][lang].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))
}

/** 语音引擎用的语言代码，按顺序试 */
export const VOICE_LANGS: Record<Lang, string[]> = {
  zh: ['zh-CN', 'cmn-CN', 'zh-TW', 'zh'],
  ms: ['ms-MY', 'ms', 'id-ID'],
  en: ['en-GB', 'en-US', 'en'],
}

export const LANG_LABEL: Record<Lang, string> = { zh: '中文', ms: 'Bahasa Melayu', en: 'English' }
