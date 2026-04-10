import React, { useState, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useScanner } from '../hooks/useScanner.js';
import { useKeyBindings } from '../hooks/useKeyBindings.js';
import { DiskEntry } from '../../types/index.js';
import { SortMode } from '../types.js';
import { formatBytes } from '../../core/DiskScanner.js';
import { StatusPanel } from '../components/panels/StatusPanel.js';
import { BreakdownPanel } from '../components/panels/BreakdownPanel.js';
import { DiskPanel } from '../components/panels/DiskPanel.js';
import { ActionsPanel, ACTIONS } from '../components/panels/ActionsPanel.js';
import { ScanView } from '../views/ScanView.js';
import { DetailView } from '../views/DetailView.js';
import { CleanView } from '../views/CleanView.js';
import { WatchView } from '../views/WatchView.js';
import { StatusBar } from '../components/StatusBar.js';
import { HelpOverlay } from '../components/HelpOverlay.js';

type MainContent = 'idle' | 'entries' | 'detail' | 'clean' | 'watch';

function contentLabel(content: MainContent, entry?: DiskEntry): string {
  switch (content) {
    case 'entries': return 'Scan Results';
    case 'detail':  return entry ? `Detail \u2014 ${entry.artifactType.label}` : 'Detail';
    case 'clean':   return 'Clean';
    case 'watch':   return 'Watch (live)';
    default:        return 'Main';
  }
}

