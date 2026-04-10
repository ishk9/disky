/**
 * TUI color palette — maps to the same semantic colors as renderers/Colors.ts
 * but expressed as raw color names for Ink's <Text> component.
 */
export const theme = {
  brand: 'cyan',
  tagline: 'gray',

  // Table columns
  id: 'gray',
  size: 'yellow',
  path: 'white',
  project: 'magenta',
  age: 'green',
  ageWarn: 'yellow',
  ageStale: 'red',
  header: 'cyan',

  // Status
  success: 'green',
  error: 'red',
  warn: 'yellow',
  dim: 'gray',

  // Artifact type colors
  artifact: {
    green: 'green',
    cyan: 'cyan',
    blue: 'blue',
    yellow: 'yellow',
    gray: 'gray',
    red: 'red',
    magenta: 'magenta',
  },

  // UI chrome
  cursor: 'cyan',
  selected: 'green',
  border: 'gray',
} as const;
