import React from 'react';
import { Box, Text } from 'ink';

export interface ActionItem {
  key: string;
  label: string;
  /** Main content this action switches to (empty string = no associated content) */
  content: string;
}

export const ACTIONS: ActionItem[] = [
  { key: 's', label: 'Scan', content: 'entries' },
  { key: 'c', label: 'Clean', content: 'clean' },
  { key: 'w', label: 'Watch', content: 'watch' },
  { key: 'q', label: 'Quit', content: '' },
  { key: '?', label: 'Help', content: '' },
];

interface ActionsPanelProps {
  isActive: boolean;
  height: number;
  mainContent: string;
  /** Cursor position when this panel is focused (used to highlight selected action) */
  cursor: number;
}

export function ActionsPanel({ isActive, height, mainContent, cursor }: ActionsPanelProps) {
  const color = isActive ? 'cyan' : 'gray';

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={color}
      height={height}
      overflow="hidden"
    >
      <Text color={color}>─ [4] Actions</Text>
      {ACTIONS.map((a, i) => {
        const isCurrent = a.content !== '' && a.content === mainContent;
        const isCursor = isActive && i === cursor;
        return (
          <Box key={a.key}>
            <Text color={isCursor ? 'cyan' : isCurrent ? 'cyan' : 'gray'}>
              {isCursor ? ' \u25b6 ' : isCurrent ? ' \u00b7 ' : '   '}
            </Text>
            <Text color="cyan" bold>
              [{a.key}]
            </Text>
            <Text color={isCursor || isCurrent ? 'white' : 'gray'}> {a.label}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
