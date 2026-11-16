export * as CassandraNCM from "./cassandra-ncm.js"

import * as fs from "node:fs"
import * as path from "node:path"
import type { SessionMessage } from "./message.js"
import { ProgressiveMemory } from "./progressive-memory.js"

export interface GroundTruthItem {
  readonly path: string
  readonly size?: string
  readonly isDirectory: boolean
  readonly modified?: string
}

export interface GroundTruthManifest {
  readonly confirmed: ReadonlyArray<GroundTruthItem>
  readonly missing: ReadonlyArray<{ readonly path: string }>
}

export interface TopologicalState {
  readonly runtime: string
  readonly isMonorepo: boolean
  readonly projectType: string
  readonly rootMarkers: ReadonlyArray<string>
}

export type HypothesisKey = "H1" | "H2" | "H3" | "H4" | "H5"

export interface Hypothesis {
  readonly id: HypothesisKey
  readonly name: string
  readonly probability: number
  readonly description: string
  readonly directive: string
}

export interface TransitionAnalysis {
  readonly hypotheses: ReadonlyArray<Hypothesis>
  readonly winningConcept: Hypothesis
}

export interface BlueprintOptions {
  readonly cwd?: string
  readonly messages?: ReadonlyArray<SessionMessage.Info>
  readonly promptText?: string
}

/**
 * O Motor Híbrido LLM + NCM 2.0 (Next-Concept Modeling)
 * Créditos: Mörlsara
 * Ref: Stanford Hazy Research (https://hazyresearch.stanford.edu/blog/2026-10-12-ncm)
 *
 * Upper Semantic & Heuristic Layer operating directly on the host environment:
 * 1. Ground-Truth Manifest: 0-token physical filesystem preflight check (0ms LLM latency).
 * 2. Topological Indexing via AST Nexus: project shape and workspace boundary detection.
 * 3. Transition Probability Matrix: computes H1..H5 to isolate Winning Concept H*.
 * 4. Cognitive Blueprint Injection: eliminates hallucinated state, deliberate hesitation, and blind rewrites.
 */

// Regex patterns to capture file mentions in user requests and conversation history
const FILE_PATH_REGEX = /(?:[a-zA-Z0-9_\-\.]+[/\\enter])+[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]{1,10}/g
const EXT_FILE_REGEX = /\b[a-zA-Z0-9_\-\.]+\.(?:ts|tsx|js|jsx|json|md|py|rs|go|css|html|yaml|yml|toml|sql|sh|ps1|txt|asar|exe)\b/g
const QUOTED_PATH_REGEX = /[`"']([a-zA-Z0-9_\-\./\\]+\.[a-zA-Z0-9]{1,10})[`"']/g
const ERROR_PATTERNS = /(?:TypeError|ReferenceError|SyntaxError|Error|Exception|failed with exit code|cannot find module|ENOENT|ECONNREFUSED)/i

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function extractTextFromMessage(message: SessionMessage.Info): string {
  const parts: string[] = []
  if (message.data && typeof message.data === "object") {
    const data = message.data as Record<string, unknown>
    if (typeof data.text === "string") parts.push(data.text)
    if (Array.isArray(data.content)) {
      for (const item of data.content) {
        if (typeof item === "string") parts.push(item)
        else if (item && typeof item === "object") {
          const partObj = item as Record<string, unknown>
          if (typeof partObj.text === "string") parts.push(partObj.text)
          if (typeof partObj.name === "string") parts.push(partObj.name)
        }
      }
    }
  }
  return parts.join("\n")
}

export function inspectGroundTruth(cwd: string, textCorpus: string): GroundTruthManifest {
  const candidates = new Set<string>()

  // 1. Regex candidate extraction
  let match: RegExpExecArray | null
  while ((match = QUOTED_PATH_REGEX.exec(textCorpus)) !== null) {
    if (match[1]) candidates.add(match[1])
  }
  while ((match = FILE_PATH_REGEX.exec(textCorpus)) !== null) {
    candidates.add(match[0])
  }
  while ((match = EXT_FILE_REGEX.exec(textCorpus)) !== null) {
    candidates.add(match[0])
  }

  const confirmed: GroundTruthItem[] = []
  const missing: Array<{ path: string }> = []
  const seenPaths = new Set<string>()

  for (const raw of candidates) {
    const clean = raw.trim().replace(/^['"`]+|['"`]+$/g, "")
    // Skip URLs, semver, and trivial non-file tokens
    if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("file://") || clean.startsWith("oc://")) continue
    if (/^\d+\.\d+\.\d+$/.test(clean)) continue
    if (clean.length < 3 || clean.includes("*") || clean.includes("?")) continue

    const normalizedRelative = clean.replace(/\\/g, "/")
    if (seenPaths.has(normalizedRelative)) continue
    seenPaths.add(normalizedRelative)

    const fullPath = path.isAbsolute(clean) ? clean : path.resolve(cwd, clean)

    try {
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath)
        confirmed.push({
          path: normalizedRelative,
          size: stat.isDirectory() ? "DIR" : formatBytes(stat.size),
          isDirectory: stat.isDirectory(),
          modified: stat.mtime.toISOString().slice(11, 19),
        })
      } else {
        missing.push({ path: normalizedRelative })
      }
    } catch {
      missing.push({ path: normalizedRelative })
    }
  }

  return {
    confirmed: confirmed.slice(0, 16),
    missing: missing.slice(0, 10),
  }
}

