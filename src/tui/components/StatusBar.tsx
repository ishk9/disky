import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  left?: string;
  right?: string;
  hints?: string[];
}

export function StatusBar({ left, right, hints }: StatusBarProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      {(left || right) && (
        <Box justifyContent="space-between">
          <Text color="gray">{left ?? ''}</Text>
          <Text color="gray">{right ?? ''}</Text>
        </Box>
      )}
      {hints && hints.length > 0 && (
        <Box>
          <Text color="gray">{hints.join('  ')}</Text>
        </Box>
      )}
    </Box>
  );
}
