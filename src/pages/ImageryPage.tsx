import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Layers,
  ListOrdered,
  Network,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  PenLine,
  Bus,
  Wand2,
} from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import { buildImageryIndex } from '@/utils/imageryIndex'
import type { ImageryItem } from '@/utils/imageryIndex'

const RANK_PAGE = 20

export default function ImageryPage() {
  const scenes = useSceneStore((s) => s.scenes)
  const loadAll = useSceneStore((s) => s.loadAll)
  const navigate = useNavigate()
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // 索引完全由记录派生:记录增删后 scenes 变化,索引自动重建
  const index = useMemo(() => buildImageryIndex(scenes), [scenes])
  const { items, themes, pairs, matchedRecordCount, totalRecords } = index

  const goImagery = (term: string) =>
    navigate(`/timeline?imagery=${encodeURIComponent(term)}`)
  const goPair = (a: string, b: string) =>
    navigate(`/timeline?imagery=${encodeURIComponent(a)}&imagery=${encodeURIComponent(b)}`)
  const goTheme = (id: string) => navigate(`/timeline?theme=${encodeURIComponent(id)}`)

  const maxCount = items.length > 0 ? items[0].recordCount : 1
  const visibleItems = showAll ? items : items.slice(0, RANK_PAGE)

  /* ---------- 空态:一条记录都没有 ---------- */
  if (totalRecords === 0) {
    return (
      <div className="min-h-screen bg-teal-950 flex flex-col items-center justify-center px-6 text-center">
        <Bus className="w-16 h-16 text-dusk-400/40 mb-6" />
        <p className="text-mist-100 text-lg font-serif mb-2">还没有窗景记录</p>
        <p className="text-mist-400 text-sm mb-6">
          意象索引台会扫描你的观察笔记,
          <br />
          把反复出现的意象、主题和它们之间的关系整理出来
        </p>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-dusk-400/15 border border-dusk-400/30
            hover:bg-dusk-400/25 transition-all text-mist-100 font-serif text-sm"
        >
          <PenLine className="w-4 h-4 text-dusk-400" />
          先去记录一段窗景
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
        {/* ---------- 头部 ---------- */}
        <header>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-wide text-dusk-400">
            <Sparkles className="w-7 h-7" />
            意象索引台
          </h1>
          <p className="mt-2 text-sm text-mist-400">
            扫描了 {totalRecords} 条窗景记录 · 发现 {items.length} 个反复出现的意象
            {themes.length > 0 && ` · 归纳出 ${themes.length} 个主题`}
          </p>
          {matchedRecordCount < totalRecords && (
            <p className="mt-1 text-xs text-mist-500">
              {matchedRecordCount} 条记录含有反复出现的意象;同一个意象在至少两条记录里出现才会上榜
            </p>
          )}
        </header>

        {items.length === 0 ? (
          /* ---------- 有记录但没识别出意象 ---------- */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Wand2 className="w-12 h-12 text-dusk-400/40 mb-4" />
            <p className="text-mist-300 text-lg mb-2">还没有反复出现的意象</p>
            <p className="text-mist-500 text-sm max-w-sm">
              同一个意象在至少两条记录里出现时,才会列在这里。
              试着在观察笔记里写下你反复看到的东西——雨、路灯、猫、某家店的招牌……
            </p>
          </div>
        ) : (
          <>
            {/* ---------- 主题 ---------- */}
            <section>
              <h2 className="flex items-center gap-2 text-xl text-dusk-300 mb-1">
                <Layers className="w-5 h-5" />
                主题
              </h2>
              {themes.length === 0 ? (
                <p className="text-mist-500 text-sm mt-2">
                  记录还太少,暂时归纳不出主题。当一些意象开始经常一起出现,它们会在这里聚成主题。
                </p>
              ) : (
                <>
                  <p className="text-mist-500 text-xs mb-4">经常一起出现的意象,聚成了这些主题</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {themes.map((theme) => (
                      <div
                        key={theme.id}
                        onClick={() => goTheme(theme.id)}
                        className="group cursor-pointer rounded-2xl border border-teal-800 bg-teal-900/50 p-4
                          transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40
                          hover:shadow-lg hover:shadow-dusk-400/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg text-dusk-300">「{theme.label}」</span>
                          <span className="text-xs text-mist-500">{theme.recordCount} 条记录</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {theme.members.map((m) => (
                            <button
                              key={m}
                              onClick={(e) => {
                                e.stopPropagation()
                                goImagery(m)
                              }}
                              className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                                m === theme.label
                                  ? 'bg-dusk-400/25 text-dusk-300 border border-dusk-400/40'
                                  : 'bg-teal-800/70 text-mist-300 border border-transparent hover:border-dusk-400/30 hover:text-dusk-300'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-mist-500 group-hover:text-dusk-400 transition-colors">
                          查看该主题的记录
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* ---------- 意象榜 ---------- */}
            <section>
              <h2 className="flex items-center gap-2 text-xl text-dusk-300 mb-1">
                <ListOrdered className="w-5 h-5" />
                意象榜
              </h2>
              <p className="text-mist-500 text-xs mb-4">
                在至少两条记录里反复出现的意象,按重要程度排序——点意象跳到包含它的记录,点「关系」看看它常和谁一起出现
              </p>
              <div className="space-y-2">
                {visibleItems.map((item, rank) => (
                  <ImageryRow
                    key={item.term}
                    item={item}
                    rank={rank + 1}
                    maxCount={maxCount}
                    expanded={expandedTerm === item.term}
                    onToggle={() =>
                      setExpandedTerm(expandedTerm === item.term ? null : item.term)
                    }
                    onJump={() => goImagery(item.term)}
                    onJumpRelated={goImagery}
                  />
                ))}
              </div>
              {items.length > RANK_PAGE && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="mt-3 flex items-center gap-1 text-xs text-mist-400 hover:text-dusk-300 transition-colors"
                >
                  {showAll ? (
                    <>
                      收起 <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      展开全部 {items.length} 个意象 <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </section>

            {/* ---------- 意象关系 ---------- */}
            {pairs.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-xl text-dusk-300 mb-1">
                  <Network className="w-5 h-5" />
                  意象关系
                </h2>
                <p className="text-mist-500 text-xs mb-4">这些意象经常出现在同一段窗景里</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {pairs.map((p) => (
                    <button
                      key={`${p.a}-${p.b}`}
                      onClick={() => goPair(p.a, p.b)}
                      className="group flex items-center justify-between rounded-xl border border-teal-800
                        bg-teal-900/40 px-4 py-2.5 text-left transition-all
                        hover:border-dusk-400/40 hover:bg-teal-900/70"
                    >
                      <span className="text-sm text-mist-200">
                        <span className="text-dusk-300">{p.a}</span>
                        <span className="mx-2 text-mist-500">×</span>
                        <span className="text-dusk-300">{p.b}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-mist-500 group-hover:text-dusk-400 transition-colors">
                        {p.shared} 条共同记录
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ---------- 意象榜单行 ---------- */
function ImageryRow({
  item,
  rank,
  maxCount,
  expanded,
  onToggle,
  onJump,
  onJumpRelated,
}: {
  item: ImageryItem
  rank: number
  maxCount: number
  expanded: boolean
  onToggle: () => void
  onJump: () => void
  onJumpRelated: (term: string) => void
}) {
  const widthPct = Math.max(6, Math.round((item.recordCount / maxCount) * 100))
  return (
    <div
      className={`rounded-xl border transition-colors ${
        expanded ? 'border-dusk-400/40 bg-teal-900/70' : 'border-teal-800 bg-teal-900/40'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className={`w-6 shrink-0 text-right text-sm ${
            rank <= 3 ? 'text-dusk-400 font-semibold' : 'text-mist-500'
          }`}
        >
          {rank}
        </span>
        <button
          onClick={onJump}
          className="group flex min-w-0 flex-1 items-center gap-3 text-left"
          title={`在时间线中查看「${item.term}」`}
        >
          <span className="shrink-0 text-base text-mist-100 group-hover:text-dusk-300 transition-colors">
            {item.term}
          </span>
          {item.source === 'discovered' && (
            <span className="shrink-0 rounded bg-dusk-400/15 px-1.5 py-0.5 text-[10px] text-dusk-300">
              自发现
            </span>
          )}
          <span className="relative h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-teal-800/80">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-dusk-400/70"
              style={{ width: `${widthPct}%` }}
            />
          </span>
          <span className="shrink-0 text-xs text-mist-400">{item.recordCount} 条记录</span>
        </button>
        {item.related.length > 0 && (
          <button
            onClick={onToggle}
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
              expanded
                ? 'bg-dusk-400/20 text-dusk-300'
                : 'text-mist-500 hover:bg-teal-800 hover:text-mist-300'
            }`}
          >
            关系
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>
      {expanded && item.related.length > 0 && (
        <div className="border-t border-teal-800/70 px-4 py-3 pl-12">
          <p className="mb-2 text-xs text-mist-500">
            「{item.term}」常与这些意象一起出现(共出现 {item.totalCount} 次):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {item.related.map((rel) => (
              <button
                key={rel.term}
                onClick={() => onJumpRelated(rel.term)}
                className="rounded-full border border-teal-700 bg-teal-800/60 px-2.5 py-1 text-xs
                  text-mist-300 transition-colors hover:border-dusk-400/40 hover:text-dusk-300"
              >
                {rel.term}
                <span className="ml-1 text-mist-500">{rel.shared}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
