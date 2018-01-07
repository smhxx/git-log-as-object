import { EOL } from 'os';
import { spawn, spawnSync } from 'child_process';

/**
 *  An object representing an author or committer, containing their name and email address.
 */
export interface Person {
  name: string;
  email: string;
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
}

/**
 *  Asynchronously fetches the metadata of all commits within a particular reference range.
 *  @param dir The path to the root directory of a git repository.
 *  @param startRef A reference string, such as a commit hash or tag name, which designates the
 *    beginning of the range (exclusive.) If not defined, all ancestors of endRef will be listed.
 *  @param endRef A reference string, such as a commit hash or tag name, which designates the end
 *    of the range (inclusive.) If not defined, endRef will be assumed to be 'HEAD'.
 *  @return A Promise for an array of objects containing the metadata of each commit in the range.
 */
// tslint:disable-next-line max-line-length
export function gitLog(dir: string = process.cwd(), startRef?: string, endRef?: string): Promise<Commit[]> {
  let rangeString;
  let commitCount;
  try {
    rangeString = getRangeString(startRef, endRef);
    commitCount = getRevisionCount(dir, rangeString);
  } catch (err) {
    return Promise.reject(err);
  }

  const promises = [] as Promise<Commit>[];
  for (let i = 0; i < commitCount; i += 1) {
    promises[i] = getCommit(dir, rangeString, i);
  }

  return Promise.all(promises);
}

/**
 *  Synchronously fetches the metadata of all commits within a particular reference range.
 *  @param dir The path to the root directory of a git repository.
 *  @param startRef A reference string, such as a commit hash or tag name, which designates the
 *    beginning of the range (exclusive.) If not defined, all ancestors of endRef will be listed.
 *  @param endRef A reference string, such as a commit hash or tag name, which designates the end
 *    of the range (inclusive.) If not defined, endRef will be assumed to be 'HEAD'.
 *  @return An array of objects containing the metadata of each commit in the range.
 */
// tslint:disable-next-line max-line-length
export function gitLogSync(dir: string = process.cwd(), startRef?: string, endRef?: string): Commit[] {
  const rangeString = getRangeString(startRef, endRef);
  const commitCount = getRevisionCount(dir, rangeString);

  const commits = [] as Commit[];
  for (let i = 0; i < commitCount; i += 1) {
    commits[i] = getCommitSync(dir, rangeString, i);
  }

  return commits;
}

function getRangeString(startRef?: string, endRef: string = 'HEAD'): string {
  if (startRef !== undefined) {
    return `${startRef}..${endRef}`;
  }
  return endRef;
}

function getRevisionCount(dir: string, range: string): number {
  const child = spawnSync('git', ['rev-list', '--count', range], { cwd: dir });
  if (child.status !== 0) {
    if (child.error !== undefined) {
      // tslint:disable-next-line max-line-length
      throw new Error(`Unable to perform revision count on range '${range}' (git rev-list exited with ${child.status}). The error encountered was:\n\n${child.error.message}`);
    } else {
      // tslint:disable-next-line max-line-length
      throw new Error(`Unable to perform revision count on range '${range}' (git rev-list exited with ${child.status}). The error encountered was:\n\n${child.stderr.toString()}`);
    }
  }
  return parseInt(child.stdout.toString(), 10);
}

const metadataFormat = '%H%n%h%n%an%n%ae%n%at%n%cn%n%ce%n%ct%n%s%n';
const bodyFormat = '%b';
const gitLogArgs = (range: string, offset: number, format: string) =>
  ['log', range, '-n', '1', `--skip=${offset}`, `--format=${format}`];

async function getCommit(dir: string, range: string, offset: number): Promise<Commit> {
  const logOutput = await Promise.all([
    wrapProcess(gitLogArgs(range, offset, metadataFormat), dir),
    wrapProcess(gitLogArgs(range, offset, bodyFormat), dir),
  ]);

  return createCommitObject(logOutput[0], logOutput[1]);
}

function getCommitSync(dir: string, range: string, offset: number): Commit {
  const logData = spawnSync('git', gitLogArgs(range, offset, metadataFormat), { cwd: dir });
  const logBody = spawnSync('git', gitLogArgs(range, offset, bodyFormat), { cwd: dir });

  return createCommitObject(logData.stdout.toString(), logBody.stdout.toString());
}

function createCommitObject(metadata: string, rawBody: string): Commit {
  const data = metadata.split('\n');
  const body = rawBody.substr(0, rawBody.length - EOL.length);

  return {
    body,
    fullHash: data[0],
    partialHash: data[1],
    author: {
      name: data[2],
      email: data[3],
    },
    authorTime: new Date(parseInt(data[4], 10) * 1000),
    committer: {
      name: data[5],
      email: data[6],
    },
    commitTime: new Date(parseInt(data[7], 10) * 1000),
    subject: data[8],
  };
}

function wrapProcess(args: string[], dir: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn('git', args, { cwd: dir });
    let stdout = new Buffer('');
    let stderr = new Buffer('');
    child.stdout.on('data', data => stdout = Buffer.concat([stdout, data as Buffer]));
    child.stderr.on('data', data => stderr = Buffer.concat([stderr, data as Buffer]));
    child.once('exit', (code: number) => {
      if (code !== 0 || stderr.toString() !== '') {
        type ErrorWithCode = Error & { code: number };
        const err = new Error(stderr.toString()) as ErrorWithCode;
        err.code = code;
        reject(err);
      } else {
        resolve(stdout.toString());
      }
    });
  });
}
