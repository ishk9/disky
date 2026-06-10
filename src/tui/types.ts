import { DiskEntry } from '../types/index.js';

export type ViewName =
  | 'dashboard'
  | 'scan'
  | 'detail'
  | 'clean'
  | 'watch'
  | 'status'
  | 'analyze'
  | 'sweep'
  | 'history'
  | 'uninstall';

export interface NavigationState {
  view: ViewName;
  /** Entry selected for detail/clean-specific views */
  selectedEntry?: DiskEntry;
  /** Full scan results passed between views */
  scanResults?: DiskEntry[];
}

export type SortMode = 'size' | 'age' | 'type';
