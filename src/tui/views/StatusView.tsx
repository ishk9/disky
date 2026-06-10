import React from 'react';
import { Box, Text } from 'ink';
import { StatusBar } from '../components/StatusBar.js';
import { useKeyBindings } from '../hooks/useKeyBindings.js';
import { useSystemMetrics } from '../hooks/useSystemMetrics.js';
import { formatBytes } from '../../core/format.js';
import type { SystemMetrics } from '../../system/ISystemMetrics.js';

interface StatusViewProps {
  onBack: () => void;
  isActive: boolean;
}

export function StatusView({ onBack, isActive }: StatusViewProps) {
  const { loading, data, error, refresh } = useSystemMetrics(isActive);

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
      {loading && !data && (
        <Box marginTop={1}>
          <Text color="cyan"> Collecting system metrics...</Text>
        </Box>
      )}
      {error && (
        <Box marginTop={1}>
          <Text color="red"> Error: {error}</Text>
        </Box>
      )}
      {data && <MetricsSnapshot metrics={data} />}
      <StatusBar
        left={data ? `Health ${data.health.score}/100 · ${data.health.message}` : undefined}
        hints={['r refresh', 'Esc back']}
      />
    </Box>
  );
}

function MetricsSnapshot({ metrics }: { metrics: SystemMetrics }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">
        {' '}
        {metrics.host.hostname} · {metrics.host.osVersion} · {metrics.host.cpuModel}
      </Text>
      <Metric
        label="Health"
        value={`${metrics.health.score}/100`}
        color={healthColor(metrics.health.score)}
      />
      <Metric
        label="CPU"
        value={`${pct(metrics.cpu.usage)} · ${metrics.cpu.coreCount} cores · load ${metrics.cpu.load1.toFixed(1)}`}
        color="yellow"
      />
      <Text color="gray"> cores {metrics.cpu.perCore.map((core) => pct(core)).join('  ')}</Text>
      <Metric
        label="Memory"
        value={`${formatBytes(metrics.memory.usedBytes)} / ${formatBytes(metrics.memory.totalBytes)}`}
        color="yellow"
      />
      <Metric
        label="Disk"
        value={`${formatBytes(metrics.disk.usedBytes)} used · ${formatBytes(metrics.disk.freeBytes)} free`}
        color="yellow"
      />
      {metrics.battery && (
        <Metric
          label="Battery"
          value={`${pct(metrics.battery.level)} · ${metrics.battery.charging ? 'charging' : 'on battery'}`}
          color="green"
        />
      )}
      {metrics.gpu && <Metric label="GPU" value={metrics.gpu.name} color="gray" />}
      <Metric
        label="Network"
        value={`↓ ${formatBytes(metrics.network.rxBytesPerSec)}/s · ↑ ${formatBytes(metrics.network.txBytesPerSec)}/s`}
        color="gray"
      />
      {metrics.processes.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="cyan" bold>
            {' '}
            Top processes
          </Text>
          {metrics.processes.slice(0, 6).map((p) => (
            <Text key={p.pid}>
              {' '}
              <Text color="gray">{String(p.pid).padStart(6)}</Text> {p.name.slice(0, 24).padEnd(24)}
              <Text color="yellow"> {`${p.cpu.toFixed(1)}%`.padStart(7)}</Text>{' '}
              <Text color="gray">{formatBytes(p.memBytes)}</Text>
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box>
      <Text color="gray">{('  ' + label).padEnd(13)}</Text>
      <Text color={color as any}>{value}</Text>
    </Box>
  );
}

function pct(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function healthColor(score: number): string {
  if (score >= 75) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
}
