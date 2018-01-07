import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Commit, gitLog, gitLogSync } from '../lib';

const history: Commit[] =
  JSON.parse(readFileSync('./spec/fixtures/mock-project.json').toString());

for (const commit of history) {
  commit.authorTime = new Date(commit.authorTime);
  commit.commitTime = new Date(commit.commitTime);
}

describe('module', () => {

  describe('gitLog', () => {

    it('returns a promise for the git log history', async () => {
      const promise = gitLog('./spec/fixtures/mock-project');
      await expect(promise).resolves.toEqual(history);
    });

    it('uses the current working directory if no dir is provided', async () => {
      const cwd = process.cwd;
      process.cwd = () => resolve('./spec/fixtures/mock-project');
      const promise = gitLog();
      await expect(promise).resolves.toEqual(history);
      process.cwd = cwd;
    });

    it('accepts a SHA1 hash as a startRef', async () => {
      const promise = gitLog('./spec/fixtures/mock-project', '7eadef3d');
      await expect(promise).resolves.toEqual(history.slice(0, history.length - 1));
    });

    it('accepts a git tag name as a startRef', async () => {
      const promise = gitLog('./spec/fixtures/mock-project', 'tag1');
      await expect(promise).resolves.toEqual(history.slice(0, history.length - 1));
    });

    it('accepts a SHA1 hash as an endRef', async () => {
      const promise = gitLog('./spec/fixtures/mock-project', undefined, '4d692863');
      await expect(promise).resolves.toEqual(history.slice(1, history.length));
    });

    it('accepts a git tag name as an endRef', async () => {
      const promise = gitLog('./spec/fixtures/mock-project', undefined, 'tag2');
      await expect(promise).resolves.toEqual(history.slice(1, history.length));
    });

    it('accepts both a startRef and endRef simultaneously', async () => {
      const promise = gitLog('./', 'tag1', 'tag2');
      await expect(promise).resolves.toEqual(history.slice(1, history.length - 1));
    });

    it('rejects with an Error if an invalid ref is given', async () => {
      const promise = gitLog('./', 'badref');
      await expect(promise).rejects.toBeInstanceOf(Error);
    });

  });

  describe('gitLogSync', () => {

    it('returns an array containing the git log history', () => {
      const log = gitLogSync('./spec/fixtures/mock-project');
      expect(log).toEqual(history);
    });

    it('uses the current working directory if no dir is provided', () => {
      const cwd = process.cwd;
      process.cwd = () => resolve('./spec/fixtures/mock-project');
      const log = gitLogSync();
      expect(log).toEqual(history);
      process.cwd = cwd;
    });

    it('accepts a SHA1 hash as a startRef', () => {
      const log = gitLogSync('./spec/fixtures/mock-project', '7eadef3d');
      expect(log).toEqual(history.slice(0, history.length - 1));
    });

    it('accepts a git tag name as a startRef', () => {
      const log = gitLogSync('./spec/fixtures/mock-project', 'tag1');
      expect(log).toEqual(history.slice(0, history.length - 1));
    });

    it('accepts a SHA1 hash as an endRef', () => {
      const log = gitLogSync('./spec/fixtures/mock-project', undefined, '4d692863');
      expect(log).toEqual(history.slice(1, history.length));
    });

    it('accepts a git tag name as an endRef', () => {
      const log = gitLogSync('./spec/fixtures/mock-project', undefined, 'tag2');
      expect(log).toEqual(history.slice(1, history.length));
    });

    it('accepts both a startRef and endRef simultaneously', () => {
      const log = gitLogSync('./spec/fixtures/mock-project', 'tag1', 'tag2');
      expect(log).toEqual(history.slice(1, history.length - 1));
    });

    it('throws an Error if an invalid ref is given', () => {
      expect(() => {
        gitLogSync('./spec/fixtures/mock-project', 'badref');
      }).toThrowError();
    });

  });

});
