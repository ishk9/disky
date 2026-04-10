import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Colors } from '../renderers/Colors.js';

interface DiskyConfig {
  exclude: string[];
}

/**
 * Reads and manages ~/.disky/config.json for persistent user configuration.
 */
export class Config {
  private static readonly CONFIG_DIR = path.join(os.homedir(), '.disky');
  private static readonly CONFIG_FILE = path.join(Config.CONFIG_DIR, 'config.json');

  /**
   * Returns normalised absolute exclusion paths from the config file.
   * Returns an empty array if the config file is missing or malformed.
   */
  getExclusions(): string[] {
    const config = this.load();
    return config.exclude.map((p) => this.normalisePath(p));
  }

  private load(): DiskyConfig {
    try {
      if (!fs.existsSync(Config.CONFIG_FILE)) return { exclude: [] };
      const raw = fs.readFileSync(Config.CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.exclude)) {
        return { exclude: parsed.exclude.filter((p: unknown) => typeof p === 'string') };
      }
      return { exclude: [] };
    } catch (err) {
      console.error(`  ${Colors.warn('Warning:')} Failed to parse config at ${Config.CONFIG_FILE}: ${err instanceof Error ? err.message : err}`);
      return { exclude: [] };
    }
  }

  private normalisePath(p: string): string {
    if (p.startsWith('~/')) {
      return path.join(os.homedir(), p.slice(2));
    }
    return path.resolve(p.replace(/\/+$/, ''));
  }
}
