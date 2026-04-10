import chalk from 'chalk';
import { ArtifactColorKey } from '../types/index.js';

/**
 * Centralised color palette — single place to change the entire visual theme.
 */
export const Colors = {
  // Table columns
  id:       chalk.dim,
  size:     chalk.yellow,
  path:     chalk.white,
  project:  chalk.magenta,
  age:      chalk.green,
  ageWarn:  chalk.yellow,
  ageStale: chalk.red.bold,
  header:   chalk.cyan.bold,
  dim:      chalk.dim,

  // Branding
  brand:   chalk.cyan.bold,
  tagline: chalk.dim,
  watching: chalk.dim,

  // Status / feedback
  success: chalk.green.bold,
  error:   chalk.red.bold,
  warn:    chalk.yellow.dim,
  prompt:  chalk.yellow,

  // Detail view
  directory:     chalk.magenta,
  sectionLabel:  chalk.dim,
  treeGlyph:     chalk.gray,
  removeCommand: chalk.cyan,
  removePath:    chalk.red,
  removeId:      chalk.yellow,

  // Watch mode flash
  newEntry:     chalk.green.bold,
  removedEntry: chalk.red.bold,

  /** Returns the chalk instance for a given ArtifactColorKey. */
  artifact(color: ArtifactColorKey): chalk.Chalk {
    const map: Record<ArtifactColorKey, chalk.Chalk> = {
      green:   chalk.green,
      cyan:    chalk.cyan,
      blue:    chalk.blue,
      yellow:  chalk.yellow,
      gray:    chalk.gray,
      red:     chalk.red,
      magenta: chalk.magenta,
    };
    return map[color] ?? chalk.white;
  },
} as const;
