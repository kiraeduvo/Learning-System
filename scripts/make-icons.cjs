// 生成 Android 图标和启动画面（用 Playwright 把 SVG 画成 PNG）
// 用法：node scripts/make-icons.cjs
const { chromium } = require('playwright')
const path = require('path')

const RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res')
const ORANGE = '#FF7A45'
const CREAM = '#FFF6E5'

// 小熊（画在 512 × 512 的格子中间）
const BEAR = `
  <circle cx="160" cy="150" r="58" fill="#C98B5A"/>
  <circle cx="352" cy="150" r="58" fill="#C98B5A"/>
  <circle cx="160" cy="150" r="28" fill="#F2C9A0"/>
  <circle cx="352" cy="150" r="28" fill="#F2C9A0"/>
  <circle cx="256" cy="276" r="160" fill="#D99A66"/>
  <ellipse cx="256" cy="340" rx="80" ry="58" fill="#F6D7B5"/>
  <circle cx="200" cy="256" r="20" fill="#2B2B2B"/>
  <circle cx="312" cy="256" r="20" fill="#2B2B2B"/>
  <circle cx="206" cy="250" r="7" fill="#fff"/>
  <circle cx="318" cy="250" r="7" fill="#fff"/>
  <ellipse cx="256" cy="318" rx="26" ry="19" fill="#3A2A20"/>
  <path d="M220 360c14 18 58 18 72 0" stroke="#3A2A20" stroke-width="12" fill="none" stroke-linecap="round"/>
  <circle cx="150" cy="330" r="20" fill="#FF8FA3" opacity="0.5"/>
  <circle cx="362" cy="330" r="20" fill="#FF8FA3" opacity="0.5"/>`

function svg(size, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">${body}</svg>`
}

const icons = {
  // 旧式图标：圆角方形
  legacy: (s) => svg(s, `<rect width="512" height="512" rx="112" fill="${ORANGE}"/><g transform="translate(51 46) scale(0.8)">${BEAR}</g>`),
  round: (s) => svg(s, `<circle cx="256" cy="256" r="256" fill="${ORANGE}"/><g transform="translate(66 62) scale(0.74)">${BEAR}</g>`),
  // 新式（adaptive）图标的前景：安全区是中间 66/108
  foreground: (s) => svg(s, `<g transform="translate(118 112) scale(0.54)">${BEAR}</g>`),
}

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
const splashSizes = {
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
  drawable: [480, 320],
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const render = async (html, w, h, file, transparent) => {
    await page.setViewportSize({ width: w, height: h })
    await page.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`)
    await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } })
  }
  for (const [d, k] of Object.entries(densities)) {
    const dir = path.join(RES, `mipmap-${d}`)
    await render(icons.legacy(48 * k), 48 * k, 48 * k, path.join(dir, 'ic_launcher.png'), true)
    await render(icons.round(48 * k), 48 * k, 48 * k, path.join(dir, 'ic_launcher_round.png'), true)
    await render(icons.foreground(108 * k), 108 * k, 108 * k, path.join(dir, 'ic_launcher_foreground.png'), true)
  }
  for (const [dir, [w, h]] of Object.entries(splashSizes)) {
    const s = Math.round(Math.min(w, h) * 0.42)
    const html = `<div style="width:${w}px;height:${h}px;background:${CREAM};display:flex;align-items:center;justify-content:center">${svg(s, BEAR)}</div>`
    await render(html, w, h, path.join(RES, dir, 'splash.png'), false)
  }
  // 网页版的图标也一起更新
  await browser.close()
  console.log('icons and splash written to', RES)
})()
