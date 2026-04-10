import React from 'react';
import { Box, Text } from 'ink';
import { generateBlockLogo, blockLogoHeight } from '../art/blockLogo.js';

interface HeaderProps {
  watchMode?: boolean;
}

const LOGO_ROWS = generateBlockLogo('disky', 2);

export function Header({ watchMode }: HeaderProps) {
  return (
    <Box flexDirection="column">
      {LOGO_ROWS.map((row, i) => (
        <Text key={i} color="cyan" bold>{row}</Text>
      ))}
      <Box marginTop={1} flexDirection="row" gap={2}>
        <Text color="gray">gobbling up your space{'\u2026'}</Text>
        {watchMode && <Text color="yellow">{'\u25cf'} watching</Text>}
      </Box>
    </Box>
  );
}

/** Total rows consumed by the header (logo + tagline + margin) */
export const HEADER_ROWS = blockLogoHeight(2) + 2; // logo + gap + tagline
