import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { TextInput } from "@opencode/ui/text-input"
import { TextField } from "@opencode/ui/text-field"
import { DialogBody, DialogHeader, DialogTitle, Dialog } from "@opencode/ui/dialog"
import { useDialog } from "@opencode/ui/context/dialog"
import { createEffect, createSignal, onMount, Show } from "solid-js"
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

export function CustomProviderForm(props: {
  onSave: (data: CustomProviderFormData) => void
  onCancel: () => void
  initialData?: Partial<CustomProviderFormData>
}) {
  const language = useLanguage()
  const dialog = useDialog()
  const [store, setStore] = createStore<CustomProviderFormData>({
    ...defaultFormData,
    ...props.initialData,
  })
  const [saving, setSaving] = createSignal(false)
  const [errors, setErrors] = createSignal<Record<string, string>>({})
  const [modelRows, setModelRows] = createSignal<Array<{ id: string; name: string; context?: number; output?: number }>>([])
  const [showAdvanced, setShowAdvanced] = createSignal(false)

  // Load draft from localStorage
  createEffect(() => {
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
    if (!store.id.trim()) newErrors.id = language.t("provider.custom.error.idRequired")
    if (!store.name.trim()) newErrors.name = language.t("provider.custom.error.nameRequired")
    if (!store.npm.trim()) newErrors.npm = language.t("provider.custom.error.npmRequired")
    if (!store.baseURL.trim()) newErrors.baseURL = language.t("provider.custom.error.baseURLRequired")
    if (modelRows().length === 0) newErrors.models = language.t("provider.custom.error.atLeastOneModel")
    
    for (let i = 0; i < modelRows().length; i++) {
      const model = modelRows()[i]
      if (!model.id.trim()) newErrors[`modelId_${i}`] = language.t("provider.custom.error.modelIdRequired", { index: i + 1 })
      if (!model.name.trim()) newErrors[`modelName_${i}`] = language.t("provider.custom.error.modelNameRequired", { index: i + 1 })
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    
    setSaving(true)
    try {
      const data: CustomProviderFormData = {
        ...store,
        models: Object.fromEntries(
          modelRows().map((m) => [m.id, { name: m.name, limit: { context: m.context, output: m.output } }])
        ),
      }
      
      // Clear draft
      localStorage.removeItem(CUSTOM_PROVIDER_PERSIST_KEY)
      
      props.onSave(data)
      showToast(language.t("provider.custom.toast.saved"))
    } catch (error) {
      showToast(formatServerError(error))
    } finally {
      setSaving(false)
    }
  }

  const addModelRow = () => {
    setModelRows([...modelRows(), { id: "", name: "", context: undefined, output: undefined }])
  }

  const removeModelRow = (index: number) => {
    setModelRows(modelRows().filter((_, i) => i !== index))
  }

  const updateModelRow = (index: number, field: string, value: string | number | undefined) => {
    setModelRows(modelRows().map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  onMount(() => {
    if (modelRows().length === 0) {
      addModelRow()
    }
  })

  return (
    <Dialog fit containerClass="!w-[min(calc(100vw_-_32px),520px)] !rounded-xl">
      <DialogHeader class="pb-0">
        <DialogTitle class="flex items-center gap-2">
          <Icon name="plus-circle" size="large" class="shrink-0" />
          <span>{language.t("provider.custom.title")}</span>
        </DialogTitle>
      </DialogHeader>
      <DialogBody class="flex flex-col gap-4 pt-2 pb-4">
        <div class="flex flex-col gap-4">
          {/* Provider ID */}
          <TextField>
            <TextField.Label>{language.t("provider.custom.field.id")}</TextField.Label>
            <TextInput
              value={store.id}
              onInput={(e) => setStore("id", e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="my-provider"
              aria-describedby={errors().id ? "id-error" : undefined}
            />
            <Show when={errors().id}>
              <TextField.Error id="id-error">{errors().id}</TextField.Error>
            </Show>
            <TextField.Hint>{language.t("provider.custom.field.idHint")}</TextField.Hint>
          </TextField>

          {/* Display Name */}
          <TextField>
            <TextField.Label>{language.t("provider.custom.field.name")}</TextField.Label>
            <TextInput
              value={store.name}
              onInput={(e) => setStore("name", e.currentTarget.value)}
              placeholder="My AI Provider"
              aria-describedby={errors().name ? "name-error" : undefined}
            />
            <Show when={errors().name}>
              <TextField.Error id="name-error">{errors().name}</TextField.Error>
            </Show>
          </TextField>

          {/* NPM Package */}
          <TextField>
            <TextField.Label>{language.t("provider.custom.field.npm")}</TextField.Label>
            <TextInput
              value={store.npm}
              onInput={(e) => setStore("npm", e.currentTarget.value)}
              placeholder="@ai-sdk/openai-compatible"
              aria-describedby={errors().npm ? "npm-error" : undefined}
            />
            <Show when={errors().npm}>
              <TextField.Error id="npm-error">{errors().npm}</TextField.Error>
            </Show>
            <TextField.Hint>{language.t("provider.custom.field.npmHint")}</TextField.Hint>
          </TextField>

          {/* Base URL */}
          <TextField>
            <TextField.Label>{language.t("provider.custom.field.baseURL")}</TextField.Label>
            <TextInput
              value={store.baseURL}
              onInput={(e) => setStore("baseURL", e.currentTarget.value)}
              placeholder="https://api.myprovider.com/v1"
              aria-describedby={errors().baseURL ? "baseURL-error" : undefined}
            />
            <Show when={errors().baseURL}>
              <TextField.Error id="baseURL-error">{errors().baseURL}</TextField.Error>
            </Show>
            <TextField.Hint>{language.t("provider.custom.field.baseURLHint")}</TextField.Hint>
          </TextField>

          {/* API Key (optional) */}
          <TextField>
            <TextField.Label>{language.t("provider.custom.field.apiKey")}</TextField.Label>
            <TextInput
              type="password"
              value={store.apiKey}
              onInput={(e) => setStore("apiKey", e.currentTarget.value)}
              placeholder={language.t("provider.custom.field.apiKeyPlaceholder")}
            />
            <TextField.Hint>{language.t("provider.custom.field.apiKeyHint")}</TextField.Hint>
          </TextField>

          {/* Advanced options toggle */}
          <Button
            variant="ghost-muted"
            size="small"
            onClick={() => setShowAdvanced(!showAdvanced())}
            class="w-fit"
          >
            <Icon name={showAdvanced() ? "chevron-up" : "chevron-down"} size="small" class="mr-1" />
            {showAdvanced() ? language.t("provider.custom.advanced.hide") : language.t("provider.custom.advanced.show")}
          </Button>

          <Show when={showAdvanced()}>
            {/* Custom Headers */}
            <TextField>
              <TextField.Label>{language.t("provider.custom.field.headers")}</TextField.Label>
              <TextInput
                value={JSON.stringify(store.headers, null, 2)}
                onInput={(e) => {
                  try {
                    setStore("headers", JSON.parse(e.currentTarget.value))
                  } catch {
                    // Ignore invalid JSON while typing
                  }
                }}
                placeholder='{"Authorization": "Bearer custom-token"}'
                rows={4}
                font="mono"
              />
              <TextField.Hint>{language.t("provider.custom.field.headersHint")}</TextField.Hint>
            </TextField>
          </Show>

          {/* Models */}
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <TextField.Label class="mb-0">{language.t("provider.custom.field.models")}</TextField.Label>
              <Button variant="outline" size="small" onClick={addModelRow}>
                <Icon name="plus" size="small" class="mr-1" />
                {language.t("provider.custom.field.addModel")}
              </Button>
            </div>
            <Show when={errors().models}>
              <div class="text-[12px] text-v2-state-fg-danger ml-1">{errors().models}</div>
            </Show>
            <For each={modelRows()}>
              {(model, index) => (
                <div class="flex flex-col gap-2 p-3 bg-v2-background-bg-muted rounded-md" key={index}>
                  <div class="flex items-center gap-2">
                    <TextInput
                      value={model.id}
                      onInput={(e) => updateModelRow(index, "id", e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      placeholder={language.t("provider.custom.field.modelIdPlaceholder")}
                      class="flex-1"
                      aria-describedby={errors()[`modelId_${index}`] ? `modelId-error-${index}` : undefined}
                    />
                    <Show when={errors()[`modelId_${index}`]}>
                      <div id={`modelId-error-${index}`} class="text-[12px] text-v2-state-fg-danger">{errors()[`modelId_${index}`]}</div>
                    </Show>
                    <IconButton
                      variant="ghost-muted"
                      size="small"
                      icon={<Icon name="trash" size="small" />}
                      onClick={() => removeModelRow(index)}
                      aria-label={language.t("provider.custom.field.removeModel")}
                    />
                  </div>
                  <TextInput
                    value={model.name}
                    onInput={(e) => updateModelRow(index, "name", e.currentTarget.value)}
                    placeholder={language.t("provider.custom.field.modelNamePlaceholder")}
                    aria-describedby={errors()[`modelName_${index}`] ? `modelName-error-${index}` : undefined}
                  />
                  <Show when={errors()[`modelName_${index}`]}>
                    <div id={`modelName-error-${index}`} class="text-[12px] text-v2-state-fg-danger">{errors()[`modelName_${index}`]}</div>
                  </Show>
                  <div class="flex gap-2">
                    <TextInput
                      type="number"
                      value={model.context?.toString() ?? ""}
                      onInput={(e) => updateModelRow(index, "context", e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined)}
                      placeholder={language.t("provider.custom.field.contextWindow")}
                      class="flex-1"
                    />
                    <TextInput
                      type="number"
                      value={model.output?.toString() ?? ""}
                      onInput={(e) => updateModelRow(index, "output", e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined)}
                      placeholder={language.t("provider.custom.field.outputTokens")}
                      class="flex-1"
                    />
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-v2-border-border-base">
          <Button variant="outline" onClick={() => { props.onCancel(); dialog.close() }}>
            {language.t("common.cancel")}
          </Button>
          <Button variant="contrast" onClick={handleSave} disabled={saving()}>
            {saving() ? language.t("common.saving") : language.t("common.save")}
          </Button>
        </div>
      </DialogBody>
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