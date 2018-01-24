import './helper';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Commit, gitLog, gitLogSync } from '../src';

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
      const absDir = resolve(dir);
      const cwd = stub(process, 'cwd').returns(absDir);
      const promise = gitLog();
      return expect(promise).to.eventually.deep.equal(history).then(() => {
        cwd.restore();
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

  });

  describe('gitLogSync()', () => {

    it('returns an array containing the git log history', () => {
      const log = gitLogSync(dir);
      expect(log).to.deep.equal(history);
    });

    it('uses the current working directory if no dir is provided', () => {
      const absDir = resolve(dir);
      const cwd = stub(process, 'cwd').returns(absDir);
      const log = gitLogSync();
      expect(log).to.deep.equal(history);
      cwd.restore();
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

  });

});
