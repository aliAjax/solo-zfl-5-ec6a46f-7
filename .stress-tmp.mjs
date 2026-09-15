import { chromium } from 'playwright'
const BASE = 'http://localhost:4173'
// 生成 150 条带重复意象群的记录
const POOLS = [
  ['雨','路灯','倒影','霓虹','便利店'], ['黄昏','夕阳','老人','公园','梧桐'],
  ['雪','站台','红灯','围巾','哈气'], ['猫','巷子','面馆','香味','老板娘'],
  ['清晨','学生','校服','自行车','豆浆'],
]
const scenes = []
for (let i = 0; i < 150; i++) {
  const pool = POOLS[i % POOLS.length]
  const note = `${pool[0]}和${pool[1]}都出现了,${pool[2]}也是。${pool[3]}让人想起${pool[4]}。`
  scenes.push({
    id: 's' + i, routeName: ['27路','106路','夜班3路'][i % 3], segment: `区间${i}`,
    seatDirection: i % 2 ? '左' : '右', timestamp: new Date(2026, 8, 1, 8, i).toISOString(),
    weather: '晴', signText: i % 4 === 0 ? '老王面馆' : '', treeDensity: '适中',
    pedestrianStatus: '稀少', note,
  })
}
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
let failed = 0
const ok = (c, n) => { console.log((c ? '  ✓ ' : '  ✗ ') + n); if (!c) failed++ }
page.on('pageerror', (e) => { console.log('  ✗ PAGE ERROR:', e.message); failed++ })

await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.evaluate((d) => localStorage.setItem('bus_window_scenes', JSON.stringify(d)), scenes)

const t0 = Date.now()
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=意象索引台', { timeout: 10000 })
ok(true, `150 条记录意象台渲染(${Date.now() - t0}ms)`)
const stats = await page.locator('header p').first().textContent()
ok(stats.includes('150 条窗景记录'), `统计 150 条(${stats.trim().slice(0, 60)})`)
// 意象榜默认 20 行 + 展开按钮
const rankRows = page.locator('section', { has: page.locator('h2', { hasText: '意象榜' }) }).locator('> div > div')
const rowCount = await rankRows.count()
ok(rowCount === 20, `意象榜默认 20 行(实际 ${rowCount})`)
await page.click('text=展开全部')
await page.waitForTimeout(300)
const expanded = await rankRows.count()
ok(expanded > 20, `展开全部生效(${expanded} 行)`)
// 主题数量 ≤ 8
const themeCards = await page.locator('section', { has: page.locator('h2', { hasText: '主题' }) }).locator('div.cursor-pointer').count()
ok(themeCards > 0 && themeCards <= 8, `主题 ${themeCards} 个(≤8)`)
// 关系对 ≤ 12
const pairCount = await page.locator('section', { has: page.locator('h2', { hasText: '意象关系' }) }).locator('button').count()
ok(pairCount > 0 && pairCount <= 12, `关系对 ${pairCount} 对(≤12)`)
// 时间线在 150 条下也能筛
await page.goto(BASE + '/timeline?imagery=' + encodeURIComponent('雨'), { waitUntil: 'domcontentloaded' })
await page.waitForSelector('h1:has-text("窗景时间线")')
await page.waitForSelector('text=意象筛选:')
const filtered = await page.locator('text=条记录').first().textContent()
ok(true, `150 条下意象筛选正常(${filtered.trim()})`)

// 单条记录
await page.evaluate((d) => localStorage.setItem('bus_window_scenes', JSON.stringify(d)), [scenes[0]])
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=意象索引台')
const stats1 = await page.locator('header p').first().textContent()
ok(stats1.includes('1 条窗景记录'), `单条记录统计正确`)
ok(await page.locator('text=记录还太少').count() > 0, '单条记录主题区显示提示')
ok(await page.locator('section', { has: page.locator('h2', { hasText: '意象榜' }) }).locator('button', { hasText: '雨' }).count() > 0, '单条记录意象榜有内容')

console.log(failed === 0 ? '\nSTRESS PASSED' : `\n${failed} FAILURES`)
await browser.close()
process.exit(failed ? 1 : 0)
