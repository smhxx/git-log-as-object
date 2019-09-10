const RECORD_SEPARATOR = '\x1E';
const UNIT_SEPARATOR = '\x1F';

export interface GitDiff {
  added: Set<string>;
  deleted: Set<string>;
  modified: Set<string>;
  touched: Set<string>;
}

export interface Person {
  name: string;
  email: string;
}

abstract class Attribute<T> {
  public abstract readonly builder: (...args: string[]) => T;
  public readonly tokens: string[];

  public constructor(tokens: string[]) {
    this.tokens = tokens;
  }
}

class StringAttribute extends Attribute<string> {
  public readonly builder = (value: string) => value;
}

class PersonAttribute extends Attribute<Person> {
  public readonly builder = (name: string, email: string) => ({ name, email });
}

class DateAttribute extends Attribute<Date> {
  public readonly builder = (epoch: string) => new Date(parseInt(epoch, 10) * 1000);
}

class ParentsAttribute extends Attribute<string[]> {
  public readonly builder = (raw: string) => raw.split(' ');
}

class TagsAttribute extends Attribute<string[]> {
  public readonly builder = (raw: string) => raw.split(', ')
    .filter(ref => ref.startsWith('tag: '))
    .map(ref => ref.replace(/^tag: /, ''))
}

class RefsAttribute extends Attribute<string[]> {
  public readonly builder = (raw: string) => raw.split(', ')
    .filter(ref => !ref.startsWith('tag: '))
}

class SignerAttribute extends Attribute<Person | null> {
  public readonly builder = (raw: string) => {
    const matches = raw.match(/^(.*?) <(.*?)>/);
    return matches !== null ? { name: matches[1], email: matches[2] } : null;
  }
}

export type DefaultAttributes = {
  fullHash: string;
  partialHash: string;
  author: Person;
  authorTime: Date;
  committer: Person;
  commitTime: Date;
  subject: string;
  body: string;
  tags: string[];
};

export type OptionalLogAttributes = {
  refs: string[];
  fullBody: string;
  treeHash: string;
  partialTreeHash: string;
  parentHashes: string[];
  partialParentHashes: string[];
  gpgKey: string;
  gpgSigner: Person | null;
  gpgStatus: string;
};

type LogAttributes = DefaultAttributes & OptionalLogAttributes;

type AttributeSources = {
  [T in keyof LogAttributes]: Attribute<LogAttributes[T]>
};

export type OptionalAttributes = OptionalLogAttributes & { diff: GitDiff };
export type Commit = DefaultAttributes & Partial<OptionalAttributes>;

export class CommitBuilder {

  private static readonly sources: Readonly<AttributeSources> = {
    fullHash: new StringAttribute(['%H']),
    partialHash: new StringAttribute(['%h']),
    author: new PersonAttribute(['%an', '%ae']),
    authorTime: new DateAttribute(['%at']),
    committer: new PersonAttribute(['%cn', '%ce']),
    commitTime: new DateAttribute(['%ct']),
    subject: new StringAttribute(['%s']),
    body: new StringAttribute(['%b']),
    tags: new TagsAttribute(['%D']),
    refs: new RefsAttribute(['%D']),
    fullBody: new StringAttribute(['%B']),
    treeHash: new StringAttribute(['%T']),
    partialTreeHash: new StringAttribute(['%t']),
    parentHashes: new ParentsAttribute(['%P']),
    partialParentHashes: new ParentsAttribute(['%p']),
    gpgKey: new StringAttribute(['%GK']),
    gpgSigner: new SignerAttribute(['%GS']),
    gpgStatus: new StringAttribute(['%G?']),
  };

  private static readonly defaultKeys: ReadonlyArray<keyof Commit> = [
    'fullHash',
    'partialHash',
    'author',
    'authorTime',
    'committer',
    'commitTime',
    'subject',
    'body',
    'tags',
  ];

  public readonly formatString: string;
  private readonly keys: ReadonlyArray<keyof Commit>;

  constructor(optionalKeys: Set<keyof Commit>) {
    this.keys = Array.from(new Set([...CommitBuilder.defaultKeys, ...optionalKeys]));
    this.formatString =
      `${UNIT_SEPARATOR}${[...this.placeholderTokens()].join(UNIT_SEPARATOR)}${RECORD_SEPARATOR}`;
  }

  public buildAll(rawData: string): Commit[] {
    const records = rawData.split(RECORD_SEPARATOR).slice(0, -1);
    return records.map(data => this.buildCommit(data));
  }

  private *placeholderTokens(): IterableIterator<string> {
    for (const key of this.keys) {
      const sources = CommitBuilder.sources as { [key: string]: Attribute<any> };
      for (const token of sources[key].tokens) {
        yield token;
      }
    }
  }

  private buildCommit(rawData: string): Commit {
    const commit = {} as Commit;
    const fields = rawData.split(UNIT_SEPARATOR).slice(1);
    for (const key of this.keys) {
      const sources = CommitBuilder.sources as { [key: string]: Attribute<any> };
      const source = sources[key];
      const args = source.tokens.map(() => fields.shift() as string);
      commit[key] = source.builder(...args);
    }
    return commit;
  }

}
