import { Log } from './Log';
import { Diff } from './Diff';
import { Commit, CommitBuilder } from './CommitBuilder';

export { Commit, GitDiff, Person } from './CommitBuilder';

export interface Options {
  dir?: string;
  startRef?: string;
  endRef?: string;
  includeKeys?: string[];
}

/**
 *  Asynchronously fetches the metadata of all commits within a particular reference range.
 *  @param options An object containing (optionally,) the path of the repo's root directory, the
 *    starting and ending refs of the commit range, and the names of any extra attributes to include
 *    in the resulting report.
 *  @return A Promise for an array of objects containing the metadata of each commit in the range.
 */
export async function gitLog(options?: Options): Promise<Commit[]> {
  const { dir, commitBuilder, includeDiff, rangeString } = prepare(options);
  const data = await Log.fetch(rangeString, commitBuilder.formatString, dir);
  const log = commitBuilder.buildAll(data);

  if (includeDiff) {
    const applyDiff = (commit: Commit) =>
      Diff.make(commit, dir).then(diff => Object.assign(commit, { diff }));

    return Promise.all(log.map(applyDiff));
  }

  return log;
}

/**
 *  Synchronously fetches the metadata of all commits within a particular reference range.
 *  @param options An object containing (optionally,) the path of the repo's root directory, the
 *    starting and ending refs of the commit range, and the names of any extra attributes to include
 *    in the resulting report.
 *  @return An array of objects containing the metadata of each commit in the range.
 */
export function gitLogSync(options?: Options): Commit[] {
  const { dir, commitBuilder, includeDiff, rangeString } = prepare(options);
  const data = Log.fetchSync(rangeString, commitBuilder.formatString, dir);
  const log = commitBuilder.buildAll(data);

  if (includeDiff) {
    for (const commit of log) {
      const diff = Diff.makeSync(commit, dir);
      Object.assign(commit, { diff });
    }
  }

  return log;
}

function prepare(options: Options = {}) {
  const dir = (typeof options.dir === 'string') ? options.dir : process.cwd();
  const optionalKeys = new Set(options.includeKeys) as Set<keyof Commit>;
  const includeDiff = optionalKeys.delete('diff');
  const commitBuilder = new CommitBuilder(optionalKeys);
  const rangeString = getRangeString(options.startRef, options.endRef);
  return { dir, commitBuilder, includeDiff, rangeString };
}

function getRangeString(startRef?: string, endRef: string = 'HEAD'): string {
  if (startRef !== undefined) {
    return `${startRef}..${endRef}`;
  }
  return endRef;
}
