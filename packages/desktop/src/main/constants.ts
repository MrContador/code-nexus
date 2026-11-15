import { app } from "electron"

type Channel = "local" | "dev" | "beta" | "prod"

const raw = import.meta.env.OPENCODE_CHANNEL

// Code Nexus: default to "local" so the User-Agent sent to opencode.ai matches
// the standalone CLI build (opencode/local/<ver>/opencode-cli). Opencode.ai
// appears to apply looser free-tier limits to "local" (dev-tree) builds than
// to the "dev" nightly channel, which is why the TUI from the same source
// tree worked while the desktop was being rate-limited.
export const CHANNEL: Channel = raw === "local" || raw === "dev" || raw === "beta" || raw === "prod" ? raw : "local"

export const VERSION = (() => {
  try {
    return app.isPackaged ? app.getVersion() : (process.env.OPENCODE_VERSION ?? app.getVersion())
  } catch {
    return "1.0.0"
  }
})()

// Drives app.setName(), which feeds the Windows taskbar/Alt-Tab tooltip,
// the macOS Dock/menu bar label, and the userData folder name. Must match
// electron-builder productName so an upgraded install finds its own state.
const appNames: Record<string, string> = {
  local: "Code Nexus",
  dev: "Code Nexus",
  beta: "Code Nexus",
  prod: "Code Nexus",
}

const appIDs: Record<string, string> = {
  local: "ai.code-nexus.desktop.free",
  dev: "ai.code-nexus.desktop.free",
  beta: "ai.code-nexus.desktop.free",
  prod: "ai.code-nexus.desktop.free",
}

// Local renderer/server mode keeps the dev application identity. Fallback
// covers any unexpected CHANNEL value so app.setName never receives undefined.
export const APP_NAME = app.isPackaged ? (appNames[CHANNEL] ?? "Code Nexus") : "Code Nexus"

export const APP_ID = app.isPackaged ? (appIDs[CHANNEL] ?? "ai.code-nexus.desktop.free") : "ai.code-nexus.desktop.free"
