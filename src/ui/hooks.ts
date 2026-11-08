import { useEffect, useState } from 'react'

/** 画面大小（转屏时会更新） */
export function useViewport(): { w: number; h: number } {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])
  return size
}

/** 答错次数 → 这一题的分数 */
export function scoreFor(mistakes: number): { score: number; firstTry: boolean } {
  return { score: mistakes === 0 ? 1 : mistakes === 1 ? 0.5 : 0, firstTry: mistakes === 0 }
}
