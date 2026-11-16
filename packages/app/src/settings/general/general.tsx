import { Component, Show, createMemo, createSignal } from "solid-js"
import { createMediaQuery } from "@solid-primitives/media"
import { Select } from "@opencode/ui/select"
import { Switch } from "@opencode/ui/switch"
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { TimelineDetailControl } from "@/settings/timeline-detail"
import { useLanguage } from "@/runtime/i18n/language"
import { usePlatform } from "@/runtime/platform/platform"
import { PluginSettingsSections } from "@/runtime/plugin/settings-page-view"
import {
  type BackgroundActivity,
  type FollowUpBehavior,
  type TimelineWidth,
  type WorkspaceDefaultDestination,
  useSettings,
} from "@/settings/model"
import { formatKeybind } from "@/shell/commands/command"
import { SettingsList } from "@/settings/list"
import { SettingsRow } from "@/settings/row"
import { createShellOptions } from "./behavior"
import { createOptimisticSetting, type ShellSettingsController } from "./controllers"
import { InterfaceModeSetting } from "./interface-mode"
import "@/settings/settings.css"

const AutoApprovePermissionsSetting: Component = () => {
  const language = useLanguage()
  const settings = useSettings()

  return (
    <SettingsRow
      title={language.t("command.permissions.autoaccept.enable")}
      description={language.t("settings.permissions.autoAccept.default.description")}
    >
      <div data-action="settings-auto-accept-permissions">
        <Switch
          checked={settings.permissions.autoApproveDefault()}
          onChange={(checked) => settings.permissions.setAutoApproveDefault(checked)}
        />
      </div>
    </SettingsRow>
  )
}

const WorkspaceDestinationSetting: Component = () => {
  const language = useLanguage()
  const settings = useSettings()

  const options = createMemo((): { value: WorkspaceDefaultDestination; label: string }[] => [
    { value: "last-used", label: language.t("settings.workspaces.default.lastUsed") },
    { value: "local", label: language.t("settings.workspaces.default.local") },
    { value: "new", label: language.t("settings.workspaces.default.new") },
  ])

  return (
    <SettingsRow
      title={language.t("settings.workspaces.default.title")}
      description={language.t("settings.workspaces.default.description")}
    >
      <Select
        data-action="settings-workspace-destination"
        options={options()}
        current={options().find((option) => option.value === settings.workspaces.defaultDestination())}
        value={(option) => option.value}
        label={(option) => option.label}
        placement="bottom-end"
        gutter={6}
        onSelect={(option) => option && settings.workspaces.setDefaultDestination(option.value)}
      />
    </SettingsRow>
  )
}

export const ShellSetting: Component<{
  controller: ShellSettingsController
  /** Search reveals the row with the default action; the Servers page names the other servers' rows apart. */
  action?: string
}> = (props) => {
  const language = useLanguage()

  const options = createMemo(() =>
    createShellOptions({
      shells: props.controller.shells(),
      current: props.controller.current(),
    }),
  )

  return (
    <SettingsRow
      title={language.t("settings.general.row.shell.title")}
      description={language.t("settings.general.row.shell.description")}
    >
      <Select
        data-action={props.action ?? "settings-shell"}
        options={options()}
        current={options().find((option) => option.value === props.controller.current()) ?? options()[0]}
        placement="bottom-end"
        gutter={6}
        value={(option) => option.id}
        label={(option) => {
          if (option.id === "auto") return language.t("settings.general.row.shell.autoDefault")

          if (!option.terminalOnly) return option.name

          return `${option.name} (${language.t("settings.general.row.shell.terminalOnly")})`
        }}
        onSelect={(option) => option && props.controller.select(option.value)}
      />
    </SettingsRow>
  )
}