export function analyzeTopology(cwd: string): TopologicalState {
  const rootMarkers: string[] = []
  let isMonorepo = false
  let projectType = "Generic Host Environment"

  try {
    const pkgPath = path.join(cwd, "package.json")
    if (fs.existsSync(pkgPath)) {
      rootMarkers.push("package.json")
      try {
        const pkgContent = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
        if (pkgContent.workspaces) {
          isMonorepo = true
          projectType = "Monorepo (Node/Bun Workspaces)"
        } else {
          projectType = `Node/Bun Application (${pkgContent.name || "workspace"})`
        }
      } catch {
        projectType = "Node/Bun Workspace"
      }
    }

    if (fs.existsSync(path.join(cwd, "tsconfig.json"))) {
      rootMarkers.push("tsconfig.json")
    }
    if (fs.existsSync(path.join(cwd, "Cargo.toml"))) {
      rootMarkers.push("Cargo.toml")
      projectType = "Rust Workspace"
    }
    if (fs.existsSync(path.join(cwd, "pyproject.toml")) || fs.existsSync(path.join(cwd, "requirements.txt"))) {
      rootMarkers.push("python")
      projectType = "Python Environment"
    }
    if (fs.existsSync(path.join(cwd, ".git"))) {
      rootMarkers.push(".git")
    }
  } catch {}

  return {
    runtime: typeof process !== "undefined" ? `Node/Bun v${process.versions.node || "1.0"}` : "Native Environment",
    isMonorepo,
    projectType,
    rootMarkers,
  }
}

export function computeTransitionMatrix(corpus: string): TransitionAnalysis {
  const lower = corpus.toLowerCase()
  const hasError = ERROR_PATTERNS.test(corpus)

  let scoreH1 = 10 // Inspection / Exploration
  let scoreH2 = 25 // Mutation / Implementation
  let scoreH3 = 15 // Build & Verification
  let scoreH4 = 5  // Remediation / Error Triage
  let scoreH5 = 10 // Ledger Settlement / Delivery

  if (hasError) {
    scoreH4 += 60
    scoreH2 += 30
  }
  if (/\b(?:build|pack|compile|test|bundle|vite|asar)\b/i.test(lower)) {
    scoreH3 += 50
  }
  if (/\b(?:edit|create|write|add|implement|fix|alter|change|replace|atualiz|corrig)\b/i.test(lower)) {
    scoreH2 += 45
  }
  if (/\b(?:read|list|show|find|onde|where|status|check|search|procure|veja)\b/i.test(lower)) {
    scoreH1 += 40
  }
  if (/\b(?:done|complete|final|pronto|entregar|resumo|conclu)\b/i.test(lower)) {
    scoreH5 += 35
  }

  const total = scoreH1 + scoreH2 + scoreH3 + scoreH4 + scoreH5
  const pH1 = Math.round((scoreH1 / total) * 100)
  const pH2 = Math.round((scoreH2 / total) * 100)
  const pH3 = Math.round((scoreH3 / total) * 100)
  const pH4 = Math.round((scoreH4 / total) * 100)
  const pH5 = 100 - (pH1 + pH2 + pH3 + pH4)

  const hypotheses: Hypothesis[] = [
    {
      id: "H1",
      name: "Inspecao de Estado e Exploracao Topologica",
      probability: pH1,
      description: "Mapeamento passivo do host sem mutacao de arquivos.",
      directive: "Utilize leituras diretas e pesquisas cirurgicas.",
    },
    {
      id: "H2",
      name: "Mutacao Atomica e Implementacao",
      probability: pH2,
      description: "Edicao, criacao ou correcao direta do codigo fonte.",
      directive: "Aplique edicoes atomicas via edit/write com zero hesitacao.",
    },
    {
      id: "H3",
      name: "Compilacao, Build e Verificacao de Pacote",
      probability: pH3,
      description: "Validacao executavel do build no host e integridade dos bundles.",
      directive: "Execute verificacoes de bundle e build antes de finalizar.",
    },
    {
      id: "H4",
      name: "Remediacao e Triagem de Erros de Execucao",
      probability: pH4,
      description: "Diagnostico de stack trace e erradicacao de falhas em tempo de execucao.",
      directive: "Isole a causa raiz do stack trace e aplique a correcao fisica.",
    },
    {
      id: "H5",
      name: "Assinatura do Livro-Razao e Entrega Verificada",
      probability: pH5,
      description: "Confirmacao fisica de integridade e handoff com evidencias.",
      directive: "Entregue a resposta em voz firme com links clicaveis e timestamps.",
    },
  ]

  let winning = hypotheses[0]!
  for (const h of hypotheses) {
    if (h.probability > winning.probability) winning = h
  }

  return { hypotheses, winningConcept: winning }
}

