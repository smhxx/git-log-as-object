import './helper';
import * as child_process from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Commit, GitDiff, gitLog, gitLogSync } from '../src';

const history: Commit[] =
  JSON.parse(readFileSync('./spec/fixtures/mock-project.json').toString());

const dir = './spec/fixtures/mock-project';

for (const commit of history) {
  commit.authorTime = new Date(commit.authorTime);
  commit.commitTime = new Date(commit.commitTime);
}

describe('module', () => {

  describe('gitLog()', () => {

    it('returns a promise for the git log history', () => {
      const promise = gitLog(dir);
      return expect(promise).to.eventually.deep.equal(history);
    });

    it('uses the current working directory if no dir is provided', () => {
      const cwd = resolve(dir); // Do this in advance since stubbing will break path.resolve()
      const cwdStub = stub(process, 'cwd').returns(cwd);
      const promise = gitLog();
      return expect(promise).to.eventually.deep.equal(history).then(() => {
        cwdStub.restore();
      });
    });

    it('accepts a SHA1 hash as a startRef', () => {
      const promise = gitLog(dir, '4c6567d');
      return expect(promise).to.eventually.deep.equal(history.slice(0, 7));
    });

    it('accepts a git tag name as a startRef', () => {
      const promise = gitLog(dir, 'fixture-tag1');
      return expect(promise).to.eventually.deep.equal(history.slice(0, 7));
    });

    it('accepts a SHA1 hash as an endRef', () => {
      const promise = gitLog(dir, undefined, '511aea4');
      return expect(promise).to.eventually.deep.equal(history.slice(2));
    });

    it('accepts a git tag name as an endRef', () => {
      const promise = gitLog(dir, undefined, 'fixture-tag2');
      return expect(promise).to.eventually.deep.equal(history.slice(2));
    });

    it('accepts both a startRef and endRef simultaneously', () => {
      const promise = gitLog(dir, 'fixture-tag1', 'fixture-tag2');
      return expect(promise).to.eventually.deep.equal(history.slice(2, 7));
    });

    it('rejects with an Error if an invalid ref is given', () => {
      const promise = gitLog(dir, 'badref');
      return expect(promise).to.eventually.be.rejectedWith(Error);
    });

    it('does not spawn diff-tree processes if includeDiff is omitted', () => {
      const spawnSpy = spy(child_process, 'spawn');
      return gitLog(dir, 'fixture-tag1', 'fixture-tag2').then(() => {
        expect(spawnSpy).to.have.been.calledOnce;
        spawnSpy.restore();
      });
    });

    it('does not spawn diff-tree processes if includeDiff is false', () => {
      const spawnSpy = spy(child_process, 'spawn');
      return gitLog(dir, 'fixture-tag1', 'fixture-tag2', false).then(() => {
        expect(spawnSpy).to.have.been.calledOnce;
        spawnSpy.restore();
      });
    });

    it('includes the diff files of each commit if includeDiff is true', () => {
      return gitLog(dir, '3bb3f6c', undefined, true).then((log) => {
        expect(log).to.be.of.length(3);

        const emptyDiff = log[2].diff as GitDiff;
        expect(emptyDiff.added).to.be.empty;
        expect(emptyDiff.deleted).to.be.empty;
        expect(emptyDiff.modified).to.be.empty;
        expect(emptyDiff.touched).to.be.empty;

        const nonEmptyDiff = log[0].diff as GitDiff;
        expect(nonEmptyDiff.added).to.deep.equal(new Set<string>([
          'folder/moved-file',
          'new-file',
        ]));
        expect(nonEmptyDiff.deleted).to.deep.equal(new Set<string>([
          'deleted-file',
          'moved-file',
        ]));
        expect(nonEmptyDiff.modified).to.deep.equal(new Set<string>([
          'modified-file',
        ]));
        expect(nonEmptyDiff.touched).to.deep.equal(new Set<string>([
          'deleted-file',
          'folder/moved-file',
          'modified-file',
          'moved-file',
          'new-file',
        ]));
      });
    });

  });

  describe('gitLogSync()', () => {

    it('returns an array containing the git log history', () => {
      const log = gitLogSync(dir);
      expect(log).to.deep.equal(history);
    });

    it('uses the current working directory if no dir is provided', () => {
      const cwd = resolve(dir); // Do this in advance since stubbing will break path.resolve()
      const cwdStub = stub(process, 'cwd').returns(cwd);
      const log = gitLogSync();
      expect(log).to.deep.equal(history);
      cwdStub.restore();
    });

    it('accepts a SHA1 hash as a startRef', () => {
      const log = gitLogSync(dir, '4c6567d');
      expect(log).to.deep.equal(history.slice(0, 7));
    });

    it('accepts a git tag name as a startRef', () => {
      const log = gitLogSync(dir, 'fixture-tag1');
      expect(log).to.deep.equal(history.slice(0, 7));
    });

    it('accepts a SHA1 hash as an endRef', () => {
      const log = gitLogSync(dir, undefined, '511aea4');
      expect(log).to.deep.equal(history.slice(2));
    });

    it('accepts a git tag name as an endRef', () => {
      const log = gitLogSync(dir, undefined, 'fixture-tag2');
      expect(log).to.deep.equal(history.slice(2));
    });

    it('accepts both a startRef and endRef simultaneously', () => {
      const log = gitLogSync(dir, 'fixture-tag1', 'fixture-tag2');
      expect(log).to.deep.equal(history.slice(2, 7));
    });

    it('throws an Error if an invalid ref is given', () => {
      expect(() => {
        gitLogSync(dir, 'badref');
      }).to.throw(Error);
    });

    it('does not spawn diff-tree processes if includeDiff is omitted', () => {
      const spawnSyncSpy = spy(child_process, 'spawnSync');
      gitLogSync(dir, 'fixture-tag1', 'fixture-tag2');
      expect(spawnSyncSpy).to.have.been.calledOnce;
      spawnSyncSpy.restore();
    });

    it('does not spawn diff-tree processes if includeDiff is false', () => {
      const spawnSyncSpy = spy(child_process, 'spawnSync');
      gitLogSync(dir, 'fixture-tag1', 'fixture-tag2', false);
      expect(spawnSyncSpy).to.have.been.calledOnce;
      spawnSyncSpy.restore();
    });

    it('includes the diff files of each commit if includeDiff is true', () => {
      const log = gitLogSync(dir, '3bb3f6c', undefined, true);
      expect(log).to.be.of.length(3);

      const emptyDiff = log[2].diff as GitDiff;
      expect(emptyDiff.added).to.be.empty;
      expect(emptyDiff.deleted).to.be.empty;
      expect(emptyDiff.modified).to.be.empty;
      expect(emptyDiff.touched).to.be.empty;

      const nonEmptyDiff = log[0].diff as GitDiff;
      expect(nonEmptyDiff.added).to.deep.equal(new Set<string>([
        'folder/moved-file',
        'new-file',
      ]));
      expect(nonEmptyDiff.deleted).to.deep.equal(new Set<string>([
        'deleted-file',
        'moved-file',
      ]));
      expect(nonEmptyDiff.modified).to.deep.equal(new Set<string>([
        'modified-file',
      ]));
      expect(nonEmptyDiff.touched).to.deep.equal(new Set<string>([
        'deleted-file',
        'folder/moved-file',
        'modified-file',
        'moved-file',
        'new-file',
      ]));
    });

  });

});
