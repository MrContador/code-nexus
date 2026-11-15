import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { TextInput } from "@opencode/ui/text-input"
import { DialogBody, DialogHeader, DialogTitle, DialogFooter, Dialog } from "@opencode/ui/dialog"
import { createEffect, createSignal, For, onMount, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { useLanguage } from "@/runtime/i18n/language"
import { showToast } from "@/shell/notifications/toast"
import { formatServerError } from "@/runtime/server/errors"

export interface CustomProviderFormData {
  id: string
  name: string
  npm: string
  baseURL: string
  apiKey?: string
  headers?: Record<string, string>
  models: Record<string, { name: string; limit?: { context?: number; output?: number } }>
}

const CUSTOM_PROVIDER_PERSIST_KEY = "custom-provider-form-draft"

const defaultFormData: CustomProviderFormData = {
  id: "",
  name: "",
  npm: "@ai-sdk/openai-compatible",
  baseURL: "",
  apiKey: "",
  headers: {},
  models: {},
}

function normalizeBaseURL(url: string) {
  let trimmed = url.trim()
  if (!trimmed) return ""
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = "https://" + trimmed
  }
  return trimmed.replace(/\/+$/, "")
}

export function CustomProviderForm(props: {
  onSave: (data: CustomProviderFormData) => void
  onCancel: () => void
  initialData?: Partial<CustomProviderFormData>
}) {
  const language = useLanguage()
  const [store, setStore] = createStore<CustomProviderFormData>({
    ...defaultFormData,
    ...props.initialData,
  })
  const [saving, setSaving] = createSignal(false)
  const [errors, setErrors] = createSignal<Record<string, string>>({})
  const [modelRows, setModelRows] = createSignal<Array<{ id: string; name: string; context?: number; output?: number }>>([])
  
  // Accordions and UI state
  const [showManualModels, setShowManualModels] = createSignal(false)
  const [showAdvanced, setShowAdvanced] = createSignal(false)
  const [showPassword, setShowPassword] = createSignal(false)
  
  // Models auto-discovery
  const [fetchingModels, setFetchingModels] = createSignal(false)
  const [discoveredModels, setDiscoveredModels] = createSignal<string[]>([])
  const [showModelPicker, setShowModelPicker] = createSignal(false)
  
  // Connection testing
  const [testResult, setTestResult] = createSignal<{ status: "idle" | "testing" | "success" | "error"; message?: string }>({
    status: "idle",
  })

  // Load draft from localStorage on mount only
  onMount(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PROVIDER_PERSIST_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setStore(parsed)
        if (parsed.models) {
          setModelRows(Object.entries(parsed.models).map(([id, m]: [string, any]) => ({
            id,
            name: m.name,
            context: m.limit?.context,
            output: m.limit?.output,
          })))
        }
      }
    } catch {
      // Ignore parsing errors
    }
  })

  // Save draft to localStorage
  createEffect(() => {
    const data = {
      ...store,
      models: Object.fromEntries(
        modelRows().map((m) => [m.id, { name: m.name, limit: { context: m.context, output: m.output } }])
      ),
    }
    localStorage.setItem(CUSTOM_PROVIDER_PERSIST_KEY, JSON.stringify(data))
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!store.name.trim()) newErrors.name = language.t("provider.custom.error.nameRequired") ?? "Nome de exibição é obrigatório"
    if (!store.baseURL.trim()) newErrors.baseURL = language.t("provider.custom.error.baseURLRequired") ?? "URL base é obrigatória"
    if (!store.id.trim()) {
      const generatedId = store.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")
      if (generatedId) {
        setStore("id", generatedId)
      } else {
        newErrors.id = language.t("provider.custom.error.idRequired") ?? "ID do provedor é obrigatório"
      }
    }
    if (modelRows().length === 0) {
      newErrors.models = language.t("provider.custom.error.atLeastOneModel") ?? "Adicione pelo menos um modelo"
      setShowManualModels(true)
    }
    
    for (let i = 0; i < modelRows().length; i++) {
      const model = modelRows()[i]
      if (!model.id.trim()) newErrors[`modelId_${i}`] = language.t("provider.custom.error.modelIdRequired", { index: i + 1 }) ?? `ID do modelo ${i + 1} é obrigatório`
      if (!model.name.trim()) newErrors[`modelName_${i}`] = language.t("provider.custom.error.modelNameRequired", { index: i + 1 }) ?? `Nome do modelo ${i + 1} é obrigatório`
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    
    setSaving(true)
    try {
      const cleanBaseURL = normalizeBaseURL(store.baseURL)
      const data: CustomProviderFormData = {
        ...store,
        baseURL: cleanBaseURL,
        id: store.id.trim() || store.name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        models: Object.fromEntries(
          modelRows().map((m) => [m.id, { name: m.name, limit: { context: m.context, output: m.output } }])
        ),
      }
      
      // Clear draft
      localStorage.removeItem(CUSTOM_PROVIDER_PERSIST_KEY)
      props.onSave(data)
    } catch (error) {
      showToast(formatServerError(error))
    } finally {
      setSaving(false)
    }
  }

  const addModelRow = () => {
    setModelRows([...modelRows(), { id: "", name: "", context: 128000, output: 8192 }])
  }

  const removeModelRow = (index: number) => {
    setModelRows(modelRows().filter((_, i) => i !== index))
  }

  const updateModelRow = (index: number, field: string, value: string | number | undefined) => {
    setModelRows(modelRows().map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  // Connection testing
  const testConnection = async () => {
    const url = normalizeBaseURL(store.baseURL)
    if (!url) {
      setTestResult({ status: "error", message: "Informe a URL base antes de testar a conexão." })
      return
    }
    setTestResult({ status: "testing" })
    const start = performance.now()
    try {
      const headers: Record<string, string> = {
        ...(store.headers ?? {}),
      }
      if (store.apiKey?.trim()) {
        headers["Authorization"] = `Bearer ${store.apiKey.trim()}`
      }
      const res = await fetch(`${url}/models`, {
        method: "GET",
        headers,
      })
      const duration = Math.round(performance.now() - start)
      if (res.ok) {
        setTestResult({ status: "success", message: `Conexão bem-sucedida (${duration}ms)` })
      } else {
        const text = await res.text().catch(() => "")
        setTestResult({ status: "error", message: `HTTP ${res.status}: ${res.statusText || text.slice(0, 100)}` })
      }
    } catch (err: any) {
      setTestResult({ status: "error", message: `Falha na requisição: ${err.message || "Servidor inacessível"}` })
    }
  }

  // Auto-fetch models
  const fetchModels = async () => {
    const url = normalizeBaseURL(store.baseURL)
    if (!url) {
      showToast("Informe a URL base para buscar os modelos.")
      return
    }
    setFetchingModels(true)
    try {
      const headers: Record<string, string> = {
        ...(store.headers ?? {}),
      }
      if (store.apiKey?.trim()) {
        headers["Authorization"] = `Bearer ${store.apiKey.trim()}`
      }
      const res = await fetch(`${url}/models`, {
        method: "GET",
        headers,
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const json = await res.json()
      const rawList = Array.isArray(json) 
        ? json 
        : Array.isArray(json.data) 
          ? json.data 
          : Array.isArray(json.models) 
            ? json.models 
            : []
      const ids: string[] = rawList
        .map((item: any) => typeof item === "string" ? item : (item.id || item.name || item.model))
        .filter(Boolean)

      if (ids.length === 0) {
        showToast("Nenhum modelo retornado pelo provedor.")
        return
      }

      setDiscoveredModels(ids)
      setShowModelPicker(true)
      showToast(`${ids.length} modelos encontrados!`)
    } catch (err: any) {
      showToast(`Erro ao buscar modelos: ${err.message || "Verifique a URL e chave"}`)
    } finally {
      setFetchingModels(false)
    }
  }

  const isModelSelected = (id: string) => modelRows().some((m) => m.id === id)

  const toggleSelectModel = (id: string) => {
    const current = modelRows()
    if (isModelSelected(id)) {
      setModelRows(current.filter((m) => m.id !== id))
    } else {
      setModelRows([...current, { id, name: id, context: 128000, output: 8192 }])
    }
  }

  const selectAllDiscovered = () => {
    const current = modelRows()
    const existing = new Set(current.map((m) => m.id))
    const toAdd = discoveredModels().filter((id) => !existing.has(id)).map((id) => ({
      id,
      name: id,
      context: 128000,
      output: 8192,
    }))
    setModelRows([...current, ...toAdd])
  }

  onMount(() => {
    if (modelRows().length === 0) {
      addModelRow()
    }
  })

  return (
    <Dialog containerClass="!w-[min(calc(100vw_-_32px),560px)] !h-[min(calc(100vh_-_48px),680px)] !max-h-[calc(100vh_-_48px)] !rounded-xl !overflow-hidden !flex !flex-col">
      <DialogHeader class="!py-3 !px-5 border-b border-v2-border-border-base shrink-0 flex items-center justify-between" hideClose>
        <DialogTitle class="flex flex-col gap-0.5">
          <div class="flex items-center gap-2">
            <span class="text-base font-semibold text-v2-text-text-base">
              ✨ {language.t("provider.custom.title") ?? "Adicionar um provedor personalizado"}
            </span>
          </div>
          <span class="text-xs text-v2-text-text-muted font-normal">
            Configure um provedor compatível com OpenAI / Anthropic.
          </span>
        </DialogTitle>
        <IconButton
          variant="ghost"
          size="small"
          icon={<Icon name="close" size="small" />}
          onClick={props.onCancel}
          aria-label={language.t("ui.common.close") ?? "Fechar"}
        />
      </DialogHeader>

      <DialogBody class="min-h-0 flex-1 overflow-y-auto w-full !px-5 !py-4 flex flex-col gap-4 [scrollbar-width:thin] [scrollbar-color:var(--v2-border-border-base)_transparent]">
        <div class="flex flex-col gap-4">
          {/* Nome de exibição */}
          <div class="flex flex-col gap-1.5">
            <label class="text-[12px] font-semibold text-v2-text-text-base">
              {language.t("provider.custom.field.name") ?? "Nome de exibição"}
            </label>
            <TextInput
              value={store.name}
              onInput={(e) => {
                const val = e.currentTarget.value
                setStore("name", val)
                if (!store.id || store.id === store.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")) {
                  setStore("id", val.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
                }
              }}
              placeholder="Meu provedor de IA"
              invalid={!!errors().name}
              aria-describedby={errors().name ? "name-error" : undefined}
            />
            <Show when={errors().name}>
              <span id="name-error" class="text-[11px] text-v2-state-fg-danger">{errors().name}</span>
            </Show>
          </div>

          {/* Main Card Container */}
          <div class="flex flex-col gap-3.5 p-3.5 rounded-lg border border-v2-border-border-base bg-v2-background-bg-layer-02">
            {/* URL base */}
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-semibold text-v2-text-text-base">
                {language.t("provider.custom.field.baseURL") ?? "URL base"}
              </label>
              <TextInput
                value={store.baseURL}
                onInput={(e) => setStore("baseURL", e.currentTarget.value)}
                placeholder="https://api.myprovider.com/v1"
                invalid={!!errors().baseURL}
                aria-describedby={errors().baseURL ? "baseURL-error" : undefined}
              />
              <Show when={errors().baseURL}>
                <span id="baseURL-error" class="text-[11px] text-v2-state-fg-danger">{errors().baseURL}</span>
              </Show>
            </div>

            {/* Chave de API */}
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-semibold text-v2-text-text-base">
                {language.t("provider.custom.field.apiKey") ?? "Chave de API"}
              </label>
              <div class="relative flex items-center">
                <TextInput
                  type={showPassword() ? "text" : "password"}
                  value={store.apiKey ?? ""}
                  onInput={(e) => setStore("apiKey", e.currentTarget.value)}
                  placeholder="Chave de API"
                  class="!w-full !pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword())}
                  class="absolute right-2.5 text-v2-text-text-muted hover:text-v2-text-text-base transition-colors"
                  title={showPassword() ? "Ocultar chave" : "Mostrar chave"}
                >
                  <Icon name={showPassword() ? "outline-eye-slash" : "outline-eye"} size="small" />
                </button>
              </div>
            </div>

            {/* Buscar e selecionar modelos */}
            <div class="pt-2 border-t border-v2-border-border-base flex flex-col gap-2">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs text-v2-text-text-muted">
                  {discoveredModels().length > 0
                    ? `${discoveredModels().length} modelos encontrados (${modelRows().length} selecionados)`
                    : "A lista de modelos ainda não foi buscada"}
                </span>
                <Button
                  variant="outline"
                  size="small"
                  onClick={fetchModels}
                  disabled={fetchingModels()}
                >
                  <Icon name="outline-rotate-clockwise" size="small" class={`mr-1.5 ${fetchingModels() ? "animate-spin" : ""}`} />
                  {fetchingModels() ? "Buscando…" : "Buscar e selecionar modelos"}
                </Button>
              </div>

              {/* Discovered models selection dropdown / list */}
              <Show when={showModelPicker() && discoveredModels().length > 0}>
                <div class="flex flex-col gap-2 p-2.5 rounded-md border border-v2-border-border-base bg-v2-background-bg-base max-h-[160px] overflow-y-auto [scrollbar-width:thin]">
                  <div class="flex items-center justify-between pb-1 border-b border-v2-border-border-base">
                    <span class="text-[11px] font-medium text-v2-text-text-muted">Selecione os modelos para importar:</span>
                    <button
                      type="button"
                      class="text-[11px] text-v2-icon-icon-accent hover:underline"
                      onClick={selectAllDiscovered}
                    >
                      Selecionar todos
                    </button>
                  </div>
                  <div class="flex flex-wrap gap-1.5 pt-1">
                    <For each={discoveredModels()}>
                      {(modelId) => {
                        const selected = () => isModelSelected(modelId)
                        return (
                          <button
                            type="button"
                            onClick={() => toggleSelectModel(modelId)}
                            class={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                              selected()
                                ? "bg-v2-surface-primary-base border-v2-border-border-focus text-v2-text-text-base font-medium"
                                : "bg-v2-background-bg-layer-01 border-v2-border-border-base text-v2-text-text-muted hover:border-v2-border-border-focus"
                            }`}
                          >
                            <span>{selected() ? "✓" : "+"}</span>
                            <span>{modelId}</span>
                          </button>
                        )
                      }}
                    </For>
                  </div>
                </div>
              </Show>
            </div>

            {/* Accordion: Adicionar um modelo manualmente */}
            <div class="pt-2 border-t border-v2-border-border-base flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowManualModels(!showManualModels())}
                class="flex items-center gap-1.5 text-xs font-semibold text-v2-text-text-base hover:text-v2-text-text-strong transition-colors text-left"
              >
                <Icon name="chevron-down" size="small" class={`transition-transform ${showManualModels() ? "rotate-180" : ""}`} />
                <span>Adicionar um modelo manualmente</span>
                <span class="text-[11px] text-v2-text-text-muted font-normal ml-auto">({modelRows().length} ativos)</span>
              </button>

              <Show when={showManualModels()}>
                <div class="flex flex-col gap-2.5 pt-1">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] text-v2-text-text-muted">Modelos adicionados:</span>
                    <Button variant="outline" size="small" onClick={addModelRow}>
                      <Icon name="plus" size="small" class="mr-1" />
                      Adicionar modelo
                    </Button>
                  </div>
                  <Show when={errors().models}>
                    <div class="text-[12px] text-v2-state-fg-danger">{errors().models}</div>
                  </Show>
                  <For each={modelRows()}>
                    {(model, index) => (
                      <div class="flex flex-col gap-2 p-2.5 bg-v2-background-bg-base rounded-md border border-v2-border-border-base">
                        <div class="flex items-center gap-2">
                          <TextInput
                            value={model.id}
                            onInput={(e) => updateModelRow(index(), "id", e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                            placeholder="ID do modelo (ex: meu-modelo)"
                            class="flex-1"
                            invalid={!!errors()[`modelId_${index()}`]}
                            aria-describedby={errors()[`modelId_${index()}`] ? `modelId-error-${index()}` : undefined}
                          />
                          <IconButton
                            variant="ghost"
                            size="small"
                            icon={<Icon name="trash" size="small" />}
                            onClick={() => removeModelRow(index())}
                            aria-label="Remover modelo"
                          />
                        </div>
                        <Show when={errors()[`modelId_${index()}`]}>
                          <div id={`modelId-error-${index()}`} class="text-[11px] text-v2-state-fg-danger">{errors()[`modelId_${index()}`]}</div>
                        </Show>
                        <TextInput
                          value={model.name}
                          onInput={(e) => updateModelRow(index(), "name", e.currentTarget.value)}
                          placeholder="Nome de exibição do modelo"
                          invalid={!!errors()[`modelName_${index()}`]}
                          aria-describedby={errors()[`modelName_${index()}`] ? `modelName-error-${index()}` : undefined}
                        />
                        <Show when={errors()[`modelName_${index()}`]}>
                          <div id={`modelName-error-${index()}`} class="text-[11px] text-v2-state-fg-danger">{errors()[`modelName_${index()}`]}</div>
                        </Show>
                        <div class="flex gap-2">
                          <TextInput
                            type="number"
                            value={model.context?.toString() ?? ""}
                            onInput={(e) => updateModelRow(index(), "context", e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined)}
                            placeholder="Janela de contexto (ex: 128000)"
                            class="flex-1"
                          />
                          <TextInput
                            type="number"
                            value={model.output?.toString() ?? ""}
                            onInput={(e) => updateModelRow(index(), "output", e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined)}
                            placeholder="Tokens de saída (ex: 8192)"
                            class="flex-1"
                          />
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* Accordion: Configurações avançadas de conexão */}
            <div class="pt-2 border-t border-v2-border-border-base flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced())}
                class="flex items-center gap-1.5 text-xs font-semibold text-v2-text-text-base hover:text-v2-text-text-strong transition-colors text-left"
              >
                <Icon name="chevron-down" size="small" class={`transition-transform ${showAdvanced() ? "rotate-180" : ""}`} />
                <span>Configurações avançadas de conexão</span>
              </button>

              <Show when={showAdvanced()}>
                <div class="flex flex-col gap-3 pt-1">
                  {/* Provider ID */}
                  <div class="flex flex-col gap-1">
                    <label class="text-[11px] font-medium text-v2-text-text-base">ID único do provedor</label>
                    <TextInput
                      value={store.id}
                      onInput={(e) => setStore("id", e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      placeholder="meu-provedor"
                    />
                    <span class="text-[10px] text-v2-text-text-muted">Identificador interno único (letras minúsculas e hífens)</span>
                  </div>

                  {/* NPM Package */}
                  <div class="flex flex-col gap-1">
                    <label class="text-[11px] font-medium text-v2-text-text-base">Pacote NPM do AI SDK</label>
                    <TextInput
                      value={store.npm}
                      onInput={(e) => setStore("npm", e.currentTarget.value)}
                      placeholder="@ai-sdk/openai-compatible"
                    />
                    <span class="text-[10px] text-v2-text-text-muted">Padrão: @ai-sdk/openai-compatible ou @ai-sdk/anthropic</span>
                  </div>

                  {/* Headers */}
                  <div class="flex flex-col gap-1">
                    <label class="text-[11px] font-medium text-v2-text-text-base">Headers personalizados (JSON)</label>
                    <textarea
                      class="w-full min-h-[80px] rounded-md border border-v2-border-border-base bg-v2-background-bg-base p-2 text-xs font-mono text-v2-text-text-base outline-none focus:border-v2-border-border-focus resize-y"
                      value={JSON.stringify(store.headers ?? {}, null, 2)}
                      onInput={(e) => {
                        try {
                          setStore("headers", JSON.parse(e.currentTarget.value))
                        } catch {
                          // Ignore invalid JSON while typing
                        }
                      }}
                      placeholder='{"Authorization": "Bearer custom-token"}'
                      rows={3}
                    />
                    <span class="text-[10px] text-v2-text-text-muted">Headers adicionais enviados em cada requisição à API</span>
                  </div>
                </div>
              </Show>
            </div>

            {/* Test Connection Button */}
            <div class="pt-2 border-t border-v2-border-border-base flex flex-col gap-1.5">
              <div class="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="small"
                  onClick={testConnection}
                  disabled={testResult().status === "testing"}
                >
                  <span class="mr-1.5">🔌</span>
                  {testResult().status === "testing" ? "Testando conexão…" : "Testar conexão"}
                </Button>
                <Show when={testResult().status === "success"}>
                  <span class="text-xs text-green-400 font-medium flex items-center gap-1">
                    ✓ {testResult().message}
                  </span>
                </Show>
                <Show when={testResult().status === "error"}>
                  <span class="text-xs text-v2-state-fg-danger font-medium flex items-center gap-1">
                    ✗ {testResult().message}
                  </span>
                </Show>
              </div>
              <p class="text-[11px] text-v2-text-text-muted leading-tight">
                O teste envia requisições curtas de geração e pode gerar uma pequena cobrança.
              </p>
            </div>
          </div>
        </div>
      </DialogBody>

      <DialogFooter class="!py-3 !px-5 border-t border-v2-border-border-base shrink-0 flex items-center justify-end gap-2 bg-v2-background-bg-layer-01">
        <Button variant="outline" onClick={props.onCancel}>
          {language.t("common.cancel") ?? "Cancelar"}
        </Button>
        <Button variant="contrast" onClick={handleSave} disabled={saving()}>
          {saving() ? (language.t("common.saving") ?? "Salvando…") : "Salvar provedor"}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

export function useCustomProviderForm() {
  const [isOpen, setIsOpen] = createSignal(false)
  const [initialData, setInitialData] = createSignal<Partial<CustomProviderFormData> | undefined>(undefined)

  const open = (data?: Partial<CustomProviderFormData>) => {
    setInitialData(data)
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setInitialData(undefined)
  }

  return {
    isOpen,
    open,
    close,
    initialData: initialData(),
  }
}
