import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { CleanView } from './CleanView.js';
import { DiskEntry } from '../../types/index.js';
import { macosPlatform } from '../../platform/macos/index.js';
import { sweepProviders } from '../../scan/sweepSources.js';
import { ScanOrchestrator } from '../../scan/ScanOrchestrator.js';

interface SweepViewProps {
  onBack: () => void;
  isActive: boolean;
  viewportHeight?: number;
}

export function SweepView({ onBack, isActive, viewportHeight }: SweepViewProps) {
  const [entries, setEntries] = useState<DiskEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const platform = macosPlatform();
      const result = await new ScanOrchestrator(sweepProviders(platform.dirSizer)).scan({});
      setEntries(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActive && !entries && !loading) scan();
  }, [entries, isActive, loading, scan]);

  return (
    <Box flexDirection="column">
      {error && (
        <Box paddingX={1} marginTop={1}>
          <Text color="red"> Error: {error}</Text>
        </Box>
      )}
      <CleanView
        scanData={entries}
        scanLoading={loading}
        onBack={onBack}
        isActive={isActive}
        viewportHeight={viewportHeight}
        op="sweep"
      />
    </Box>
  );
}
