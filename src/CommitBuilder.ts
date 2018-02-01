const RECORD_SEPARATOR = '\x1E';
const UNIT_SEPARATOR = '\x1F';

const buildPerson = (name: string, email: string) => ({ name, email });
const buildDate = (epoch: string) => new Date(parseInt(epoch, 10) * 1000);
const buildParents = (raw: string) => raw.split(' ');
const buildTags = (raw: string) => raw.split(', ')
  .filter(ref => ref.startsWith('tag: '))
  .map(ref => ref.replace(/^tag: /, ''));
const buildRefs = (raw: string) => raw.split(', ')
  .filter(ref => !ref.startsWith('tag: '));
const buildSigner = (raw: string) => {
  const matches = raw.match(/^(.*?) <(.*?)>/);
  return matches !== null ? { name: matches[1], email: matches[2] } : null;
};

type SimpleAttributeSource =
  { builder?: undefined, tokens: [string] };
type BuiltAttributeSource<T extends keyof LogAttributes> =
  { builder: (...args: string[]) => LogAttributes[T], tokens: string[] };
type AttributeSource<T extends keyof LogAttributes> =
  SimpleAttributeSource | BuiltAttributeSource<T>;
type AttributeSources = {
  [T in keyof LogAttributes]: AttributeSource<T>;
};

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

export type OptionalAttributes = OptionalLogAttributes & { diff: GitDiff };
export type Commit = DefaultAttributes & Partial<OptionalAttributes>;

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

export class CommitBuilder {

  private static readonly sources: Readonly<AttributeSources> = {
    fullHash: { tokens: ['%H'] },
    partialHash: { tokens: ['%h'] },
    author: { builder: buildPerson, tokens: ['%an', '%ae'] },
    authorTime: { builder: buildDate, tokens: ['%at'] },
    committer: { builder: buildPerson, tokens: ['%cn', '%ce'] },
    commitTime: { builder: buildDate, tokens: ['%ct'] },
    subject: { tokens: ['%s'] },
    body: { tokens: ['%b'] },
    tags: { builder: buildTags, tokens: ['%D'] },
    refs: { builder: buildRefs, tokens: ['%D'] },
    fullBody: { tokens: ['%B'] },
    treeHash: { tokens: ['%T'] },
    partialTreeHash: { tokens: ['%t'] },
    parentHashes: { builder: buildParents, tokens: ['%P'] },
    partialParentHashes: { builder: buildParents, tokens: ['%p'] },
    gpgKey: { tokens: ['%GK'] },
    gpgSigner: { builder: buildSigner, tokens: ['%GS'] },
    gpgStatus: { tokens: ['%G?'] },
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
      const sources = CommitBuilder.sources as { [key: string]: AttributeSource<any> };
      for (const token of sources[key].tokens) {
        yield token;
      }
    }
  }

  private buildCommit(rawData: string): Commit {
    const commit = {} as Commit;
    const fields = rawData.split(UNIT_SEPARATOR).slice(1);
    for (const key of this.keys) {
      const sources = CommitBuilder.sources as { [key: string]: AttributeSource<any> };
      const source = sources[key];
      const args = source.tokens.map(() => fields.shift() as string);
      if (source.builder !== undefined) {
        commit[key] = source.builder(...args);
      } else {
        commit[key] = args[0];
      }
    }
    return commit;
  }

}
