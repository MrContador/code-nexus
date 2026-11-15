import { createSignal, createMemo, For, Show } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { Button } from "@opencode/ui/button"
import { showToast } from "@/shell/notifications/toast"

export interface HubSkillItem {
  id: string
  name: string
  displayName: string
  category: "design" | "languages" | "system" | "engineering"
  description: string
  tags: string[]
  installed?: boolean
}

export const OPEN_SKILLS_CATALOG: HubSkillItem[] = [
  // UI & Design Styles
  {
    id: "3d-ui",
    name: "3d-ui",
    displayName: "3D UI & Spatial Depth",
    category: "design",
    description: "Guia de implementação web e app para 3D UI, perspectiva e profundidade espacial.",
    tags: ["three.js", "webgl", "perspective", "canvas"],
  },
  {
    id: "ai-native-ui",
    name: "ai-native-ui",
    displayName: "AI Native UI",
    category: "design",
    description: "Interfaces conversacionais, layouts adaptativos e estética generativa moderna.",
    tags: ["ai", "conversational", "generative", "streaming"],
  },
  {
    id: "bento-ui",
    name: "bento-ui",
    displayName: "Bento UI Grid",
    category: "design",
    description: "Grids modulares em estilo Bento box inspirados na estética de dashboards modernos.",
    tags: ["grid", "dashboard", "modular", "cards"],
  },
  {
    id: "brutalist-typography",
    name: "brutalist-typography",
    displayName: "Brutalist Typography",
    category: "design",
    description: "Fontes monumentais, diagramação raw e decisões arrojadas de layout.",
    tags: ["typography", "brutalism", "bold", "editorial"],
  },
  {
    id: "claymorphism",
    name: "claymorphism",
    displayName: "Claymorphism 3D",
    category: "design",
    description: "Elementos 3D suaves, cantos arredondados e acabamento tátil e amigável.",
    tags: ["clay", "3d", "soft", "shadows"],
  },
  {
    id: "cyberpunk-ui",
    name: "cyberpunk-ui",
    displayName: "Cyberpunk UI",
    category: "design",
    description: "Cores neon, fundos ultra-dark, interfaces hacker e estética distópica hi-tech.",
    tags: ["neon", "dark", "hacker", "futuristic"],
  },
  {
    id: "dark-mode",
    name: "dark-mode",
    displayName: "Dark Mode Elegance",
    category: "design",
    description: "Superfícies escuras refinadas com redução de fadiga visual e paletas OLED.",
    tags: ["oled", "contrast", "themes", "accessibility"],
  },
  {
    id: "duotone-design",
    name: "duotone-design",
    displayName: "Duotone Aesthetics",
    category: "design",
    description: "Esquemas de duas cores de alto impacto inspirados no visual Spotify.",
    tags: ["duotone", "two-tone", "contrast", "branding"],
  },
  {
    id: "editorial-design",
    name: "editorial-design",
    displayName: "Editorial Design",
    category: "design",
    description: "Layouts inspirados em revistas, tipografia elegante e grandes manchetes.",
    tags: ["magazine", "editorial", "serif", "layout"],
  },
  {
    id: "flat-design",
    name: "flat-design",
    displayName: "Flat Design",
    category: "design",
    description: "Sem sombras pesadas, formas geométricas puras e cores vibrantes e limpas.",
    tags: ["flat", "minimal", "vector", "clean"],
  },
  {
    id: "flat-design-2",
    name: "flat-design-2",
    displayName: "Flat Design 2.0 (Semi-Flat)",
    category: "design",
    description: "Design plano moderno com micro-sombras sutis e usabilidade superior.",
    tags: ["semi-flat", "depth", "modern", "ui"],
  },
  {
    id: "frutiger-aero",
    name: "frutiger-aero",
    displayName: "Frutiger Aero",
    category: "design",
    description: "Gradientes glossy, tecnologia inspirada na natureza dos anos 2000, vidro e água.",
    tags: ["aero", "glossy", "glass", "2000s"],
  },
  {
    id: "gradient-design",
    name: "gradient-design",
    displayName: "Vibrant Gradients",
    category: "design",
    description: "Uso arrojado de gradientes luminosos e transições energéticas contemporâneas.",
    tags: ["gradients", "mesh", "colorful", "energy"],
  },
  {
    id: "high-contrast",
    name: "high-contrast",
    displayName: "High Contrast & A11y",
    category: "design",
    description: "Foco extremo em legibilidade, contraste WCAG AAA e impacto visual imediato.",
    tags: ["a11y", "contrast", "accessibility", "clean"],
  },
  {
    id: "material-design",
    name: "material-design",
    displayName: "Material Design 3",
    category: "design",
    description: "Elevações dinâmicas, motion responsivo e paletas adaptativas Google Material.",
    tags: ["material", "google", "elevation", "tokens"],
  },
  {
    id: "maximalism",
    name: "maximalism",
    displayName: "Controlled Maximalism",
    category: "design",
    description: "Alta densidade de informação curada, riqueza visual e layout artístico.",
    tags: ["dense", "curated", "visual", "artistic"],
  },
  {
    id: "minimalism",
    name: "minimalism",
    displayName: "Pure Minimalism",
    category: "design",
    description: "Respiro, tipografia contida, remoção de ruídos e clareza absoluta.",
    tags: ["minimal", "clean", "whitespace", "focus"],
  },
  {
    id: "neo-brutalism",
    name: "neo-brutalism",
    displayName: "Neo-Brutalism",
    category: "design",
    description: "Bordas grossas, sombras duras e cores saturadas com identidade expressiva.",
    tags: ["borders", "pop", "bold", "expressive"],
  },
  {
    id: "neumorphism",
    name: "neumorphism",
    displayName: "Neumorphism (Soft UI)",
    category: "design",
    description: "Simulação de luzes e sombras extrusadas diretamente da superfície.",
    tags: ["soft-ui", "emboss", "tactile", "shadows"],
  },
  {
    id: "retro-design",
    name: "retro-design",
    displayName: "Retro Design (60s-80s)",
    category: "design",
    description: "Estética vintage nostálgica, paletas terrosas e texturas analógicas.",
    tags: ["vintage", "analog", "warm", "nostalgia"],
  },
  {
    id: "retro-futurism",
    name: "retro-futurism",
    displayName: "Retro-Futurism & Atompunk",
    category: "design",
    description: "Conceitos espaciais dos anos 50, atompunk e visões do futuro do passado.",
    tags: ["atompunk", "space-age", "sci-fi", "vintage"],
  },
  {
    id: "soft-pastel",
    name: "soft-pastel",
    displayName: "Soft Pastel UI",
    category: "design",
    description: "Tons pasteis relaxantes, paletas calmas e interface acolhedora.",
    tags: ["pastel", "calm", "lifestyle", "gentle"],
  },
  {
    id: "spatial-computing-ui",
    name: "spatial-computing-ui",
    displayName: "Spatial Computing (VisionOS)",
    category: "design",
    description: "Vidro dinâmico, materiais espaciais e layouts em estilo Apple Vision Pro.",
    tags: ["spatial", "visionos", "glassmorphism", "float"],
  },
  {
    id: "swiss-design",
    name: "swiss-design",
    displayName: "Swiss Design Style",
    category: "design",
    description: "Sistemas de grid rígidos, tipografia grotesca internacional e clareza objetiva.",
    tags: ["international", "helvetica", "grid", "asymmetric"],
  },
  {
    id: "tile-design",
    name: "tile-design",
    displayName: "Tile & Metro Design",
    category: "design",
    description: "Blocos de informação nítidos, tipografia direta e grids informacionais.",
    tags: ["tiles", "metro", "windows", "structured"],
  },
  {
    id: "typography-first",
    name: "typography-first",
    displayName: "Typography First",
    category: "design",
    description: "O texto como elemento plástico principal, sem poluição de componentes supérfluos.",
    tags: ["text", "editorial", "monochrome", "type"],
  },
  {
    id: "vibrant-maximalism",
    name: "vibrant-maximalism",
    displayName: "Vibrant Maximalism",
    category: "design",
    description: "Cores eletrizantes, colagens ricas e estímulo sensorial 'more is more'.",
    tags: ["electric", "expressive", "collage", "bold"],
  },
  {
    id: "widget-based-design",
    name: "widget-based-design",
    displayName: "Widget-Based UI",
    category: "design",
    description: "Cartões modulares em estilo iOS Home Screen com micro-interações independentes.",
    tags: ["widgets", "ios", "modular", "customizable"],
  },
  {
    id: "y2k-design",
    name: "y2k-design",
    displayName: "Y2K Aesthetic",
    category: "design",
    description: "Cromo, bolhas, tipografia futurista dos anos 2000 e otimismo tecnológico.",
    tags: ["y2k", "chrome", "blob", "cyber"],
  },

  // Programming Languages & Tooling
  {
    id: "typescript",
    name: "typescript",
    displayName: "TypeScript Super-Code",
    category: "languages",
    description: "Diretrizes e padrões de alta produtividade para tipagem avançada e runtime TS.",
    tags: ["ts", "types", "compiler", "node"],
  },
  {
    id: "python",
    name: "python",
    displayName: "Python Elite Architecture",
    category: "languages",
    description: "Padrões modernos de tipagem estática, async/await, empacotamento e performance.",
    tags: ["py", "asyncio", "typing", "fastapi"],
  },
  {
    id: "rust",
    name: "rust",
    displayName: "Rust Safe & High Perf",
    category: "languages",
    description: "Ownership limpo, concorrência segura, macros e crates sem overhead.",
    tags: ["rust", "cargo", "wasm", "systems"],
  },
  {
    id: "go",
    name: "go",
    displayName: "Go Simplicity & Concurrency",
    category: "languages",
    description: "Goroutines, canais, context propagation e arquitetura idiomática em Go.",
    tags: ["golang", "concurrency", "http", "microservices"],
  },
  {
    id: "c",
    name: "c",
    displayName: "C Systems Programming",
    category: "languages",
    description: "Padrões de gerenciamento de memória, portabilidade e performance no metal.",
    tags: ["c", "native", "memory", "systems"],
  },
  {
    id: "bash",
    name: "bash",
    displayName: "Bash & POSIX Shell",
    category: "languages",
    description: "Automações seguras, pipes, tratamento de sinais e scripts robustos de shell.",
    tags: ["bash", "sh", "cli", "automation"],
  },
  {
    id: "dart",
    name: "dart",
    displayName: "Dart & Flutter Standards",
    category: "languages",
    description: "Diretrizes e arquitetura para desenvolvimento em Dart e ecossistema Flutter.",
    tags: ["dart", "flutter", "mobile", "cross-platform"],
  },
  {
    id: "elixir",
    name: "elixir",
    displayName: "Elixir & BEAM OTP",
    category: "languages",
    description: "Concorrência em processos, atores OTP, tolerância a falhas e Phoenix.",
    tags: ["elixir", "otp", "beam", "phoenix"],
  },
  {
    id: "kotlin",
    name: "kotlin",
    displayName: "Kotlin Multiplatform",
    category: "languages",
    description: "Corrotinas, DSLs, null-safety e padrões para Kotlin e KMP.",
    tags: ["kotlin", "jvm", "coroutines", "android"],
  },
  {
    id: "php",
    name: "php",
    displayName: "Modern PHP 8+",
    category: "languages",
    description: "PHP moderno tipado, atributos, arquiteturas Laravel e boas práticas.",
    tags: ["php", "laravel", "backend", "web"],
  },
  {
    id: "swift",
    name: "swift",
    displayName: "Swift & Swift Concurrency",
    category: "languages",
    description: "Async/await, actors, SwiftData e engenharia nativa Apple.",
    tags: ["swift", "apple", "concurrency", "ios"],
  },

  // Engineering & Reverse
  {
    id: "dsl-vm-reverse",
    name: "dsl-vm-reverse",
    displayName: "DSL & VM Reverse Engineering",
    category: "engineering",
    description: "Engenharia reversa de interpretadores customizados baseados em opcode JS e VMs.",
    tags: ["reverse", "vm", "bytecode", "opcode"],
  },
  {
    id: "screenshot",
    name: "screenshot",
    displayName: "OS Desktop Screenshot",
    category: "system",
    description: "Captura de tela nativa no nível de sistema operacional e regiões de janelas.",
    tags: ["screen", "capture", "os", "desktop"],
  },
  {
    id: "run-workflow",
    name: "run-workflow",
    displayName: "Run Workflow Engine",
    category: "engineering",
    description: "Orquestração de scripts dinâmicos em pipelines e agentes paralelos.",
    tags: ["pipeline", "workflow", "parallel", "fanout"],
  },
  {
    id: "native_swarm",
    name: "native_swarm",
    displayName: "Native Swarm Multi-Agent",
    category: "engineering",
    description: "Mecanismo colaborativo de equipe de múltiplos agentes com quadro compartilhado.",
    tags: ["swarm", "multi-agent", "collaboration", "parallel"],
  },
]

