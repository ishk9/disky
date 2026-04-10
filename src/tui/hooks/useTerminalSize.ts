import { useState, useEffect } from 'react';
import { useStdout } from 'ink';

/**
 * Returns the current terminal size and stays subscribed to resize events.
 * Falls back to (80, 24) when stdout has no dimensions (e.g. piped output).
 */
export function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    columns: stdout.columns || 80,
    rows: stdout.rows || 24,
  });

  useEffect(() => {
    const onResize = () => {
      setSize({
        columns: stdout.columns || 80,
        rows: stdout.rows || 24,
      });
    };
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  return size;
}
