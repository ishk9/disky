import React from 'react';
import { Box, Text } from 'ink';
import { TopOffender } from '../../types/index.js';

interface TopOffendersChartProps {
  offenders: TopOffender[];
  maxBarWidth?: number;
}

export function TopOffendersChart({ offenders, maxBarWidth = 30 }: TopOffendersChartProps) {
  if (offenders.length === 0) return null;

  const maxBytes = offenders[0].sizeBytes;

  return (
    <Box flexDirection="column">
      <Text color="gray" bold>{'\u2500'.repeat(50)}</Text>
      <Text color="gray"> Top Offenders</Text>
      <Text> </Text>
      {offenders.map((offender, i) => {
        const ratio = maxBytes > 0 ? offender.sizeBytes / maxBytes : 0;
        const barLen = Math.max(1, Math.round(ratio * maxBarWidth));
        const bar = '\u2588'.repeat(barLen) + '\u2591'.repeat(maxBarWidth - barLen);

        return (
          <Box key={i}>
            <Text color="gray"> {'\u2192'} </Text>
            <Text color="white">{offender.name.padEnd(28)}</Text>
            <Text color="cyan">{bar} </Text>
            <Text color="yellow">{offender.sizeHuman}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
