import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { TopOffendersChart } from '../components/TopOffendersChart.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { StatusBar } from '../components/StatusBar.js';
import { useKeyBindings } from '../hooks/useKeyBindings.js';
import { useCleaner } from '../hooks/useCleaner.js';
import { DiskEntry, AGE_WARN_MS, AGE_STALE_MS } from '../../types/index.js';
import { formatBytes } from '../../core/DiskScanner.js';

interface DetailViewProps {
  entry: DiskEntry;
  onBack: () => void;
  isActive: boolean;
}

function LabelValue({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <Box>
      <Text color="gray">{('  ' + label).padEnd(18)}</Text>
      <Text color={valueColor as any ?? 'white'}>{value}</Text>
    </Box>
  );
}

export function DetailView({ entry, onBack, isActive }: DetailViewProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { cleaning, results, clean } = useCleaner();

  const removed = results.length > 0;

  useKeyBindings({
    onEscape: () => {
      if (showConfirm) { setShowConfirm(false); return; }
      onBack();
    },
    onKey: (key) => {
      if (key === 'd' || key === 'c') {
        if (!removed && !cleaning) setShowConfirm(true);
      }
    },
  }, isActive && !showConfirm);

  const handleConfirm = () => {
    setShowConfirm(false);
    clean([entry]);
  };

  const ageColor = entry.ageMs >= AGE_STALE_MS ? 'red' : entry.ageMs >= AGE_WARN_MS ? 'yellow' : 'green';

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="column" marginTop={1}>
        <LabelValue label="ID"            value={String(entry.id)}              valueColor="gray" />
        <LabelValue label="Type"          value={entry.artifactType.label}       valueColor={entry.artifactType.color} />
        <LabelValue label="Size"          value={entry.sizeHuman}                valueColor="yellow" />
        <LabelValue label="Path"          value={entry.displayPath}              valueColor="white" />
        <LabelValue label="Project"       value={entry.project ?? '\u2013'}      valueColor={entry.project ? 'magenta' : 'gray'} />
        <LabelValue label="Last Modified" value={entry.ageHuman || '\u2013'}     valueColor={ageColor} />
        <LabelValue label="Directory"     value={entry.directory ?? '\u2013'}    valueColor="magenta" />
        <LabelValue label="Git Branch"    value={entry.gitBranch ?? '\u2013'}    valueColor="gray" />
      </Box>

      {entry.ageMs >= AGE_STALE_MS && (
        <Box marginTop={1}>
          <Text color="red" bold>  {'\u26a0'} Not touched in over 90 days \u2014 safe to remove</Text>
        </Box>
      )}
      {entry.ageMs >= AGE_WARN_MS && entry.ageMs < AGE_STALE_MS && (
        <Box marginTop={1}>
          <Text color="yellow">  {'\u00b7'} Unused for over 30 days</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <TopOffendersChart offenders={entry.topOffenders} />
      </Box>

      {removed && (
        <Box marginTop={1}>
          {results[0].success ? (
            <Text color="green" bold>  {'\u2713'} Removed {entry.artifactType.label} \u2014 freed {formatBytes(results[0].bytesFreed)}</Text>
          ) : (
            <Text color="red" bold>  {'\u2717'} Failed to remove {entry.displayPath}</Text>
          )}
        </Box>
      )}

      {cleaning && <Box marginTop={1}><Text color="yellow">  Removing{'\u2026'}</Text></Box>}

      {showConfirm && (
        <Box marginTop={1}>
          <ConfirmDialog
            message={`Delete ${entry.artifactType.label} at ${entry.project ?? entry.displayPath}? (${entry.sizeHuman})`}
            onConfirm={handleConfirm}
            onCancel={() => setShowConfirm(false)}
          />
        </Box>
      )}

      <StatusBar hints={removed ? ['Esc back'] : ['d delete', 'Esc back', '? help']} />
    </Box>
  );
}