const FollowUpBehaviorSetting: Component = () => {
  const language = useLanguage()
  const settings = useSettings()

  const options = createMemo((): { value: FollowUpBehavior; label: string }[] => [
    { value: "queue", label: language.t("settings.general.row.followUpBehavior.queue") },
    { value: "steer", label: language.t("settings.general.row.followUpBehavior.steer") },
  ])

  return (
    <SettingsRow
      title={language.t("settings.general.row.followUpBehavior.title")}
      description={language.t("settings.general.row.followUpBehavior.description", {
        keybind: formatKeybind("mod+enter", language.t),
      })}
    >
      <Select
        data-action="settings-follow-up-behavior"
        options={options()}
        current={options().find((option) => option.value === settings.general.followUpBehavior())}
        value={(option) => option.value}
        label={(option) => option.label}
        placement="bottom-end"
        gutter={6}
        onSelect={(option) => option && settings.general.setFollowUpBehavior(option.value)}
      />
    </SettingsRow>
  )
}

const BackgroundActivitySetting = () => {
  const language = useLanguage()
  const settings = useSettings()

  const options = createMemo((): { value: BackgroundActivity; label: string }[] => [
    { value: "off", label: language.t("settings.timeline.row.backgroundActivity.off") },
    { value: "left", label: language.t("settings.timeline.row.backgroundActivity.left") },
    { value: "center", label: language.t("settings.timeline.row.backgroundActivity.center") },
    { value: "right", label: language.t("settings.timeline.row.backgroundActivity.right") },
  ])

  return (
    <SettingsRow
      title={language.t("settings.timeline.row.backgroundActivity.title")}
      description={language.t("settings.timeline.row.backgroundActivity.description")}
    >
      <Select
        data-action="settings-background-activity"
        aria-label={language.t("settings.timeline.row.backgroundActivity.title")}
        options={options()}
        current={options().find((option) => option.value === settings.general.backgroundActivity())}
        value={(option) => option.value}
        label={(option) => option.label}
        placement="bottom-end"
        gutter={6}
        onSelect={(option) => option && settings.general.setBackgroundActivity(option.value)}
      />
    </SettingsRow>
  )
}

const TimelineWidthSetting = () => {
  const language = useLanguage()
  const settings = useSettings()

  const options = createMemo((): { value: TimelineWidth; label: string }[] => [
    { value: "focused", label: language.t("settings.timeline.row.width.focused") },
    { value: "comfortable", label: language.t("settings.timeline.row.width.comfortable") },
    { value: "wide", label: language.t("settings.timeline.row.width.wide") },
  ])

  return (
    <SettingsRow
      title={language.t("settings.timeline.row.width.title")}
      description={language.t("settings.timeline.row.width.description")}
    >
      <Select
        data-action="settings-timeline-width"
        aria-label={language.t("settings.timeline.row.width.title")}
        options={options()}
        current={options().find((option) => option.value === settings.general.timelineWidth())}
        value={(option) => option.value}
        label={(option) => option.label}
        placement="bottom-end"
        gutter={6}
        onSelect={(option) => option && settings.general.setTimelineWidth(option.value)}
      />
    </SettingsRow>
  )
}

const LanguageSetting = () => {
  const language = useLanguage()

  const options = createMemo(() =>
    language.locales.map((locale) => ({
      value: locale,
      label: language.label(locale),
    })),
  )

  return (
    <SettingsRow
      title={language.t("settings.general.row.language.title")}
      description={language.t("settings.general.row.language.description")}
    >
      <Select
        data-action="settings-language"
        options={options()}
        placement="bottom-end"
        gutter={6}
        current={options().find((option) => option.value === language.locale())}
        value={(option) => option.value}
        label={(option) => option.label}
        onSelect={(option) => option && language.setLocale(option.value)}
      />
    </SettingsRow>
  )
}

