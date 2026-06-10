import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import { IAppRegistry, InstalledApp, AppRemnant } from '../IAppRegistry.js';

const APP_DIRS = ['/Applications', '/Applications/Utilities'];

/** Enumerates /Applications and locates an app's on-disk remnants. */
export class MacAppRegistry implements IAppRegistry {
  constructor(private readonly home: string = os.homedir()) {}

  list(): InstalledApp[] {
    const apps: InstalledApp[] = [];
    const userApps = path.join(this.home, 'Applications');
    for (const dir of [...APP_DIRS, userApps]) {
      let names: string[];
      try {
        names = fs.readdirSync(dir);
      } catch {
        continue;
      }
      for (const name of names) {
        if (!name.endsWith('.app')) continue;
        const appPath = path.join(dir, name);
        apps.push({
          name: name.replace(/\.app$/, ''),
          bundleId: readBundleId(appPath),
          appPath,
        });
      }
    }
    return apps;
  }

  find(query: string): InstalledApp | null {
    const q = query.toLowerCase().replace(/\.app$/, '');
    const apps = this.list();
    return (
      apps.find((a) => a.name.toLowerCase() === q || a.bundleId?.toLowerCase() === q) ??
      apps.find((a) => a.name.toLowerCase().includes(q)) ??
      null
    );
  }

  remnants(app: InstalledApp): AppRemnant[] {
    return appRemnantCandidates(app, this.home).filter((r) => existsSafe(r.path));
  }
}

/**
 * Pure generator of candidate remnant paths for an app. Existence is checked
 * separately, so this is unit-testable without a filesystem.
 */
export function appRemnantCandidates(app: InstalledApp, home: string): AppRemnant[] {
  const lib = path.join(home, 'Library');
  const ids = [app.bundleId, app.name].filter((x): x is string => !!x);
  const candidates: AppRemnant[] = [];

  const add = (p: string, kind: string) => candidates.push({ path: p, kind });

  for (const id of ids) {
    add(path.join(lib, 'Application Support', id), 'Application Support');
    add(path.join(lib, 'Caches', id), 'Caches');
    add(path.join(lib, 'Logs', id), 'Logs');
    add(path.join(lib, 'Containers', id), 'Container');
    add(path.join(lib, 'HTTPStorages', id), 'HTTP storage');
    add(path.join(lib, 'WebKit', id), 'WebKit storage');
  }
  if (app.bundleId) {
    const id = app.bundleId;
    add(path.join(lib, 'Preferences', `${id}.plist`), 'Preferences');
    add(path.join(lib, 'Saved Application State', `${id}.savedState`), 'Saved state');
    add(path.join(lib, 'Cookies', `${id}.binarycookies`), 'Cookies');
    add(path.join(lib, 'LaunchAgents', `${id}.plist`), 'Launch agent');
  }

  // De-dupe by path while preserving order.
  const seen = new Set<string>();
  return candidates.filter((c) => (seen.has(c.path) ? false : (seen.add(c.path), true)));
}

function readBundleId(appPath: string): string | null {
  try {
    return (
      execFileSync(
        'defaults',
        ['read', path.join(appPath, 'Contents', 'Info'), 'CFBundleIdentifier'],
        {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      ).trim() || null
    );
  } catch {
    return null;
  }
}

function existsSafe(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}
