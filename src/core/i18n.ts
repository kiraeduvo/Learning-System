// 三种语言的文字（孩子听到的语音也是用这些）

import type { ColorName, Lang, ObjectKind, Position, Prompt, RefKind, ShapeKind } from './types'

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

/** 位置：中文放在名词后面（箱子上面），马来文、英文放在名词前面（di atas kotak / on the box） */
export const POSITION_WORDS: Record<Position, Record<Lang, string>> = {
  on: { zh: '上面', ms: 'di atas', en: 'on' },
  under: { zh: '下面', ms: 'di bawah', en: 'under' },
  in: { zh: '里面', ms: 'di dalam', en: 'in' },
  outside: { zh: '外面', ms: 'di luar', en: 'outside' },
  nextTo: { zh: '旁边', ms: 'di sebelah', en: 'next to' },
  front: { zh: '前面', ms: 'di hadapan', en: 'in front of' },
  behind: { zh: '后面', ms: 'di belakang', en: 'behind' },
}

export const REF_WORDS: Record<RefKind, Record<Lang, string>> = {
  box: { zh: '箱子', ms: 'kotak', en: 'box' },
  table: { zh: '桌子', ms: 'meja', en: 'table' },
  basket: { zh: '篮子', ms: 'bakul', en: 'basket' },
}

/** 量词（中文）/ penjodoh bilangan（马来文） */
export function measureWord(kind: ObjectKind, lang: 'zh' | 'ms'): string {
  return OBJECT_WORDS[kind][lang][0]
}

/** 数东西时的数字：中文 2 要说"两"（两个苹果），算式里还是"二" */
function countWord(n: number, lang: Lang): string {
  return lang === 'zh' && n === 2 ? '两' : numberWord(n, lang)
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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
    case 'orderSmallToBig':
      return {
        zh: '从小排到大',
        ms: 'Susun dari kecil ke besar',
        en: 'Put them in order, from smallest to biggest',
      }[lang]
    case 'orderBigToSmall':
      return {
        zh: '从大排到小',
        ms: 'Susun dari besar ke kecil',
        en: 'Put them in order, from biggest to smallest',
      }[lang]
    case 'orderNumbers':
      return {
        zh: '把数字从小排到大',
        ms: 'Susun nombor dari kecil ke besar',
        en: 'Put the numbers in order, smallest first',
      }[lang]
    case 'missingNumber':
      return { zh: '哪一个数字不见了？', ms: 'Nombor apa yang hilang?', en: 'Which number is missing?' }[lang]
    case 'missingNumbers':
      return { zh: '哪些数字不见了？', ms: 'Nombor apa yang hilang?', en: 'Which numbers are missing?' }[lang]
    case 'whereIs': {
      const w = OBJECT_WORDS[p.kind]
      const pos = POSITION_WORDS[p.pos][lang]
      const ref = REF_WORDS[p.ref][lang]
      if (lang === 'zh') return `哪一${w.zh[0]}${w.zh[1]}在${ref}${pos}？`
      if (lang === 'ms') return `${cap(w.ms[1])} yang mana ${pos} ${ref}?`
      return `Which ${w.en[0]} is ${pos} the ${ref}?`
    }
    case 'putIt': {
      const w = OBJECT_WORDS[p.kind]
      const pos = POSITION_WORDS[p.pos][lang]
      const ref = REF_WORDS[p.ref][lang]
      if (lang === 'zh') return `把${w.zh[1]}放到${ref}${pos}`
      if (lang === 'ms') return `Letakkan ${w.ms[1]} ${pos} ${ref}`
      return `Put the ${w.en[0]} ${pos} the ${ref}`
    }
    case 'addStory': {
      const w = OBJECT_WORDS[p.kind]
      if (lang === 'zh')
        return `有${countWord(p.a, 'zh')}${w.zh[0]}${w.zh[1]}，再加${countWord(p.b, 'zh')}${w.zh[0]}，一共有几${w.zh[0]}${w.zh[1]}？`
      if (lang === 'ms')
        return `Ada ${numberWord(p.a, 'ms')} ${w.ms[0]} ${w.ms[1]}. Tambah ${numberWord(p.b, 'ms')} ${w.ms[0]} lagi. Berapa ${w.ms[0]} semuanya?`
      return `There ${p.a === 1 ? 'is' : 'are'} ${numberWord(p.a, 'en')} ${p.a === 1 ? w.en[0] : w.en[1]}. Add ${numberWord(p.b, 'en')} more. How many ${w.en[1]} altogether?`
    }
    case 'subStory': {
      const w = OBJECT_WORDS[p.kind]
      if (lang === 'zh')
        return `有${countWord(p.a, 'zh')}${w.zh[0]}${w.zh[1]}，拿走${countWord(p.b, 'zh')}${w.zh[0]}，还剩几${w.zh[0]}？`
      if (lang === 'ms')
        return `Ada ${numberWord(p.a, 'ms')} ${w.ms[0]} ${w.ms[1]}. Ambil ${numberWord(p.b, 'ms')} ${w.ms[0]}. Berapa ${w.ms[0]} yang tinggal?`
      return `There ${p.a === 1 ? 'is' : 'are'} ${numberWord(p.a, 'en')} ${p.a === 1 ? w.en[0] : w.en[1]}. Take away ${numberWord(p.b, 'en')}. How many are left?`
    }
    case 'addEquation':
      if (lang === 'zh') return `${numberWord(p.a, 'zh')}加${numberWord(p.b, 'zh')}等于几？`
      if (lang === 'ms') return `${cap(numberWord(p.a, 'ms'))} tambah ${numberWord(p.b, 'ms')} sama dengan berapa?`
      return `What is ${numberWord(p.a, 'en')} plus ${numberWord(p.b, 'en')}?`
    case 'subEquation':
      if (lang === 'zh') return `${numberWord(p.a, 'zh')}减${numberWord(p.b, 'zh')}等于几？`
      if (lang === 'ms') return `${cap(numberWord(p.a, 'ms'))} tolak ${numberWord(p.b, 'ms')} sama dengan berapa?`
      return `What is ${numberWord(p.a, 'en')} minus ${numberWord(p.b, 'en')}?`
    case 'matchNumbers':
      return {
        zh: '把数字放到一样多的那一堆',
        ms: 'Padankan nombor dengan kumpulan yang sama banyak',
        en: 'Match each number to the group with the same amount',
      }[lang]
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
