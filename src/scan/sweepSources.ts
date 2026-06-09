import * as os from 'os';
import * as path from 'path';
import type { IDirSizer } from '../platform/IDirSizer.js';
import { IScanProvider } from './IScanProvider.js';
import { DirectoryScanProvider } from './DirectoryScanProvider.js';

const MB = 1024 * 1024;

/**
 * The providers backing `disky sweep`: user caches, logs, and trash. Caches
 * under ~/Library/Caches cover app and browser caches that live there. Each set
 * is data, so extending coverage is a config change, not new code.
 */
export function sweepProviders(dirSizer: IDirSizer): IScanProvider[] {
  const home = os.homedir();
  return [
    new DirectoryScanProvider(
      'system-cache',
      [
        {
          roots: [path.join(home, 'Library', 'Caches')],
          mode: 'children',
          color: 'gray',
          policy: 'auto',
          policyReason: 'Application cache — regenerated on next launch.',
          minBytes: 1 * MB,
        },
      ],
      dirSizer,
    ),
    new DirectoryScanProvider(
      'log',
      [
        {
          roots: [
            path.join(home, 'Library', 'Logs'),
            path.join(home, 'Library', 'Application Support', 'CrashReporter'),
          ],
          mode: 'self',
          color: 'gray',
          policy: 'auto',
          policyReason: 'Log/diagnostic data — safe to clear.',
          minBytes: 0,
        },
      ],
      dirSizer,
    ),
    new DirectoryScanProvider(
      'trash',
      [
        {
          roots: [path.join(home, '.Trash')],
          mode: 'self',
          color: 'gray',
          policy: 'auto',
          policyReason: 'Trash contents.',
          label: 'Trash',
          minBytes: 0,
        },
      ],
      dirSizer,
    ),
  ];
}
