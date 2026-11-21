import { describe, expect, it } from 'vitest'
import { promptText, wrongPosition } from './i18n'

describe('新题目的三种语言', () => {
  it('位置', () => {
    const p = { key: 'whereIs', pos: 'on', kind: 'cat', ref: 'box' } as const
    expect(promptText(p, 'zh')).toBe('哪一只小猫在箱子上面？')
    expect(promptText(p, 'ms')).toBe('Kucing yang mana di atas kotak?')
    expect(promptText(p, 'en')).toBe('Which cat is on the box?')
    const put = { key: 'putIt', pos: 'front', kind: 'ball', ref: 'table' } as const
    expect(promptText(put, 'zh')).toBe('把球放到桌子前面')
    expect(promptText(put, 'ms')).toBe('Letakkan bola di hadapan meja')
    expect(promptText(put, 'en')).toBe('Put the ball in front of the table')
  })

  it('位置题答错时说出那个位置', () => {
    expect(wrongPosition('pick', 'cat', 'under', 'box', 'zh')).toBe('这一只在箱子下面，再试一次')
    expect(wrongPosition('pick', 'cat', 'under', 'box', 'ms')).toBe('Yang ini di bawah kotak. Cuba lagi')
    expect(wrongPosition('place', 'ball', 'nextTo', 'table', 'en')).toBe('This is next to the table. Try again')
    expect(wrongPosition('place', 'ball', 'nextTo', 'table', 'zh')).toBe('这里是桌子旁边，再试一次')
  })

  it('加法：中文数东西时 2 说"两"', () => {
    const p = { key: 'addStory', a: 2, b: 1, kind: 'apple' } as const
    expect(promptText(p, 'zh')).toBe('有两个苹果，再加一个，一共有几个苹果？')
    expect(promptText(p, 'ms')).toBe('Ada dua biji epal. Tambah satu biji lagi. Berapa biji semuanya?')
    expect(promptText(p, 'en')).toBe('There are two apples. Add one more. How many apples altogether?')
    const one = { key: 'addStory', a: 1, b: 2, kind: 'fish' } as const
    expect(promptText(one, 'zh')).toBe('有一条鱼，再加两条，一共有几条鱼？')
    expect(promptText(one, 'en')).toBe('There is one fish. Add two more. How many fish altogether?')
  })

  it('减法', () => {
    const p = { key: 'subStory', a: 5, b: 2, kind: 'duck' } as const
    expect(promptText(p, 'zh')).toBe('有五只鸭子，拿走两只，还剩几只？')
    expect(promptText(p, 'ms')).toBe('Ada lima ekor itik. Ambil dua ekor. Berapa ekor yang tinggal?')
    expect(promptText(p, 'en')).toBe('There are five ducks. Take away two. How many are left?')
  })

  it('算式：中文算式里还是说"二"', () => {
    expect(promptText({ key: 'addEquation', a: 2, b: 3 }, 'zh')).toBe('二加三等于几？')
    expect(promptText({ key: 'subEquation', a: 7, b: 2 }, 'ms')).toBe('Tujuh tolak dua sama dengan berapa?')
    expect(promptText({ key: 'subEquation', a: 7, b: 2 }, 'en')).toBe('What is seven minus two?')
  })
})
