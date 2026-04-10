import React from 'react';
import { Box, Text } from 'ink';
import { EntryTable } from '../components/EntryTable.js';
import { StatusBar } from '../components/StatusBar.js';
import { useKeyBindings } from '../hooks/useKeyBindings.js';
import { useWatcher } from '../hooks/useWatcher.js';
import { formatBytes } from '../../core/DiskScanner.js';

interface WatchViewProps {
  onBack: () => void;
  isActive: boolean;
  viewportHeight?: number;
}

export function WatchView({ onBack, isActive, viewportHeight = 12 }: WatchViewProps) {
  const { entries, newIds, removedEntries, loading } = useWatcher(isActive);

  useKeyBindings({
    onEscape: onBack,
    onKey: (key) => { if (key === 'q') onBack(); },
  }, isActive);

  const totalBytes = entries.reduce((s, e) => s + e.sizeBytes, 0);
  const time = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      {loading && (
        <Box marginTop={1}><Text color="cyan"> Scanning{'\u2026'}</Text></Box>
      )}

      {!loading && entries.length === 0 && removedEntries.length === 0 && (
        <Box marginTop={1}><Text color="gray"> No disk hogs found.</Text></Box>
      )}

      {!loading && (entries.length > 0 || removedEntries.length > 0) && (
        <Box marginTop={1}>
          <EntryTable
            entries={entries}
            cursorIndex={-1}
            newIds={newIds}
            removedEntries={removedEntries}
            viewportHeight={viewportHeight}
          />
        </Box>
      )}

      <StatusBar
        left={`Last updated: ${time}  \u00b7  ${formatBytes(totalBytes)} recoverable`}
        hints={['q/Esc stop watching']}
      />
    </Box>
  );
}
