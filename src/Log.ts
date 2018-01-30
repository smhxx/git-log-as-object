import { wrapGitProcess, wrapGitProcessSync } from './process';

const args = (range: string, format: string) => [
  'log',
  range,
  `--format=${format}`,
];

export namespace Log {
  export const fetch = (range: string, format: string, dir: string) =>
    wrapGitProcess(args(range, format), dir);
  export const fetchSync = (range: string, format: string, dir: string) =>
    wrapGitProcessSync(args(range, format), dir);
}
