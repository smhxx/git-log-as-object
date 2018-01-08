import { readFileSync } from 'fs';
import { Commit, gitLog, gitLogSync } from '../src';

const histories: Commit[][] = [
  './spec/fixtures/mock-project.json',
  './spec/fixtures/git-log-as-object.json',
].map(f => JSON.parse(readFileSync(f).toString()));

const dir = './spec/fixtures/mock-project';

for (const history of histories) {
  for (const commit of history) {
    commit.authorTime = new Date(commit.authorTime);
    commit.commitTime = new Date(commit.commitTime);
  }
}

describe('module', () => {

  describe('gitLog', () => {

    it('returns a promise for the git log history', async () => {
      const promise = gitLog(dir);
      await expect(promise).resolves.toEqual(histories[0]);
    });

    it('uses the current working directory if no dir is provided', async () => {
      const promise = gitLog(undefined, undefined, 'b5f87d1');
      await expect(promise).resolves.toEqual(histories[1]);
    });

    it('accepts a SHA1 hash as a startRef', async () => {
      const promise = gitLog(dir, '23e8b12');
      await expect(promise).resolves.toEqual(histories[0].slice(0, histories[0].length - 3));
    });

    it('accepts a git tag name as a startRef', async () => {
      const promise = gitLog(dir, 'fixture-tag1');
      await expect(promise).resolves.toEqual(histories[0].slice(0, histories[0].length - 3));
    });

    it('accepts a SHA1 hash as an endRef', async () => {
      const promise = gitLog(dir, undefined, 'f91136c');
      await expect(promise).resolves.toEqual(histories[0].slice(1, histories[0].length));
    });

    it('accepts a git tag name as an endRef', async () => {
      const promise = gitLog(dir, undefined, 'fixture-tag2');
      await expect(promise).resolves.toEqual(histories[0].slice(1, histories[0].length));
    });

    it('accepts both a startRef and endRef simultaneously', async () => {
      const promise = gitLog(dir, 'fixture-tag1', 'fixture-tag2');
      await expect(promise).resolves.toEqual(histories[0].slice(1, histories[0].length - 3));
    });

    it('rejects with an Error if an invalid ref is given', async () => {
      const promise = gitLog(dir, 'badref');
      await expect(promise).rejects.toBeInstanceOf(Error);
    });

  });

  describe('gitLogSync', () => {

    it('returns an array containing the git log history', () => {
      const log = gitLogSync(dir);
      expect(log).toEqual(histories[0]);
    });

    it('uses the current working directory if no dir is provided', () => {
      const log = gitLogSync(undefined, undefined, 'b5f87d1');
      expect(log).toEqual(histories[1]);
    });

    it('accepts a SHA1 hash as a startRef', () => {
      const log = gitLogSync(dir, '23e8b12');
      expect(log).toEqual(histories[0].slice(0, histories[0].length - 3));
    });

    it('accepts a git tag name as a startRef', () => {
      const log = gitLogSync(dir, 'fixture-tag1');
      expect(log).toEqual(histories[0].slice(0, histories[0].length - 3));
    });

    it('accepts a SHA1 hash as an endRef', () => {
      const log = gitLogSync(dir, undefined, 'f91136c');
      expect(log).toEqual(histories[0].slice(1, histories[0].length));
    });

    it('accepts a git tag name as an endRef', () => {
      const log = gitLogSync(dir, undefined, 'fixture-tag2');
      expect(log).toEqual(histories[0].slice(1, histories[0].length));
    });

    it('accepts both a startRef and endRef simultaneously', () => {
      const log = gitLogSync(dir, 'fixture-tag1', 'fixture-tag2');
      expect(log).toEqual(histories[0].slice(1, histories[0].length - 3));
    });

    it('throws an Error if an invalid ref is given', () => {
      expect(() => {
        gitLogSync(dir, 'badref');
      }).toThrowError();
    });

  });

});
