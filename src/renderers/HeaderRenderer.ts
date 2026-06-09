import { Colors } from './Colors.js';

interface HeaderOptions {
  watchMode?: boolean;
}

/**
 * Renders the branded "disky" header box shown at the top of every command.
 */
export class HeaderRenderer {
  private readonly BOX_WIDTH = 65;

  render(options: HeaderOptions = {}): string {
    const title = '🗑️ disky';
    const tagline = 'gobbling up your space...';
    const watchLabel = 'watching · Ctrl+C exit';

    const top = `┌${'─'.repeat(this.BOX_WIDTH)}┐`;
    const bottom = `└${'─'.repeat(this.BOX_WIDTH)}┘`;

    // Emoji "🗑️" is a surrogate pair (JS len 2) + zero-width FE0F selector.
    // After stripping FE0F, .length already matches visual columns (emoji=2cols).
    const titleVisualLen = title.replace(/\uFE0F/g, '').length;

    let titleLine: string;
    if (options.watchMode) {
      const gap = this.BOX_WIDTH - titleVisualLen - watchLabel.length - 2;
      titleLine = `│  ${Colors.brand(title)}${' '.repeat(Math.max(0, gap))}${Colors.watching(watchLabel)}  │`;
    } else {
      titleLine = `│  ${Colors.brand(title)}${' '.repeat(this.BOX_WIDTH - titleVisualLen - 2)}│`;
    }

    const taglineLine = `│  ${Colors.tagline(tagline)}${' '.repeat(this.BOX_WIDTH - tagline.length - 2)}│`;

    return [top, titleLine, taglineLine, bottom].join('\n');
  }
}
