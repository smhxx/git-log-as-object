import { spawn, spawnSync } from 'child_process';

/**
 *  An object representing an author or committer, containing their name and email address.
 */
export interface Person {
  name: string;
  email: string;
}

/**
 *  An object containing relative paths to the files added, deleted, or modified by each commit.
 */
export interface GitDiff {
  added: Set<string>;
  deleted: Set<string>;
  modified: Set<string>;
  touched: Set<string>;
}

/**
 *  An object containing the metadata for a single git commit.
 */
export interface Commit {
  fullHash: string;
  partialHash: string;
  author: Person;
  authorTime: Date;
  committer: Person;
  commitTime: Date;
  subject: string;
  body: string;
  diff?: GitDiff;
}

const gitLogArgs = (range: string) => [
  'log',
  range,
  '--format=\x1F%H\x1F%h\x1F%an\x1F%ae\x1F%at\x1F%cn\x1F%ce\x1F%ct\x1F%s\x1F%b\x1F\x1E',
];

const gitDiffArgs = (commit: Commit) => [
  'diff-tree',
  '--no-commit-id',
  '--name-status',
  '-r',
  commit.fullHash,
];

/**
 *  Asynchronously fetches the metadata of all commits within a particular reference range.
 *  @param dir The path to the root directory of a git repository.
 *  @param startRef A reference string, such as a commit hash or tag name, which designates the
 *    beginning of the range (exclusive.) If not defined, all ancestors of endRef will be listed.
 *  @param endRef A reference string, such as a commit hash or tag name, which designates the end
 *    of the range (inclusive.) If not defined, endRef will be assumed to be 'HEAD'.
 *  @param includeDiff An optional boolean which, if set to true, will cause information on the
 *    files touched by each commit to also be collected. This functionality is disabled by default
 *    for performance reasons.
 *  @return A Promise for an array of objects containing the metadata of each commit in the range.
 */
export async function gitLog(
  dir: string = process.cwd(),
  startRef?: string,
  endRef?: string,
  includeDiff: boolean = false,
): Promise<Commit[]> {
  const rangeString = getRangeString(startRef, endRef);
  const log = await wrapGitProcess(gitLogArgs(rangeString), dir).then(parseLog);

  if (includeDiff) {
    const applyDiff = (commit: Commit) =>
      wrapGitProcess(gitDiffArgs(commit), dir)
        .then(parseDiff)
        .then(diff => Object.assign(commit, { diff }));

    return Promise.all(log.map(applyDiff));
  }

  return log;
}

/**
 *  Synchronously fetches the metadata of all commits within a particular reference range.
 *  @param dir The path to the root directory of a git repository.
 *  @param startRef A reference string, such as a commit hash or tag name, which designates the
 *    beginning of the range (exclusive.) If not defined, all ancestors of endRef will be listed.
 *  @param endRef A reference string, such as a commit hash or tag name, which designates the end
 *    of the range (inclusive.) If not defined, endRef will be assumed to be 'HEAD'.
 *  @param includeDiff An optional boolean which, if set to true, will cause information on the
 *    files touched by each commit to also be collected. This functionality is disabled by default
 *    for performance reasons.
 *  @return An array of objects containing the metadata of each commit in the range.
 */
// tslint:disable-next-line max-line-length
export function gitLogSync(
  dir: string = process.cwd(),
  startRef?: string,
  endRef?: string,
  includeDiff: boolean = false,
): Commit[] {
  const rangeString = getRangeString(startRef, endRef);
  const log = parseLog(wrapGitProcessSync(gitLogArgs(rangeString), dir));

  if (includeDiff) {
    for (const commit of log) {
      const diff = parseDiff(wrapGitProcessSync(gitDiffArgs(commit), dir));
      Object.assign(commit, { diff });
    }
  }

  return log;
}

function getRangeString(startRef?: string, endRef: string = 'HEAD'): string {
  if (startRef !== undefined) {
    return `${startRef}..${endRef}`;
  }
  return endRef;
}

function wrapGitProcess(args: string[], cwd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const child = spawn('git', args, { cwd });
    let stdout = new Buffer('');
    let stderr = new Buffer('');
    child.stdout.on('data', data => stdout = Buffer.concat([stdout, data as Buffer]));
    child.stderr.on('data', data => stderr = Buffer.concat([stderr, data as Buffer]));
    child.once('close', (code: number) => {
      if (code !== 0 || stderr.toString() !== '') {
        reject(getErrorWithCode(code, stderr.toString()));
      } else {
        resolve(stdout.toString());
      }
    });
  });
}

function wrapGitProcessSync(args: string[], cwd: string): string {
  const child = spawnSync('git', args, { cwd });

  if (child.status !== 0) {
    throw getErrorWithCode(child.status, child.stderr.toString());
  }

  return child.stdout.toString();
}

function parseLog(rawData: string): Commit[] {
  const commits: Commit[] = [];
  const commitData = rawData.split('\x1E');

  for (let i = 0; i < commitData.length - 1; i += 1) {
    const entries = commitData[i].split('\x1F');
    commits[i] = {
      fullHash: entries[1],
      partialHash: entries[2],
      author: {
        name: entries[3],
        email: entries[4],
      },
      authorTime: new Date(parseInt(entries[5], 10) * 1000),
      committer: {
        name: entries[6],
        email: entries[7],
      },
      commitTime: new Date(parseInt(entries[8], 10) * 1000),
      subject: entries[9],
      body: entries[10],
    };
  }

  return commits;
}

function parseDiff(rawData: string): GitDiff {
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

function getErrorWithCode(code: number, message: string) {
  type ErrorWithCode = Error & { code: number };
  const err = new Error(message) as ErrorWithCode;
  err.code = code;
  return err;
}
