// 核心类型：技能、题目、孩子资料

export type Lang = 'zh' | 'ms' | 'en'

export type SkillId =
  | 'count5'
  | 'count10'
  | 'numeral5'
  | 'numeral10'
  | 'moreLess'
  | 'size'
  | 'shapes'
  | 'sortColor'
  | 'sortShape'
  | 'pattern'
  | 'trace'

export type Difficulty = 1 | 2 | 3

export type ObjectKind =
  | 'apple'
  | 'fish'
  | 'star'
  | 'ball'
  | 'car'
  | 'duck'
  | 'flower'
  | 'balloon'
  | 'cat'

export type ShapeKind = 'circle' | 'triangle' | 'square' | 'rectangle'

export type ColorName = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'pink'

/** 画面上的一个东西：物件或形状，可以换颜色、大小 */
export interface Item {
  kind: ObjectKind | ShapeKind
  color?: ColorName
  /** 1 = 正常大小 */
  scale?: number
  /** 旋转角度（形状用） */
  rotate?: number
}

/** 要读出来的题目：文字 key + 参数，三种语言各自组合 */
export type Prompt =
  | { key: 'countHowMany'; kind: ObjectKind }
  | { key: 'findNumber'; n: number }
  | { key: 'whichMore' }
  | { key: 'whichLess' }
  | { key: 'whichBigger' }
  | { key: 'whichSmaller' }
  | { key: 'whichBiggest' }
  | { key: 'whichSmallest' }
  | { key: 'findShape'; shape: ShapeKind }
  | { key: 'sortByColor' }
  | { key: 'sortByShape' }
  | { key: 'whatNext' }
  | { key: 'traceNumber'; n: number }

interface BaseQuestion {
  skill: SkillId
  difficulty: Difficulty
  /** 用来避免同一题重复出现 */
  signature: string
  prompt: Prompt
}

export interface CountQuestion extends BaseQuestion {
  engine: 'count'
  item: Item
  count: number
  options: number[]
  /** 数字下面加圆点提示（给还不认识数字的孩子） */
  showDots: boolean
  /** 排成整齐的两行（像十格框），或者散开 */
  layout: 'rows' | 'scatter'
}

export type ChoiceOption =
  | { type: 'numeral'; value: number }
  | { type: 'item'; item: Item }
  | { type: 'group'; item: Item; count: number }

export interface ChoiceQuestion extends BaseQuestion {
  engine: 'choice'
  /** 规律题：先显示一排东西，最后一格是问号 */
  sequence?: Item[]
  options: ChoiceOption[]
  answerIndex: number
}

export type SortBinLabel = { type: 'color'; color: ColorName } | { type: 'shape'; shape: ShapeKind }

export interface SortQuestion extends BaseQuestion {
  engine: 'sort'
  bins: SortBinLabel[]
  items: { item: Item; bin: number }[]
}

export interface TraceQuestion extends BaseQuestion {
  engine: 'trace'
  digit: number
}

export type Question = CountQuestion | ChoiceQuestion | SortQuestion | TraceQuestion

/** 每一题做完的结果。score：1 = 第一次就对，0.5 = 错一次，0 = 错很多次 */
export interface QuestionResult {
  skill: SkillId
  score: number
  firstTry: boolean
}

export interface SkillProgress {
  attempts: number
  firstTryCorrect: number
  /** 掌握度 0–1（指数移动平均） */
  score: number
  difficulty: Difficulty
  /** 连续第一次就答对 */
  streak: number
  /** 连续答错 */
  wrongStreak: number
  lastPracticed: number
}

export interface SessionLog {
  /** YYYY-MM-DD（本地时间） */
  date: string
  startedAt: number
  durationSec: number
  questions: number
  firstTryCorrect: number
  skills: SkillId[]
}

export interface ChildSettings {
  lang: Lang
  questionsPerSession: number
  /** 每天最多几次，0 = 不限 */
  dailySessionLimit: number
  speechRate: number
  sound: boolean
  unlockAll: boolean
}

export interface RewardGoal {
  goalStars: number
  label: string
  /** 设定目标时的星星数，从这里开始算 */
  startStars: number
}

export type AvatarId = 'bear' | 'bunny' | 'chick' | 'cat'

export interface ChildProfile {
  id: string
  name: string
  birthYear: number
  avatar: AvatarId
  settings: ChildSettings
  reward: RewardGoal | null
  stars: number
  stickers: string[]
  progress: Partial<Record<SkillId, SkillProgress>>
  sessions: SessionLog[]
}

export interface AppData {
  version: 1
  activeChildId: string | null
  children: ChildProfile[]
}