export function SkillHubManager(props: { installedSkills?: Array<{ name: string; path?: string }> }) {
  const [filter, setFilter] = createSignal("")
  const [activeCategory, setActiveCategory] = createSignal<string>("all")

  const getInitialSet = (): Set<string> => {
    const s = new Set<string>()
    if (props.installedSkills && Array.isArray(props.installedSkills)) {
      for (const item of props.installedSkills) {
        if (item?.name) s.add(item.name)
      }
    }
    try {
      if (typeof localStorage !== "undefined" && localStorage.getItem("codenexus_full_skills_pack") === "true") {
        OPEN_SKILLS_CATALOG.forEach((item) => s.add(item.name))
      }
    } catch {}
    return s
  }

  const [localInstalled, setLocalInstalled] = createSignal<Set<string>>(getInitialSet())
  const [installingAll, setInstallingAll] = createSignal(false)

  const isInstalled = (skillName: string): boolean => {
    const set = localInstalled()
    const inLocal = set instanceof Set ? set.has(skillName) : false
    const inProps = Array.isArray(props.installedSkills)
      ? props.installedSkills.some((s) => s?.name === skillName)
      : false
    return inLocal || inProps
  }

  const toggleSkill = (skillName: string) => {
    setLocalInstalled((prev) => {
      const next = new Set(prev instanceof Set ? prev : [])
      if (next.has(skillName)) {
        next.delete(skillName)
        showToast({ title: "Skill removida", description: `${skillName} foi desativada.` })
      } else {
        next.add(skillName)
        showToast({ title: "Skill instalada", description: `${skillName} está pronta para uso nos agentes.` })
      }
      return next
    })
  }

  const installFullPack = () => {
    setInstallingAll(true)
    setTimeout(() => {
      setLocalInstalled((prev) => {
        const next = new Set(prev instanceof Set ? prev : [])
        OPEN_SKILLS_CATALOG.forEach((item) => next.add(item.name))
        return next
      })
      try {
        localStorage.setItem("codenexus_full_skills_pack", "true")
      } catch {}
      setInstallingAll(false)
      showToast({
        title: "Pacote completo instalado!",
        description: `Todas as ${OPEN_SKILLS_CATALOG.length} skills do biSkills / open-skills foram ativadas com sucesso.`,
      })
    }, 400)
  }

  const filteredCatalog = createMemo(() => {
    const q = filter().toLowerCase().trim()
    const cat = activeCategory()

    return OPEN_SKILLS_CATALOG.filter((item) => {
      if (cat === "installed" && !isInstalled(item.name)) return false
      if (cat !== "all" && cat !== "installed" && item.category !== cat) return false
      if (!q) return true
      return (
        item.name.toLowerCase().includes(q) ||
        item.displayName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  })

  const installedCount = createMemo(() => {
    let count = 0
    OPEN_SKILLS_CATALOG.forEach((item) => {
      if (isInstalled(item.name)) count++
    })
    return count
  })

  return (
    <div class="flex flex-col gap-6 text-v2-text-text-base">
      {/* Banner / Hero Card */}
      <div class="rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-950/40 via-v2-background-bg-layer-02 to-v2-background-bg-layer-01 p-6 relative overflow-hidden shadow-lg">
        <div class="absolute -right-12 -top-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div class="flex flex-col gap-2 max-w-2xl">
            <div class="inline-flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                biSkills · open-skills
              </span>
              <span class="text-xs text-v2-text-text-muted">SkillHub Oficial</span>
            </div>
            <h3 class="text-xl font-bold tracking-tight text-v2-text-text-base">
              Gerencie suas Skills ou descubra no SkillHub
            </h3>
            <p class="text-xs text-v2-text-text-muted leading-relaxed">
              Expanda o repertório dos agentes do Code Nexus com pacotes especializados de UI, linguagens, engenharia reversa e automações completas prontas para uso.
            </p>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="primary"
              disabled={installingAll()}
              onClick={installFullPack}
              class="px-4 py-2 text-xs font-semibold shadow-md bg-teal-600 hover:bg-teal-500 text-white gap-2"
            >
              <Icon name="download" size="small" />
              <span>{installingAll() ? "Instalando..." : "Instalar pacote completo"}</span>
            </Button>
            <a
              href="https://github.com/x7dl8p/open-skills"
              target="_blank"
              rel="noreferrer"
              class="px-3.5 py-2 text-xs font-medium rounded-lg border border-v2-border-border-base bg-v2-background-bg-layer-02 hover:bg-v2-background-bg-layer-03 text-v2-text-text-base transition-colors inline-flex items-center gap-1.5"
            >
              <span>GitHub</span>
              <span class="text-xs">↗</span>
            </a>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div class="inline-flex rounded-lg bg-v2-background-bg-layer-02 p-1 border border-v2-border-border-base text-xs">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            class={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeCategory() === "all"
                ? "bg-v2-background-bg-inverse text-v2-text-text-inverse shadow-xs"
                : "text-v2-text-text-muted hover:text-v2-text-text-base"
            }`}
          >
            Todas ({OPEN_SKILLS_CATALOG.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("installed")}
            class={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeCategory() === "installed"
                ? "bg-v2-background-bg-inverse text-v2-text-text-inverse shadow-xs"
                : "text-v2-text-text-muted hover:text-v2-text-text-base"
            }`}
          >
            Instaladas ({installedCount()})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("design")}
            class={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeCategory() === "design"
                ? "bg-v2-background-bg-inverse text-v2-text-text-inverse shadow-xs"
                : "text-v2-text-text-muted hover:text-v2-text-text-base"
            }`}
          >
            UI / Design
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("languages")}
            class={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeCategory() === "languages"
                ? "bg-v2-background-bg-inverse text-v2-text-text-inverse shadow-xs"
                : "text-v2-text-text-muted hover:text-v2-text-text-base"
            }`}
          >
            Linguagens
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("engineering")}
            class={`px-3 py-1 rounded-md font-medium transition-colors ${
              activeCategory() === "engineering"
                ? "bg-v2-background-bg-inverse text-v2-text-text-inverse shadow-xs"
                : "text-v2-text-text-muted hover:text-v2-text-text-base"
            }`}
          >
            Engenharia
          </button>
        </div>

        {/* Search */}
        <div class="relative w-full sm:w-72">
          <input
            type="text"
            value={filter()}
            onInput={(e) => setFilter(e.currentTarget.value)}
            placeholder="Pesquisar no SkillHub..."
            class="w-full px-3 py-1.5 pl-8 text-xs bg-v2-background-bg-layer-02 border border-v2-border-border-base rounded-lg text-v2-text-text-base placeholder:text-v2-text-text-muted focus:outline-none focus:border-teal-500 transition-colors"
          />
          <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-v2-icon-icon-muted pointer-events-none">
            <Icon name="magnifying-glass" size="small" />
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <For
          each={filteredCatalog()}
          fallback={
            <div class="col-span-full py-12 text-center text-v2-text-text-muted text-xs">
              Nenhuma skill encontrada para o filtro atual.
            </div>
          }
        >
          {(skill) => {
            const installed = () => isInstalled(skill.name)

            return (
              <div class="rounded-xl border border-v2-border-border-base bg-v2-background-bg-layer-01/80 hover:border-v2-border-border-hover p-4 flex flex-col justify-between gap-3 transition-all duration-150 hover:shadow-md">
                <div class="flex flex-col gap-2">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                        <Icon name="post-skill" size="small" />
                      </div>
                      <div class="flex flex-col min-w-0">
                        <h4 class="text-xs font-bold text-v2-text-text-base truncate">{skill.displayName}</h4>
                        <span class="text-[10px] font-mono text-v2-text-text-muted">{skill.name}</span>
                      </div>
                    </div>

                    <Show
                      when={installed()}
                      fallback={
                        <span class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-v2-background-bg-layer-02 text-v2-text-text-muted border border-v2-border-border-base">
                          SkillHub
                        </span>
                      }
                    >
                      <span class="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Ativa
                      </span>
                    </Show>
                  </div>

                  <p class="text-[11px] text-v2-text-text-muted leading-relaxed line-clamp-2">
                    {skill.description}
                  </p>

                  <div class="flex flex-wrap gap-1 pt-1">
                    <For each={skill.tags.slice(0, 3)}>
                      {(tag) => (
                        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-v2-background-bg-layer-02 text-v2-text-text-muted border border-white/5">
                          #{tag}
                        </span>
                      )}
                    </For>
                  </div>
                </div>

                <div class="pt-2 border-t border-v2-border-border-base/40 flex items-center justify-between">
                  <span class="text-[10px] font-mono text-v2-text-text-muted uppercase">
                    {skill.category}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleSkill(skill.name)}
                    class={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      installed()
                        ? "bg-teal-500/20 text-teal-300 hover:bg-rose-500/20 hover:text-rose-300 border border-teal-500/30"
                        : "bg-v2-background-bg-inverse text-v2-text-text-inverse hover:opacity-90 shadow-xs"
                    }`}
                  >
                    {installed() ? "Instalada ✓" : "Instalar"}
                  </button>
                </div>
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}

