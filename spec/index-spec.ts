import './helper';
import * as child_process from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Commit, GitDiff, gitLog, gitLogSync, Person } from '../src';

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
      const promise = gitLog({ dir });
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
      const promise = gitLog({ dir, startRef: '4c6567d' });
      return expect(promise).to.eventually.deep.equal(history.slice(0, 8));
    });

    it('accepts a git tag name as a startRef', () => {
      const promise = gitLog({ dir, startRef: 'fixture-tag1' });
      return expect(promise).to.eventually.deep.equal(history.slice(0, 8));
    });

    it('accepts a SHA1 hash as an endRef', () => {
      const promise = gitLog({ dir, endRef: '511aea4' });
      return expect(promise).to.eventually.deep.equal(history.slice(3));
    });

    it('accepts a git tag name as an endRef', () => {
      const promise = gitLog({ dir, endRef: 'fixture-tag2' });
      return expect(promise).to.eventually.deep.equal(history.slice(3));
    });

    it('accepts both a startRef and endRef simultaneously', () => {
      const promise = gitLog({ dir, startRef: 'fixture-tag1', endRef: 'fixture-tag2' });
      return expect(promise).to.eventually.deep.equal(history.slice(3, 8));
    });

    it('rejects with an Error if an invalid ref is given', () => {
      const promise = gitLog({ dir, startRef: 'badref' });
      return expect(promise).to.eventually.be.rejectedWith(Error);
    });

    it('does not spawn diff-tree processes if includeDiff is omitted', () => {
      const spawnSpy = spy(child_process, 'spawn');
      return gitLog({ dir, startRef: 'fixture-tag1', endRef: 'fixture-tag2' }).then(() => {
        expect(spawnSpy).to.have.been.calledOnce;
        spawnSpy.restore();
      });
    });

    it('does not spawn diff-tree processes if diff is not requested', () => {
      const spawnSpy = spy(child_process, 'spawn');
      return gitLog({ dir, startRef: 'fixture-tag1', endRef: 'fixture-tag2' }).then(() => {
        expect(spawnSpy).to.have.been.calledOnce;
        spawnSpy.restore();
      });
    });

    it('includes the diff files of each commit if requested', () => {
      return gitLog({ dir, startRef: '3bb3f6c', includeKeys: ['diff'] }).then((log) => {
        expect(log).to.be.of.length(4);

        const emptyDiff = log[3].diff as GitDiff;
        expect(emptyDiff.added).to.be.empty;
        expect(emptyDiff.deleted).to.be.empty;
        expect(emptyDiff.modified).to.be.empty;
        expect(emptyDiff.touched).to.be.empty;

        const nonEmptyDiff = log[1].diff as GitDiff;
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

    it('omits extra information when in includeKeys parameter is not given', () => {
      return gitLog({ dir, startRef: 'fixture-tag2' }).then((log) => {
        expect(log[0].refs).to.equal(undefined);
        expect(log[0].treeHash).to.equal(undefined);
        expect(log[0].partialTreeHash).to.equal(undefined);
        expect(log[0].parentHashes).to.equal(undefined);
        expect(log[0].partialParentHashes).to.equal(undefined);
        expect(log[0].gpgKey).to.equal(undefined);
        expect(log[0].gpgSigner).to.equal(undefined);
        expect(log[0].gpgStatus).to.equal(undefined);
      });
    });

    it('includes extra information when an includeKeys parameter is given', () => {
      const includeKeys = [
        'refs',
        'fullBody',
        'treeHash',
        'partialTreeHash',
        'parentHashes',
        'partialParentHashes',
        'gpgKey',
        'gpgSigner',
        'gpgStatus',
      ];
      return gitLog({ dir, includeKeys, startRef: 'HEAD~2', endRef: 'HEAD~1' }).then((log) => {
        expect(log[0].refs).to.deep.equal(['']);
        expect(log[0].treeHash).to.equal('dd60d7cdf6af37b7352431fec032d60293fc3a7b');
        expect(log[0].partialTreeHash).to.equal('dd60d7c');
        expect(log[0].parentHashes).to.deep.equal(['91772924ed5ba02932c5025960e0efa764c72225']);
        expect(log[0].partialParentHashes).to.deep.equal(['9177292']);
        expect(log[0].gpgKey).to.equal('9DE4F05CE92E5CCC');
        expect(log[0].gpgSigner).to.be.an('object');
        expect((log[0].gpgSigner as Person).name).to.equal('smhxx');
        expect((log[0].gpgSigner as Person).email).to.equal('captaintrek@gmail.com');
        expect(log[0].gpgStatus).to.be.a('string');
        expect((log[0].gpgStatus as string).length).to.equal(1);
      });
    });

    it('includes non-tag refs if requested', () => {
      return gitLog({
        dir,
        startRef: 'HEAD~1',
        endRef: 'HEAD',
        includeKeys: ['refs'],
      }).then((log) => {
        expect(log[0].refs).to.deep.equal(['HEAD', 'origin/fixture']);
      });
    });

    it('gives the correct GPG metadata if the commit is unsigned', () => {
      const includeKeys = ['gpgKey', 'gpgSigner', 'gpgStatus'];
      return gitLog({
        dir,
        includeKeys,
        startRef: 'HEAD~1',
        endRef: 'HEAD',
      }).then((log) => {
        expect(log[0].gpgKey).to.equal('');
        expect(log[0].gpgSigner).to.equal(null);
        expect(log[0].gpgStatus).to.equal('N');
      });
    });

  });

  describe('gitLogSync()', () => {

    it('returns an array containing the git log history', () => {
      const log = gitLogSync({ dir });
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
      const log = gitLogSync({ dir, startRef: '4c6567d' });
      expect(log).to.deep.equal(history.slice(0, 8));
    });

    it('accepts a git tag name as a startRef', () => {
      const log = gitLogSync({ dir, startRef: 'fixture-tag1' });
      expect(log).to.deep.equal(history.slice(0, 8));
    });

    it('accepts a SHA1 hash as an endRef', () => {
      const log = gitLogSync({ dir, endRef: '511aea4' });
      expect(log).to.deep.equal(history.slice(3));
    });

    it('accepts a git tag name as an endRef', () => {
      const log = gitLogSync({ dir, endRef: 'fixture-tag2' });
      expect(log).to.deep.equal(history.slice(3));
    });

    it('accepts both a startRef and endRef simultaneously', () => {
      const log = gitLogSync({ dir, startRef: 'fixture-tag1', endRef: 'fixture-tag2' });
      expect(log).to.deep.equal(history.slice(3, 8));
    });

    it('throws an Error if an invalid ref is given', () => {
      expect(() => {
        gitLogSync({ dir, startRef: 'badref' });
      }).to.throw(Error);
    });

    it('does not spawn diff-tree processes if includeDiff is omitted', () => {
      const spawnSyncSpy = spy(child_process, 'spawnSync');
      gitLogSync({ dir, startRef: 'fixture-tag1', endRef: 'fixture-tag2' });
      expect(spawnSyncSpy).to.have.been.calledOnce;
      spawnSyncSpy.restore();
    });

    it('does not spawn diff-tree processes if diff is not requested', () => {
      const spawnSyncSpy = spy(child_process, 'spawnSync');
      gitLogSync({ dir, startRef: 'fixture-tag1', endRef: 'fixture-tag2' });
      expect(spawnSyncSpy).to.have.been.calledOnce;
      spawnSyncSpy.restore();
    });

    it('includes the diff files of each commit if requested', () => {
      const log = gitLogSync({ dir, startRef: '3bb3f6c', includeKeys: ['diff'] });
      expect(log).to.be.of.length(4);

      const emptyDiff = log[3].diff as GitDiff;
      expect(emptyDiff.added).to.be.empty;
      expect(emptyDiff.deleted).to.be.empty;
      expect(emptyDiff.modified).to.be.empty;
      expect(emptyDiff.touched).to.be.empty;

      const nonEmptyDiff = log[1].diff as GitDiff;
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

    it('omits extra information when in includeKeys parameter is not given', () => {
      const log = gitLogSync({ dir, startRef: 'fixture-tag2' });
      expect(log[0].refs).to.equal(undefined);
      expect(log[0].treeHash).to.equal(undefined);
      expect(log[0].partialTreeHash).to.equal(undefined);
      expect(log[0].parentHashes).to.equal(undefined);
      expect(log[0].partialParentHashes).to.equal(undefined);
      expect(log[0].gpgKey).to.equal(undefined);
      expect(log[0].gpgSigner).to.equal(undefined);
      expect(log[0].gpgStatus).to.equal(undefined);
    });

    it('includes extra information when an includeKeys parameter is given', () => {
      const includeKeys = [
        'refs',
        'treeHash',
        'partialTreeHash',
        'parentHashes',
        'partialParentHashes',
        'gpgKey',
        'gpgSigner',
        'gpgStatus',
      ];
      const log = gitLogSync({ dir, includeKeys, startRef: 'HEAD~2', endRef: 'HEAD~1' });
      expect(log[0].refs).to.deep.equal(['']);
      expect(log[0].treeHash).to.equal('dd60d7cdf6af37b7352431fec032d60293fc3a7b');
      expect(log[0].partialTreeHash).to.equal('dd60d7c');
      expect(log[0].parentHashes).to.deep.equal(['91772924ed5ba02932c5025960e0efa764c72225']);
      expect(log[0].partialParentHashes).to.deep.equal(['9177292']);
      expect(log[0].gpgKey).to.equal('9DE4F05CE92E5CCC');
      expect(log[0].gpgSigner).to.be.an('object');
      expect((log[0].gpgSigner as Person).name).to.equal('smhxx');
      expect((log[0].gpgSigner as Person).email).to.equal('captaintrek@gmail.com');
      expect(log[0].gpgStatus).to.be.a('string');
      expect((log[0].gpgStatus as string).length).to.equal(1);
    });

    it('includes non-tag refs if requested', () => {
      const log = gitLogSync({ dir, startRef: 'HEAD~1', endRef: 'HEAD', includeKeys: ['refs'] });
      expect(log[0].refs).to.deep.equal(['HEAD', 'origin/fixture']);
    });

    it('gives the correct GPG metadata if the commit is unsigned', () => {
      const includeKeys = ['gpgKey', 'gpgSigner', 'gpgStatus'];
      const log = gitLogSync({ dir, includeKeys, startRef: 'HEAD~1', endRef: 'HEAD' });
      expect(log[0].gpgKey).to.equal('');
      expect(log[0].gpgSigner).to.equal(null);
      expect(log[0].gpgStatus).to.equal('N');
    });

  });

});
