import React from 'react';
import { Box, Text } from 'ink';
import { ViewName } from '../types.js';
import { DiskEntry } from '../../types/index.js';
import { getCleanPolicy } from '../../core/CleanPolicy.js';

interface HelpOverlayProps {
  currentView: ViewName;
  currentEntry?: DiskEntry;
}

const GLOBAL_KEYS = [
  ['?', 'Toggle this help'],
  ['Esc', 'Go back'],
  ['q', 'Quit'],
];

const VIEW_KEYS: Record<ViewName, string[][]> = {
  dashboard: [
    ['s', 'Scan for disk hogs'],
    ['c', 'Clean disk hogs'],
    ['w', 'Watch mode'],
  ],
  scan: [
    ['\u2191\u2193', 'Navigate entries'],
    ['Enter', 'View details'],
    ['c', 'Clean selected auto entry'],
    ['s', 'Cycle sort mode'],
    ['f', 'Toggle all-mode filter'],
    ['/', 'Filter by size'],
  ],
  detail: [
    ['d', 'Delete this entry'],
    ['c', 'Clean this entry'],
  ],
  clean: [
    ['\u2191\u2193', 'Navigate entries'],
    ['Space', 'Toggle selection'],
    ['a', 'Select all cleanable'],
    ['n', 'Deselect all'],
    ['Enter', 'Confirm removal'],
    ['p', 'Preview (dry run)'],
  ],
  watch: [['q/Esc', 'Stop watching']],
};

export function HelpOverlay({ currentView, currentEntry }: HelpOverlayProps) {
  const viewKeys = [...(VIEW_KEYS[currentView] || [])];
  if (
    currentView === 'detail' &&
    currentEntry &&
    getCleanPolicy(currentEntry.artifactType) === 'locked'
  ) {
    viewKeys.push(['!', 'Force locked entry']);
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text color="cyan" bold>
        {' '}
        Keyboard Shortcuts{' '}
      </Text>
      <Text> </Text>

      <Text color="yellow" bold>
        {' '}
        Global
      </Text>
      {GLOBAL_KEYS.map(([key, desc], i) => (
        <Text key={i}>
          {' '}
          <Text color="cyan" bold>
            {key.padEnd(8)}
          </Text>{' '}
          <Text color="gray">{desc}</Text>
        </Text>
      ))}

      <Text> </Text>
      <Text color="yellow" bold>
        {' '}
        {currentView.charAt(0).toUpperCase() + currentView.slice(1)} View
      </Text>
      {viewKeys.map(([key, desc], i) => (
        <Text key={i}>
          {' '}
          <Text color="cyan" bold>
            {key.padEnd(8)}
          </Text>{' '}
          <Text color="gray">{desc}</Text>
        </Text>
      ))}

      <Text> </Text>
      <Text color="gray">
        Press{' '}
        <Text color="cyan" bold>
          ?
        </Text>{' '}
        to close
      </Text>
    </Box>
  );
}
