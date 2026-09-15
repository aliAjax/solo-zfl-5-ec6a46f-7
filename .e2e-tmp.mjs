import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
let failures = 0
const ok = (cond, name) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name)
  if (!cond) failures++
}
const section = (title) => console.log('\n== ' + title + ' ==')

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => {
  console.log('  ✗ PAGE ERROR:', e.message)
  failures++
})

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

/* ---------- 1. 空态 ---------- */
section('空态(0 条记录)')
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=还没有窗景记录', { timeout: 8000 })
ok(true, '意象台 0 条记录显示空态')
await page.click('text=先去记录一段窗景')
await page.waitForSelector('text=窗景记录')
ok(page.url().endsWith('/'), '空态按钮跳回记录页')

await page.goto(BASE + '/timeline?imagery=' + encodeURIComponent('雨'), { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=没有找到同时包含这些意象的记录')
ok(true, '0 条记录时意象筛选时间线不报错')
await page.click('text=清除筛选,回到路线浏览')
await page.waitForSelector('text=选择一条路线，开始浏览窗景')
ok(true, '清除筛选回到路线浏览')

await page.goto(BASE + '/inspire', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=还没有窗景记录')
ok(true, '灵感页 0 条记录显示空态')

/* ---------- 2. 记录 3 条 ---------- */
section('记录 3 条窗景')
await addRecord('27路', '人民广场→静安寺', '老王面馆',
  '雨打在车窗上,路灯在积水里晃出倒影,一只猫躲进便利店门口。', '小雨')
await addRecord('27路', '静安寺→徐家汇', '24小时便利店',
  '又下雨了,路灯全亮了,便利店门口挤满了躲雨的人。', '小雨')
await addRecord('106路', '外滩→城隍庙', '',
  '黄昏的梧桐影子很长,老人在站台边下棋。', '多云')
ok(true, '表单提交 3 条记录成功')

/* ---------- 3. 意象索引台 ---------- */
section('意象索引台(3 条记录)')
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=意象索引台', { timeout: 8000 })
const stats = await page.locator('header p').first().textContent()
ok(stats.includes('3 条窗景记录'), `统计正确(${stats.trim()})`)
ok(stats.includes('1 个主题'), '归纳出 1 个主题')

const rankSection = page.locator('section', { has: page.locator('h2', { hasText: '意象榜' }) })
await rankSection.locator('button', { hasText: '雨' }).first().waitFor()
ok(true, '意象榜出现「雨」')
ok(await rankSection.locator('button', { hasText: '路灯' }).count() > 0, '意象榜出现「路灯」')
ok(await rankSection.locator('button', { hasText: '便利店' }).count() > 0, '意象榜出现「便利店」')

await page.waitForSelector('text=「便利店」')
ok(true, '主题卡片「便利店」出现(雨/路灯/便利店 共现聚类)')

const pairSection = page.locator('section', { has: page.locator('h2', { hasText: '意象关系' }) })
ok((await pairSection.locator('button').count()) > 0, '意象关系列表非空')

// 展开某意象的关系
const rainRow = rankSection.locator('> div > div', { has: page.locator('button', { hasText: '雨' }) }).first()
await rankSection.locator('button', { hasText: '关系' }).first().click()
await page.waitForTimeout(300)
ok((await page.locator('text=常与这些意象一起出现').count()) > 0, '展开意象显示相关意象')

/* ---------- 4. 点意象跳时间线 ---------- */
section('意象 → 时间线筛选')
await rankSection.locator('button', { hasText: '雨' }).first().click()
await page.waitForURL(/imagery=/, { timeout: 5000 })
await page.waitForSelector('text=意象筛选:')
ok(decodeURIComponent(page.url()).includes('imagery=雨'), 'URL 带意象参数')
ok(await page.locator('text=人民广场→静安寺').count() === 1, '筛选出含雨的记录 1')
ok(await page.locator('text=静安寺→徐家汇').count() === 1, '筛选出含雨的记录 2')
ok(await page.locator('text=外滩→城隍庙').count() === 0, '不含雨的记录被过滤')
await page.click('text=清除筛选')
await page.waitForSelector('text=全部')
ok(true, '清除筛选恢复路线浏览')

/* ---------- 5. 主题 → 时间线 ---------- */
section('主题 → 时间线筛选')
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=「便利店」')
await page.click('text=「便利店」')
await page.waitForURL(/theme=/, { timeout: 5000 })
await page.waitForSelector('h1:has-text("窗景时间线")')
await page.waitForSelector('text=主题「便利店」')
ok(true, '主题筛选横幅出现')
ok(await page.locator('text=人民广场→静安寺').count() === 1, '主题命中记录 1')
ok(await page.locator('text=静安寺→徐家汇').count() === 1, '主题命中记录 2')
ok(await page.locator('text=外滩→城隍庙').count() === 0, '主题外记录被过滤')

/* ---------- 6. 关系对 → 时间线(双意象) ---------- */
section('意象关系 → 时间线筛选')
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=意象关系')
const firstPair = page.locator('section', { has: page.locator('h2', { hasText: '意象关系' }) }).locator('button').first()
const pairText = await firstPair.textContent()
await firstPair.click()
await page.waitForURL(/imagery=.*imagery=/, { timeout: 5000 })
await page.waitForSelector('h1:has-text("窗景时间线")')
await page.waitForSelector('text=意象筛选:')
ok(true, `关系对「${pairText.trim().replace(/\s+/g, ' ')}」跳到双意象筛选`)
ok(await page.locator('text=外滩→城隍庙').count() === 0, '共同记录之外的被过滤')

/* ---------- 7. 删除记录 → 索引自动更新 ---------- */
section('删除记录后索引自动更新')
await page.goto(BASE + '/timeline', { waitUntil: 'domcontentloaded' })
await page.locator('button', { hasText: '27路' }).first().click()
await page.waitForSelector('text=静安寺→徐家汇')
await page.locator('button', { hasText: '静安寺→徐家汇' }).first().click()
await page.waitForSelector('text=删除此窗景')
await page.click('text=删除此窗景')
await page.waitForTimeout(300)
ok(await page.locator('text=静安寺→徐家汇').count() === 0, '记录已从时间线删除')

await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=意象索引台')
const stats2 = await page.locator('header p').first().textContent()
ok(stats2.includes('2 条窗景记录'), `索引统计自动更新为 2 条(${stats2.trim()})`)
ok(await page.locator('text=记录还太少').count() > 0, '删除后主题消失,显示「记录还太少」提示')

/* ---------- 8. 灵感页 ---------- */
section('灵感页')
await page.goto(BASE + '/inspire', { waitUntil: 'domcontentloaded' })
await page.locator('button', { hasText: '采一段窗景' }).click({ force: true })
await page.waitForSelector('text=再采一段', { timeout: 5000 })
ok(true, '灵感页随机采集正常')

/* ---------- 9. 记录页仍正常 ---------- */
section('记录页')
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=窗景记录')
await page.waitForSelector('button:has-text("保存记录")')
ok(true, '记录页照常可用')

/* ---------- 10. 新增记录 → 索引再次自动更新 ---------- */
section('新增记录后索引自动更新')
await addRecord('27路', '人民广场→静安寺', '老王面馆',
  '又是雨天,路灯和便利店,还有那只猫。', '小雨')
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=意象索引台')
const stats3 = await page.locator('header p').first().textContent()
ok(stats3.includes('3 条窗景记录'), `新增后索引统计更新为 3 条(${stats3.trim()})`)
ok(await page.locator('section', { has: page.locator('h2', { hasText: '意象榜' }) }).locator('button', { hasText: '猫' }).count() > 0, '新记录里的「猫」进入意象榜')

console.log('\n' + (failures === 0 ? 'ALL FLOWS PASSED' : `${failures} FAILURES`))
await browser.close()
process.exit(failures === 0 ? 0 : 1)
