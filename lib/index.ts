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

const gitLogArgs = (range: string) =>
  // tslint:disable-next-line max-line-length
  ['log', range, '--format=\x1F%H\x1F%h\x1F%an\x1F%ae\x1F%at\x1F%cn\x1F%ce\x1F%ct\x1F%s\x1F%b\x1F\x1E'];

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
  try {
    rangeString = getRangeString(startRef, endRef);
  } catch (err) {
    return Promise.reject(err);
  }

  return wrapProcess('git', gitLogArgs(rangeString), dir).then(d => parseData(d));
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

  const child = spawnSync('git', gitLogArgs(rangeString), { cwd: dir });

  if (child.status !== 0) {
    throw getErrorWithCode(child.status, child.stderr.toString());
  }

  return parseData(child.stdout.toString());
}

function getRangeString(startRef?: string, endRef: string = 'HEAD'): string {
  if (startRef !== undefined) {
    return `${startRef}..${endRef}`;
  }
  return endRef;
}

function wrapProcess(cmd: string, args: string[], dir: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: dir });
    let stdout = new Buffer('');
    let stderr = new Buffer('');
    child.stdout.on('data', data => stdout = Buffer.concat([stdout, data as Buffer]));
    child.stderr.on('data', data => stderr = Buffer.concat([stderr, data as Buffer]));
    child.once('exit', (code: number) => {
      if (code !== 0 || stderr.toString() !== '') {
        reject(getErrorWithCode(code, stderr.toString()));
      } else {
        resolve(stdout.toString());
      }
    });
  });
}

function parseData(rawData: string): Commit[] {
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

function getErrorWithCode(code: number, message: string) {
  type ErrorWithCode = Error & { code: number };
  const err = new Error(message) as ErrorWithCode;
  err.code = code;
  return err;
}