export function generateBlueprint(options: BlueprintOptions): string {
  const cwd = options.cwd || (typeof process !== "undefined" ? process.cwd() : ".")
  
  // Collect text corpus from prompt and recent messages
  const textParts: string[] = []
  if (options.promptText) textParts.push(options.promptText)
  if (options.messages && options.messages.length > 0) {
    const recent = options.messages.slice(-5)
    for (const msg of recent) {
      textParts.push(extractTextFromMessage(msg))
    }
  }
  const corpus = textParts.join("\n\n")

  const manifest = inspectGroundTruth(cwd, corpus)
  const topology = analyzeTopology(cwd)
  const transition = computeTransitionMatrix(corpus)

  const lines: string[] = [
    "================================================================================",
    "[MOTOR HIBRIDO LLM + NCM 2.0 // CREDITOS: MÖRLSARA]",
    "SUPERIOR HEURISTIC LAYER - COGNITIVE BLUEPRINT (GROUND-TRUTH 0-TOKEN HOST PREFLIGHT)",
    "REF: https://hazyresearch.stanford.edu/blog/2026-10-12-ncm",
    "================================================================================",
    `HOST CWD: ${cwd}`,
    `TOPOLOGIA ATIVA: ${topology.projectType} [${topology.rootMarkers.join(", ")}]`,
    "",
    "1. MANIFESTO GROUND-TRUTH FISICO NO DISCO:",
  ]

  if (manifest.confirmed.length > 0) {
    lines.push("  • ARQUIVOS CONFIRMADOS NO HOST:")
    for (const item of manifest.confirmed) {
      lines.push(`    - [CONFIRMED] ${item.path} (${item.size}${item.modified ? `, mod: ${item.modified}` : ""})`)
    }
  } else {
    lines.push("  • ARQUIVOS CONFIRMADOS: Nenhum caminho explicito citado ou resolvido no host.")
  }

  if (manifest.missing.length > 0) {
    lines.push("  • ARQUIVOS AUSENTES NO DISCO (NAO TENTE LER SEM CONFIRMAR OU CRIAR):")
    for (const item of manifest.missing) {
      lines.push(`    - [MISSING] ${item.path} (nao existe neste CWD)`)
    }
  }

  lines.push("")
  lines.push("2. MATRIZ DE PROBABILIDADES DE TRANSICAO (H1 a H5):")
  for (const h of transition.hypotheses) {
    const isWin = h.id === transition.winningConcept.id ? " [WINNING CONCEPT H*]" : ""
    lines.push(`  • ${h.id} (${h.name}): ${h.probability}%${isWin}`)
  }
  lines.push(`  >>> CONCEITO VENCEDOR (H*): ${transition.winningConcept.id} - ${transition.winningConcept.name}`)
  lines.push(`  >>> DIRETIVA OPERACIONAL: ${transition.winningConcept.directive}`)

  lines.push("")
  lines.push("3. HIERARCHICAL TASK DAG (MARCOS DETERMINISTICOS M1 a M4):")
  lines.push("  [M1] Inspecao Ground-Truth Fisica        -> RESOLVIDO (Manifesto carregado)")
  lines.push(`  [M2] Execucao do Conceito Vencedor (${transition.winningConcept.id}) -> ATIVO`)
  lines.push("  [M3] Verificacao de Artefato Host (Build)  -> AGUARDANDO")
  lines.push("  [M4] Assentamento no Livro-Razao           -> AGUARDANDO")

  lines.push("")
  lines.push("4. PROTOCOLO DO LIVRO-RAZAO DE EVIDENCIAS:")
  lines.push("  - Rejeicao categorica de alucinacoes de estado ou caminhos inexistentes.")
  lines.push("  - Eliminacao de hesitacao deliberativa e recusas genericas.")
  lines.push("  - Toda alegacao de conclusao deve ser respaldada por verificacao fisica no host.")

  ProgressiveMemory.distillProgressiveMemory(cwd, options.messages)
  const memoryBlock = ProgressiveMemory.formatForBlueprint(cwd)

  lines.push("")
  lines.push("5. MEMORIA PROGRESSIVA CONSOLIDADA (NCM COGNITIVE LEDGER):")
  lines.push(memoryBlock)
  lines.push("================================================================================")

  return lines.join("\n")
}

