export interface ISudoRunner {
  readFile(path: string): string | null;
  writeFile(path: string, content: string): boolean;
  removeFile(path: string): boolean;
}
