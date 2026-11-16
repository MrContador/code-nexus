import { Button } from "@opencode/ui/button"
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from "@opencode/ui/dialog"
import { Icon } from "@opencode/ui/icon"
import { createSignal, For, Show, onMount } from "solid-js"

export interface MemoryItem {
  id: string
  category: "architecture" | "convention" | "resolution" | "preference" | "fact"
  key: string
  content: string
  timestamp: string
  confidence: number
  origin: "automatic" | "operator"
}

const STORAGE_KEY = "codenexus_progressive_memory_v1"

const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: "mem_01",
    category: "architecture",
    key: "core_framework",
    content: "Arquitetura Code Nexus Free: SolidJS no renderer, Electron no desktop, Bun workspaces no monorepo e TailwindCSS v4.",
    timestamp: new Date().toISOString(),
    confidence: 1.0,
    origin: "operator",
  },
  {
    id: "mem_02",
    category: "convention",
    key: "portal_popover_rule",
    content: "Menus e popovers flutuantes no composer devem renderizar via <Portal> com max-height dinâmico para não serem cortados pelas bordas do viewport.",
    timestamp: new Date().toISOString(),
    confidence: 1.0,
    origin: "operator",
  },
  {
    id: "mem_03",
    category: "resolution",
    key: "solidjs_signals_fix",
    content: "No SolidJS, inicializadores passados a createSignal devem ser executados de imediato para evitar armazenar funções como valor inicial (previne NaN% e TypeError: .has is not a function).",
    timestamp: new Date().toISOString(),
    confidence: 1.0,
    origin: "operator",
  },
  {
    id: "mem_04",
    category: "convention",
    key: "git_large_files",
    content: "Commits do Git nunca devem incluir packages/cli/.bun-cache nem binários superiores a 100MB (política restrita do GitHub).",
    timestamp: new Date().toISOString(),
    confidence: 1.0,
    origin: "operator",
  },
  {
    id: "mem_05",
    category: "preference",
    key: "author_credits",
    content: "O Motor Híbrido LLM + NCM 2.0 possui autoria e créditos atribuídos a Mörlsara, fundamentado na pesquisa de Stanford Hazy Research.",
    timestamp: new Date().toISOString(),
    confidence: 1.0,
    origin: "operator",
  },
]

