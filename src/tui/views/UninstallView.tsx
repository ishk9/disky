import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { CleanView } from './CleanView.js';
import { StatusBar } from '../components/StatusBar.js';
import { useKeyBindings } from '../hooks/useKeyBindings.js';
import { MacAppRegistry } from '../../platform/macos/MacAppRegistry.js';
import { macosPlatform } from '../../platform/macos/index.js';
import { makeEntry } from '../../scan/makeEntry.js';
import type { DiskEntry, ArtifactTypeInfo } from '../../types/index.js';
import { formatBytes } from '../../core/format.js';
import { isSystemPath } from '../../clean/AppUninstaller.js';

interface UninstallViewProps {
  onBack: () => void;
  isActive: boolean;
}

const APP_ARTIFACT: ArtifactTypeInfo = {
  label: 'app',
  color: 'magenta',
  safeToClean: true,
  cleanPolicy: 'auto',
};

export function UninstallView({ onBack, isActive }: UninstallViewProps) {
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<DiskEntry[]>([]);
  const [message, setMessage] = useState('Type an app name or bundle id.');
  const [loading, setLoading] = useState(false);

  const preview = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const registry = new MacAppRegistry();
      const app = registry.find(query.trim());
      if (!app) {
        setEntries([]);
        setMessage(`No app matching "${query}".`);
        return;
      }
      if (isSystemPath(app.appPath)) {
        setEntries([]);
        setMessage(`Refusing system app at ${app.appPath}.`);
        return;
      }
      const remnants = registry.remnants(app);
      const paths = [app.appPath, ...remnants.map((r) => r.path)];
      const sizes = await macosPlatform().dirSizer.sizes(paths);
      const next = [
        makeEntry({
          absPath: app.appPath,
          sizeBytes: sizes.get(app.appPath) ?? 0,
          category: 'app',
          artifactType: { ...APP_ARTIFACT, label: app.name },
        }),
        ...remnants.map((r) =>
          makeEntry({
            absPath: r.path,
            sizeBytes: sizes.get(r.path) ?? 0,
            category: 'app',
            artifactType: { ...APP_ARTIFACT, label: r.kind, color: 'gray' },
          }),
        ),
      ];
      next.forEach((entry, i) => {
        entry.id = i + 1;
      });
      setEntries(next);
      setMessage(`${app.name} · dry-run preview`);
    } finally {
      setLoading(false);
    }
  };

  useKeyBindings(
    {
      onEnter: () => {
        preview();
      },
      onEscape: onBack,
      onKey: (key) => {
        if (key === '\x7f' || key === '\b') setQuery((q) => q.slice(0, -1));
        else if (key.length === 1 && key >= ' ') setQuery((q) => q + key);
      },
    },
    isActive && !loading && entries.length === 0,
  );

  const total = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);

  if (entries.length > 0) {
    return (
      <Box flexDirection="column">
        <Box paddingX={1} marginTop={1}>
          <Text color="cyan"> {message}</Text>
          <Text color="gray"> · {formatBytes(total)} total</Text>
        </Box>
        <CleanView
          scanData={entries}
          onBack={() => setEntries([])}
          isActive={isActive}
          viewportHeight={12}
          op="uninstall"
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginTop={1}>
        <Text color="gray"> App </Text>
        <Text color="white">{query || '_'}</Text>
      </Box>
      <Box>
        <Text color={entries.length > 0 ? 'cyan' : 'gray'}>
          {' '}
          {loading ? 'Scanning...' : message}
        </Text>
      </Box>
      <StatusBar hints={['Enter preview', 'Backspace edit', 'Esc back']} />
    </Box>
  );
}
