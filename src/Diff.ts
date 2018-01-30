import { Commit, GitDiff } from './CommitBuilder';
import { wrapGitProcess, wrapGitProcessSync } from './process';

const args = (commit: Commit) => [
  'diff-tree',
  '--no-commit-id',
  '--name-status',
  '-r',
  commit.fullHash,
];

function parse(rawData: string): GitDiff {
  const files = rawData.split('\n').slice(0, -1).map(s => s.split('\t'));

  const diff: GitDiff = {
    added: new Set<string>(),
    deleted: new Set<string>(),
    modified: new Set<string>(),
    touched: new Set<string>(),
  };

  for (const [mode, path] of files) {
    diff.touched.add(path);
    switch (mode) {
      case 'A':
        diff.added.add(path);
        continue;
      case 'D':
        diff.deleted.add(path);
        continue;
      case 'M':
        diff.modified.add(path);
        continue;
    }
  }

  return diff;
}

export namespace Diff {
  export const make = (commit: Commit, dir: string) =>
    wrapGitProcess(args(commit), dir).then(parse);
  export const makeSync = (commit: Commit, dir: string) =>
    parse(wrapGitProcessSync(args(commit), dir));
}
