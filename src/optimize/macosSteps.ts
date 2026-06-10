import { IOptimizeStep, ShellOptimizeStep } from './IOptimizeStep.js';

const LSREGISTER =
  '/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/' +
  'LaunchServices.framework/Versions/A/Support/lsregister';

/**
 * The default macOS optimize steps. All are user-level (no sudo) and reversible
 * — caches/databases that rebuild themselves on demand.
 */
export function macosOptimizeSteps(): IOptimizeStep[] {
  return [
    new ShellOptimizeStep(
      'flush-dns',
      'Flush DNS cache',
      'Clears the DNS resolver cache.',
      'dscacheutil -flushcache',
    ),
    new ShellOptimizeStep(
      'rebuild-launch-services',
      'Rebuild Launch Services',
      'Fixes duplicate / stale "Open With" entries.',
      `"${LSREGISTER}" -kill -r -domain user`,
    ),
    new ShellOptimizeStep(
      'reset-quicklook',
      'Reset QuickLook thumbnails',
      'Rebuilds the QuickLook thumbnail cache.',
      'qlmanage -r cache',
    ),
    new ShellOptimizeStep(
      'clear-font-cache',
      'Clear user font cache',
      'Removes the per-user font registration cache.',
      'atsutil databases -removeUser',
    ),
  ];
}
