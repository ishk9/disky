import React from 'react';
import { Box, Text } from 'ink';
import { DiskEntry } from '../../../types/index.js';
import { formatBytes } from '../../../core/DiskScanner.js';

interface BreakdownPanelProps {
  isActive: boolean;
  height: number;
  data: DiskEntry[] | null;
}

interface TypeGroup {
  label: string;
  color: string;
  sizeBytes: number;
  count: number;
}

const BAR_WIDTH = 8;

function buildGroups(data: DiskEntry[]): TypeGroup[] {
  const map = new Map<string, TypeGroup>();
  for (const e of data) {
    const key = e.artifactType.label;
    const existing = map.get(key);
    if (existing) {
      existing.sizeBytes += e.sizeBytes;
      existing.count += 1;
    } else {
      map.set(key, { label: key, color: e.artifactType.color, sizeBytes: e.sizeBytes, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.sizeBytes - a.sizeBytes);
}

export function BreakdownPanel({ isActive, height, data }: BreakdownPanelProps) {
  const color = isActive ? 'cyan' : 'gray';
  const groups = data ? buildGroups(data) : [];
  const maxBytes = groups[0]?.sizeBytes ?? 1;

  // How many type rows fit (panel height minus border + label)
  const visibleRows = Math.max(1, height - 3);
  const visible = groups.slice(0, visibleRows);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={color}
      height={height}
      overflow="hidden"
    >
      <Text color={color}>─ [2] Breakdown</Text>
      {visible.length === 0 && <Text color="gray"> No data</Text>}
      {visible.map((g) => {
        const barLen = Math.max(1, Math.round((g.sizeBytes / maxBytes) * BAR_WIDTH));
        const bar = '\u2588'.repeat(barLen) + '\u2591'.repeat(BAR_WIDTH - barLen);
        return (
          <Box key={g.label}>
            <Text color={g.color as any}>{'\u25cf'} </Text>
            <Text color="white">{g.label.padEnd(14).slice(0, 14)}</Text>
            <Text color="cyan"> {bar} </Text>
            <Text color="yellow">{formatBytes(g.sizeBytes)}</Text>
          </Box>
        );
      })}
      {groups.length > visibleRows && (
        <Text color="gray"> +{groups.length - visibleRows} more</Text>
      )}
    </Box>
  );
}
