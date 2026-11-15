import { app } from "electron"
import { homedir } from "node:os"
import path from "node:path"

/** App ID used for custom userData paths in tests. */
export const APP_ID = "ai.code-nexus.desktop.free"

/**
 * Safely resolves `app.getPath(name)` with platform-appropriate fallbacks.
 * Electron's `app.getPath` can return empty string on Linux if XDG directories
 * aren't set, or before `app.whenReady()` in some edge cases.
 */
export function getAppPath(name: Parameters<typeof app.getPath>[0]): string {
  let result: string | undefined
  try {
    if (name) {
      result = app.getPath(name) as string | undefined
    }
  } catch {}

  if (result && typeof result === "string" && result.length > 0) {
    return result
  }

  // Platform-specific fallbacks for when Electron returns empty
  switch (name) {
    case "userData": {
      // Linux: XDG_CONFIG_HOME or ~/.config
      // Windows: %APPDATA% (already default in Electron but may be empty in tests)
      // macOS: ~/Library/Application Support (already default)
      if (process.platform === "linux") {
        return process.env.XDG_CONFIG_HOME ?? path.join(homedir(), ".config", APP_ID)
      }
      if (process.platform === "win32") {
        return process.env.APPDATA ?? path.join(homedir(), "AppData", "Roaming", APP_ID)
      }
      return path.join(homedir(), "Library", "Application Support", APP_ID)
    }
    case "documents": {
      // XDG_DOCUMENTS_DIR or ~/Documents
      if (process.platform === "linux") {
        return process.env.XDG_DOCUMENTS_DIR ?? path.join(homedir(), "Documents")
      }
      return path.join(homedir(), "Documents")
    }
    case "home": {
      return homedir()
    }
    case "downloads": {
      if (process.platform === "linux") {
        return process.env.XDG_DOWNLOAD_DIR ?? path.join(homedir(), "Downloads")
      }
      return path.join(homedir(), "Downloads")
    }
    case "appData": {
      if (process.platform === "win32") {
        return process.env.APPDATA ?? path.join(homedir(), "AppData", "Roaming")
      }
      if (process.platform === "linux") {
        return process.env.XDG_CONFIG_HOME ?? path.join(homedir(), ".config")
      }
      return path.join(homedir(), "Library", "Application Support")
    }
    case "sessionData": {
      if (process.platform === "win32") {
        return process.env.LOCALAPPDATA ?? path.join(homedir(), "AppData", "Local")
      }
      if (process.platform === "linux") {
        return process.env.XDG_RUNTIME_DIR ?? path.join(homedir(), ".cache")
      }
      return path.join(homedir(), "Library", "Caches")
    }
    case "crashDumps": {
      // Fall back to userData/crashes
      return path.join(getAppPath("userData"), "crashes")
    }
    default: {
      // For any other path type, fall back to userData
      return name ? path.join(getAppPath("userData"), name) : getAppPath("userData")
    }
  }
}

/**
 * Safely joins paths, throwing if any segment is falsy.
 * Use when you need a guaranteed valid path or want to fail fast.
 */
export function joinPaths(...segments: (string | undefined | null)[]): string {
  const valid = segments.filter((s): s is string => Boolean(s && s.length > 0))

  if (valid.length !== segments.length) {
    const bad = segments
      .map((s, i) => (!s || s.length === 0 ? `segment[${i}]: ${String(s)}` : null))
      .filter(Boolean)
    throw new Error(`path.join received empty segment(s): ${bad.join(", ")}`)
  }

  return path.join(...valid)
}

/**
 * Safely joins paths, returning undefined if any segment is falsy.
 * Use when the caller can handle a missing path gracefully.
 */
export function tryJoinPaths(...segments: (string | undefined | null)[]): string | undefined {
  if (segments.some((s) => !s || s.length === 0)) {
    return undefined
  }
  return path.join(...(segments as string[]))
}