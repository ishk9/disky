import React from 'react';
import { Box } from 'ink';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface AppFrameProps {
  children: React.ReactNode;
}

/**
 * Wraps the entire TUI in a rounded border sized to the current terminal,
 * giving it the look of a windowed GUI application.
 *
 * The frame consumes 2 columns and 2 rows of chrome (border + 1ch pad on
 * each side). Children should compute their own viewport sizes from
 * useTerminalSize() and subtract this chrome where it matters.
 */
export function AppFrame({ children }: AppFrameProps) {
  const { columns, rows } = useTerminalSize();

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      width={columns}
      height={rows}
      flexDirection="column"
      paddingX={1}
    >
      {children}
    </Box>
  );
}
