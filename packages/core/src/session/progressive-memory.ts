export * as ProgressiveMemory from "./progressive-memory.js"

import * as fs from "node:fs"
import * as path from "node:path"
import type { SessionMessage } from "./message.js"

export type MemoryCategory = "architecture" | "convention" | "resolution" | "preference" | "fact"

export interface MemoryEntry {
  readonly id: string
  readonly category: MemoryCategory
  readonly key: string
  readonly content: string
  readonly timestamp: string
  readonly confidence: number // 0.0 a 1.0
  readonly origin: "automatic" | "operator"
}

export interface ProgressiveMemoryState {
  readonly version: "1.0"
  readonly projectName?: string
  readonly lastUpdated: string
  readonly memories: MemoryEntry[]
}

const MEMORY_DIR_NAME = ".codenexus"
const MEMORY_FILE_NAME = "progressive-memory.json"

function getMemoryPath(cwd: string): string {
  return path.join(cwd, MEMORY_DIR_NAME, MEMORY_FILE_NAME)
}

function getDefaultMemories(): MemoryEntry[] {
  const now = new Date().toISOString()
  return [
    {
      id: "mem_init_01",
      category: "architecture",
      key: "core_framework",
      content: "Arquitetura Code Nexus Free: SolidJS no renderer, Electron no desktop, Bun workspaces no monorepo e TailwindCSS v4.",
      timestamp: now,
      confidence: 1.0,
      origin: "operator",
    },
    {
      id: "mem_init_02",
      category: "convention",
      key: "portal_popover_rule",
      content: "Menus e popovers flutuantes no composer devem renderizar via <Portal> com max-height dinâmico para não serem cortados pelas bordas do viewport.",
      timestamp: now,
      confidence: 1.0,
      origin: "operator",
    },
    {
      id: "mem_init_03",
      category: "resolution",
      key: "solidjs_signals_fix",
      content: "No SolidJS, inicializadores passados a createSignal devem ser executados de imediato para evitar armazenar a função como valor inicial (previne NaN% e TypeError: .has is not a function).",
      timestamp: now,
      confidence: 1.0,
      origin: "operator",
    },
    {
      id: "mem_init_04",
      category: "convention",
      key: "git_large_files",
      content: "Commits do Git nunca devem incluir packages/cli/.bun-cache nem binários superiores a 100MB (política restrita do GitHub).",
      timestamp: now,
      confidence: 1.0,
      origin: "operator",
    },
    {
      id: "mem_init_05",
      category: "preference",
      key: "author_credits",
      content: "O Motor Híbrido LLM + NCM 2.0 possui autoria e créditos atribuídos a Mörlsara, fundamentado na pesquisa de Stanford Hazy Research.",
      timestamp: now,
      confidence: 1.0,
      origin: "operator",
    },
  ]
}

export function loadMemory(cwd: string): ProgressiveMemoryState {
  const filePath = getMemoryPath(cwd)
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8")
      const parsed = JSON.parse(raw) as ProgressiveMemoryState
      if (parsed && Array.isArray(parsed.memories)) {
        return parsed
      }
    }
  } catch {}

  // Se não existir, inicializa com o estado padrão
  const initial: ProgressiveMemoryState = {
    version: "1.0",
    projectName: path.basename(cwd),
    lastUpdated: new Date().toISOString(),
    memories: getDefaultMemories(),
  }
  saveMemory(cwd, initial)
  return initial
}

export function saveMemory(cwd: string, state: ProgressiveMemoryState): void {
  const dirPath = path.join(cwd, MEMORY_DIR_NAME)
  const filePath = path.join(dirPath, MEMORY_FILE_NAME)
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8")
  } catch {}
}

export function recordMemory(
  cwd: string,
  entry: Omit<MemoryEntry, "id" | "timestamp">,
): MemoryEntry {
  const state = loadMemory(cwd)
  const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const newEntry: MemoryEntry = {
    ...entry,
    id,
    timestamp: new Date().toISOString(),
  }

  // Se já existir entrada com a mesma chave, atualiza
  const existingIdx = state.memories.findIndex((m) => m.key === entry.key)
  let updatedMemories: MemoryEntry[]
  if (existingIdx >= 0) {
    updatedMemories = [...state.memories]
    updatedMemories[existingIdx] = newEntry
  } else {
    updatedMemories = [...state.memories, newEntry]
  }

  const updatedState: ProgressiveMemoryState = {
    ...state,
    lastUpdated: new Date().toISOString(),
    memories: updatedMemories,
  }

  saveMemory(cwd, updatedState)
  return newEntry
}

export function removeMemory(cwd: string, idOrKey: string): boolean {
  const state = loadMemory(cwd)
  const filtered = state.memories.filter((m) => m.id !== idOrKey && m.key !== idOrKey)
  if (filtered.length === state.memories.length) return false

  saveMemory(cwd, {
    ...state,
    lastUpdated: new Date().toISOString(),
    memories: filtered,
  })
  return true
}

export function clearMemory(cwd: string): void {
  saveMemory(cwd, {
    version: "1.0",
    projectName: path.basename(cwd),
    lastUpdated: new Date().toISOString(),
    memories: getDefaultMemories(),
  })
}

/**
 * Destilação Heurística Progressiva:
 * Analisa turnos recentes para extrair resoluções de problemas ou diretivas explícitas
 */
export function distillProgressiveMemory(
  cwd: string,
  messages?: ReadonlyArray<SessionMessage.Info>,
): void {
  if (!messages || messages.length === 0) return

  // Analisa as últimas mensagens
  const recent = messages.slice(-4)
  for (const msg of recent) {
    let text = ""
    if (msg.data && typeof msg.data === "object") {
      const data = msg.data as Record<string, unknown>
      if (typeof data.text === "string") text = data.text
    }
    if (!text) continue

    // Detecta padrões explícitos como "resolvido:", "sempre use:", "nunca:", "prefiro:"
    const prefMatch = /\b(?:sempre use|nunca use|prefiro|regra:|padrao:)\s+([^\.\n]+)/i.exec(text)
    if (prefMatch && prefMatch[1] && prefMatch[1].length > 10) {
      const content = prefMatch[1].trim()
      const key = `auto_pref_${content.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}`
      recordMemory(cwd, {
        category: "convention",
        key,
        content: `Diretiva aprendida: ${content}`,
        confidence: 0.9,
        origin: "automatic",
      })
    }
  }
}

export function formatForBlueprint(cwd: string): string {
  const state = loadMemory(cwd)
  if (!state.memories || state.memories.length === 0) {
    return "  (Nenhuma memória consolidada registrada no livro-razão)"
  }

  const categoryLabels: Record<MemoryCategory, string> = {
    architecture: "ARQUITETURA",
    convention: "CONVENCAO",
    resolution: "RESOLUCAO",
    preference: "PREFERENCIA",
    fact: "FATO",
  }

  const lines: string[] = []
  for (const m of state.memories) {
    const cat = categoryLabels[m.category] || "GERAL"
    lines.push(`  • [${cat}] ${m.content}`)
  }

  return lines.join("\n")
}

