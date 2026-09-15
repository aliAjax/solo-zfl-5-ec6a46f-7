import type { WindowScene } from '@/types'

export interface ImageryRelation {
  term: string
  shared: number
}

export interface ImageryItem {
  term: string
  /** 出现在多少条不同的记录里 */
  recordCount: number
  /** 全部记录里的总出现次数 */
  totalCount: number
  /** lexicon = 内置意象词典命中; discovered = 从笔记里自动发现的重复词 */
  source: 'lexicon' | 'discovered'
  /** 经常一起出现的意象,按同现记录数降序 */
  related: ImageryRelation[]
}

export interface ImageryTheme {
  /** 主题标识 = 代表意象 */
  id: string
  /** 代表意象(主题内最重要的意象) */
  label: string
  /** 主题成员意象,按重要程度排序,第一个即代表意象 */
  members: string[]
  /** 包含任一成员意象的记录数 */
  recordCount: number
}

export interface ImageryPair {
  a: string
  b: string
  shared: number
}

export interface ImageryIndex {
  items: ImageryItem[]
  themes: ImageryTheme[]
  pairs: ImageryPair[]
  /** 至少包含一个意象的记录数 */
  matchedRecordCount: number
  /** 扫描的记录总数 */
  totalRecords: number
}

const MAX_DISCOVERED = 40
const MAX_ITEMS = 100
const MAX_THEMES = 8
const MAX_THEME_MEMBERS = 8
const MAX_PAIRS = 12
const MAX_RELATED = 8
const MAX_TERMS_PER_RECORD_FOR_PAIRS = 60
const MIN_SHARED_FOR_THEME = 2
const MIN_RECORDS_FOR_DISCOVERED = 2
const PAIR_SEP = '\u0001'

/** 内置意象词典:城市车窗观察中常见的具体意象 */
const IMAGERY_LEXICON: string[] = [
  // 天光时刻
  '清晨', '黎明', '拂晓', '晨光', '朝阳', '日出', '午后', '傍晚', '黄昏', '暮色',
  '夕阳', '落日', '晚霞', '余晖', '夜晚', '深夜', '午夜', '夜色', '月光', '月亮',
  '星星', '星空', '天光', '蓝天', '天空',
  // 天气
  '雨', '小雨', '大雨', '暴雨', '细雨', '毛毛雨', '雨滴', '雨点', '雨丝',
  '雪', '雪花', '初雪', '积雪', '雾', '浓雾', '薄雾', '雾气',
  '风', '微风', '大风', '阵风', '云', '乌云', '白云', '云层',
  '彩虹', '闪电', '雷声', '霜', '露水', '露珠', '雾霾', '阳光',
  // 光与影
  '灯', '路灯', '灯光', '灯火', '霓虹', '霓虹灯', '车灯', '尾灯',
  '红绿灯', '红灯', '绿灯', '信号灯', '灯箱', '广告牌', '招牌', '橱窗',
  '玻璃', '倒影', '反光', '影子', '光影', '光', '灯笼', '烛光',
  // 植物
  '树', '梧桐', '梧桐树', '银杏', '银杏叶', '柳树', '垂柳', '槐树', '槐花',
  '香樟', '松树', '枫树', '枫叶', '桂花', '樱花', '桃花', '花', '野花',
  '落叶', '树叶', '叶子', '新叶', '枯枝', '藤蔓', '爬山虎', '草', '草坪',
  '灌木', '绿化带', '荷花', '芦苇',
  // 动物
  '猫', '流浪猫', '狗', '小狗', '鸟', '麻雀', '鸽子', '喜鹊', '乌鸦',
  '燕子', '蝉', '蝴蝶', '蚂蚁', '蜗牛',
  // 人物
  '老人', '小孩', '孩子', '情侣', '学生', '少年', '司机', '骑手', '外卖员',
  '小贩', '摊贩', '行人', '路人', '乘客', '保安', '环卫工', '奶奶', '爷爷',
  '伞', '雨伞', '背影', '白发', '校服', '口罩',
  // 场所建筑
  '站台', '车站', '桥', '天桥', '路口', '十字路口', '斑马线', '巷子', '胡同',
  '老街', '街道', '便利店', '咖啡馆', '奶茶店', '面馆', '早点铺', '包子铺', '菜场',
  '菜市场', '水果摊', '书店', '报亭', '工地', '学校', '医院', '公园', '广场',
  '河', '河边', '江', '湖', '运河', '教堂', '寺庙', '城墙', '钟楼',
  '居民楼', '阳台', '天台', '围墙', '铁门',
  // 物件
  '自行车', '电动车', '摩托车', '三轮车', '公交车', '出租车', '卡车', '地铁',
  '报纸', '手机', '背包', '书包', '帽子', '围巾', '气球', '风筝', '轮椅',
  '婴儿车', '行李箱', '菜篮', '蒲扇',
  // 声音气味
  '喇叭', '鸣笛', '广播', '歌声', '叫卖声', '香味', '油烟', '烟火气',
  '花香', '桂花香', '蝉鸣', '鸟叫', '味道', '哈气',
  // 吃食
  '豆浆', '油条', '包子', '老板娘',
]