export function PanelLayout() {
  const app = useApp();
  const { columns, rows } = useTerminalSize();
  const { loading, data, error, scan } = useScanner();

  const [mainContent, setMainContent] = useState<MainContent>('idle');
  const [activePanel, setActivePanel] = useState<number>(1);
  const [selectedEntry, setSelectedEntry] = useState<DiskEntry | undefined>();
  const [cleanTarget, setCleanTarget] = useState<DiskEntry | undefined>();
  const [showHelp, setShowHelp] = useState(false);
  const [allMode, setAllMode] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('size');
  const [actionsCursor, setActionsCursor] = useState(0);

  // Chrome: AppFrame border = 2 rows/cols
  const usable = rows - 2;
  const leftWidth = Math.max(28, Math.floor((columns - 4) * 0.32));

  // Proportional left panel heights
  const statusH    = Math.max(11, Math.floor(usable * 0.32));
  const breakdownH = Math.max(8,  Math.floor(usable * 0.28));
  const diskH      = Math.max(7,  Math.floor(usable * 0.22));
  const actionsH   = Math.max(5,  usable - statusH - breakdownH - diskH - 1);

  // Right panel: minus border (2) minus label row (1) minus statusbar (1)
  const mainViewportH = Math.max(5, usable - 4);

  const doScan = useCallback(() => {
    scan(allMode);
    setMainContent('entries');
    setActivePanel(0);
  }, [allMode, scan]);

  const handleDetail = useCallback((entry: DiskEntry) => {
    setSelectedEntry(entry);
    setMainContent('detail');
  }, []);

  const handleCleanEntry = useCallback((entry: DiskEntry) => {
    setCleanTarget(entry);
    setMainContent('clean');
    setActivePanel(0);
  }, []);

  const handleBack = useCallback(() => {
    if (mainContent === 'detail') {
      setMainContent('entries');
      setSelectedEntry(undefined);
    } else if (mainContent === 'clean' && cleanTarget) {
      setMainContent('entries');
      setCleanTarget(undefined);
    } else {
      setMainContent('idle');
      setCleanTarget(undefined);
      setSelectedEntry(undefined);
    }
    setActivePanel(0);
  }, [mainContent, cleanTarget]);

  const runAction = useCallback((actionKey: string) => {
    switch (actionKey) {
      case 's': doScan(); break;
      case 'c':
        setCleanTarget(undefined);
        setMainContent('clean');
        setActivePanel(0);
        break;
      case 'w':
        setMainContent('watch');
        setActivePanel(0);
        break;
      case 'q':
        if (mainContent !== 'clean') app.exit();
        break;
      case '?':
        setShowHelp(true);
        break;
    }
  }, [doScan, mainContent, app]);

  useKeyBindings({
    onUp: () => {
      if (activePanel === 4) setActionsCursor((c) => Math.max(0, c - 1));
    },
    onDown: () => {
      if (activePanel === 4) setActionsCursor((c) => Math.min(ACTIONS.length - 1, c + 1));
    },
    onEnter: () => {
      if (activePanel === 4) runAction(ACTIONS[actionsCursor].key);
    },
    onKey: (key) => {
      if (showHelp) { setShowHelp(false); return; }
      switch (key) {
        case '1': setActivePanel(1); break;
        case '2': setActivePanel(2); break;
        case '3': setActivePanel(3); break;
        case '4': setActivePanel(4); break;
        case '0': setActivePanel(0); break;
        case '\t':
          setActivePanel((p) => p === 4 ? 0 : p + 1);
          break;
        case 's':
        case 'c':
        case 'w':
        case 'q':
        case '?':
          runAction(key);
          break;
      }
    },
  }, !showHelp);

  const mainBorderColor = activePanel === 0 ? 'cyan' : 'gray';
  const totalBytes = data ? data.reduce((s, e) => s + e.sizeBytes, 0) : 0;
  const statusLeft = data
    ? `${data.length} entries \u00b7 ${formatBytes(totalBytes)} recoverable`
    : loading ? 'scanning\u2026' : undefined;

  return (
    <Box flexDirection="column" height={usable}>
      {showHelp && <HelpOverlay currentView={mainContent === 'idle' ? 'dashboard' : mainContent as any} />}

      <Box flexDirection="row" flexGrow={1}>
        {/* ── Left column ───────────────────────────────── */}
        <Box flexDirection="column" width={leftWidth}>
          <StatusPanel
            isActive={activePanel === 1}
            height={statusH}
            data={data}
            loading={loading}
          />
          <BreakdownPanel
            isActive={activePanel === 2}
            height={breakdownH}
            data={data}
          />
          <DiskPanel
            isActive={activePanel === 3}
            height={diskH}
            width={leftWidth}
          />
          <ActionsPanel
            isActive={activePanel === 4}
            height={actionsH}
            mainContent={mainContent}
            cursor={actionsCursor}
          />
        </Box>

        {/* ── Right / main panel ────────────────────────── */}
        <Box
          flexDirection="column"
          flexGrow={1}
          borderStyle="single"
          borderColor={mainBorderColor}
          overflow="hidden"
        >
          <Text color={mainBorderColor}>
            {'\u2500'} [0] {contentLabel(mainContent, selectedEntry)}
          </Text>

          {mainContent === 'idle' && (
            <Box flexDirection="column" paddingX={1} marginTop={2}>
              <Text color="gray">
                Press <Text color="cyan">s</Text> to scan{' '}
                <Text color="gray">\u00b7</Text>{' '}
                <Text color="cyan">c</Text> to clean{' '}
                <Text color="gray">\u00b7</Text>{' '}
                <Text color="cyan">w</Text> to watch
              </Text>
              <Text color="gray">
                Press <Text color="cyan">1\u20134</Text> to focus panels{' '}
                <Text color="gray">\u00b7</Text>{' '}
                <Text color="cyan">Tab</Text> to cycle{' '}
                <Text color="gray">\u00b7</Text>{' '}
                <Text color="cyan">?</Text> for help
              </Text>
            </Box>
          )}

          {mainContent === 'entries' && (
            <ScanView
              data={data}
              loading={loading}
              error={error}
              scan={scan}
              onDetail={handleDetail}
              onCleanEntry={handleCleanEntry}
              isActive={activePanel === 0}
              viewportHeight={mainViewportH - 6}
              allMode={allMode}
              onAllModeChange={setAllMode}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
            />
          )}

          {mainContent === 'detail' && selectedEntry && (
            <DetailView
              entry={selectedEntry}
              onBack={handleBack}
              isActive={activePanel === 0}
            />
          )}

          {mainContent === 'clean' && (
            <CleanView
              targetEntry={cleanTarget}
              scanData={data}
              scanLoading={loading}
              onBack={handleBack}
              isActive={activePanel === 0}
              viewportHeight={mainViewportH - 4}
            />
          )}

          {mainContent === 'watch' && (
            <WatchView
              onBack={handleBack}
              isActive={activePanel === 0}
              viewportHeight={mainViewportH - 4}
            />
          )}
        </Box>
      </Box>

      <StatusBar
        left={statusLeft}
        hints={['1-4 panels', '0/Tab main', 's scan', 'c clean', 'w watch', 'q quit', '? help']}
      />
    </Box>
  );
}
