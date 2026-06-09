import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { EntryTable } from '../components/EntryTable.js';
import { StatusBar } from '../components/StatusBar.js';
import { useKeyBindings } from '../hooks/useKeyBindings.js';
import { DiskEntry } from '../../types/index.js';
import type { ScanProgress } from '../../interfaces/IScanner.js';
import { formatBytes } from '../../core/DiskScanner.js';
import { parseMinSize } from '../../commands/ListCommand.js';
import { ArtCanvas } from '../art/ArtCanvas.js';
import { SortMode } from '../types.js';
import { getCleanPolicy, isAutoCleanable } from '../../core/CleanPolicy.js';

interface ScanViewProps {
  // Data supplied by parent (PanelLayout owns useScanner)
  data: DiskEntry[] | null;
  loading: boolean;
  error: string | null;
  progress?: ScanProgress | null;
  scan: (artifactOnly: boolean) => void;
  // Navigation
  onDetail: (entry: DiskEntry, all: DiskEntry[]) => void;
  onCleanEntry: (entry: DiskEntry) => void;
  isActive: boolean;
  viewportHeight?: number;
  viewportWidth?: number;
  // Sort / filter state lifted to parent so it persists across view switches
  allMode: boolean;
  onAllModeChange: (v: boolean) => void;
  sortMode: SortMode;
  onSortModeChange: (v: SortMode) => void;
}

export function ScanView({
  data,
  loading,
  error,
  progress,
  scan,
  onDetail,
  onCleanEntry,
  isActive,
  viewportHeight = 15,
  viewportWidth = 60,
  allMode,
  onAllModeChange,
  sortMode,
  onSortModeChange,
}: ScanViewProps) {
  const [cursor, setCursor] = useState(0);
  const [filterInput, setFilterInput] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [minBytes, setMinBytes] = useState<number | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  const entries = useCallback(() => {
    if (!data) return [];
    let list = [...data];
    if (minBytes) list = list.filter((e) => e.sizeBytes >= minBytes);
    switch (sortMode) {
      case 'size':
        list.sort((a, b) => b.sizeBytes - a.sizeBytes);
        break;
      case 'age':
        list.sort((a, b) => b.ageMs - a.ageMs);
        break;
      case 'type':
        list.sort((a, b) => a.artifactType.label.localeCompare(b.artifactType.label));
        break;
    }
    return list;
  }, [data, sortMode, minBytes]);

  const sorted = entries();
  const totalBytes = sorted.reduce((s, e) => s + e.sizeBytes, 0);
  const recoverableBytes = sorted.filter(isAutoCleanable).reduce((s, e) => s + e.sizeBytes, 0);
  const selectedEntry = sorted[cursor];
  const selectedPolicy = selectedEntry ? getCleanPolicy(selectedEntry.artifactType) : 'inspect';
  const canCleanSelected = selectedPolicy === 'auto';
  const spaceLabel = allMode ? 'shown' : 'recoverable';
  const statusBytes = allMode ? totalBytes : recoverableBytes;
  const loadingArtWidth = Math.max(40, viewportWidth);
  const loadingArtHeight = Math.max(8, Math.min(24, Math.floor(viewportHeight * 0.65)));

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 1800);
    return () => clearTimeout(timer);
  }, [notice]);

  useKeyBindings(
    {
      onUp: () => setCursor((c) => Math.max(0, c - 1)),
      onDown: () => setCursor((c) => Math.min(Math.max(0, sorted.length - 1), c + 1)),
      onEnter: () => {
        if (showFilter) {
          const parsed = parseMinSize(filterInput);
          setMinBytes(!isNaN(parsed) && parsed > 0 ? parsed : undefined);
          setShowFilter(false);
          setCursor(0);
          return;
        }
        if (selectedEntry) onDetail(selectedEntry, sorted);
      },
      onEscape: () => {
        if (showFilter) {
          setShowFilter(false);
          return;
        }
      },
      onKey: (key) => {
        if (showFilter) {
          if (key === '\x7f' || key === '\b') setFilterInput((f) => f.slice(0, -1));
          else if (key.length === 1 && key >= ' ') setFilterInput((f) => f + key);
          return;
        }
        switch (key) {
          case 's':
            onSortModeChange(sortMode === 'size' ? 'age' : sortMode === 'age' ? 'type' : 'size');
            break;
          case 'f': {
            const next = !allMode;
            onAllModeChange(next);
            scan(!next);
            setCursor(0);
            break;
          }
          case '/':
            setShowFilter(true);
            setFilterInput('');
            break;
          case 'c':
            if (selectedEntry && canCleanSelected) {
              onCleanEntry(selectedEntry);
            } else if (selectedEntry) {
              setNotice(
                selectedPolicy === 'locked'
                  ? 'Locked. Open detail to inspect.'
                  : 'Inspect only. Open detail to review.',
              );
            }
            break;
          case 'r':
            scan(!allMode);
            setCursor(0);
            break;
        }
      },
    },
    isActive && !loading,
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Controls bar */}
      <Box marginTop={1} gap={2}>
        <Text color="gray">
          Sort:{' '}
          <Text color="cyan" bold>
            {sortMode}
          </Text>
        </Text>
        <Text color="gray">
          Scope:{' '}
          <Text color="cyan" bold>
            {allMode ? 'all large dirs' : 'artifacts'}
          </Text>
        </Text>
        {minBytes && (
          <Text color="gray">
            Min: <Text color="yellow">{formatBytes(minBytes)}</Text>
          </Text>
        )}
        {showFilter && (
          <Text color="yellow">
            Size: <Text color="white">{filterInput || '_'}</Text>{' '}
            <Text color="gray">(Enter apply, Esc cancel)</Text>
          </Text>
        )}
      </Box>

      {loading && (
        <Box flexDirection="column" marginTop={1} width={viewportWidth} alignItems="center">
          <ArtCanvas
            mode="scan"
            width={loadingArtWidth}
            height={loadingArtHeight}
            fps={8}
            color="cyan"
          />
          <Text color="cyan"> Scanning your filesystem{'\u2026'}</Text>
          {progress && (
            <Text color="gray">
              {progress.phase === 'size'
                ? ` sizing ${progress.scanned}/${progress.total} \u00b7 ${progress.found} found`
                : progress.phase === 'docker'
                  ? ' checking Docker\u2026'
                  : ' searching\u2026'}
            </Text>
          )}
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {notice && (
        <Box marginTop={1}>
          <Text color="gray"> {notice}</Text>
        </Box>
      )}

      {!loading && sorted.length > 0 && (
        <EntryTable entries={sorted} cursorIndex={cursor} viewportHeight={viewportHeight} />
      )}

      {!loading && data && sorted.length === 0 && (
        <Box marginTop={1}>
          <Text color="gray"> No disk hogs found{minBytes ? ' matching your filter' : ''}.</Text>
        </Box>
      )}

      <StatusBar
        left={
          !loading && data
            ? `${sorted.length} entries \u00b7 ${formatBytes(statusBytes)} ${spaceLabel}`
            : undefined
        }
        hints={[
          '\u2191\u2193 navigate',
          canCleanSelected ? 'Enter detail' : 'Enter inspect',
          ...(canCleanSelected ? ['c clean'] : []),
          's sort',
          'f scope',
          '/ size',
          'r rescan',
        ]}
      />
    </Box>
  );
}
