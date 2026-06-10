import { describe, expect, it } from 'vitest';
import { shouldRouteGlobalAction } from '../src/tui/layouts/PanelLayout';

describe('PanelLayout key routing', () => {
  it('does not route global action keys while uninstall owns main input', () => {
    expect(shouldRouteGlobalAction('uninstall', 0)).toBe(false);
  });

  it('routes global action keys outside uninstall main input', () => {
    expect(shouldRouteGlobalAction('uninstall', 4)).toBe(true);
    expect(shouldRouteGlobalAction('status', 0)).toBe(true);
  });
});
