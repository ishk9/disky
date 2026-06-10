import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import * as os from 'os';
import { EntryTable } from '../components/EntryTable.js';
import { StatusBar } from '../components/StatusBar.js';
import { useKeyBindings } from '../hooks/useKeyBindings.js';
import { DiskEntry } from '../../types/index.js';
import { macosPlatform } from '../../platform/macos/index.js';
import { LargeFileScanProvider } from '../../scan/LargeFileScanProvider.js';
import { ScanOrchestrator } from '../../scan/ScanOrchestrator.js';
import { diskUsage } from '../../system/diskUsage.js';
import { formatBytes } from '../../core/format.js';
import { generateSummaryBar } from '../art/diskViz.js';

const MIN_BYTES = 100 * 1024 * 1024;

interface AnalyzeViewProps {
  onBack: () => void;
  isActive: boolean;
  viewportHeight?: number;
}

export function AnalyzeView({ onBack, isActive, viewportHeight = 12 }: AnalyzeViewProps) {
  const [entries, setEntries] = useState<DiskEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const platform = macosPlatform();
      const result = await new ScanOrchestrator([
        new LargeFileScanProvider(platform.fileFinder, os.homedir(), MIN_BYTES),
      ]).scan({});
      setEntries(result.slice(0, 50));
      setCursor(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActive && entries.length === 0 && !loading) refresh();
  }, [entries.length, isActive, loading, refresh]);

  useKeyBindings(
    {
      onUp: () => setCursor((c) => Math.max(0, c - 1)),
      onDown: () => setCursor((c) => Math.min(Math.max(0, entries.length - 1), c + 1)),
      onEscape: onBack,
      onKey: (key) => {
        if (key === 'r') refresh();
      },
    },
    isActive && !loading,
  );

  const usage = diskUsage(os.homedir());
  const total = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);

  return (
    <Box flexDirection="column" paddingX={1}>
      {usage && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray">
            {' '}
            Disk {formatBytes(usage.usedBytes)} used ·{' '}
            <Text color="green">{formatBytes(usage.freeBytes)} free</Text>
          </Text>
          <Text color="yellow"> {generateSummaryBar(entries, 44)}</Text>
        </Box>
      )}
      {loading && (
        <Box marginTop={1}>
          <Text color="cyan"> Finding files larger than {formatBytes(MIN_BYTES)}...</Text>
        </Box>
      )}
      {error && (
        <Box marginTop={1}>
          <Text color="red"> Error: {error}</Text>
        </Box>
      )}
      {!loading && entries.length > 0 && (
        <Box marginTop={1}>
          <EntryTable entries={entries} cursorIndex={cursor} viewportHeight={viewportHeight} />
        </Box>
      )}
      {!loading && entries.length === 0 && (
        <Box marginTop={1}>
          <Text color="gray"> No files larger than {formatBytes(MIN_BYTES)} found.</Text>
        </Box>
      )}
      <StatusBar
        left={`${entries.length} files · ${formatBytes(total)} shown`}
        hints={['↑↓ navigate', 'r refresh', 'Esc back']}
      />
    </Box>
  );
}
