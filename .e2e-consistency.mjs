import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
let failures = 0
const ok = (cond, name) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name)
  if (!cond) failures++
}
const section = (t) => console.log('\n== ' + t + ' ==')

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
page.on('pageerror', (e) => { console.log('  ✗ PAGE ERROR:', e.message); failures++ })

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

const timelineCardCount = async () => {
  await page.waitForSelector('h1:has-text("窗景时间线")', { timeout: 8000 })
  await page.waitForTimeout(200)
  return page.locator('main button.group').count()
}

/* ---------- 0. 空态 ---------- */
section('空态(0 条记录)')
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=还没有窗景记录', { timeout: 8000 })
ok(true, '意象台 0 条记录显示空态')
await page.goto(BASE + '/timeline?imagery=' + encodeURIComponent('雨'), { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=没有找到同时包含这些意象的记录')
ok(true, '0 条记录时意象筛选不报错')
await page.goto(BASE + '/inspire', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=还没有窗景记录')
ok(true, '灵感页空态正常')

/* ---------- 1. 记录 6 条(含单次词与反复词) ---------- */
section('记录 6 条窗景')
await addRecord('27路', '人民广场→静安寺', '老王面馆', '雨打在车窗上,路灯在积水里晃出倒影,一只猫躲进便利店门口。', '小雨')
await addRecord('27路', '静安寺→徐家汇', '24小时便利店', '又下雨了,路灯全亮了,便利店门口挤满了躲雨的人。', '小雨')
await addRecord('106路', '外滩→城隍庙', '', '黄昏的梧桐影子很长,老人在站台边下棋。', '多云')
await addRecord('106路', '城隍庙→新天地', '', '雪下了一夜,站台上全是脚印,路灯还亮着。', '雪')
await addRecord('27路', '徐家汇→中山公园', '烤红薯摊', '烤红薯的摊子又出来了,香味飘了半条街。', '阴')
await addRecord('27路', '中山公园→人民广场', '', '路过烤红薯摊,买了一个捂手。', '晴')
ok(true, '6 条记录提交成功')

/* ---------- 2. 反复门槛:单次词不上榜 ---------- */
section('反复出现门槛(≥2 条记录才上榜)')
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=意象索引台', { timeout: 8000 })
const rankSection = page.locator('section', { has: page.locator('h2', { hasText: '意象榜' }) })
await rankSection.locator('> div.space-y-2 > div').first().waitFor()
const rowCount = await rankSection.locator('> div.space-y-2 > div').count()
const rows = []
for (let i = 0; i < rowCount; i++) {
  const row = rankSection.locator('> div.space-y-2 > div').nth(i)
  const term = (await row.locator('button span').first().textContent()).trim()
  const m = (await row.textContent()).match(/(\d+)\s*条记录/)
  rows.push({ term, count: parseInt(m[1], 10) })
}
console.log('  榜单:', rows.map((r) => `${r.term}(${r.count})`).join(' '))
ok(rows.length === 6, `意象榜共 6 个反复出现的意象(实际 ${rows.length})`)
ok(rows.every((r) => r.count >= 2), '榜单全部 ≥2 条记录')
for (const t of ['雪', '猫', '黄昏', '倒影', '老人', '梧桐', '面馆', '香味']) {
  ok(await rankSection.getByText(t, { exact: true }).count() === 0, `单次词「${t}」未上榜`)
}
ok(rows.some((r) => r.term === '烤红薯'), '发现词「烤红薯」上榜')
ok(await rankSection.locator('text=自发现').count() > 0, '发现词带「自发现」标记')

/* ---------- 3. 一致性:意象榜数字 == 时间线实际条数 ---------- */
section('一致性:意象 → 时间线')
for (const r of rows) {
  await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=意象索引台')
  await page.locator('section', { has: page.locator('h2', { hasText: '意象榜' }) })
    .getByText(r.term, { exact: true }).first().click()
  await page.waitForURL(/imagery=/, { timeout: 5000 })
  const n = await timelineCardCount()
  ok(n === r.count, `「${r.term}」榜 ${r.count} 条 == 时间线 ${n} 条`)
}

/* ---------- 4. 一致性:主题卡数字 == 时间线实际条数 ---------- */
section('一致性:主题 → 时间线')
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=意象索引台')
const themeSection = page.locator('section', { has: page.locator('h2', { hasText: '主题' }) })
const themeCards = themeSection.locator('div.cursor-pointer')
const themeCount = await themeCards.count()
ok(themeCount >= 1, `主题卡存在(${themeCount} 个)`)
for (let i = 0; i < themeCount; i++) {
  const card = themeCards.nth(i)
  const label = (await card.locator('span').first().textContent()).trim()
  const m = (await card.textContent()).match(/(\d+)\s*条记录/)
  const expect = parseInt(m[1], 10)
  await card.locator('span').first().click()
  await page.waitForURL(/theme=/, { timeout: 5000 })
  const n = await timelineCardCount()
  ok(n === expect, `主题${label}卡 ${expect} 条 == 时间线 ${n} 条`)
  await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=意象索引台')
}

/* ---------- 5. 一致性:关系卡数字 == 时间线实际条数 ---------- */
section('一致性:关系 → 时间线')
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=意象索引台')
const pairSection = page.locator('section', { has: page.locator('h2', { hasText: '意象关系' }) })
const pairBtns = pairSection.locator('button')
const pairCount = await pairBtns.count()
ok(pairCount >= 1, `关系卡存在(${pairCount} 对)`)
const pairTexts = []
for (let i = 0; i < pairCount; i++) pairTexts.push(await pairBtns.nth(i).textContent())
for (let i = 0; i < pairCount; i++) {
  const text = pairTexts[i]
  const m = text.match(/(\d+)\s*条共同记录/)
  const expect = parseInt(m[1], 10)
  await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=意象索引台')
  await page.locator('section', { has: page.locator('h2', { hasText: '意象关系' }) })
    .locator('button').nth(i).click()
  await page.waitForURL(/imagery=.*imagery=/, { timeout: 5000 })
  const n = await timelineCardCount()
  ok(n === expect, `关系「${text.trim().replace(/\s+/g, ' ')}」卡 ${expect} 条 == 时间线 ${n} 条`)
}

/* ---------- 6. 删除记录 → 索引自动更新 ---------- */
section('删除记录后索引自动更新')
await page.goto(BASE + '/timeline', { waitUntil: 'domcontentloaded' })
await page.locator('button', { hasText: '106路' }).first().click()
await page.locator('button', { hasText: '城隍庙→新天地' }).first().click()
await page.click('text=删除此窗景')
await page.waitForTimeout(400)
await page.goto(BASE + '/imagery', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=意象索引台')
const stats = await page.locator('header p').first().textContent()
ok(stats.includes('5 条窗景记录'), `删除后统计更新为 5 条(${stats.trim().slice(0, 40)})`)
// 路灯/灯 原来 3 条,删掉含路灯的雪天记录后应变 2 条
const dengRow = page.locator('section', { has: page.locator('h2', { hasText: '意象榜' }) })
  .locator('> div.space-y-2 > div', { hasText: '路灯' }).first()
const dengText = await dengRow.textContent()
ok(/2\s*条记录/.test(dengText), `「路灯」计数随删除更新为 2(${dengText.trim().slice(0, 40)})`)
// 站台只剩 1 条(R3),应掉出榜单
ok(await page.locator('section', { has: page.locator('h2', { hasText: '意象榜' }) })
  .getByText('站台', { exact: true }).count() === 0, '「站台」降为 1 条后掉出榜单')

/* ---------- 7. 原有流程回归 ---------- */
section('记录/时间线/灵感回归')
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=窗景记录')
await page.waitForSelector('button:has-text("保存记录")')
ok(true, '记录页可用')
await page.goto(BASE + '/timeline', { waitUntil: 'domcontentloaded' })
await page.locator('button', { hasText: '27路' }).first().click()
await page.waitForSelector('text=人民广场→静安寺')
ok(true, '时间线路线浏览可用')
await page.goto(BASE + '/inspire', { waitUntil: 'domcontentloaded' })
await page.locator('button', { hasText: '采一段窗景' }).click({ force: true })
await page.waitForSelector('text=再采一段', { timeout: 5000 })
ok(true, '灵感页采集可用')

console.log('\n' + (failures === 0 ? 'ALL CONSISTENCY E2E PASSED' : `${failures} FAILURES`))
await browser.close()
process.exit(failures ? 1 : 0)
