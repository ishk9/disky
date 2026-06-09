import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { StatusBar } from '../components/StatusBar.js';
import { useKeyBindings } from '../hooks/useKeyBindings.js';
import { useCleaner } from '../hooks/useCleaner.js';
import { DiskEntry } from '../../types/index.js';
import { formatBytes } from '../../core/DiskScanner.js';
import { Config } from '../../core/Config.js';
import { isExcluded, getEffectiveExclusions } from '../../core/EntryResolver.js';
import { getCleanPolicy, isAutoCleanable } from '../../core/CleanPolicy.js';

interface CleanViewProps {
  /** Pre-selected entry to clean (single-entry shortcut from detail/scan) */
  targetEntry?: DiskEntry;
  /** Scan data provided by parent — avoids a redundant scan */
  scanData?: DiskEntry[] | null;
  scanLoading?: boolean;
  onBack: () => void;
  isActive: boolean;
  viewportHeight?: number;
}

export function CleanView({
  targetEntry,
  scanData,
  scanLoading = false,
  onBack,
  isActive,
  viewportHeight = 12,
}: CleanViewProps) {
  const { cleaning, results, clean } = useCleaner();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [exclusions, setExclusions] = useState<string[]>([]);

  useEffect(() => {
    const config = new Config();
    setExclusions(getEffectiveExclusions(config));
  }, []);

  const safeEntries = useCallback((): DiskEntry[] => {
    if (targetEntry) {
      return isAutoCleanable(targetEntry) && !isExcluded(targetEntry, exclusions)
        ? [targetEntry]
        : [];
    }
    if (!scanData) return [];
    return scanData.filter(isAutoCleanable).filter((e) => !isExcluded(e, exclusions));
  }, [scanData, targetEntry, exclusions]);

  const entries = safeEntries();
  const sourceEntries = targetEntry ? [targetEntry] : (scanData ?? []);
  const lockedCount = sourceEntries.filter(
    (e) => getCleanPolicy(e.artifactType) === 'locked',
  ).length;
  const inspectCount = sourceEntries.filter(
    (e) => getCleanPolicy(e.artifactType) === 'inspect',
  ).length;

  // Pre-select the target entry when one is provided
  useEffect(() => {
    if (targetEntry)
      setSelected(isAutoCleanable(targetEntry) ? new Set([targetEntry.id]) : new Set());
  }, [targetEntry]);

  useKeyBindings(
    {
      onUp: () => setCursor((c) => Math.max(0, c - 1)),
      onDown: () => setCursor((c) => Math.min(Math.max(0, entries.length - 1), c + 1)),
      onSpace: () => {
        if (entries.length === 0) return;
        const id = entries[cursor].id;
        setSelected((s) => {
          const next = new Set(s);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
      onEnter: () => {
        if (selected.size === 0 || cleaning || results.length > 0) return;
        setDryRun(false);
        setShowConfirm(true);
      },
      onEscape: () => {
        if (showConfirm) {
          setShowConfirm(false);
          return;
        }
        onBack();
      },
      onKey: (key) => {
        switch (key) {
          case 'a':
            setSelected(new Set(entries.map((e) => e.id)));
            break;
          case 'n':
            setSelected(new Set());
            break;
          case 'p':
            if (selected.size > 0 && !cleaning) {
              setDryRun(true);
              setShowConfirm(true);
            }
            break;
        }
      },
    },
    isActive && !showConfirm && !cleaning,
  );

  const handleConfirm = () => {
    setShowConfirm(false);
    if (dryRun) return;
    clean(entries.filter((e) => selected.has(e.id)));
  };

  const selectedEntries = entries.filter((e) => selected.has(e.id));
  const selectedBytes = selectedEntries.reduce((s, e) => s + e.sizeBytes, 0);
  const loading = scanLoading && !targetEntry;

  // Viewport windowing
  const total = entries.length;
  const halfVP = Math.floor(viewportHeight / 2);
  let startIdx = Math.max(0, cursor - halfVP);
  const endIdx = Math.min(total, startIdx + viewportHeight);
  if (endIdx - startIdx < viewportHeight) startIdx = Math.max(0, endIdx - viewportHeight);
  const visible = entries.slice(startIdx, endIdx);

  return (
    <Box flexDirection="column" paddingX={1}>
      {loading && (
        <Box marginTop={1}>
          <Text color="cyan"> Scanning for cleanable entries{'\u2026'}</Text>
        </Box>
      )}

      {!loading && entries.length > 0 && !results.length && (
        <Box flexDirection="column" marginTop={1}>
          {visible.map((entry, i) => {
            const idx = startIdx + i;
            const isCursor = idx === cursor;
            const isSelected = selected.has(entry.id);
            const excluded = isExcluded(entry, exclusions);
            return (
              <Box key={entry.id}>
                <Text color={isCursor ? 'cyan' : undefined}>{isCursor ? '\u25b6 ' : '  '}</Text>
                <Text color={isSelected ? 'green' : 'gray'}>{isSelected ? '[x]' : '[ ]'} </Text>
                <Text color={excluded ? 'gray' : (entry.artifactType.color as any)}>
                  {entry.artifactType.label.padEnd(18)}
                </Text>
                <Text color={excluded ? 'gray' : 'white'}>{entry.displayPath.padEnd(40)}</Text>
                <Text color="yellow">{entry.sizeHuman}</Text>
                {excluded && <Text color="gray"> {'\ud83d\udd12'}</Text>}
              </Box>
            );
          })}
          {total > viewportHeight && (
            <Box>
              <Text color="gray">
                {'  '}
                {startIdx > 0 ? '\u25b2' : ' '} showing {startIdx + 1}–{endIdx} of {total}{' '}
                {endIdx < total ? '\u25bc' : ' '}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {!loading && entries.length === 0 && !results.length && (
        <Box marginTop={1}>
          <Text color="gray"> No cleanable entries found.</Text>
        </Box>
      )}

      {!loading && (lockedCount > 0 || inspectCount > 0) && !results.length && (
        <Box marginTop={1}>
          <Text color="gray">
            {' '}
            Skipped {lockedCount + inspectCount}{' '}
            {lockedCount + inspectCount === 1 ? 'entry' : 'entries'} {'\u00b7'} inspect from scan
            results
          </Text>
        </Box>
      )}

      {!loading && selected.size > 0 && !results.length && (
        <Box marginTop={1}>
          <Text color="yellow">
            {' '}
            {selected.size} {selected.size === 1 ? 'entry' : 'entries'} selected {'\u00b7'}{' '}
            {formatBytes(selectedBytes)} will be freed
          </Text>
        </Box>
      )}

      {/* Dry-run preview */}
      {dryRun && showConfirm && (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor="yellow"
          paddingX={1}
        >
          <Text color="yellow" bold>
            {' '}
            [DRY RUN] Preview
          </Text>
          {selectedEntries.map((e) => (
            <Text key={e.id} color="gray">
              {' '}
              Would delete {e.artifactType.label} at {e.displayPath} ({e.sizeHuman})
            </Text>
          ))}
          {(lockedCount > 0 || inspectCount > 0) && (
            <Text color="gray">
              {' '}
              Skipped {lockedCount + inspectCount} locked or inspect-only{' '}
              {lockedCount + inspectCount === 1 ? 'entry' : 'entries'}.
            </Text>
          )}
          <Text color="gray"> No files will be modified.</Text>
          <Text color="gray"> Press any key to close</Text>
        </Box>
      )}

      {cleaning && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="cyan" bold>
            {' '}
            Cleaning{'\u2026'}
          </Text>
          {results.map((r) => (
            <Text key={r.id} color={r.success ? 'green' : 'red'}>
              {' '}
              {r.success ? '\u2713' : '\u2717'} {r.label} at {r.displayPath}
              {r.success ? ` (freed ${formatBytes(r.bytesFreed)})` : ' (failed)'}
            </Text>
          ))}
        </Box>
      )}

      {!cleaning && results.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green" bold>
            {' '}
            Cleanup Complete
          </Text>
          {results.map((r) => (
            <Text key={r.id} color={r.success ? 'green' : 'red'}>
              {' '}
              {r.success ? '\u2713' : '\u2717'} {r.label} at {r.displayPath}
              {r.success ? ` (freed ${formatBytes(r.bytesFreed)})` : ' (failed)'}
            </Text>
          ))}
          <Box marginTop={1}>
            <Text color="green" bold>
              {' '}
              Total freed:{' '}
              {formatBytes(results.filter((r) => r.success).reduce((s, r) => s + r.bytesFreed, 0))}
            </Text>
          </Box>
        </Box>
      )}

      {showConfirm && !dryRun && (
        <Box marginTop={1}>
          <ConfirmDialog
            message={`Remove ${selected.size} ${selected.size === 1 ? 'entry' : 'entries'}? (${formatBytes(selectedBytes)})`}
            onConfirm={handleConfirm}
            onCancel={() => setShowConfirm(false)}
          />
        </Box>
      )}

      <StatusBar
        hints={
          results.length > 0
            ? ['Esc back']
            : [
                '\u2191\u2193 navigate',
                'Space toggle',
                'a all cleanable',
                'n none',
                'Enter confirm',
                'p preview',
                'Esc back',
              ]
        }
      />
    </Box>
  );
}
