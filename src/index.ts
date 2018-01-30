import { Log } from './Log';
import { Diff } from './Diff';
import { Commit, CommitBuilder } from './CommitBuilder';

export { Commit, GitDiff, Person } from './CommitBuilder';

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
  includeKeys?: string[],
): Promise<Commit[]> {
  const { commitBuilder, includeDiff, rangeString } = prepare(startRef, endRef, includeKeys);
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
export function gitLogSync(
  dir: string = process.cwd(),
  startRef?: string,
  endRef?: string,
  includeKeys?: string[],
): Commit[] {
  const { commitBuilder, includeDiff, rangeString } = prepare(startRef, endRef, includeKeys);
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

function prepare(startRef?: string, endRef?: string, includeKeys?: string[]) {
  const optionalKeys = new Set(includeKeys) as Set<keyof Commit>;
  const includeDiff = optionalKeys.delete('diff');
  const commitBuilder = new CommitBuilder(optionalKeys);
  const rangeString = getRangeString(startRef, endRef);
  return { commitBuilder, includeDiff, rangeString };
}

function getRangeString(startRef?: string, endRef: string = 'HEAD'): string {
  if (startRef !== undefined) {
    return `${startRef}..${endRef}`;
  }
  return endRef;
}