/** 自动发现词时的停用字(虚词、通用动词/形容词性字),含这些字的词不当作意象 */
const STOP_CHARS = new Set(
  '的一了是我不在你他她它们这那有和就都也很还不又着过之其与或而且吗呢吧啊哦嗯嘛么个种样些把被让向从往到再才只却倒并即若虽因但如像好很要看想说会能可来去上下出进回起里后前中时为对什怎谁哪多没无非更最太极挺竟忽渐已曾将正于由按除及而别勿莫未何岂每各该本此彼某两几' +
    '印象刻旁睡觉模糊冷热挤声音得停走站场活点道买卖吃喝哭笑喊叫说讲唱读写听闻感思想忘带拿提推拉关乘坐骑驾驶亮暗满空真新旧快慢高低远近重软甜苦辣咸深浅',
  )

/** 自动发现词的黑名单:功能词与 app 元信息词,即使频繁出现也不算意象 */
const BIGRAM_BLACKLIST = new Set([
  '可以', '没有', '什么', '一个', '自己', '时候', '地方', '东西', '觉得', '好像',
  '已经', '还是', '就是', '不是', '这个', '那个', '这样', '那样', '现在', '今天',
  '昨天', '明天', '因为', '所以', '但是', '如果', '虽然', '还有', '知道', '看到',
  '听见', '想到', '回来', '出去', '起来', '这里', '那里', '怎么', '可能', '应该',
  '一直', '突然', '然后', '接着', '于是', '终于', '慢慢', '轻轻', '远远', '开始',
  '继续', '发现', '记得', '希望', '喜欢', '经过', '离开', '等待', '仿佛', '似乎',
  '原来', '其实', '大概', '几乎', '差点', '刚好', '正在',
  '窗外', '车窗', '车上', '车子', '座位', '公交',
])

const CJK_RUN_RE = /[一-龥]{2,}/g

function isCJK(ch: string): boolean {
  return ch >= '一' && ch <= '龥'
}

/** 一条记录参与意象分析的文本:观察笔记 + 招牌文字 */
export function getSceneCorpus(scene: WindowScene): string {
  const note = typeof scene?.note === 'string' ? scene.note : ''
  const sign = typeof scene?.signText === 'string' ? scene.signText : ''
  return sign ? `${note}\n${sign}` : note
}

export function sceneContainsTerm(scene: WindowScene, term: string): boolean {
  if (!term) return false
  return getSceneCorpus(scene).includes(term)
}

export function sceneContainsAnyTerm(scene: WindowScene, terms: string[]): boolean {
  return terms.some((t) => sceneContainsTerm(scene, t))
}

function byImportance(a: ImageryItem, b: ImageryItem): number {
  return (
    b.recordCount - a.recordCount ||
    b.totalCount - a.totalCount ||
    (a.term < b.term ? -1 : a.term > b.term ? 1 : 0)
  )
}

function overlaps(ranges: Array<[number, number]>, s: number, e: number): boolean {
  for (const [rs, re] of ranges) {
    if (rs >= e) break // ranges 按起点升序,后面的不可能再相交
    if (s < re && rs < e) return true
  }
  return false
}

/**
 * 扫描全部窗景记录,构建意象索引。
 * 纯函数:输入记录数组,输出意象榜 / 主题 / 共现关系。
 * 0 条、1 条、几百条记录都安全;记录增删后重新调用即可得到最新索引。
 */
