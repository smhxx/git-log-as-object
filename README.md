[![Travis](https://img.shields.io/travis/smhxx/git-log-as-object/master.svg)](https://travis-ci.org/smhxx/git-log-as-object)
[![Version](https://img.shields.io/npm/v/git-log-as-object.svg)](https://www.npmjs.com/package/git-log-as-object)
[![Downloads](https://img.shields.io/npm/dt/git-log-as-object.svg)](https://www.npmjs.com/package/git-log-as-object)
[![CodeCov](https://codecov.io/gh/smhxx/git-log-as-object/branch/master/graph/badge.svg)](https://codecov.io/gh/smhxx/git-log-as-object)
[![Dependencies](https://david-dm.org/smhxx/git-log-as-object/status.svg)](https://david-dm.org/smhxx/git-log-as-object)
[![DevDependencies](https://david-dm.org/smhxx/git-log-as-object/dev-status.svg)](https://david-dm.org/smhxx/git-log-as-object?type=dev)
# git-log-as-object

The `git-log-as-object` module allows for the asynchronous gathering of commit metadata for any range of commits within a local git repository.

## Usage

### gitLog(options?: Options): Promise<Commit[]>

Asynchronously fetches the metadata of all commits within a particular reference range.

#### Parameters

 * **options**: An object containing optional arguments to the function. See "Options Parameter" below.

#### Return

A Promise for an array of Commit objects containing the metadata of each commit in the range. (See *Commit Format* below.)

### gitLogSync(options?: Options): Commit[]

Synchronously fetches the metadata of all commits within a particular reference range.

#### Parameters

 * **options**: An object containing optional arguments to the function. See "Options Parameter" below.

#### Return

An array of Commit objects containing the metadata of each commit in the range. (See *Commit Format* below.)

## Options Parameter

The Options object has the following properties, all of which may be `undefined`:

 * **dir**: The path to the root directory of a git repository. Defaults to `process.cwd()`.
 * **startRef**: A reference string, such as a commit hash or tag name, which designates the beginning of the range (exclusive.) If not defined, all ancestors of endRef will be listed.
 * **endRef**: A reference string, such as a commit hash or tag name, which designates the end of the range (inclusive.) If not defined, endRef will be assumed to be 'HEAD'.
 * **includeKeys**: An optional array of strings which, if given, specify additional properties to include in the resulting object. (See *Commit Format* section below.) Note that requesting additional properties, particularly `diff`, may impose an undesirable performance penalty; in general, only properties which will actually be used should be included.

## Commit Format

The Commit object returned by these functions has all of the properties marked as "default" below, plus any additional properties in this list whose names are passed to the `includeKeys` parameter. For more information on each of these properties, see the [`git-log` documentation][git-log].

| property            | default? | type                           | equivalent format tokens  |
|---------------------|----------|--------------------------------|---------------------------|
| fullHash            | yes      | string                         | `%H`                      |
| partialHash         | yes      | string                         | `%h`                      |
| author              | yes      | `Person` (see below)           | `%an`, `%ae`              |
| authorTime          | yes      | [JavaScript Date Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) | `%at`, etc. |
| committer           | yes      | `Person` (see below)           | `%cn`, `%ce`              |
| commitTime          | yes      | [JavaScript Date Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) | `%ct`, etc. |
| subject             | yes      | string                         | `%s`                      |
| body                | yes      | string                         | `%b`                      |
| tags                | yes      | string[]                       | `%d`/`%D` (see below)     |
| refs                |          | string[]                       | `%d`/`%D` (see below)     |
| diff                |          | `GitDiff` (see below)          | n/a                       |
| fullBody            |          | string                         | `%B`                      |
| treeHash            |          | string                         | `%T`                      |
| partialTreeHash     |          | string                         | `%t`                      |
| parentHashes        |          | string[]                       | `%P`                      |
| partialParentHashes |          | string[]                       | `%p`                      |
| notes               |          | string                         | `%N`                      |
| gpgKey              |          | string                         | `%GK`                     |
| gpgSigner           |          | `Person` or `null` (see below) | `%GS`                     |
| gpgStatus           |          | string (`G`, `B`, `E`, etc...) | `%G?`                     |

### Person

A `Person` object has only two properties, `name` and `email`, corresponding to the person's name and e-mail address.

### GitDiff

A `GitDiff` object has the following properties, each of which is a [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) of strings containing relative paths to files in the repository.

* **added:** new files added by the commit, as well as the *destination* of files moved with `git mv`
* **deleted:** existing files deleted by the commit, as well as the *source* of files moved with `git mv`
* **modified:** existing files whose contents were modified by the commit
* **touched:** all paths matching any of these three criteria

### 'tags' vs. 'refs'

The `tags` and `refs` properties of a `Commit` are both based on the output of `%D`, but are filtered to separate git tags from other refs (like `HEAD`, `origin/HEAD`, and branch names.) The `tags` property is included by default; if you need access to non-tag refs as well, you can specify 'refs' in the `includeKeys` parameter.

### gpgSigner

One important caveat if you are relying on the `gpgSigner` attribute is that it will **ONLY** be set if the signer's public key is in your GPG keyring. If the commit is signed, but the public key is unknown, or if the commit is unsigned, the `gpgSigner` attribute will always be `null`.

## License

The source code of this project is released under the [MIT Expat License](https://opensource.org/licenses/MIT), which freely permits reuse and redistribution. Feel free to use and/or modify it in any way, provided that you include the copyright notice and terms of this license with any copies that you make.

>*Copyright © 2018 "smhxx" (https://github.com/smhxx)*
>
>*Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:*
>
>*The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.*
>
>*THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*

[git-log]: https://git-scm.com/docs/git-log
