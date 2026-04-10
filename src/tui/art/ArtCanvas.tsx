import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { generateFlowField, generateMyceliumField } from './flowField.js';
import { generateScanFrame } from './scanAnimation.js';
import { generateDiskFrame } from './diskArt.js';

interface ArtCanvasProps {
  /** Type of art to render */
  mode: 'flow' | 'mycelium' | 'scan' | 'disk';
  width?: number;
  height?: number;
  seed?: number;
  /** Whether animation is running */
  animate?: boolean;
  /** Color for the art text */
  color?: string;
  /** Frames per second */
  fps?: number;
  /** Render dim instead of bright (default: dim for backgrounds) */
  dim?: boolean;
}

export function ArtCanvas({
  mode,
  width = 60,
  height = 12,
  seed = 42,
  animate = true,
  color = 'cyan',
  fps = 4,
  dim = true,
}: ArtCanvasProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const interval = setInterval(() => {
      setFrame((f) => f + 1);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [animate, fps]);

  let art: string;

  switch (mode) {
    case 'flow':
      art = generateFlowField({ width, height, seed, time: frame * 0.3 });
      break;
    case 'mycelium':
      art = generateMyceliumField({ width, height, seed, time: frame * 0.2, filaments: 60 });
      break;
    case 'scan':
      art = generateScanFrame({ width, height, frame });
      break;
    case 'disk':
      art = generateDiskFrame({ cellWidth: width, cellHeight: height, time: frame * 0.15, seed });
      break;
    default:
      art = '';
  }

  return (
    <Box flexDirection="column">
      {art.split('\n').map((line, i) => (
        <Text key={i} color={color as any} dimColor={dim}>{line}</Text>
      ))}
    </Box>
  );
}
