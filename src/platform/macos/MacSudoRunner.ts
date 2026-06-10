import * as fs from 'fs';
import { spawnSync } from 'child_process';
import { ISudoRunner } from '../ISudoRunner.js';

/** Sudo-backed file operations for privileged macOS maintenance files. */
export class MacSudoRunner implements ISudoRunner {
  readFile(path: string): string | null {
    try {
      return fs.readFileSync(path, 'utf8');
    } catch {
      return null;
    }
  }

  writeFile(path: string, content: string): boolean {
    const result = spawnSync('sudo', ['tee', path], {
      input: content,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.status === 0;
  }

  removeFile(path: string): boolean {
    const result = spawnSync('sudo', ['rm', '-f', path], { stdio: 'pipe' });
    return result.status === 0;
  }
}
