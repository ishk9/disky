export interface InstalledApp {
  /** Display name without ".app", e.g. "Google Chrome". */
  name: string;
  /** CFBundleIdentifier, e.g. "com.google.Chrome" (null if unreadable). */
  bundleId: string | null;
  /** Absolute path to the .app bundle. */
  appPath: string;
}

export interface AppRemnant {
  path: string;
  /** What this remnant is, e.g. "Application Support", "Preferences". */
  kind: string;
}

/**
 * Enumerates installed apps and locates their on-disk remnants (caches,
 * preferences, containers, launch agents, …) for a clean uninstall.
 */
export interface IAppRegistry {
  /** Installed apps in the standard application directories. */
  list(): InstalledApp[];
  /** Resolve an app by display name or bundle id (case-insensitive). */
  find(query: string): InstalledApp | null;
  /** Existing remnant files/dirs associated with an app. */
  remnants(app: InstalledApp): AppRemnant[];
}
