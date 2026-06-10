import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { StatusBar } from '../components/StatusBar.js';
import { useKeyBindings } from '../hooks/useKeyBindings.js';
import { OperationLog, OperationRecord } from '../../core/OperationLog.js';
import { formatBytes } from '../../core/format.js';

interface HistoryViewProps {
  onBack: () => void;
  isActive: boolean;
}

export function HistoryView({ onBack, isActive }: HistoryViewProps) {
  const [records, setRecords] = useState<OperationRecord[]>([]);

  const refresh = useCallback(() => {
    setRecords(new OperationLog().read(40));
  }, []);

  useEffect(() => {
    if (isActive) refresh();
  }, [isActive, refresh]);

  useKeyBindings(
    {
      onEscape: onBack,
      onKey: (key) => {
        if (key === 'r') refresh();
      },
    },
    isActive,
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      {records.length === 0 && (
        <Box marginTop={1}>
          <Text color="gray"> No operations recorded yet.</Text>
        </Box>
      )}
      {records.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {records.map((record, index) => (
            <Text key={`${record.ts}-${index}`}>
              {' '}
              <Text color={record.success ? 'green' : 'red'}>
                {record.success ? '✓' : '✗'}
              </Text>{' '}
              <Text color="gray">{record.ts.slice(0, 19).replace('T', ' ')}</Text>{' '}
              <Text color={record.dryRun ? 'yellow' : 'cyan'}>{record.dryRun ? 'dry ' : ''}</Text>
              {record.op.padEnd(10)} <Text color="gray">{record.label.padEnd(18)}</Text>{' '}
              {record.path}{' '}
              <Text color="green">{record.bytes ? formatBytes(record.bytes) : ''}</Text>
            </Text>
          ))}
        </Box>
      )}
      <StatusBar left={`${records.length} records`} hints={['r refresh', 'Esc back']} />
    </Box>
  );
}
