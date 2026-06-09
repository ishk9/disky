import React from 'react';
import { render } from 'ink';
import { AppFrame } from './components/AppFrame.js';
import { PanelLayout } from './layouts/PanelLayout.js';

function App() {
  return (
    <AppFrame>
      <PanelLayout />
    </AppFrame>
  );
}

const ENTER_ALT = '\x1b[?1049h';
const LEAVE_ALT = '\x1b[?1049l';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

export async function launchTUI() {
  process.stdout.write(ENTER_ALT + HIDE_CURSOR);

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    process.stdout.write(SHOW_CURSOR + LEAVE_ALT);
  };

  process.on('exit', restore);
  process.on('SIGINT', () => {
    restore();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    restore();
    process.exit(143);
  });

  const { waitUntilExit } = render(<App />, { exitOnCtrlC: true });
  try {
    await waitUntilExit();
  } finally {
    restore();
  }
}
