import { ICommand } from '../interfaces/ICommand.js';
import { Config, WhitelistCategory } from '../core/Config.js';
import { Colors } from '../renderers/Colors.js';

type WhitelistAction = 'list' | 'add' | 'remove';

interface WhitelistCommandOptions {
  action: WhitelistAction;
  category?: WhitelistCategory;
  pattern?: string;
  json?: boolean;
}

/** `disky whitelist` — manages protected cleanup patterns by category. */
export class WhitelistCommand implements ICommand {
  constructor(
    private readonly options: WhitelistCommandOptions,
    private readonly config: Config = new Config(),
  ) {}

  async execute(): Promise<void> {
    switch (this.options.action) {
      case 'add':
        this.requireCategoryAndPattern();
        this.config.addWhitelist(this.options.category!, this.options.pattern!);
        break;
      case 'remove':
        this.requireCategoryAndPattern();
        this.config.removeWhitelist(this.options.category!, this.options.pattern!);
        break;
      case 'list':
        break;
    }

    const category = this.options.category;
    const map = this.config.getWhitelistMap(category);
    const json = this.options.json ?? !process.stdout.isTTY;

    if (json) {
      process.stdout.write(JSON.stringify(map, null, 2) + '\n');
      return;
    }

    console.log(`\n  ${Colors.brand('🛡️  disky whitelist')}\n`);
    const entries = Object.entries(map);
    if (entries.length === 0) {
      console.log(`  ${Colors.dim('No protected patterns configured.')}\n`);
      return;
    }
    for (const [cat, patterns] of entries) {
      console.log(`  ${Colors.header(cat)}`);
      if (patterns.length === 0) {
        console.log(`    ${Colors.dim('empty')}`);
      } else {
        for (const pattern of patterns) console.log(`    ${pattern}`);
      }
    }
    console.log('');
  }

  private requireCategoryAndPattern(): void {
    if (!this.options.category || !this.options.pattern) {
      throw new Error('whitelist add/remove require a category and pattern');
    }
  }
}
