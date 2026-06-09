import React from 'react';
import { Box, Text } from 'ink';
import { DiskEntry, AGE_WARN_MS, AGE_STALE_MS } from '../../types/index.js';
import { theme } from '../theme.js';
import { getCleanPolicy } from '../../core/CleanPolicy.js';

interface EntryTableProps {
  entries: DiskEntry[];
  cursorIndex: number;
  viewportHeight?: number;
  newIds?: Set<number>;
  removedEntries?: DiskEntry[];
}

export function EntryTable({
  entries,
  cursorIndex,
  viewportHeight = 20,
  newIds,
  removedEntries,
}: EntryTableProps) {
  // Calculate viewport window
  const totalEntries = entries.length;
  const halfViewport = Math.floor(viewportHeight / 2);
  let startIdx = Math.max(0, cursorIndex - halfViewport);
  const endIdx = Math.min(totalEntries, startIdx + viewportHeight);
  if (endIdx - startIdx < viewportHeight) {
    startIdx = Math.max(0, endIdx - viewportHeight);
  }

  const visibleEntries = entries.slice(startIdx, endIdx);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Text color="cyan" bold>
          {'  '}
        </Text>
        <Text color="cyan" bold>
          {'ID'.padEnd(6)}
        </Text>
        <Text color="cyan" bold>
          {'SIZE'.padEnd(10)}
        </Text>
        <Text color="cyan" bold>
          {'TYPE'.padEnd(18)}
        </Text>
        <Text color="cyan" bold>
          {'PATH'.padEnd(35)}
        </Text>
        <Text color="cyan" bold>
          {'PROJECT'.padEnd(18)}
        </Text>
        <Text color="cyan" bold>
          {'AGE'}
        </Text>
      </Box>

      {/* Removed entries (flash red) */}
      {removedEntries?.map((entry) => (
        <Box key={`rm-${entry.id}`}>
          <Text color="red" bold strikethrough>
            {'  '}
            {String(entry.id).padEnd(6)}
            {entry.sizeHuman.padEnd(10)}
            {entry.artifactType.label.padEnd(18)}
            {truncate(entry.displayPath, 35).padEnd(35)}
            {(entry.project ?? '\u2013').padEnd(18)}
            {entry.ageHuman}
          </Text>
        </Box>
      ))}

      {/* Visible entries */}
      {visibleEntries.map((entry, i) => {
        const actualIndex = startIdx + i;
        const isCursor = actualIndex === cursorIndex;
        const isNew = newIds?.has(entry.id);

        return (
          <Box key={entry.id}>
            <Text color={isCursor ? 'cyan' : undefined}>{isCursor ? '\u25b6 ' : '  '}</Text>
            <Text color={isNew ? 'green' : 'gray'}>{String(entry.id).padEnd(6)}</Text>
            <Text color={isNew ? 'green' : 'yellow'}>{entry.sizeHuman.padEnd(10)}</Text>
            <TypeCell entry={entry} isNew={isNew} />
            <Text color={isNew ? 'green' : 'white'}>
              {truncate(entry.displayPath, 35).padEnd(35)}
            </Text>
            <Text color={isNew ? 'green' : entry.project ? 'magenta' : 'gray'}>
              {(entry.project ?? '\u2013').padEnd(18)}
            </Text>
            <Text color={isNew ? 'green' : ageColor(entry)}>
              {entry.ageHuman}
              {entry.ageMs >= AGE_STALE_MS ? ' \u26a0' : ''}
            </Text>
          </Box>
        );
      })}

      {/* Scroll indicator */}
      {totalEntries > viewportHeight && (
        <Box marginTop={0}>
          <Text color="gray">
            {' '.repeat(2)}
            {startIdx > 0 ? '\u25b2' : ' '} showing {startIdx + 1}-{endIdx} of {totalEntries}{' '}
            {endIdx < totalEntries ? '\u25bc' : ' '}
          </Text>
        </Box>
      )}
    </Box>
  );
}

function TypeCell({ entry, isNew }: { entry: DiskEntry; isNew?: boolean }) {
  const policy = getCleanPolicy(entry.artifactType);
  const suffix = policy === 'auto' ? '' : ` ${policy}`;
  const fullLabel = `${entry.artifactType.label}${suffix}`;
  const paddedSuffix = suffix ? suffix + ' '.repeat(Math.max(0, 18 - fullLabel.length)) : '';

  if (isNew) {
    return <Text color="green">{fullLabel.padEnd(18)}</Text>;
  }

  return (
    <>
      <Text color={(theme.artifact as any)[entry.artifactType.color] ?? 'white'}>
        {entry.artifactType.label}
      </Text>
      <Text color="gray">
        {paddedSuffix || ' '.repeat(Math.max(0, 18 - entry.artifactType.label.length))}
      </Text>
    </>
  );
}

function ageColor(entry: DiskEntry): string {
  if (entry.ageMs >= AGE_STALE_MS) return 'red';
  if (entry.ageMs >= AGE_WARN_MS) return 'yellow';
  return 'green';
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return '\u2026' + str.slice(str.length - maxLen + 1);
}
