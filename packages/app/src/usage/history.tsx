import { createSignal, createMemo, createEffect, onMount, For, Show, type JSX } from "solid-js"
import { useServer, useData } from "@/runtime/server/current"
import { useLanguage } from "@/runtime/i18n/language"
import { Button } from "@opencode/ui/button"
import { Loader } from "@opencode/ui/loader"
import "@/settings/settings.css"

export interface SessionStatsData {
  streak?: number
  tokens?: {
    input?: number
    output?: number
    reasoning?: number
    cache?: { read?: number; write?: number }
  }
  activity?: Array<{ date: string; steps: number }>
  models?: Array<{
    model: { providerID: string; id: string }
    tokens: {
      input?: number
      output?: number
      reasoning?: number
      cache?: { read?: number; write?: number }
    }
  }>
}

export function formatCompactNumber(val: number): string {
  if (!val || isNaN(val) || val <= 0) return "0"
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`
  return Math.round(val).toLocaleString()
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60_000) return "agora há pouco"
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours} ${hours === 1 ? "hora" : "horas"}`
  const days = Math.floor(hours / 24)
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`
  const months = Math.floor(days / 30)
  return `há ${months} ${months === 1 ? "mês" : "meses"}`
}

type PeriodOption = "30d" | "7d" | "24h" | "all"

export function UsageHistoryDashboard(props: { headerAction?: JSX.Element; showHeader?: boolean } = {}) {
  const language = useLanguage()
  const server = useServer()
  const data = useData()

  const [period, setPeriod] = createSignal<PeriodOption>("30d")
  const [customDate, setCustomDate] = createSignal<string>("")
  const [loading, setLoading] = createSignal(true)
  const [statsData, setStatsData] = createSignal<SessionStatsData | null>(null)
  const [todayTokens, setTodayTokens] = createSignal<number>(0)

  const rangeFrom = createMemo(() => {
    const now = Date.now()
    switch (period()) {
      case "24h":
        return now - 24 * 60 * 60 * 1000
      case "7d":
        return now - 7 * 24 * 60 * 60 * 1000
      case "30d":
        return now - 30 * 24 * 60 * 60 * 1000
      case "all":
        return 0
    }
  })

  const periodLabel = createMemo(() => {
    switch (period()) {
      case "24h":
        return "Hoje (24h)"
      case "7d":
        return "Últimos 7 dias"
      case "30d":
        return "Últimos 30 dias"
      case "all":
        return "Todo o período"
    }
  })

  const loadStats = async () => {
    setLoading(true)
    try {
      const now = Date.now()
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const from = rangeFrom() > 0 ? rangeFrom() : undefined
      const startOfToday = new Date().setHours(0, 0, 0, 0)

      // Parallel fetch main stats and today stats
      const [mainRes, todayRes] = await Promise.allSettled([
        server.ctx.sdk.api.experimental.session.stats({
          from,
          to: now,
          timezone: tz,
          tools: "summary",
        }),
        server.ctx.sdk.api.experimental.session.stats({
          from: startOfToday,
          to: now,
          timezone: tz,
          tools: "none",
        }),
      ])

      if (mainRes.status === "fulfilled" && mainRes.value.data) {
        setStatsData(mainRes.value.data)
      } else {
        setStatsData(null)
      }

      if (todayRes.status === "fulfilled" && todayRes.value.data) {
        const t = todayRes.value.data.tokens
        const sum = (t?.input || 0) + (t?.output || 0) + (t?.reasoning || 0) + (t?.cache?.read || 0) + (t?.cache?.write || 0)
        setTodayTokens(sum)
      } else {
        // Fallback from session list
        const todaySessions = data.session.list().filter((s) => s.time.updated >= startOfToday)
        const sum = todaySessions.reduce((acc, s) => {
          const t = s.tokens
          return acc + (t ? (t.input || 0) + (t.output || 0) + (t.reasoning || 0) + (t.cache?.read || 0) + (t.cache?.write || 0) : 0)
        }, 0)
        setTodayTokens(sum)
      }
    } catch (e) {
      console.warn("Failed to load session stats:", e)
    } finally {
      setLoading(false)
    }
  }

  createEffect(() => {
    // Re-fetch when period changes
    rangeFrom()
    loadStats()
  })

  // Overview metrics derived from stats or local session list
  const allSessions = createMemo(() => data.session.list())

  const periodSessions = createMemo(() => {
    const from = rangeFrom()
    return allSessions().filter((s) => s.time.updated >= from)
  })

  const totalPeriodTokens = createMemo(() => {
    const st = statsData()
    if (st && st.tokens) {
      const t = st.tokens
      return (t.input || 0) + (t.output || 0) + (t.reasoning || 0) + (t.cache?.read || 0) + (t.cache?.write || 0)
    }
    return periodSessions().reduce((acc, s) => {
      const t = s.tokens
      return acc + (t ? (t.input || 0) + (t.output || 0) + (t.reasoning || 0) + (t.cache?.read || 0) + (t.cache?.write || 0) : 0)
    }, 0)
  })

  const cacheHitRate = createMemo(() => {
    const st = statsData()
    if (st && st.tokens) {
      const t = st.tokens
      const read = t.cache?.read || 0
      const total = (t.input || 0) + (t.output || 0) + (t.reasoning || 0) + (t.cache?.read || 0) + (t.cache?.write || 0)
      if (total <= 0) return 0
      return Math.round((read / total) * 100)
    }
    let read = 0
    let total = 0
    for (const s of periodSessions()) {
      if (!s.tokens) continue
      read += s.tokens.cache?.read || 0
      total += (s.tokens.input || 0) + (s.tokens.output || 0) + (s.tokens.reasoning || 0) + (s.tokens.cache?.read || 0) + (s.tokens.cache?.write || 0)
    }
    if (total <= 0) return 0
    return Math.round((read / total) * 100)
  })

  const modelsUsedCount = createMemo(() => {
    const st = statsData()
    if (st && st.models && st.models.length > 0) {
      return st.models.length
    }
    const set = new Set<string>()
    for (const s of periodSessions()) {
      if (s.model?.id) set.add(`${s.model.providerID}/${s.model.id}`)
    }
    return Math.max(set.size, 1)
  })

  const streakDays = createMemo(() => {
    const st = statsData()
    return st?.streak || (totalPeriodTokens() > 0 ? 1 : 0)
  })

  // 31-week heatmap calculations
  const heatmapGrid = createMemo(() => {
    const totalWeeks = 31
    const totalDays = totalWeeks * 7
    const now = new Date()
    // Activity map from stats
    const activityMap = new Map<string, number>()
    const st = statsData()
    if (st && st.activity) {
      for (const item of st.activity) {
        activityMap.set(item.date, item.steps)
      }
    }
    // Also include session updates from local DB
    for (const s of allSessions()) {
      const d = new Date(s.time.updated).toISOString().slice(0, 10)
      activityMap.set(d, (activityMap.get(d) || 0) + 1)
    }

    const weeks: Array<Array<{ date: string; steps: number; level: number; dayOfWeek: number }>> = []
    
    // We want the last column to end on today or Saturday
    // Calculate start date (totalDays ago)
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - totalDays + 1)

    let currentDay = new Date(startDate)
    let currentWeek: Array<{ date: string; steps: number; level: number; dayOfWeek: number }> = []

    for (let i = 0; i < totalDays; i++) {
      const dateStr = currentDay.toISOString().slice(0, 10)
      const steps = activityMap.get(dateStr) || 0
      let level = 0
      if (steps > 40) level = 4
      else if (steps > 15) level = 3
      else if (steps > 5) level = 2
      else if (steps > 0) level = 1

      currentWeek.push({
        date: dateStr,
        steps,
        level,
        dayOfWeek: currentDay.getDay(),
      })

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
      currentDay.setDate(currentDay.getDate() + 1)
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return weeks
  })

  // Month labels for the heatmap
  const heatmapMonths = createMemo(() => {
    const months = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."]
    const result: Array<{ label: string; weekIndex: number }> = []
    let lastMonth = -1
    let lastPushedIdx = -10
    const grid = heatmapGrid()
    grid.forEach((week, idx) => {
      if (week[0]) {
        const m = new Date(week[0].date).getMonth()
        if (m !== lastMonth && (idx - lastPushedIdx >= 3 || lastPushedIdx < 0)) {
          result.push({ label: months[m], weekIndex: idx })
          lastMonth = m
          lastPushedIdx = idx
        }
      }
    })
    return result
  })

  // 30 days stacked bar chart
  const dailyChartDays = createMemo(() => {
    const days: Array<{ date: string; label: string; tokens: number }> = []
    const now = new Date()
    const activityMap = new Map<string, number>()
    
    // Aggregate session tokens by date
    for (const s of periodSessions()) {
      const d = new Date(s.time.updated).toISOString().slice(0, 10)
      const t = s.tokens
      const tok = t ? (t.input || 0) + (t.output || 0) + (t.reasoning || 0) + (t.cache?.read || 0) + (t.cache?.write || 0) : 0
      activityMap.set(d, (activityMap.get(d) || 0) + tok)
    }

    // Generate 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const label = `${d.getDate()}/${d.getMonth() + 1}`
      days.push({
        date: dateStr,
        label,
        tokens: activityMap.get(dateStr) || 0,
      })
    }
    return days
  })

  const maxDailyTokens = createMemo(() => {
    let max = 1000
    for (const d of dailyChartDays()) {
      if (d.tokens > max) max = d.tokens
    }
    return max
  })

  // Agent / Harness Breakdown
  const agentBreakdown = createMemo(() => {
    const map = new Map<
      string,
      { name: string; tokens: number; todayTokens: number; cacheRead: number; cacheTotal: number; models: Set<string> }
    >()
    const startOfToday = new Date().setHours(0, 0, 0, 0)
    const total = totalPeriodTokens() || 1

    for (const s of periodSessions()) {
      const agentName = s.agent || "default"
      const t = s.tokens
      const tok = t ? (t.input || 0) + (t.output || 0) + (t.reasoning || 0) + (t.cache?.read || 0) + (t.cache?.write || 0) : 0
      const isToday = s.time.updated >= startOfToday

      let item = map.get(agentName)
      if (!item) {
        item = {
          name: agentName,
          tokens: 0,
          todayTokens: 0,
          cacheRead: 0,
          cacheTotal: 0,
          models: new Set(),
        }
        map.set(agentName, item)
      }
      item.tokens += tok
      if (isToday) item.todayTokens += tok
      if (t) {
        item.cacheRead += t.cache?.read || 0
        item.cacheTotal += (t.input || 0) + (t.output || 0) + (t.cache?.read || 0) + (t.cache?.write || 0)
      }
      if (s.model?.id) item.models.add(s.model.id)
    }

    // If empty, add placeholder
    if (map.size === 0) {
      return [
        {
          name: "pi",
          color: "bg-[#2dd4bf]",
          tokens: 0,
          share: 100,
          todayTokens: 0,
          cacheRate: 0,
          modelsCount: 1,
        },
      ]
    }

    const colors = ["bg-[#2dd4bf]", "bg-[#818cf8]", "bg-[#f472b6]", "bg-[#fb923c]", "bg-[#38bdf8]"]
    let colorIdx = 0

    return Array.from(map.values())
      .sort((a, b) => b.tokens - a.tokens)
      .map((item) => {
        const share = Math.round((item.tokens / total) * 100)
        const cacheRate = item.cacheTotal > 0 ? Math.round((item.cacheRead / item.cacheTotal) * 100) : 0
        const color = colors[colorIdx % colors.length]
        colorIdx++
        return {
          name: item.name,
          color,
          tokens: item.tokens,
          share,
          todayTokens: item.todayTokens,
          cacheRate,
          modelsCount: Math.max(item.models.size, 1),
        }
      })
  })

  // Model Breakdown
  const modelBreakdown = createMemo(() => {
    const st = statsData()
    const total = totalPeriodTokens() || 1
    if (st && st.models && st.models.length > 0) {
      return st.models.map((m) => {
        const tok = (m.tokens.input || 0) + (m.tokens.output || 0) + (m.tokens.reasoning || 0) + (m.tokens.cache?.read || 0) + (m.tokens.cache?.write || 0)
        const share = Math.round((tok / total) * 100)
        const cacheRead = m.tokens.cache?.read || 0
        const cacheTotal = (m.tokens.input || 0) + (m.tokens.output || 0) + (m.tokens.cache?.read || 0) + (m.tokens.cache?.write || 0)
        const hitRate = cacheTotal > 0 ? Math.round((cacheRead / cacheTotal) * 100) : 0
        return {
          id: `${m.model.providerID}/${m.model.id}`,
          name: m.model.id,
          provider: m.model.providerID,
          tokens: tok,
          share,
          input: m.tokens.input || 0,
          output: m.tokens.output || 0,
          cacheRead: m.tokens.cache?.read || 0,
          cacheWrite: m.tokens.cache?.write || 0,
          hitRate,
        }
      })
    }

    // Fallback from session list
    const map = new Map<
      string,
      { id: string; name: string; provider: string; input: number; output: number; cacheRead: number; cacheWrite: number }
    >()
    for (const s of periodSessions()) {
      if (!s.model) continue
      const key = `${s.model.providerID}/${s.model.id}`
      let item = map.get(key)
      if (!item) {
        item = {
          id: key,
          name: s.model.id,
          provider: s.model.providerID,
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
        }
        map.set(key, item)
      }
      if (s.tokens) {
        item.input += s.tokens.input || 0
        item.output += s.tokens.output || 0
        item.cacheRead += s.tokens.cache?.read || 0
        item.cacheWrite += s.tokens.cache?.write || 0
      }
    }

    return Array.from(map.values())
      .map((item) => {
        const tok = item.input + item.output + item.cacheRead + item.cacheWrite
        const share = Math.round((tok / total) * 100)
        const cacheTotal = item.input + item.output + item.cacheRead + item.cacheWrite
        const hitRate = cacheTotal > 0 ? Math.round((item.cacheRead / cacheTotal) * 100) : 0
        return {
          ...item,
          tokens: tok,
          share,
          hitRate,
        }
      })
      .sort((a, b) => b.tokens - a.tokens)
  })

  // Top sessions by token consumption
  const topSessions = createMemo(() => {
    return periodSessions()
      .map((s) => {
        const t = s.tokens
        const tok = t ? (t.input || 0) + (t.output || 0) + (t.reasoning || 0) + (t.cache?.read || 0) + (t.cache?.write || 0) : 0
        // Context estimate (tokens / 128k or 200k)
        const contextPct = Math.min(100, Math.round((tok / 128_000) * 100))
        return {
          id: s.id,
          title: s.title || `Sessão ${s.id.slice(0, 8)}`,
          model: s.model?.id || "padrão",
          provider: s.model?.providerID || "opencode",
          tokens: tok,
          contextPct,
          updated: s.time.updated,
        }
      })
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 15)
  })

  return (
    <>
      <Show when={props.showHeader !== false}>
        <div class="settings-tab-header">
          <div class="settings-tab-header-row">
            <div class="flex min-w-0 flex-col gap-1">
              <h2 class="settings-tab-title">{language.t("settings.usage.title")}</h2>
              <span class="text-11-regular text-v2-text-text-muted">{language.t("settings.usage.description")}</span>
            </div>
            <Show when={props.headerAction}>
              <div class="settings-tab-header-actions">{props.headerAction}</div>
            </Show>
          </div>
        </div>
      </Show>

      <div class="settings-tab-body flex flex-col gap-6 text-v2-text-text-base pb-10">
      {/* Subtitle & Filter Bar */}
      <div class="flex flex-col gap-3">
        <p class="text-xs text-v2-text-text-muted leading-relaxed max-w-4xl">
          Uso de tokens gerado no Code Nexus em seus computadores, combinado por padrão; você também pode visualizar
          um dispositivo por vez. Os outros computadores precisam estar online e permitir controle remoto para a
          leitura; quando um deles não puder ser acessado, serão usados os últimos dados lidos. Os registros começam a
          ser acumulados quando o recurso é lançado; o histórico anterior não é preenchido retroativamente.
        </p>

        <div class="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div class="flex items-center gap-2">
            <span class="text-xs text-v2-text-text-muted font-medium">Período</span>
            <div class="inline-flex rounded-md bg-v2-background-bg-layer-02 p-0.5 border border-v2-border-border-base">
              <button
                type="button"
                onClick={() => setPeriod("30d")}
                class={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  period() === "30d"
                    ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base"
                }`}
              >
                Últimos 30 dias
              </button>
              <button
                type="button"
                onClick={() => setPeriod("7d")}
                class={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  period() === "7d"
                    ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base"
                }`}
              >
                Últimos 7 dias
              </button>
              <button
                type="button"
                onClick={() => setPeriod("24h")}
                class={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  period() === "24h"
                    ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base"
                }`}
              >
                Hoje (24h)
              </button>
              <button
                type="button"
                onClick={() => setPeriod("all")}
                class={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  period() === "all"
                    ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold shadow-xs"
                    : "text-v2-text-text-muted hover:text-v2-text-text-base"
                }`}
              >
                Todos
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2 text-xs text-v2-text-text-muted">
            <span>Data</span>
            <div class="flex items-center gap-1.5 px-3 py-1 rounded bg-v2-background-bg-layer-02 border border-v2-border-border-base text-v2-text-text-base">
              <span>{new Date().toLocaleDateString("pt-BR")}</span>
              <span class="text-xs">📅</span>
            </div>
            <Button variant="ghost" size="small" onClick={loadStats} disabled={loading()}>
              <span class={loading() ? "animate-spin" : ""}>🔄</span>
            </Button>
          </div>
        </div>
      </div>

      <Show when={loading() && !statsData()}>
        <div class="flex min-h-[200px] items-center justify-center">
          <Loader />
        </div>
      </Show>

      {/* 1. Visão Geral (5 Metric Cards) */}
      <div class="rounded-xl border border-v2-border-border-base bg-v2-background-bg-layer-01/60 p-5 flex flex-col gap-4">
        <span class="text-xs font-semibold text-v2-text-text-base uppercase tracking-wider">Visão geral</span>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Card 1 */}
          <div class="rounded-lg bg-v2-background-bg-layer-02/80 border border-v2-border-border-base/50 p-3.5 flex flex-col gap-1">
            <span class="text-xl font-bold tracking-tight text-v2-text-text-base tabular-nums">
              {formatCompactNumber(todayTokens())}
            </span>
            <span class="text-[11px] text-v2-text-text-muted font-medium">Tokens hoje</span>
          </div>

          {/* Card 2 */}
          <div class="rounded-lg bg-v2-background-bg-layer-02/80 border border-v2-border-border-base/50 p-3.5 flex flex-col gap-1">
            <span class="text-xl font-bold tracking-tight text-v2-text-text-base tabular-nums text-teal-400">
              {formatCompactNumber(totalPeriodTokens())}
            </span>
            <span class="text-[11px] text-v2-text-text-muted font-medium">Tokens ({periodLabel()})</span>
          </div>

          {/* Card 3 */}
          <div class="rounded-lg bg-v2-background-bg-layer-02/80 border border-v2-border-border-base/50 p-3.5 flex flex-col gap-1">
            <span class="text-xl font-bold tracking-tight text-v2-text-text-base tabular-nums">
              {streakDays()}d · recorde {streakDays()}d
            </span>
            <span class="text-[11px] text-v2-text-text-muted font-medium">Sequência de dias ativos</span>
          </div>

          {/* Card 4 */}
          <div class="rounded-lg bg-v2-background-bg-layer-02/80 border border-v2-border-border-base/50 p-3.5 flex flex-col gap-1">
            <span class="text-xl font-bold tracking-tight text-v2-text-text-base tabular-nums text-cyan-400">
              {cacheHitRate()}%
            </span>
            <span class="text-[11px] text-v2-text-text-muted font-medium">Taxa de acertos do cache</span>
          </div>

          {/* Card 5 */}
          <div class="rounded-lg bg-v2-background-bg-layer-02/80 border border-v2-border-border-base/50 p-3.5 flex flex-col gap-1">
            <span class="text-xl font-bold tracking-tight text-v2-text-text-base tabular-nums">
              {modelsUsedCount()}
            </span>
            <span class="text-[11px] text-v2-text-text-muted font-medium">Modelos usados</span>
          </div>
        </div>
      </div>

      {/* 2. Mapa de calor de atividade (Últimas 31 semanas) */}
      <div class="rounded-xl border border-v2-border-border-base bg-v2-background-bg-layer-01/60 p-5 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-v2-text-text-base uppercase tracking-wider">
              Mapa de calor de atividade
            </span>
            <span class="text-xs text-v2-text-text-muted">Últimas 31 semanas</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div class="overflow-x-auto pb-1">
          <div class="min-w-[680px] flex flex-col gap-2">
            {/* Months Header with exact 31-column grid positioning */}
            <div
              class="w-full text-[11px] text-v2-text-text-muted font-mono h-4 relative"
              style={{
                display: "grid",
                "grid-template-columns": "repeat(31, minmax(0, 1fr))",
                gap: "4px",
              }}
            >
              <For each={heatmapMonths()}>
                {(m) => (
                  <span
                    style={{ "grid-column-start": m.weekIndex + 1 }}
                    class="truncate text-left whitespace-nowrap"
                  >
                    {m.label}
                  </span>
                )}
              </For>
            </div>

            {/* Squares Columns matching the exact same 31-column grid */}
            <div
              class="w-full"
              style={{
                display: "grid",
                "grid-template-columns": "repeat(31, minmax(0, 1fr))",
                gap: "4px",
              }}
            >
              <For each={heatmapGrid()}>
                {(week) => (
                  <div class="flex flex-col gap-1 w-full">
                    <For each={week}>
                      {(day) => {
                        const levelClass = () => {
                          switch (day.level) {
                            case 1:
                              return "bg-teal-900 border border-teal-800/40"
                            case 2:
                              return "bg-teal-700"
                            case 3:
                              return "bg-teal-500"
                            case 4:
                              return "bg-teal-300 shadow-[0_0_8px_rgba(45,212,191,0.5)]"
                            default:
                              return "bg-[#181d28]/70 border border-white/5"
                          }
                        }
                        return (
                          <div
                            class={`w-full aspect-square max-h-[14px] rounded-[2.5px] transition-all duration-150 cursor-pointer hover:scale-125 ${levelClass()}`}
                            title={`${day.date}: ${day.steps} interações`}
                          />
                        )
                      }}
                    </For>
                  </div>
                )}
              </For>
            </div>

            {/* Legend / Range labels */}
            <div class="flex items-center justify-between text-[11px] text-v2-text-text-muted pt-1">
              <span>{heatmapGrid()[0]?.[0]?.date ? new Date(heatmapGrid()[0][0].date).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : ""}</span>
              <div class="flex items-center gap-1.5">
                <span>Menos</span>
                <div class="w-3 h-3 rounded-[2px] bg-[#181d28]/70 border border-white/5" />
                <div class="w-3 h-3 rounded-[2px] bg-teal-900" />
                <div class="w-3 h-3 rounded-[2px] bg-teal-700" />
                <div class="w-3 h-3 rounded-[2px] bg-teal-500" />
                <div class="w-3 h-3 rounded-[2px] bg-teal-300" />
                <span>Mais</span>
              </div>
              <span>{new Date().toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tokens diários (30d) Empilhados por modelo */}
      <div class="rounded-xl border border-v2-border-border-base bg-v2-background-bg-layer-01/60 p-5 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-v2-text-text-base uppercase tracking-wider">
              Tokens diários (30d)
            </span>
            <span class="text-xs text-v2-text-text-muted">Empilhados por modelo</span>
          </div>
        </div>

        {/* Bar chart container */}
        <div class="flex flex-col gap-1 pt-2">
          {/* Y-axis labels & bars */}
          <div class="h-32 flex items-end gap-1.5 border-b border-v2-border-border-base/60 pb-1 px-1 relative">
            <For each={dailyChartDays()}>
              {(day) => {
                const heightPct = Math.max(
                  4,
                  Math.min(100, Math.round((day.tokens / Math.max(maxDailyTokens(), 1)) * 100))
                )
                return (
                  <div class="flex-1 flex flex-col items-center justify-end h-full group relative">
                    {/* Tooltip on hover */}
                    <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                      <div class="bg-v2-background-bg-inverse text-v2-text-text-inverse text-[11px] rounded px-2 py-1 shadow-lg whitespace-nowrap">
                        <span class="font-semibold">{day.label}:</span> {formatCompactNumber(day.tokens)} tokens
                      </div>
                    </div>
                    {/* Bar */}
                    <div
                      class={`w-full rounded-t-sm transition-all duration-200 group-hover:brightness-125 ${
                        day.tokens > 0 ? "bg-teal-400" : "bg-white/5"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                )
              }}
            </For>
          </div>
          {/* X-axis labels */}
          <div class="flex justify-between text-[10px] text-v2-text-text-muted pt-1 px-1">
            <span>{dailyChartDays()[0]?.label}</span>
            <span>{dailyChartDays()[14]?.label}</span>
            <span>Hoje ({dailyChartDays()[29]?.label})</span>
          </div>
        </div>
      </div>

      {/* 4. Por Agent / Harness */}
      <div class="rounded-xl border border-v2-border-border-base bg-v2-background-bg-layer-01/60 p-5 flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-v2-text-text-base uppercase tracking-wider">
            Por Agent / Harness
          </span>
          <span class="text-xs text-v2-text-text-muted">{periodLabel()}</span>
        </div>

        {/* Segmented Proportional Bar */}
        <div class="h-3 w-full rounded-full bg-white/5 overflow-hidden flex">
          <For each={agentBreakdown()}>
            {(agent) => (
              <div
                class={`h-full ${agent.color}`}
                style={{ width: `${Math.max(agent.share, 2)}%` }}
                title={`${agent.name}: ${agent.share}%`}
              />
            )}
          </For>
        </div>

        {/* Table */}
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-v2-border-border-base/50 text-v2-text-text-muted font-medium">
                <th class="py-2 px-3">Agent / Harness</th>
                <th class="py-2 px-3 text-right">Tokens ({periodLabel()})</th>
                <th class="py-2 px-3 text-left">Compartilhar</th>
                <th class="py-2 px-3 text-right">Tokens hoje</th>
                <th class="py-2 px-3 text-right">Taxa de acertos do cache</th>
                <th class="py-2 px-3 text-right">Modelos</th>
              </tr>
            </thead>
            <tbody>
              <For each={agentBreakdown()}>
                {(agent) => (
                  <tr class="border-b border-v2-border-border-base/30 hover:bg-white/[0.02]">
                    <td class="py-2.5 px-3 flex items-center gap-2">
                      <span class={`w-2 h-2 rounded-xs ${agent.color}`} />
                      <span class="font-medium text-v2-text-text-base">{agent.name}</span>
                    </td>
                    <td class="py-2.5 px-3 text-right tabular-nums text-v2-text-text-base font-medium">
                      {formatCompactNumber(agent.tokens)}
                    </td>
                    <td class="py-2.5 px-3">
                      <div class="flex items-center gap-2">
                        <div class="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div class={`h-full ${agent.color}`} style={{ width: `${agent.share}%` }} />
                        </div>
                        <span class="text-[11px] tabular-nums text-v2-text-text-muted">{agent.share}%</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-3 text-right tabular-nums text-v2-text-text-muted">
                      {agent.todayTokens > 0 ? formatCompactNumber(agent.todayTokens) : "—"}
                    </td>
                    <td class="py-2.5 px-3 text-right tabular-nums text-v2-text-text-muted">
                      {agent.cacheRate > 0 ? `${agent.cacheRate}%` : "—"}
                    </td>
                    <td class="py-2.5 px-3 text-right tabular-nums text-v2-text-text-muted">
                      {agent.modelsCount}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Por Modelo */}
      <div class="rounded-xl border border-v2-border-border-base bg-v2-background-bg-layer-01/60 p-5 flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-v2-text-text-base uppercase tracking-wider">
            Por modelo
          </span>
          <span class="text-xs text-v2-text-text-muted">{periodLabel()}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-v2-border-border-base/50 text-v2-text-text-muted font-medium">
                <th class="py-2 px-3">Modelo</th>
                <th class="py-2 px-3 text-left">Compartilhar</th>
                <th class="py-2 px-3 text-right">Entrada</th>
                <th class="py-2 px-3 text-right">Saída</th>
                <th class="py-2 px-3 text-right">Leitura de cache</th>
                <th class="py-2 px-3 text-right">Gravação de cache</th>
                <th class="py-2 px-3 text-right">Taxa de acertos do cache</th>
              </tr>
            </thead>
            <tbody>
              <Show
                when={modelBreakdown().length > 0}
                fallback={
                  <tr>
                    <td colspan="7" class="py-6 text-center text-v2-text-text-muted text-xs">
                      Nenhum uso de modelo registrado neste período.
                    </td>
                  </tr>
                }
              >
                <For each={modelBreakdown()}>
                  {(m) => (
                    <tr class="border-b border-v2-border-border-base/30 hover:bg-white/[0.02]">
                      <td class="py-2.5 px-3">
                        <div class="flex flex-col">
                          <span class="font-medium text-v2-text-text-base">{m.name}</span>
                          <span class="text-[10px] text-v2-text-text-muted">{m.provider}</span>
                        </div>
                      </td>
                      <td class="py-2.5 px-3">
                        <div class="flex items-center gap-2">
                          <div class="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div class="h-full bg-teal-400" style={{ width: `${m.share}%` }} />
                          </div>
                          <span class="text-[11px] tabular-nums text-v2-text-text-muted">{m.share}%</span>
                        </div>
                      </td>
                      <td class="py-2.5 px-3 text-right tabular-nums text-v2-text-text-muted">
                        {formatCompactNumber(m.input)}
                      </td>
                      <td class="py-2.5 px-3 text-right tabular-nums text-v2-text-text-muted">
                        {formatCompactNumber(m.output)}
                      </td>
                      <td class="py-2.5 px-3 text-right tabular-nums text-v2-text-text-muted">
                        {formatCompactNumber(m.cacheRead)}
                      </td>
                      <td class="py-2.5 px-3 text-right tabular-nums text-v2-text-text-muted">
                        {formatCompactNumber(m.cacheWrite)}
                      </td>
                      <td class="py-2.5 px-3 text-right tabular-nums font-medium text-teal-400">
                        {m.hitRate > 0 ? `${m.hitRate}%` : "—"}
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Sessões principais por consumo de tokens */}
      <div class="rounded-xl border border-v2-border-border-base bg-v2-background-bg-layer-01/60 p-5 flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-v2-text-text-base uppercase tracking-wider">
            Sessões principais por consumo de tokens
          </span>
          <span class="text-xs text-v2-text-text-muted">{periodLabel()}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-v2-border-border-base/50 text-v2-text-text-muted font-medium">
                <th class="py-2 px-3">Sessão</th>
                <th class="py-2 px-3">Modelo atual</th>
                <th class="py-2 px-3">Provedor</th>
                <th class="py-2 px-3 text-right">Tokens</th>
                <th class="py-2 px-3 text-right">Contexto %</th>
                <th class="py-2 px-3 text-right">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              <Show
                when={topSessions().length > 0}
                fallback={
                  <tr>
                    <td colspan="6" class="py-6 text-center text-v2-text-text-muted text-xs">
                      Nenhuma sessão ativa encontrada.
                    </td>
                  </tr>
                }
              >
                <For each={topSessions()}>
                  {(s) => (
                    <tr class="border-b border-v2-border-border-base/30 hover:bg-white/[0.02]">
                      <td class="py-2.5 px-3 max-w-[240px] truncate font-medium text-v2-text-text-base" title={s.title}>
                        {s.title}
                      </td>
                      <td class="py-2.5 px-3">
                        <span class="px-2 py-0.5 rounded bg-white/5 text-[11px] text-v2-text-text-base font-mono">
                          {s.model}
                        </span>
                      </td>
                      <td class="py-2.5 px-3 text-v2-text-text-muted text-[11px]">
                        {s.provider}
                      </td>
                      <td class="py-2.5 px-3 text-right tabular-nums font-medium text-teal-400">
                        {formatCompactNumber(s.tokens)}
                      </td>
                      <td class="py-2.5 px-3 text-right tabular-nums text-v2-text-text-muted">
                        {s.contextPct}%
                      </td>
                      <td class="py-2.5 px-3 text-right text-v2-text-text-muted text-[11px]">
                        {formatTimeAgo(s.updated)}
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </>
  )
}