export function buildImageryIndex(scenes: WindowScene[]): ImageryIndex {
  const empty: ImageryIndex = {
    items: [],
    themes: [],
    pairs: [],
    matchedRecordCount: 0,
    totalRecords: Array.isArray(scenes) ? scenes.length : 0,
  }
  if (!Array.isArray(scenes) || scenes.length === 0) return empty

  const termRecords = new Map<string, Set<number>>()
  const termTotal = new Map<string, number>()
  const termSource = new Map<string, 'lexicon' | 'discovered'>()
  // 自动发现候选(二字 + 三字):记录覆盖、总次数、左右汉字上下文
  interface Cand { records: Set<number>; total: number; left: Set<string>; right: Set<string> }
  const candMap = new Map<string, Cand>()

  const noteTerm = (term: string, idx: number, count: number, source: 'lexicon' | 'discovered') => {
    if (!termRecords.has(term)) termRecords.set(term, new Set())
    termRecords.get(term)!.add(idx)
    termTotal.set(term, (termTotal.get(term) || 0) + count)
    if (!termSource.has(term)) termSource.set(term, source)
  }

  scenes.forEach((scene, idx) => {
    const corpus = getSceneCorpus(scene)
    if (!corpus || !corpus.trim()) return

    // 1) 词典命中,同时记录命中区间(自动发现词要避开这些区间)
    const ranges: Array<[number, number]> = []
    for (const term of IMAGERY_LEXICON) {
      let count = 0
      let from = 0
      while (from <= corpus.length - term.length) {
        const at = corpus.indexOf(term, from)
        if (at === -1) break
        count++
        ranges.push([at, at + term.length])
        from = at + term.length
      }
      if (count > 0) noteTerm(term, idx, count, 'lexicon')
    }
    ranges.sort((a, b) => a[0] - b[0])

    // 2) 自动发现:连续汉字串里的二字/三字词,跨记录重复出现的才算
    CJK_RUN_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = CJK_RUN_RE.exec(corpus)) !== null) {
      const run = m[0]
      const base = m.index
      for (let i = 0; i < run.length - 1; i++) {
        for (const len of [2, 3]) {
          if (i + len > run.length) continue
          const term = run.slice(i, i + len)
          let hasStop = false
          for (const ch of term) {
            if (STOP_CHARS.has(ch)) { hasStop = true; break }
          }
          if (hasStop) continue
          if (len === 2 && BIGRAM_BLACKLIST.has(term)) continue
          const s = base + i
          if (overlaps(ranges, s, s + len)) continue
          let c = candMap.get(term)
          if (!c) {
            c = { records: new Set(), total: 0, left: new Set(), right: new Set() }
            candMap.set(term, c)
          }
          c.records.add(idx)
          c.total++
          const lc = s > 0 ? corpus.charAt(s - 1) : ''
          const rc = s + len < corpus.length ? corpus.charAt(s + len) : ''
          if (isCJK(lc)) c.left.add(lc)
          if (isCJK(rc)) c.right.add(rc)
        }
      }
    }
  })

  // 3) 筛出合格的自动发现词,并入意象表。合格条件:
  //    a. 至少出现在两条记录里;
  //    b. 上下文有多样性——左右相邻汉字加起来至少两种,否则基本是固定短语/长词的碎片
  //       (如「印象深刻」切出的「人印」「象深」);
  //    c. 二字词若总是某个合格三字词的一部分(如「老板娘」里的「板娘」),让位给三字词。
  interface Qualified { term: string; recs: Set<number>; total: number }
  const qualified: Qualified[] = []
  for (const [term, c] of candMap) {
    if (c.records.size < MIN_RECORDS_FOR_DISCOVERED) continue
    if (termSource.has(term)) continue
    if (c.left.size <= 1 && c.right.size <= 1) continue
    qualified.push({ term, recs: c.records, total: c.total })
  }
  const qualifiedTrigrams = qualified.filter((q) => q.term.length === 3)
  const discovered = qualified
    .filter((q) => {
      if (q.term.length !== 2) return true
      for (const t of qualifiedTrigrams) {
        if (!t.term.includes(q.term)) continue
        let subset = true
        for (const r of q.recs) {
          if (!t.recs.has(r)) { subset = false; break }
        }
        if (subset) return false
      }
      return true
    })
    .sort((a, b) => b.recs.size - a.recs.size || b.total - a.total || (a.term < b.term ? -1 : 1))
    .slice(0, MAX_DISCOVERED)
  for (const { term, recs, total } of discovered) {
    for (const idx of recs) noteTerm(term, idx, 0, 'discovered')
    termTotal.set(term, total)
  }

  // 4) 意象榜:按重要程度(覆盖记录数 → 总次数 → 字序)排序
  const items: ImageryItem[] = [...termRecords.entries()]
    .map(([term, recs]) => ({
      term,
      recordCount: recs.size,
      totalCount: termTotal.get(term) || 0,
      source: termSource.get(term) || 'lexicon',
      related: [] as ImageryRelation[],
    }))
    .sort(byImportance)
    .slice(0, MAX_ITEMS)

  // 5) 每条记录的命中意象集合(只保留上榜意象)
  const matchedSets: string[][] = Array.from({ length: scenes.length }, () => [])
  for (const item of items) {
    for (const idx of termRecords.get(item.term) || []) matchedSets[idx].push(item.term)
  }
  const matchedRecordCount = matchedSets.filter((s) => s.length > 0).length

  // 6) 共现统计:同一条记录里出现的意象两两计一次;互为子串的跳过(如「雨」与「小雨」)
  const pairCount = new Map<string, number>()
  for (const terms of matchedSets) {
    const t = terms.slice(0, MAX_TERMS_PER_RECORD_FOR_PAIRS)
    for (let i = 0; i < t.length; i++) {
      for (let j = i + 1; j < t.length; j++) {
        const a = t[i]
        const b = t[j]
        if (a.includes(b) || b.includes(a)) continue
        const key = a < b ? a + PAIR_SEP + b : b + PAIR_SEP + a
        pairCount.set(key, (pairCount.get(key) || 0) + 1)
      }
    }
  }

  // 7) 每个意象的相关意象
  const relatedMap = new Map<string, ImageryRelation[]>()
  for (const [key, shared] of pairCount) {
    const [a, b] = key.split(PAIR_SEP)
    if (!relatedMap.has(a)) relatedMap.set(a, [])
    if (!relatedMap.has(b)) relatedMap.set(b, [])
    relatedMap.get(a)!.push({ term: b, shared })
    relatedMap.get(b)!.push({ term: a, shared })
  }
  for (const item of items) {
    const rel = (relatedMap.get(item.term) || [])
      .sort((x, y) => y.shared - x.shared || (x.term < y.term ? -1 : 1))
      .slice(0, MAX_RELATED)
    item.related = rel
  }

  // 8) 全局共现榜(关系展示区用)
  const pairs: ImageryPair[] = [...pairCount.entries()]
    .map(([key, shared]) => {
      const [a, b] = key.split(PAIR_SEP)
      return { a, b, shared }
    })
    .sort((x, y) => y.shared - x.shared || (x.a < y.a ? -1 : x.a > y.a ? 1 : x.b < y.b ? -1 : 1))
    .slice(0, MAX_PAIRS)

  // 9) 主题:同现 ≥2 条记录的意象连边,按重要程度贪心做星形聚类
  const strongAdj = new Map<string, Set<string>>()
  for (const [key, shared] of pairCount) {
    if (shared < MIN_SHARED_FOR_THEME) continue
    const [a, b] = key.split(PAIR_SEP)
    if (!strongAdj.has(a)) strongAdj.set(a, new Set())
    if (!strongAdj.has(b)) strongAdj.set(b, new Set())
    strongAdj.get(a)!.add(b)
    strongAdj.get(b)!.add(a)
  }
  const candidates = items.filter((it) => it.recordCount >= MIN_SHARED_FOR_THEME)
  const assigned = new Set<string>()
  const themes: ImageryTheme[] = []
  for (const seed of candidates) {
    if (themes.length >= MAX_THEMES) break
    if (assigned.has(seed.term)) continue
    const neighbors = strongAdj.get(seed.term)
    if (!neighbors || neighbors.size === 0) continue
    const members = [seed.term]
    for (const other of candidates) {
      if (members.length >= MAX_THEME_MEMBERS) break
      if (other.term === seed.term || assigned.has(other.term)) continue
      if (neighbors.has(other.term)) members.push(other.term)
    }
    if (members.length < 2) continue
    members.forEach((t) => assigned.add(t))
    const recordSet = new Set<number>()
    for (const t of members) {
      for (const idx of termRecords.get(t) || []) recordSet.add(idx)
    }
    themes.push({ id: seed.term, label: seed.term, members, recordCount: recordSet.size })
  }

  return { items, themes, pairs, matchedRecordCount, totalRecords: scenes.length }
}

export function getThemeById(index: ImageryIndex, id: string): ImageryTheme | undefined {
  return index.themes.find((t) => t.id === id)
}
