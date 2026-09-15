import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const scenes = [
  { id: 'a1', routeName: '27路', segment: '人民广场→静安寺', seatDirection: '左',
    timestamp: '2026-09-10T08:00:00.000Z', weather: '小雨', signText: '老王面馆',
    treeDensity: '适中', pedestrianStatus: '稀少',
    note: '雨打在车窗上,路灯在积水里晃出倒影,一只猫躲进便利店门口。' },
  { id: 'a2', routeName: '27路', segment: '静安寺→徐家汇', seatDirection: '右',
    timestamp: '2026-09-11T18:30:00.000Z', weather: '小雨', signText: '24小时便利店',
    treeDensity: '茂密', pedestrianStatus: '密集',
    note: '又下雨了,路灯全亮了,便利店门口挤满了躲雨的人。' },
  { id: 'a3', routeName: '106路', segment: '外滩→城隍庙', seatDirection: '左',
    timestamp: '2026-09-12T17:00:00.000Z', weather: '多云', signText: '',
    treeDensity: '稀疏', pedestrianStatus: '零星',
    note: '黄昏的梧桐影子很长,老人在站台边下棋。' },
]

const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text()) })

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.evaluate((data) => {
  localStorage.setItem('bus_window_scenes', JSON.stringify(data))
}, scenes)

// 意象页:看主题卡片
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=意象索引台')
const themeCards = await page.locator('section', { has: page.locator('h2', { hasText: '主题' }) })
  .locator('div[class*="cursor-pointer"]').allTextContents()
console.log('主题卡片:', JSON.stringify(themeCards))

// 点主题卡片
await page.click('text=「便利店」')
await page.waitForTimeout(800)
console.log('跳转后 URL:', page.url())
const banner = await page.locator('div.rounded-xl.border').first().textContent().catch(() => '(none)')
console.log('横幅:', banner?.replace(/\s+/g, ' ').slice(0, 120))
// 时间线上渲染了哪些记录
const cards = await page.locator('main button.group, main [class*="group"]').allTextContents().catch(() => [])
console.log('时间线内容片段:', JSON.stringify(cards.map((c) => c.replace(/\s+/g, ' ').slice(0, 60))))
const bodyText = await page.locator('main').textContent()
console.log('main 文本:', bodyText.replace(/\s+/g, ' ').slice(0, 400))

await browser.close()
