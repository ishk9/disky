import { useInput } from 'ink';

interface KeyBindings {
  onUp?: () => void;
  onDown?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onSpace?: () => void;
  onTab?: () => void;
  onKey?: (key: string) => void;
}

export function useKeyBindings(bindings: KeyBindings, isActive = true) {
  useInput(
    (input, key) => {
      if (!isActive) return;

      if (key.upArrow) bindings.onUp?.();
      else if (key.downArrow) bindings.onDown?.();
      else if (key.return) bindings.onEnter?.();
      else if (key.escape) bindings.onEscape?.();
      else if (key.tab) bindings.onTab?.();
      else if (input === ' ') bindings.onSpace?.();
      else if (input) bindings.onKey?.(input);
    },
    { isActive },
  );
}
