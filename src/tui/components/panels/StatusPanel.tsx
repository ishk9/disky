import React from 'react';
import { Box, Text } from 'ink';
import { DiskEntry } from '../../../types/index.js';
import { formatBytes } from '../../../core/DiskScanner.js';
import { generateBlockLogo } from '../../art/blockLogo.js';

interface StatusPanelProps {
  isActive: boolean;
  height: number;
  data: DiskEntry[] | null;
  loading: boolean;
  spaceLabel?: string;
  totalBytes?: number;
}

const LOGO_ROWS = generateBlockLogo('disky', 1, true); // 7 rows, compact single-char blocks (~28 cols wide)

export function StatusPanel({
  isActive,
  height,
  data,
  loading,
  spaceLabel = 'recoverable',
  totalBytes,
}: StatusPanelProps) {
  const color = isActive ? 'cyan' : 'gray';
  const displayedBytes = totalBytes ?? (data ? data.reduce((s, e) => s + e.sizeBytes, 0) : 0);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={color}
      height={height}
      overflow="hidden"
    >
      <Text color={color}>─ [1] Status</Text>
      {LOGO_ROWS.map((row, i) => (
        <Text key={i} color="cyan" bold>
          {row}
        </Text>
      ))}
      <Text> </Text>
      {loading && <Text color="cyan"> Scanning{'\u2026'}</Text>}
      {!loading && data && (
        <>
          <Text color="gray">
            {' '}
            <Text color="white">{data.length}</Text> entries found
          </Text>
          <Text color="gray">
            {' '}
            <Text color="yellow">{formatBytes(displayedBytes)}</Text> {spaceLabel}
          </Text>
        </>
      )}
      {!loading && !data && (
        <Text color="gray">
          {' '}
          Press <Text color="cyan">s</Text> to scan
        </Text>
      )}
    </Box>
  );
}