export const SettingsGeneral: Component = () => {
  const language = useLanguage()
  const platform = usePlatform()
  const settings = useSettings()
  const mobile = createMediaQuery("(max-width: 767px)")
  const desktop = createMemo(() => platform.platform === "desktop")

  const pinchZoom = createOptimisticSetting({
    source: () => (desktop() && "getPinchZoomEnabled" in platform) || undefined,
    initial: false,
    initialMeta: undefined,
    load: async () => ({ value: (await platform.getPinchZoomEnabled?.()) ?? false, meta: undefined }),
    write: (checked) => platform.setPinchZoomEnabled?.(checked),
  })

  const spellcheck = createOptimisticSetting({
    source: () => (desktop() && "getSpellcheckEnabled" in platform) || undefined,
    initial: true,
    initialMeta: undefined,
    load: async () => ({ value: (await platform.getSpellcheckEnabled?.()) ?? true, meta: undefined }),
    write: (checked) => platform.setSpellcheckEnabled?.(checked),
  })

  // Cindy Preferences state (persisted to localStorage)
  const [stayAwake, setStayAwake] = createSignal(localStorage.getItem("codenexus_stay_awake") === "true")
  const [startOnLogin, setStartOnLogin] = createSignal(localStorage.getItem("codenexus_start_on_login") === "true")
  const [closeAction, setCloseAction] = createSignal<string>(localStorage.getItem("codenexus_close_action") || "ask")
  const [preventAccidentalClicks, setPreventAccidentalClicks] = createSignal(localStorage.getItem("codenexus_prevent_accidental") !== "false")
  const [ctrlEnter, setCtrlEnter] = createSignal(localStorage.getItem("codenexus_ctrl_enter") === "true")
  const [showReplyRef, setShowReplyRef] = createSignal(localStorage.getItem("codenexus_show_reply_ref") !== "false")
  const [softWorkerLimit, setSoftWorkerLimit] = createSignal<number>(Number(localStorage.getItem("codenexus_soft_workers") || "5"))
  const [hardWorkerLimit, setHardWorkerLimit] = createSignal<number>(Number(localStorage.getItem("codenexus_hard_workers") || "8"))
  const [idleReleaseMins, setIdleReleaseMins] = createSignal<number>(Number(localStorage.getItem("codenexus_idle_release") || "0"))
  const [resourceProfile, setResourceProfile] = createSignal<string>(localStorage.getItem("codenexus_resource_profile") || "max")
  const [cmdLimit, setCmdLimit] = createSignal<number>(Number(localStorage.getItem("codenexus_cmd_limit") || "0"))
  const [procPriority, setProcPriority] = createSignal<string>(localStorage.getItem("codenexus_proc_priority") || "normal")
  const [limitToolParallelism, setLimitToolParallelism] = createSignal(localStorage.getItem("codenexus_limit_tool_parallelism") === "true")
  const [gitRecoveryPoints, setGitRecoveryPoints] = createSignal(localStorage.getItem("codenexus_git_recovery") !== "false")
  const [lspBeta, setLspBeta] = createSignal(localStorage.getItem("codenexus_lsp_beta") === "true")
  const [updateChannel, setUpdateChannel] = createSignal<string>(localStorage.getItem("codenexus_update_channel") || "stable")

  const setStayAwakePref = (v: boolean) => {
    setStayAwake(v)
    try { localStorage.setItem("codenexus_stay_awake", String(v)) } catch {}
  }
  const setStartOnLoginPref = (v: boolean) => {
    setStartOnLogin(v)
    try { localStorage.setItem("codenexus_start_on_login", String(v)) } catch {}
  }
  const setCloseActionPref = (v: string) => {
    setCloseAction(v)
    try { localStorage.setItem("codenexus_close_action", v) } catch {}
  }
  const setPreventAccidentalPref = (v: boolean) => {
    setPreventAccidentalClicks(v)
    try { localStorage.setItem("codenexus_prevent_accidental", String(v)) } catch {}
  }
  const setCtrlEnterPref = (v: boolean) => {
    setCtrlEnter(v)
    try { localStorage.setItem("codenexus_ctrl_enter", String(v)) } catch {}
  }
  const setShowReplyRefPref = (v: boolean) => {
    setShowReplyRef(v)
    try { localStorage.setItem("codenexus_show_reply_ref", String(v)) } catch {}
  }
  const setSoftLimitPref = (v: number) => {
    setSoftWorkerLimit(v)
    try { localStorage.setItem("codenexus_soft_workers", String(v)) } catch {}
  }
  const setHardLimitPref = (v: number) => {
    setHardWorkerLimit(v)
    try { localStorage.setItem("codenexus_hard_workers", String(v)) } catch {}
  }
  const setIdleReleasePref = (v: number) => {
    setIdleReleaseMins(v)
    try { localStorage.setItem("codenexus_idle_release", String(v)) } catch {}
  }
  const setResourceProfilePref = (v: string) => {
    setResourceProfile(v)
    try { localStorage.setItem("codenexus_resource_profile", v) } catch {}
  }
  const setCmdLimitPref = (v: number) => {
    setCmdLimit(v)
    try { localStorage.setItem("codenexus_cmd_limit", String(v)) } catch {}
  }
  const setProcPriorityPref = (v: string) => {
    setProcPriority(v)
    try { localStorage.setItem("codenexus_proc_priority", v) } catch {}
  }
  const setLimitToolParallelismPref = (v: boolean) => {
    setLimitToolParallelism(v)
    try { localStorage.setItem("codenexus_limit_tool_parallelism", String(v)) } catch {}
  }
  const setGitRecoveryPref = (v: boolean) => {
    setGitRecoveryPoints(v)
    try { localStorage.setItem("codenexus_git_recovery", String(v)) } catch {}
  }
  const setLspBetaPref = (v: boolean) => {
    setLspBeta(v)
    try { localStorage.setItem("codenexus_lsp_beta", String(v)) } catch {}
  }
  const setUpdateChannelPref = (v: string) => {
    setUpdateChannel(v)
    try { localStorage.setItem("codenexus_update_channel", v) } catch {}
  }

  const GeneralSection = () => (
    <div class="settings-section">
      {/* Account / Device status banner (Cindy Reference) */}
      <div class="rounded-xl border border-v2-border-border-base bg-v2-background-bg-layer-02/70 p-4 mb-4 flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs font-semibold text-v2-text-text-base">Login não realizado</span>
          <span class="text-[11px] text-v2-text-text-muted">
            Os dados ficam neste dispositivo sem os serviços da conta Cindy / Code Nexus.
          </span>
        </div>
        <span class="px-2.5 py-1 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-v2-text-text-muted">
          Modo Local
        </span>
      </div>

      <h3 class="settings-section-title">{language.t("settings.general.section.general")}</h3>
      <SettingsList>
        <InterfaceModeSetting />
        <LanguageSetting />

        <WorkspaceDestinationSetting />
        <AutoApprovePermissionsSetting />

        <SettingsRow
          title={language.t("settings.general.row.showCustomAgents.title")}
          description={language.t("settings.general.row.showCustomAgents.description")}
        >
          <div data-action="settings-show-custom-agents">
            <Switch
              checked={settings.general.showCustomAgents()}
              onChange={(checked) => settings.general.setShowCustomAgents(checked)}
            />
          </div>
        </SettingsRow>

        <FollowUpBehaviorSetting />

        <Show when={desktop()}>
          <SettingsRow
            title={language.t("settings.general.row.pinchZoom.title")}
            description={language.t("settings.general.row.pinchZoom.description")}
          >
            <div data-action="settings-pinch-zoom">
              <Switch checked={pinchZoom.value()} onChange={pinchZoom.select} />
            </div>
          </SettingsRow>
          <SettingsRow
            title={language.t("settings.general.row.spellcheck.title")}
            description={language.t("settings.general.row.spellcheck.description")}
          >
            <div data-action="settings-spellcheck">
              <Switch checked={spellcheck.value()} onChange={spellcheck.select} />
            </div>
          </SettingsRow>
        </Show>

        <PluginSettingsSections page="general" section="general" />

        <Show when={mobile()}>
          <SettingsRow
            title={language.t("settings.general.row.mobileTitlebarBottom.title")}
            description={language.t("settings.general.row.mobileTitlebarBottom.description")}
          >
            <div data-action="settings-mobile-titlebar-bottom">
              <Switch
                checked={settings.general.mobileTitlebarPosition() === "bottom"}
                onChange={(checked) => settings.general.setMobileTitlebarPosition(checked ? "bottom" : "top")}
              />
            </div>
          </SettingsRow>
        </Show>
      </SettingsList>
    </div>
  )

  return (
    <>
      <div class="settings-tab-header">
        <div class="settings-tab-header-row">
          <div class="flex flex-col gap-1">
            <h2 class="settings-tab-title">{language.t("settings.tab.preferences")}</h2>
            <span class="text-11-regular text-v2-text-text-muted">
              {language.t("settings.preferences.description")}
            </span>
          </div>
        </div>
      </div>
      <div class="settings-tab-body settings-tab-body--sectioned">
        <GeneralSection />

        {/* Comportamento do aplicativo (Cindy Reference) */}
        <section class="settings-section">
          <h3 class="settings-section-title">Comportamento do aplicativo</h3>
          <SettingsList>
            <SettingsRow
              title="Manter computador ativo"
              description="Quando ativado, esta máquina não entrará em suspensão, para que Agents em segundo plano e tarefas agendadas continuem em execução (você ainda pode desligar o monitor ou bloquear a tela)."
            >
              <Switch checked={stayAwake()} onChange={setStayAwakePref} />
            </SettingsRow>

            <SettingsRow
              title="Iniciar ao entrar"
              description="Abra o Code Nexus ao entrar no computador. Desativado por padrão."
            >
              <Switch checked={startOnLogin()} onChange={setStartOnLoginPref} />
            </SettingsRow>

            <SettingsRow
              title="Ao fechar a janela principal"
              description="Aplica-se sempre que você fecha a janela principal. Escolha entre minimizar para a bandeja do sistema ou sair do aplicativo."
            >
              <div class="inline-flex rounded-lg bg-v2-background-bg-layer-02 p-0.5 border border-v2-border-border-base text-xs">
                <button
                  type="button"
                  onClick={() => setCloseActionPref("ask")}
                  class={`px-2.5 py-1 rounded-md transition-colors ${closeAction() === "ask" ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold" : "text-v2-text-text-muted hover:text-v2-text-text-base"}`}
                >
                  Perguntar
                </button>
                <button
                  type="button"
                  onClick={() => setCloseActionPref("tray")}
                  class={`px-2.5 py-1 rounded-md transition-colors ${closeAction() === "tray" ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold" : "text-v2-text-text-muted hover:text-v2-text-text-base"}`}
                >
                  Bandeja
                </button>
                <button
                  type="button"
                  onClick={() => setCloseActionPref("quit")}
                  class={`px-2.5 py-1 rounded-md transition-colors ${closeAction() === "quit" ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold" : "text-v2-text-text-muted hover:text-v2-text-text-base"}`}
                >
                  Sair
                </button>
              </div>
            </SettingsRow>

            <SettingsRow
              title="Evitar cliques acidentais ao retornar"
              description="Quando ativado, um clique esquerdo em uma janela em segundo plano apenas a traz para frente. Quando desativado, ele também aciona o item clicado."
            >
              <Switch checked={preventAccidentalClicks()} onChange={setPreventAccidentalPref} />
            </SettingsRow>
          </SettingsList>
        </section>

        {/* Entrada de mensagens (Cindy Reference) */}
        <section class="settings-section">
          <h3 class="settings-section-title">Entrada de mensagens</h3>
          <SettingsList>
            <SettingsRow
              title="Usar Ctrl+Enter para enviar"
              description="Quando ativado, Ctrl+Enter envia mensagens. Quando desativado, Enter envia mensagens e Shift+Enter insere uma nova linha."
            >
              <Switch checked={ctrlEnter()} onChange={setCtrlEnterPref} />
            </SettingsRow>
          </SettingsList>
        </section>

        {/* Amigos (Cindy Reference) */}
        <section class="settings-section">
          <h3 class="settings-section-title">Amigos & Mensagens</h3>
          <SettingsList>
            <SettingsRow
              title="Mostrar a qual mensagem uma resposta se refere"
              description="Acima da resposta de um colaborador, mostre a qual das suas mensagens ele está respondendo. Respostas antigas não mostram isso."
            >
              <Switch checked={showReplyRef()} onChange={setShowReplyRefPref} />
            </SettingsRow>
          </SettingsList>
        </section>

        {/* Colaboração (Workers / Swarm - Cindy Reference) */}
        <section class="settings-section">
          <h3 class="settings-section-title">Colaboração</h3>
          <SettingsList>
            <SettingsRow
              title="Limite flexível de Workers"
              description="Aviso quando o número de Workers simultâneos atingir este limite."
            >
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="32"
                  value={softWorkerLimit()}
                  onInput={(e) => setSoftLimitPref(parseInt(e.currentTarget.value, 10) || 5)}
                  class="w-16 px-2.5 py-1 text-xs rounded-md bg-v2-background-bg-layer-02 border border-v2-border-border-base text-center font-mono"
                />
              </div>
            </SettingsRow>

            <SettingsRow
              title="Limite rígido de Workers"
              description="Número máximo de Workers permitidos em execução paralela. Deve ser maior ou igual ao limite flexível."
            >
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="64"
                  value={hardWorkerLimit()}
                  onInput={(e) => setHardLimitPref(parseInt(e.currentTarget.value, 10) || 8)}
                  class="w-16 px-2.5 py-1 text-xs rounded-md bg-v2-background-bg-layer-02 border border-v2-border-border-base text-center font-mono"
                />
              </div>
            </SettingsRow>

            <SettingsRow
              title="Liberação por inatividade (minutos)"
              description="Defina 0 para desativar a liberação automática em segundo plano; valores positivos liberam Workers após esse número de minutos de inatividade."
            >
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={idleReleaseMins()}
                  onInput={(e) => setIdleReleasePref(parseInt(e.currentTarget.value, 10) || 0)}
                  class="w-16 px-2.5 py-1 text-xs rounded-md bg-v2-background-bg-layer-02 border border-v2-border-border-base text-center font-mono"
                />
              </div>
            </SettingsRow>
          </SettingsList>
        </section>

        {/* Uso de recursos do Agent (Cindy Reference) */}
        <section class="settings-section">
          <h3 class="settings-section-title">Uso de recursos do Agent</h3>
          <SettingsList>
            <SettingsRow
              title="Perfil de uso de recursos"
              description="Limite os recursos do sistema que o trabalho de linha de comando dos Agents pode usar, para que testes ou compilações em paralelo não deixem seu computador lento."
            >
              <div class="inline-flex rounded-lg bg-v2-background-bg-layer-02 p-0.5 border border-v2-border-border-base text-xs">
                <button
                  type="button"
                  onClick={() => setResourceProfilePref("max")}
                  class={`px-2.5 py-1 rounded-md transition-colors ${resourceProfile() === "max" ? "bg-teal-600 text-white font-semibold" : "text-v2-text-text-muted hover:text-v2-text-text-base"}`}
                >
                  Velocidade máxima
                </button>
                <button
                  type="button"
                  onClick={() => setResourceProfilePref("balanced")}
                  class={`px-2.5 py-1 rounded-md transition-colors ${resourceProfile() === "balanced" ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold" : "text-v2-text-text-muted hover:text-v2-text-text-base"}`}
                >
                  Equilibrado
                </button>
                <button
                  type="button"
                  onClick={() => setResourceProfilePref("bg")}
                  class={`px-2.5 py-1 rounded-md transition-colors ${resourceProfile() === "bg" ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold" : "text-v2-text-text-muted hover:text-v2-text-text-base"}`}
                >
                  Segundo plano
                </button>
              </div>
            </SettingsRow>

            <SettingsRow
              title="Limite de comandos simultâneos"
              description="0 = ilimitado. Define quantos processos de terminal os agentes podem executar ao mesmo tempo."
            >
              <input
                type="number"
                min="0"
                max="32"
                value={cmdLimit()}
                onInput={(e) => setCmdLimitPref(parseInt(e.currentTarget.value, 10) || 0)}
                class="w-16 px-2.5 py-1 text-xs rounded-md bg-v2-background-bg-layer-02 border border-v2-border-border-base text-center font-mono"
              />
            </SettingsRow>

            <SettingsRow
              title="Prioridade de processos"
              description="Prioridade de agendamento de CPU atribuída aos subprocessos e compilações iniciados pelos agentes."
            >
              <div class="inline-flex rounded-lg bg-v2-background-bg-layer-02 p-0.5 border border-v2-border-border-base text-xs">
                <button
                  type="button"
                  onClick={() => setProcPriorityPref("normal")}
                  class={`px-2 py-1 rounded-md transition-colors ${procPriority() === "normal" ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold" : "text-v2-text-text-muted hover:text-v2-text-text-base"}`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setProcPriorityPref("low")}
                  class={`px-2 py-1 rounded-md transition-colors ${procPriority() === "low" ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold" : "text-v2-text-text-muted hover:text-v2-text-text-base"}`}
                >
                  Baixo
                </button>
                <button
                  type="button"
                  onClick={() => setProcPriorityPref("min")}
                  class={`px-2 py-1 rounded-md transition-colors ${procPriority() === "min" ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold" : "text-v2-text-text-muted hover:text-v2-text-text-base"}`}
                >
                  Mínima
                </button>
              </div>
            </SettingsRow>

            <SettingsRow
              title="Limitar paralelismo das ferramentas"
              description="Injeta automaticamente variáveis de ambiente como VITEST_MAX_FORKS e MAKEFLAGS para evitar sobrecarga de CPU."
            >
              <Switch checked={limitToolParallelism()} onChange={setLimitToolParallelismPref} />
            </SettingsRow>
          </SettingsList>
        </section>

        {/* Segurança do Git & Extensões (Cindy Reference) */}
        <section class="settings-section">
          <h3 class="settings-section-title">Segurança & Extensões</h3>
          <SettingsList>
            <SettingsRow
              title="Pontos de recuperação de arquivos"
              description="Cria checkpoints automáticos no Git e snapshot local antes de edições massivas para que qualquer alteração possa ser desfeita com segurança."
            >
              <Switch checked={gitRecoveryPoints()} onChange={setGitRecoveryPref} />
            </SettingsRow>

            <SettingsRow
              title="Inteligência de código (LSP) · Beta"
              description="Conecta servidores de linguagem em segundo plano para auto-completar inteligente, diagnósticos de tipos e navegação de símbolos."
            >
              <Switch checked={lspBeta()} onChange={setLspBetaPref} />
            </SettingsRow>

            <SettingsRow
              title="Canal de atualizações"
              description="Escolha entre a versão estável testada ou o canal beta para receber novos recursos de agentes antecipadamente."
            >
              <div class="inline-flex rounded-lg bg-v2-background-bg-layer-02 p-0.5 border border-v2-border-border-base text-xs">
                <button
                  type="button"
                  onClick={() => setUpdateChannelPref("stable")}
                  class={`px-2.5 py-1 rounded-md transition-colors ${updateChannel() === "stable" ? "bg-v2-background-bg-inverse text-v2-text-text-inverse font-semibold" : "text-v2-text-text-muted hover:text-v2-text-text-base"}`}
                >
                  Estável
                </button>
                <button
                  type="button"
                  onClick={() => setUpdateChannelPref("beta")}
                  class={`px-2.5 py-1 rounded-md transition-colors ${updateChannel() === "beta" ? "bg-teal-600 text-white font-semibold" : "text-v2-text-text-muted hover:text-v2-text-text-base"}`}
                >
                  Beta
                </button>
              </div>
            </SettingsRow>
          </SettingsList>
        </section>

        <section class="settings-section" aria-label={language.t("settings.timeline.title")}>
          <h3 class="settings-section-title">{language.t("settings.timeline.title")}</h3>
          <SettingsList>
            <div class="border-b-[0.5px] border-v2-border-border-base py-5">
              <TimelineDetailControl
                value={settings.general.timelineDetail()}
                onChange={settings.general.setTimelineDetail}
              />
            </div>
            <TimelineWidthSetting />
            <BackgroundActivitySetting />
            <SettingsRow
              title={language.t("settings.timeline.row.turnDiffs.title")}
              description={language.t("settings.timeline.row.turnDiffs.description")}
            >
              <div data-action="settings-show-turn-diffs">
                <Switch
                  checked={settings.general.showTurnDiffs()}
                  onChange={(checked) => settings.general.setShowTurnDiffs(checked)}
                />
              </div>
            </SettingsRow>
          </SettingsList>
        </section>

        <PluginSettingsSections page="general" />
      </div>
    </>
  )
}
