import React from 'react';
import { Box, Text } from 'ink';
import { ArtCanvas } from '../../art/ArtCanvas.js';

interface DiskPanelProps {
  isActive: boolean;
  height: number;
  width: number;
}

export function DiskPanel({ isActive, height, width }: DiskPanelProps) {
  const color = isActive ? 'cyan' : 'gray';
  const artHeight = Math.max(3, height - 3); // minus border + label
  const artWidth = Math.max(10, width - 2);  // minus border

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={color} height={height} overflow="hidden">
      <Text color={color}>─ [3] Disk</Text>
      <ArtCanvas mode="disk" width={artWidth} height={artHeight} fps={4} color="cyan" dim={false} />
    </Box>
  );
}
