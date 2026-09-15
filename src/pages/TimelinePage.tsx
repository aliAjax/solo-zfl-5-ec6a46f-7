import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Route, X, Trash2, Clock, MapPin, Sparkles, Layers } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import {
  formatTimestamp,
  getTimeOfDay,
  getWeatherIcon,
  getTreeIcon,
  getPedestrianIcon,
} from '@/utils/sceneHelpers'
import {
  buildImageryIndex,
  getThemeById,
  sceneContainsTerm,
  sceneContainsAnyTerm,
} from '@/utils/imageryIndex'
import type { WindowScene } from '@/types'

export default function TimelinePage() {
  const { scenes, routeNames, selectedRoute, currentRouteScenes, selectRoute, loadAll, deleteScene } =
    useSceneStore()
  const [search, setSearch] = useState('')
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // 意象/主题筛选(来自意象索引台的跳转):?imagery=雨&imagery=灯 或 ?theme=雨
  const imageryView = useMemo(() => {
    const terms = searchParams.getAll('imagery').filter(Boolean)
    const themeId = (searchParams.get('theme') || '').trim()
    if (terms.length === 0 && !themeId) return null
    if (themeId) {
      const theme = getThemeById(buildImageryIndex(scenes), themeId)
      if (!theme) {
        // 记录变动后主题可能已不存在,给出可清除的空结果而不是报错
        return { kind: 'theme' as const, label: themeId, members: [] as string[], list: [] as WindowScene[] }
      }
      return {
        kind: 'theme' as const,
        label: theme.label,
        members: theme.members,
        list: scenes.filter((s) => sceneContainsAnyTerm(s, theme.members)),
      }
    }
    return {
      kind: 'terms' as const,
      terms,
      list: scenes.filter((s) => terms.every((t) => sceneContainsTerm(s, t))),
    }
  }, [scenes, searchParams])

  const clearImageryFilter = () => setSearchParams({})

  const filteredRoutes = routeNames.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  )

  const sourceScenes = imageryView ? imageryView.list : currentRouteScenes
  const sorted = [...sourceScenes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const handleDelete = (id: string) => {
    deleteScene(id)
    setDetailScene(null)
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold tracking-wide text-dusk-400">
          窗景时间线
        </h1>

        <div className="mb-6 space-y-3">
          {imageryView ? (
            /* 意象/主题筛选横幅:从意象索引台跳入时替代路线筛选 */
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dusk-400/30 bg-dusk-400/10 px-4 py-3">
              {imageryView.kind === 'theme' ? (
                <>
                  <Layers className="w-4 h-4 text-dusk-400" />
                  <span className="text-sm text-mist-100">
                    主题「{imageryView.label}」
                  </span>
                  {imageryView.members.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {imageryView.members.map((m) => (
                        <span
                          key={m}
                          className="rounded-full bg-teal-800/70 px-2 py-0.5 text-[10px] text-mist-300"
                        >
                          {m}
                        </span>
                      ))}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-dusk-400" />
                  <span className="text-sm text-mist-100">意象筛选:</span>
                  {imageryView.terms.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-dusk-400/20 border border-dusk-400/40 px-2.5 py-0.5 text-xs text-dusk-300"
                    >
                      {t}
                    </span>
                  ))}
                </>
              )}
              <span className="text-xs text-mist-400">{sorted.length} 条记录</span>
              <button
                onClick={clearImageryFilter}
                className="ml-auto flex items-center gap-1 rounded-full bg-teal-800/70 px-2.5 py-1 text-xs text-mist-300 transition-colors hover:bg-teal-800 hover:text-mist-100"
              >
                <X className="w-3 h-3" />
                清除筛选
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-mist-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索路线..."
                  className="w-full rounded-lg border border-teal-800 bg-teal-900/60 py-2.5 pl-10 pr-4 text-sm text-mist-100 placeholder:text-mist-500 focus:border-dusk-400 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => selectRoute('')}
                  className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                    !selectedRoute
                      ? 'bg-dusk-400 text-teal-950'
                      : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
                  }`}
                >
                  全部
                </button>
                {filteredRoutes.map((name) => (
                  <button
                    key={name}
                    onClick={() => selectRoute(name)}
                    className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                      selectedRoute === name
                        ? 'bg-dusk-400 text-teal-950'
                        : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
                    }`}
                  >
                    <Route className="mr-1 inline w-3 h-3" />
                    {name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-400">
            <div className="mb-4 text-6xl opacity-30">🪟</div>
            <p className="text-lg">
              {imageryView
                ? imageryView.kind === 'theme'
                  ? `没有找到与主题「${imageryView.label}」相关的记录`
                  : `没有找到同时包含这些意象的记录`
                : selectedRoute
                  ? '该路线暂无窗景记录'
                  : '选择一条路线，开始浏览窗景'}
            </p>
            {imageryView && (
              <button
                onClick={clearImageryFilter}
                className="mt-4 flex items-center gap-1.5 rounded-full bg-teal-900 px-4 py-2 text-xs text-mist-300 transition-colors hover:bg-teal-800"
              >
                <X className="w-3 h-3" />
                清除筛选,回到路线浏览
              </button>
            )}
          </div>
        ) : (
          <div className="relative pl-8">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-teal-800" />
            <div className="space-y-6">
              {sorted.map((scene) => (
                <div key={scene.id} className="relative flex gap-4">
                  <div className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-dusk-400 ring-4 ring-teal-950" />
                  <div className="w-20 shrink-0 pt-0.5 text-right">
                    <p className="text-xs text-dusk-400">
                      {formatTimestamp(scene.timestamp)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-mist-500">
                      {getTimeOfDay(scene.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailScene(scene)}
                    className="group flex-1 rounded-xl border border-teal-800 bg-teal-900/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40 hover:shadow-lg hover:shadow-dusk-400/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getWeatherIcon(scene.weather)}
                      <span className="text-sm font-semibold text-mist-100">
                        {scene.segment}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-1.5 text-mist-400">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs">{scene.routeName}</span>
                      <span className="mx-1 text-teal-700">·</span>
                      <span className="text-xs">{scene.seatDirection}侧</span>
                    </div>
                    {scene.note && (
                      <p className="text-xs text-mist-400 line-clamp-2">
                        {scene.note}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {getTreeIcon(scene.treeDensity)}
                      {getPedestrianIcon(scene.pedestrianStatus)}
                      {scene.signText && (
                        <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-300">
                          {scene.signText}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {detailScene && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailScene(null)}
        >
          <div
            className="relative mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailScene(null)}
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              {getWeatherIcon(detailScene.weather)}
              <h2 className="text-xl font-bold text-dusk-400">{detailScene.segment}</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-mist-300">
                <MapPin className="w-4 h-4 text-dusk-400" />
                <span>{detailScene.routeName}</span>
                <span className="text-teal-600">·</span>
                <span>{detailScene.seatDirection}侧</span>
              </div>
              <div className="flex items-center gap-2 text-mist-300">
                <Clock className="w-4 h-4 text-dusk-400" />
                <span>{formatTimestamp(detailScene.timestamp)}</span>
                <span className="text-teal-600">·</span>
                <span>{getTimeOfDay(detailScene.timestamp)}</span>
              </div>
              <div className="flex items-center gap-3 text-mist-300">
                {getTreeIcon(detailScene.treeDensity)}
                <span>{detailScene.treeDensity}</span>
                {getPedestrianIcon(detailScene.pedestrianStatus)}
                <span>{detailScene.pedestrianStatus}</span>
              </div>
              {detailScene.signText && (
                <div className="rounded-lg bg-teal-800/50 px-3 py-2 text-mist-200">
                  招牌: {detailScene.signText}
                </div>
              )}
              {detailScene.note && (
                <div className="rounded-lg border border-teal-800 px-3 py-2 text-mist-300">
                  {detailScene.note}
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(detailScene.id)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-900/40 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-900/60"
            >
              <Trash2 className="w-4 h-4" />
              删除此窗景
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
