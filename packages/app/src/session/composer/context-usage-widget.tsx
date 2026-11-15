import { createSignal, createMemo, createEffect, onCleanup, Show, For } from "solid-js"
import { Portal } from "solid-js/web"
import { useServerSDK } from "@/runtime/server/client"
import { useData } from "@/runtime/server/current"
import { useLanguage } from "@/runtime/i18n/language"
import { showToast } from "@/shell/notifications/toast"
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { useSettingsSurface } from "@/settings/surface"

export function formatCompact(num: number): string {
  if (!num || isNaN(num) || num <= 0) return "0"
  if (num >= 1_000_000) {
    const val = (num / 1_000_000).toFixed(1)
    return `${val.endsWith(".0") ? val.slice(0, -2) : val}M`
  }
  if (num >= 1_000) {
    const val = (num / 1_000).toFixed(1)
    return `${val.endsWith(".0") ? val.slice(0, -2) : val}K`
  }
  return num.toLocaleString()
}

export function SessionContextUsageWidget(props: { sessionID?: string }) {
  const server = useServerSDK()
  const data = useData()
  const language = useLanguage()
  const surface = useSettingsSurface()

  let buttonRef: HTMLButtonElement | undefined
  let popupRef: HTMLDivElement | undefined

  const [open, setOpen] = createSignal(false)
  const [compacting, setCompacting] = createSignal(false)
  const [buttonRect, setButtonRect] = createSignal<{ bottom: number; right: number } | null>(null)

  // Auto-compaction state (evaluated eagerly)
  const getInitialAutoCompact = (): boolean => {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem("codenexus_auto_compact_enabled") === "true"
    } catch {
      return false
    }
  }

  const getInitialThreshold = (): number => {
    try {
      if (typeof localStorage === "undefined") return 80
      const saved = localStorage.getItem("codenexus_auto_compact_threshold")
      return saved ? parseInt(saved, 10) : 80
    } catch {
      return 80
    }
  }

  const getInitialWindow = (): number => {
    try {
      if (!props.sessionID || typeof localStorage === "undefined") return 1.0
      const saved = localStorage.getItem(`codenexus_context_window_${props.sessionID}`)
      return saved ? parseFloat(saved) : 1.0
    } catch {
      return 1.0
    }
  }

  const [autoCompact, setAutoCompact] = createSignal<boolean>(getInitialAutoCompact())
  const [compactThreshold, setCompactThreshold] = createSignal<number>(getInitialThreshold())
  const [windowMultiplier, setWindowMultiplier] = createSignal<number>(getInitialWindow())

  const sessionInfo = createMemo(() => {
    if (!props.sessionID) return undefined
    return data.session.get(props.sessionID)
  })

  // Standard max window for models (default 1M tokens or model-specific)
  const baseContextWindow = createMemo(() => {
    const model = sessionInfo()?.model
    if (model?.id?.includes("gpt-4") || model?.id?.includes("claude-3-5")) return 200_000
    if (model?.id?.includes("gemini")) return 1_000_000
    return 1_000_000 // 1M standard default
  })

  const effectiveContextWindow = createMemo(() => {
    const mult = typeof windowMultiplier() === "number" && !isNaN(windowMultiplier()) ? windowMultiplier() : 1.0
    const base = typeof baseContextWindow() === "number" && !isNaN(baseContextWindow()) ? baseContextWindow() : 1_000_000
    return Math.max(10_000, Math.round(base * mult))
  })

  // Current session tokens
  const currentTokens = createMemo(() => {
    const t = sessionInfo()?.tokens
    if (!t) return 0
    const sum = (t.input || 0) + (t.output || 0) + (t.reasoning || 0) + (t.cache?.read || 0) + (t.cache?.write || 0)
    return isNaN(sum) ? 0 : Math.max(0, sum)
  })

  const currentCost = createMemo(() => {
    const c = sessionInfo()?.cost
    if (typeof c === "number" && !isNaN(c)) return c
    return 0
  })

  const percentUsed = createMemo(() => {
    const total = currentTokens() || 0
    const limit = effectiveContextWindow() || 1_000_000
    if (limit <= 0 || isNaN(limit)) return 0
    const pct = Math.round((total / limit) * 100)
    if (isNaN(pct)) return 0
    if (total > 0 && pct === 0) return 1
    return Math.min(100, Math.max(0, pct))
  })

  // Status badge text & color
  const statusInfo = createMemo(() => {
    const p = percentUsed() || 0
    if (p <= 50) return { label: "Bastante espaço", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" }
    if (p <= 75) return { label: "Espaço moderado", color: "text-teal-400 bg-teal-500/10 border-teal-500/20" }
    if (p <= 90) return { label: "Atenção", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" }
    return { label: "Limite próximo", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" }
  })

  // Progress bar color
  const progressColor = createMemo(() => {
    const p = percentUsed() || 0
    if (p <= 50) return "bg-gradient-to-r from-teal-500 to-emerald-400"
    if (p <= 75) return "bg-gradient-to-r from-teal-400 to-amber-400"
    if (p <= 90) return "bg-gradient-to-r from-amber-400 to-rose-400"
    return "bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
  })

  // Compact context function
  const handleCompact = async () => {
    if (!props.sessionID || compacting()) return
    setCompacting(true)
    try {
      await server.api.session.compact({ sessionID: props.sessionID })
      showToast({
        title: "Contexto compactado",
        description: "O histórico anterior foi resumido com sucesso.",
      })
    } catch (e: any) {
      showToast({
        title: "Erro ao compactar",
        description: e?.message || "Não foi possível compactar a sessão agora.",
      })
    } finally {
      setCompacting(false)
    }
  }

  // Auto-compact watcher
  createEffect(() => {
    if (!autoCompact() || !props.sessionID || compacting()) return
    if (percentUsed() >= compactThreshold()) {
      void handleCompact()
    }
  })

  const setAutoCompactPref = (val: boolean) => {
    setAutoCompact(val)
    try {
      localStorage.setItem("codenexus_auto_compact_enabled", String(val))
    } catch {}
  }

  const setThresholdPref = (val: number) => {
    setCompactThreshold(val)
    try {
      localStorage.setItem("codenexus_auto_compact_threshold", String(val))
    } catch {}
  }

  const setWindowPref = (mult: number) => {
    setWindowMultiplier(mult)
    if (props.sessionID) {
      try {
        localStorage.setItem(`codenexus_context_window_${props.sessionID}`, String(mult))
      } catch {}
    }
  }

  const updateRect = () => {
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect()
      setButtonRect({
        bottom: Math.max(8, window.innerHeight - rect.top + 8),
        right: Math.max(16, window.innerWidth - rect.right),
      })
    }
  }

  const toggleOpen = () => {
    if (!open()) {
      updateRect()
    }
    setOpen((o) => !o)
  }

  // Close on Escape or click outside
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as Node
    if (buttonRef && buttonRef.contains(target)) return
    if (popupRef && !popupRef.contains(target)) {
      setOpen(false)
    }
  }

  createEffect(() => {
    if (open()) {
      updateRect()
      window.addEventListener("mousedown", handleClickOutside)
      window.addEventListener("resize", updateRect)
      window.addEventListener("scroll", updateRect, true)
      onCleanup(() => {
        window.removeEventListener("mousedown", handleClickOutside)
        window.removeEventListener("resize", updateRect)
        window.removeEventListener("scroll", updateRect, true)
      })
    }
  })

  return (
    <div class="relative inline-flex items-center">
      {/* Status Bar Trigger Button: $ [cost] (circle) [pct]% */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        class={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono font-medium rounded-md transition-colors border select-none ${
          open()
            ? "bg-v2-background-bg-inverse text-v2-text-text-inverse border-transparent shadow-xs"
            : "bg-v2-background-bg-layer-02/80 text-v2-text-text-muted hover:text-v2-text-text-base border-v2-border-border-base hover:border-v2-border-border-hover"
        }`}
        title="Contexto e Estimativa de API"
      >
        <span class="text-xs font-semibold text-emerald-400">$</span>
        <Show when={currentCost() > 0}>
          <span class="text-[11px] tabular-nums font-mono opacity-90">${currentCost().toFixed(3)}</span>
        </Show>

        <div class="inline-flex items-center gap-1 pl-0.5 border-l border-v2-border-border-base/40">
          {/* Progress circle icon */}
          <div class="relative w-3.5 h-3.5 flex items-center justify-center">
            <svg class="w-3.5 h-3.5 -rotate-90" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                class="opacity-20"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-dasharray="56.5"
                stroke-dashoffset={56.5 - (56.5 * (percentUsed() || 0)) / 100}
                stroke-linecap="round"
                class={percentUsed() > 80 ? "text-rose-400" : "text-teal-400"}
              />
            </svg>
          </div>
          <span class="text-[11px] tabular-nums font-semibold">{percentUsed()}%</span>
        </div>
      </button>

      {/* Interactive Context Popover inside Portal (never clipped, perfectly anchored) */}
      <Show when={open() && buttonRect()}>
        <Portal>
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              bottom: `${buttonRect()!.bottom}px`,
              right: `${buttonRect()!.right}px`,
              "max-height": `calc(100vh - ${buttonRect()!.bottom + 16}px)`,
              "z-index": "99999",
            }}
            class="w-[320px] sm:w-[350px] bg-v2-background-bg-layer-01 border border-v2-border-border-base rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 text-v2-text-text-base animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md overflow-y-auto overscroll-contain"
          >
            {/* Header */}
            <div class="flex items-center justify-between pb-1 border-b border-v2-border-border-base/40">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-v2-text-text-muted font-mono">
                  CONTEXTO
                </span>
                <span class="text-[10px] text-v2-text-text-muted">·</span>
                <span class="text-[11px] font-mono font-semibold text-teal-400">
                  {formatCompact(effectiveContextWindow())} max
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                class="p-1 -mr-1 text-v2-text-text-muted hover:text-v2-text-text-base rounded-md"
              >
                <Icon name="x" size="small" />
              </button>
            </div>

            {/* Usage Stats Card */}
            <div class="rounded-xl bg-v2-background-bg-layer-02/70 border border-v2-border-border-base p-3 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <div class="flex items-baseline gap-1.5">
                  <span class="text-xl font-bold tracking-tight text-v2-text-text-base">{percentUsed()}%</span>
                  <span class="text-[11px] text-v2-text-text-muted font-medium">Usado</span>
                </div>
                <span class={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusInfo().color}`}>
                  {statusInfo().label}
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div class="w-full bg-v2-background-bg-layer-03 h-1.5 rounded-full overflow-hidden relative border border-white/5">
                <div
                  class={`h-full transition-all duration-300 rounded-full ${progressColor()}`}
                  style={{ width: `${percentUsed()}%` }}
                />
              </div>

              <div class="flex items-center justify-between text-[11px] text-v2-text-text-muted font-mono">
                <span>{formatCompact(currentTokens())} / {formatCompact(effectiveContextWindow())} tokens</span>
                <Show when={currentCost() > 0}>
                  <span class="text-emerald-400 font-semibold">${currentCost().toFixed(4)}</span>
                </Show>
              </div>

              <p class="text-[10px] text-v2-text-text-muted leading-tight">
                {percentUsed() < 75
                  ? "Continue. Nenhum ajuste é necessário por enquanto."
                  : "Recomendamos compactar o histórico para manter velocidade e precisão."}
              </p>
            </div>

            {/* Action: Compactar contexto */}
            <div class="flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                disabled={compacting() || !props.sessionID}
                onClick={handleCompact}
                class="w-full py-1.5 font-medium text-xs justify-center gap-2 border-v2-border-border-base hover:bg-v2-background-bg-layer-02"
              >
                <Icon name="archive" size="small" class="text-teal-400" />
                <span>{compacting() ? "Compactando..." : "Compactar contexto"}</span>
              </Button>
              <span class="text-[10px] text-v2-text-text-muted leading-tight px-0.5">
                Resuma o conteúdo anterior para liberar espaço.
              </span>
            </div>

            {/* Auto-compactar Section */}
            <div class="flex flex-col gap-1.5 pt-1.5 border-t border-v2-border-border-base/60">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-v2-text-text-base">Auto-compactar</span>
                <button
                  type="button"
                  onClick={() => setAutoCompactPref(!autoCompact())}
                  class={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors border ${
                    autoCompact()
                      ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                      : "bg-v2-background-bg-layer-02 text-v2-text-text-muted border-v2-border-border-base"
                  }`}
                >
                  {autoCompact() ? "Ativado" : "Desativado"}
                </button>
              </div>

              <Show when={autoCompact()}>
                <div class="flex flex-col gap-1">
                  <span class="text-[10px] text-v2-text-text-muted">Compactar automaticamente ao atingir:</span>
                  <div class="flex items-center justify-between gap-1">
                    <For each={[25, 50, 65, 75, 80, 95]}>
                      {(val) => (
                        <button
                          type="button"
                          onClick={() => setThresholdPref(val)}
                          class={`flex-1 py-1 text-[10px] font-mono rounded font-medium transition-colors border ${
                            compactThreshold() === val
                              ? "bg-teal-500/20 text-teal-300 font-bold border-teal-500/40"
                              : "bg-v2-background-bg-layer-02 text-v2-text-text-muted border-v2-border-border-base hover:text-v2-text-text-base"
                          }`}
                        >
                          {val}%
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>

            {/* Ajustar janela Section */}
            <div class="flex flex-col gap-1.5 pt-1.5 border-t border-v2-border-border-base/60">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-v2-text-text-base">Ajustar janela (Esta sessão)</span>
                <span class="text-[10px] text-teal-400 font-mono font-medium">
                  {formatCompact(effectiveContextWindow())}
                </span>
              </div>

              <div class="grid grid-cols-4 gap-1.5 pt-0.5">
                <For
                  each={[
                    { pct: 0.25, label: "25%", sub: formatCompact(baseContextWindow() * 0.25) },
                    { pct: 0.5, label: "50%", sub: formatCompact(baseContextWindow() * 0.5) },
                    { pct: 0.75, label: "75%", sub: formatCompact(baseContextWindow() * 0.75) },
                    { pct: 1.0, label: "100%", sub: "Padrão" },
                  ]}
                >
                  {(opt) => (
                    <button
                      type="button"
                      onClick={() => setWindowPref(opt.pct)}
                      class={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-xs font-mono transition-colors border ${
                        windowMultiplier() === opt.pct
                          ? "bg-teal-500/20 border-teal-500/50 text-teal-300 font-bold"
                          : "bg-v2-background-bg-layer-02 border-v2-border-border-base text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-background-bg-layer-02/70"
                      }`}
                    >
                      <span class="text-[11px] leading-tight">{opt.label}</span>
                      <span class="text-[9px] opacity-75 font-normal truncate max-w-full">{opt.sub}</span>
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Model defaults link */}
            <div class="pt-1.5 border-t border-v2-border-border-base/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  surface.open("models")
                }}
                class="text-xs text-v2-text-text-muted hover:text-teal-300 transition-colors inline-flex items-center gap-1 font-medium"
              >
                <span>Padrões do modelo</span>
                <span class="text-xs">↗</span>
              </button>
              <a
                href="https://hazyresearch.stanford.edu/blog/2026-10-12-ncm"
                target="_blank"
                rel="noreferrer noopener"
                class="text-[10px] font-mono text-teal-400/90 hover:text-teal-300 font-medium tracking-tight hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer"
                title="O Motor Híbrido LLM + NCM 2.0 (Créditos: Mörlsara) - Stanford Hazy Research"
              >
                <span>NCM</span>
                <span class="text-[9px] opacity-75">↗</span>
              </a>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  )
}
