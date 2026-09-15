import { chromium } from 'playwright'
const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message))

async function addRecord(route, segment, sign, note, weather) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  const inputs = page.locator('form input')
  await inputs.nth(0).fill(route)
  await inputs.nth(1).fill(segment)
  await inputs.nth(2).fill(sign)
  if (weather) await page.locator(`form button:has-text("${weather}")`).click()
  await page.locator('form textarea').fill(note)
  await page.locator('button:has-text("保存记录")').click()
  await page.waitForSelector('text=记录已保存', { timeout: 5000 })
  await page.waitForTimeout(1700)
}
await addRecord('27路', '人民广场→静安寺', '老王面馆', '雨打在车窗上,路灯在积水里晃出倒影,一只猫躲进便利店门口。', '小雨')
await addRecord('27路', '静安寺→徐家汇', '24小时便利店', '又下雨了,路灯全亮了,便利店门口挤满了躲雨的人。', '小雨')
await addRecord('106路', '外滩→城隍庙', '', '黄昏的梧桐影子很长,老人在站台边下棋。', '多云')

// 检查 localStorage 里实际存的数据
const stored = await page.evaluate(() => localStorage.getItem('bus_window_scenes'))
console.log('STORED:', stored?.slice(0, 400))

await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=「便利店」')
// 点击前看看主题卡片长什么样
const card = await page.locator('div.cursor-pointer', { hasText: '「便利店」' }).first().textContent()
console.log('THEME CARD:', card.replace(/\s+/g, ' '))
await page.click('text=「便利店」')
await page.waitForURL(/theme=/, { timeout: 5000 })
console.log('URL:', decodeURIComponent(page.url()))
await page.waitForTimeout(600)
console.log('MAIN:', (await page.locator('main').textContent()).replace(/\s+/g, ' ').slice(0, 500))
await browser.close()
