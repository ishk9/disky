import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Colors } from '../renderers/Colors.js';
import type { EntryCategory } from '../types/index.js';

interface DiskyConfig {
  exclude: string[];
  whitelist: Partial<Record<WhitelistCategory, string[]>>;
}

export type WhitelistCategory = EntryCategory | 'all' | 'optimize';

/**
 * Reads and manages ~/.disky/config.json for persistent user configuration.
 */
export class Config {
  private static readonly CONFIG_DIR = path.join(os.homedir(), '.disky');
  private static readonly CONFIG_FILE = path.join(Config.CONFIG_DIR, 'config.json');

  constructor(
    private readonly file: string = Config.CONFIG_FILE,
    private readonly home: string = os.homedir(),
  ) {}

  /**
   * Returns normalised absolute exclusion paths from the config file.
   * Returns an empty array if the config file is missing or malformed.
   */
  getExclusions(): string[] {
    const config = this.load();
    return config.exclude.map((p) => this.normalisePath(p));
  }

  /** Returns global + category-specific protected patterns. */
  getWhitelist(category?: WhitelistCategory): string[] {
    const config = this.load();
    const all = config.whitelist.all ?? [];
    const scoped = category ? (config.whitelist[category] ?? []) : [];
    return [...new Set([...all, ...scoped].map((p) => this.normalisePattern(p)))];
  }

  getWhitelistMap(category?: WhitelistCategory): Partial<Record<WhitelistCategory, string[]>> {
    const config = this.load();
    if (category) {
      return {
        [category]: (config.whitelist[category] ?? []).map((p) => this.normalisePattern(p)),
      };
    }

    const out: Partial<Record<WhitelistCategory, string[]>> = {};
    for (const [key, patterns] of Object.entries(config.whitelist)) {
      out[key as WhitelistCategory] = patterns.map((p) => this.normalisePattern(p));
    }
    return out;
  }

  addWhitelist(category: WhitelistCategory, pattern: string): void {
    const config = this.load();
    const list = config.whitelist[category] ?? [];
    if (!list.includes(pattern)) {
      config.whitelist[category] = [...list, pattern];
      this.save(config);
    }
  }

  removeWhitelist(category: WhitelistCategory, pattern: string): void {
    const config = this.load();
    const normalized = this.normalisePattern(pattern);
    const list = config.whitelist[category] ?? [];
    const next = list.filter((p) => this.normalisePattern(p) !== normalized);
    config.whitelist[category] = next;
    this.save(config);
  }

  private load(): DiskyConfig {
    try {
      if (!fs.existsSync(this.file)) return emptyConfig();
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      const exclude = Array.isArray(parsed?.exclude)
        ? parsed.exclude.filter((p: unknown) => typeof p === 'string')
        : [];
      const whitelist: DiskyConfig['whitelist'] = {};
      if (parsed?.whitelist && typeof parsed.whitelist === 'object') {
        for (const [category, patterns] of Object.entries(parsed.whitelist)) {
          if (!Array.isArray(patterns)) continue;
          whitelist[category as WhitelistCategory] = patterns.filter(
            (p: unknown) => typeof p === 'string',
          );
        }
      }
      return { exclude, whitelist };
    } catch (err) {
      console.error(
        `  ${Colors.warn('Warning:')} Failed to parse config at ${this.file}: ${err instanceof Error ? err.message : err}`,
      );
      return emptyConfig();
    }
  }

  private save(config: DiskyConfig): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(config, null, 2) + '\n', 'utf8');
  }

  private normalisePath(p: string): string {
    if (p.startsWith('~/')) {
      return path.join(this.home, p.slice(2));
    }
    return path.resolve(p.replace(/\/+$/, ''));
  }

  private normalisePattern(p: string): string {
    if (p.startsWith('~/') || p.startsWith('/') || p.startsWith('./') || p.startsWith('../')) {
      return this.normalisePath(p);
    }
    return p;
  }
}

function emptyConfig(): DiskyConfig {
  return { exclude: [], whitelist: {} };
}
