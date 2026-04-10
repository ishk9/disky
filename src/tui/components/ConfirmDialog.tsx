import React from 'react';
import { Box, Text } from 'ink';
import { useKeyBindings } from '../hooks/useKeyBindings.js';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  active?: boolean;
}

export function ConfirmDialog({ message, onConfirm, onCancel, active = true }: ConfirmDialogProps) {
  useKeyBindings({
    onKey: (key) => {
      if (key === 'y' || key === 'Y') onConfirm();
      else if (key === 'n' || key === 'N') onCancel();
    },
    onEscape: onCancel,
  }, active);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text color="yellow">{message}</Text>
      <Text color="gray">Press <Text color="green" bold>y</Text> to confirm, <Text color="red" bold>n</Text> to cancel</Text>
    </Box>
  );
}
