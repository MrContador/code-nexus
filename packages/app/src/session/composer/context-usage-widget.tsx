import { createSignal, createMemo, createEffect, onCleanup, Show, For } from "solid-js"
import { Portal } from "solid-js/web"
import { useServerSDK } from "@/runtime/server/client"
import { useData } from "@/runtime/server/current"
import { useLanguage } from "@/runtime/i18n/language"
import { showToast } from "@/shell/notifications/toast"
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { useDialog } from "@opencode/ui/context/dialog"
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
  const dialog = useDialog()

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
    const total = currentTokens()
    const limit = effectiveContextWindow()
    if (!total || total <= 0 || isNaN(total) || !isFinite(total)) return 0
    if (!limit || limit <= 0 || isNaN(limit) || !isFinite(limit)) return 0
    const pct = Math.round((total / limit) * 100)
    if (isNaN(pct) || !isFinite(pct)) return 0
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
                stroke-dashoffset={56.5 - (56.5 * (isNaN(percentUsed()) ? 0 : percentUsed())) / 100}
                stroke-linecap="round"
                class={percentUsed() > 80 ? "text-rose-400" : "text-teal-400"}
              />
            </svg>
          </div>
          <span class="text-[11px] tabular-nums font-semibold">{isNaN(percentUsed()) ? 0 : percentUsed()}%</span>
        </div>
      </button>

      {/* Interactive Context Popover inside Portal (never clipped, perfectly anchored, Cindy-style) */}
      <Show when={open() && buttonRect()}>
        <Portal>
          <div
            ref={popupRef}
            style={{
              position: "fixed",
              bottom: `${buttonRect()!.bottom}px`,
              right: `${buttonRect()!.right}px`,
              "max-height": `min(490px, calc(100vh - ${buttonRect()!.bottom + 16}px))`,
              "z-index": "99999",
            }}
            class="w-[330px] sm:w-[355px] bg-v2-background-bg-layer-01 border border-v2-border-border-base rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 text-v2-text-text-base animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md overflow-y-auto overscroll-contain"
          >
            {/* Header (Cindy Reference) */}
            <div class="flex flex-col gap-0.5 pb-2 border-b border-v2-border-border-base/40">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-v2-text-text-muted font-mono">
                  CONTEXT
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  class="p-0.5 -mr-1 text-v2-text-text-muted hover:text-v2-text-text-base rounded-md transition-colors"
                >
                  <Icon name="x" size="small" />
                </button>
              </div>
              <h3 class="text-sm font-bold text-v2-text-text-base">Contexto</h3>
              <p class="text-[11px] text-v2-text-text-muted leading-snug">
                O que a IA pode consultar neste turno: conversa, instruções e resultados de ferramentas.
              </p>
            </div>

            {/* Usage Stats (Cindy Reference) */}
            <div class="flex flex-col gap-2 py-0.5">
              <div class="flex items-center justify-between">
                <div class="flex items-baseline gap-1.5">
                  <span class="text-2xl font-bold tracking-tight text-v2-text-text-base">
                    {isNaN(percentUsed()) ? 0 : percentUsed()}%
                  </span>
                  <span class="text-xs text-v2-text-text-muted font-medium">Usado</span>
                </div>
                <span class={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusInfo().color}`}>
                  {statusInfo().label}
                </span>
              </div>

              {/* Progress bar */}
              <div class="relative w-full bg-[#181d28] h-1.5 rounded-full border border-white/5 overflow-visible">
                <div
                  class={`h-full transition-all duration-300 rounded-full ${progressColor()}`}
                  style={{ width: `${Math.min(100, Math.max(0, isNaN(percentUsed()) ? 0 : percentUsed()))}%` }}
                />
              </div>

              <div class="flex items-center justify-between text-[11px] text-v2-text-text-muted font-mono">
                <span>{formatCompact(currentTokens())} / {formatCompact(effectiveContextWindow())} tokens</span>
                <Show when={currentCost() > 0}>
                  <span class="text-emerald-400 font-semibold">${currentCost().toFixed(3)}</span>
                </Show>
              </div>

              <p class="text-[11px] text-v2-text-text-muted leading-tight">
                {percentUsed() < 75
                  ? "Continue. Nenhum ajuste é necessário por enquanto."
                  : "Recomendamos compactar o histórico para manter velocidade e precisão."}
              </p>
            </div>

            {/* Action: Compactar contexto */}
            <div class="flex flex-col gap-1 pt-1 border-t border-v2-border-border-base/40">
              <button
                type="button"
                disabled={compacting() || !props.sessionID}
                onClick={handleCompact}
                class="w-full py-1.5 px-3 rounded-lg font-medium text-xs justify-center items-center gap-2 border border-v2-border-border-base bg-v2-background-bg-layer-02 hover:bg-v2-background-bg-layer-03 transition-colors inline-flex disabled:opacity-50"
              >
                <Icon name="archive" size="small" class="text-teal-400" />
                <span>{compacting() ? "Compactando..." : "Compactar contexto"}</span>
              </button>
              <span class="text-[10px] text-v2-text-text-muted leading-tight px-0.5">
                Resuma o conteúdo anterior para liberar espaço. Alguns detalhes podem ser omitidos.
              </span>
            </div>

            {/* Auto-compactar Section */}
            <div class="flex flex-col gap-1.5 pt-1.5 border-t border-v2-border-border-base/40">
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
                          class={`flex-1 py-0.5 text-[10px] font-mono rounded font-medium transition-colors border ${
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

            {/* Memória Progressiva (NCM 2.0) */}
            <div class="flex items-center justify-between pt-1.5 border-t border-v2-border-border-base/40">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-v2-text-text-base">Memória Progressiva</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 font-mono border border-teal-500/20">
                  NCM 2.0
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setOpen(false)
                  const { DialogProgressiveMemory } = await import("./dialog-progressive-memory")
                  void dialog.show(() => <DialogProgressiveMemory onClose={() => dialog.close()} />)
                }}
                class="px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors border bg-v2-background-bg-layer-02 text-v2-text-text-muted hover:text-teal-300 hover:border-teal-500/30 inline-flex items-center gap-1"
                title="Visualizar e gerenciar memórias consolidadas"
              >
                <Icon name="archive" size="small" />
                <span>Gerenciar</span>
              </button>
            </div>

            {/* Ajustar janela Section (Cindy Reference) */}
            <div class="flex flex-col gap-1.5 pt-1.5 border-t border-v2-border-border-base/40">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-v2-text-text-base">Ajustar janela</span>
                <span class="text-[11px] text-teal-400 font-mono font-medium">
                  {formatCompact(effectiveContextWindow())}
                </span>
              </div>
              <div class="text-[10px] text-v2-text-text-muted leading-tight">
                <p class="font-medium text-v2-text-text-base">Esta sessão</p>
                <p>Afeta apenas esta tarefa. Válido a partir da próxima mensagem.</p>
                <p>Uma janela maior comporta mais conteúdo e pode custar mais.</p>
              </div>

              <div class="flex flex-col gap-1 pt-0.5">
                <For
                  each={[
                    { pct: 0.25, label: "25% · " + formatCompact(baseContextWindow() * 0.25) },
                    { pct: 0.5, label: "50% · " + formatCompact(baseContextWindow() * 0.5) },
                    { pct: 0.75, label: "75% · " + formatCompact(baseContextWindow() * 0.75) },
                    { pct: 1.0, label: "100% · " + formatCompact(baseContextWindow()) + " (Padrão do modelo)" },
                  ]}
                >
                  {(opt) => (
                    <button
                      type="button"
                      onClick={() => setWindowPref(opt.pct)}
                      class={`w-full py-1 px-2.5 rounded-lg text-xs font-mono transition-colors border flex items-center justify-between ${
                        windowMultiplier() === opt.pct
                          ? "bg-teal-500/15 border-teal-500/40 text-teal-300 font-semibold"
                          : "bg-v2-background-bg-layer-02 border-v2-border-border-base/70 text-v2-text-text-muted hover:text-v2-text-text-base hover:bg-v2-background-bg-layer-02/70"
                      }`}
                    >
                      <span class="text-[11px]">{opt.label}</span>
                      <Show when={windowMultiplier() === opt.pct}>
                        <span class="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      </Show>
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Model defaults link & Stanford NCM Link */}
            <div class="pt-1.5 border-t border-v2-border-border-base/40 flex flex-col gap-1">
              <div class="flex items-center justify-between">
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
              <p class="text-[10px] text-v2-text-text-muted leading-tight">
                Altere a janela e o limite padrão deste modelo. Isso também afeta outras sessões.
              </p>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  )
}