export function DialogProgressiveMemory(props: { onClose: () => void }) {
  const [memories, setMemories] = createSignal<MemoryItem[]>(DEFAULT_MEMORIES)
  const [newContent, setNewContent] = createSignal("")
  const [newCategory, setNewCategory] = createSignal<MemoryItem["category"]>("convention")
  const [filter, setFilter] = createSignal<string>("all")

  onMount(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMemories(parsed)
          return
        }
      }
    } catch {}
    saveToStorage(DEFAULT_MEMORIES)
  })

  const saveToStorage = (list: MemoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    } catch {}
  }

  const handleAdd = () => {
    const text = newContent().trim()
    if (!text) return

    const newItem: MemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category: newCategory(),
      key: `user_rule_${Date.now()}`,
      content: text,
      timestamp: new Date().toISOString(),
      confidence: 1.0,
      origin: "operator",
    }

    const updated = [newItem, ...memories()]
    setMemories(updated)
    saveToStorage(updated)
    setNewContent("")
  }

  const handleDelete = (id: string) => {
    const updated = memories().filter((m) => m.id !== id)
    setMemories(updated)
    saveToStorage(updated)
  }

  const handleResetDefaults = () => {
    setMemories(DEFAULT_MEMORIES)
    saveToStorage(DEFAULT_MEMORIES)
  }

  const filteredMemories = () => {
    const f = filter()
    if (f === "all") return memories()
    return memories().filter((m) => m.category === f)
  }

  const categoryBadge = (cat: MemoryItem["category"]) => {
    switch (cat) {
      case "architecture":
        return { label: "Arquitetura", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" }
      case "convention":
        return { label: "Convenção", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" }
      case "resolution":
        return { label: "Resolução", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" }
      case "preference":
        return { label: "Preferência", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" }
      case "fact":
      default:
        return { label: "Fato", color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30" }
    }
  }

  return (
    <Dialog size="large">
      <DialogHeader>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Icon name="archive" size="small" />
            </div>
            <div>
              <DialogTitle class="text-base font-bold text-v2-text-text-base">
                Memória Progressiva (NCM 2.0)
              </DialogTitle>
              <p class="text-xs text-v2-text-text-muted">
                Fatos consolidados, diretivas de projeto e resoluções aprendidas que persistem entre sessões.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="small" onClick={props.onClose} class="text-v2-text-text-muted hover:text-v2-text-text-base">
            <Icon name="x" size="small" />
          </Button>
        </div>
      </DialogHeader>

      <DialogBody>
        <div class="flex flex-col gap-4 py-2">
          {/* Adicionar Nova Memória */}
          <div class="p-3.5 rounded-xl bg-v2-background-bg-layer-02 border border-v2-border-border-base flex flex-col gap-2.5">
            <span class="text-xs font-semibold text-v2-text-text-base flex items-center gap-1.5">
              <span>Gravar Nova Memória Progressiva</span>
              <span class="text-[10px] text-teal-400 font-mono">(Injetada no Blueprint do NCM)</span>
            </span>

            <div class="flex items-center gap-2">
              <select
                value={newCategory()}
                onChange={(e) => setNewCategory(e.currentTarget.value as MemoryItem["category"])}
                class="px-2.5 py-1.5 text-xs rounded-lg bg-v2-background-bg-layer-01 border border-v2-border-border-base text-v2-text-text-base focus:outline-none focus:border-teal-500/50"
              >
                <option value="convention">Convenção</option>
                <option value="architecture">Arquitetura</option>
                <option value="resolution">Resolução</option>
                <option value="preference">Preferência</option>
                <option value="fact">Fato</option>
              </select>

              <input
                type="text"
                value={newContent()}
                onInput={(e) => setNewContent(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd()
                }}
                placeholder="Ex: Sempre formate números de tokens em K/M e mostre logs no final..."
                class="flex-1 px-3 py-1.5 text-xs rounded-lg bg-v2-background-bg-layer-01 border border-v2-border-border-base text-v2-text-text-base placeholder:text-v2-text-text-muted focus:outline-none focus:border-teal-500/50"
              />

              <Button
                variant="primary"
                size="small"
                onClick={handleAdd}
                disabled={!newContent().trim()}
                class="px-3 py-1.5 text-xs font-semibold"
              >
                Gravar
              </Button>
            </div>
          </div>

          {/* Filtros de Categoria */}
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <For each={[
                { id: "all", label: "Todas" },
                { id: "architecture", label: "Arquitetura" },
                { id: "convention", label: "Convenções" },
                { id: "resolution", label: "Resoluções" },
                { id: "preference", label: "Preferências" },
              ]}>
                {(tab) => (
                  <button
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    class={`px-2.5 py-1 text-xs rounded-md transition-colors border ${
                      filter() === tab.id
                        ? "bg-teal-500/20 text-teal-300 border-teal-500/40 font-semibold"
                        : "bg-v2-background-bg-layer-02 text-v2-text-text-muted border-v2-border-border-base hover:text-v2-text-text-base"
                    }`}
                  >
                    {tab.label}
                  </button>
                )}
              </For>
            </div>

            <span class="text-xs text-v2-text-text-muted font-mono">
              {filteredMemories().length} de {memories().length} memórias
            </span>
          </div>

          {/* Lista de Memórias */}
          <div class="flex flex-col gap-2 max-h-[360px] overflow-y-auto overscroll-contain pr-1">
            <Show
              when={filteredMemories().length > 0}
              fallback={
                <div class="py-12 text-center text-xs text-v2-text-text-muted">
                  Nenhuma memória progressiva registrada nesta categoria.
                </div>
              }
            >
              <For each={filteredMemories()}>
                {(item) => {
                  const badge = categoryBadge(item.category)
                  return (
                    <div class="p-3 rounded-xl bg-v2-background-bg-layer-02/70 border border-v2-border-border-base hover:border-v2-border-border-hover transition-colors flex items-start justify-between gap-3 group">
                      <div class="flex flex-col gap-1.5 flex-1">
                        <div class="flex items-center gap-2">
                          <span class={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span class="text-[10px] font-mono text-v2-text-text-muted">
                            {item.key}
                          </span>
                          <span class="text-[10px] text-v2-text-text-muted/60">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p class="text-xs text-v2-text-text-base leading-relaxed">
                          {item.content}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        class="p-1.5 text-v2-text-text-muted hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity rounded-md"
                        title="Remover memória"
                      >
                        <Icon name="trash" size="small" />
                      </button>
                    </div>
                  )
                }}
              </For>
            </Show>
          </div>
        </div>
      </DialogBody>

      <DialogFooter>
        <div class="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="small"
            onClick={handleResetDefaults}
            class="text-xs text-v2-text-text-muted hover:text-rose-400"
          >
            Restaurar Padrões
          </Button>

          <Button variant="outline" size="small" onClick={props.onClose} class="text-xs">
            Fechar
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  )
}

