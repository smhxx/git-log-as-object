[![Travis](https://img.shields.io/travis/smhxx/git-log-as-object/master.svg)](https://travis-ci.org/smhxx/git-log-as-object)
[![Version](https://img.shields.io/npm/v/git-log-as-object.svg)](https://www.npmjs.com/package/git-log-as-object)
[![Downloads](https://img.shields.io/npm/dt/git-log-as-object.svg)](https://www.npmjs.com/package/git-log-as-object)
[![CodeCov](https://codecov.io/gh/smhxx/git-log-as-object/branch/master/graph/badge.svg)](https://codecov.io/gh/smhxx/git-log-as-object)
[![Dependencies](https://david-dm.org/smhxx/git-log-as-object/status.svg)](https://david-dm.org/smhxx/git-log-as-object)
[![DevDependencies](https://david-dm.org/smhxx/git-log-as-object/dev-status.svg)](https://david-dm.org/smhxx/git-log-as-object?type=dev)
# git-log-as-object

The `git-log-as-object` module allows for the asynchronous gathering of commit metadata for any range of commits within a local git repository.

### gitLog(dir?: string, startRef?: string, endRef?: string, includeDiff?: boolean): Promise<Commit[]>

Asynchronously fetches the metadata of all commits within a particular reference range.

#### Parameters

 * **dir**: The path to the root directory of a git repository. Defaults to `process.cwd()`.
 * **startRef**: A reference string, such as a commit hash or tag name, which designates the beginning of the range (exclusive.) If not defined, all ancestors of endRef will be listed.
 * **endRef**: A reference string, such as a commit hash or tag name, which designates the end of the range (inclusive.) If not defined, endRef will be assumed to be 'HEAD'.
 * **includeDiff**: An optional boolean which, if set to `true`, will cause a list of the files modified by each commit to be included in the output. This feature is disabled by default to avoid an unnecessary performance penalty when this information is not needed.

#### Return

A Promise for an array of Commit objects containing the metadata of each commit in the range. (See *Commit Format* below.)

### gitLogSync(dir?: string, startRef?: string, endRef?: string, includeDiff?: boolean): Commit[]

Synchronously fetches the metadata of all commits within a particular reference range.

#### Parameters

 * **dir**: The path to the root directory of a git repository. Defaults to `process.cwd()`.
 * **startRef**: A reference string, such as a commit hash or tag name, which designates the beginning of the range (exclusive.) If not defined, all ancestors of endRef will be listed.
 * **endRef**: A reference string, such as a commit hash or tag name, which designates the end of the range (inclusive.) If not defined, endRef will be assumed to be 'HEAD'.
 * **includeDiff**: An optional boolean which, if set to `true`, will cause a list of the files modified by each commit to be included in the output. This feature is disabled by default to avoid an unnecessary performance penalty when this information is not needed.

#### Return

An array of Commit objects containing the metadata of each commit in the range. (See *Commit Format* below.)

## Commit Format

The Commit object provided by these functions takes the following form:

```js
{
  "fullHash": // The full SHA1 hash of the commit
  "partialHash": // The abbreviated SHA1 hash of the commit
  "author": {
    "name": // The name provided for the commit author, before application of any mailmap
    "email": // The e-mail address provided for the commit author, before application of any mailmap
  },
  "authorTime": // A JavaScript Date object representing the time the commit was authored
  "committer": {
    "name": // The name provided for the committer, before application of any mailmap
    "email": // The e-mail address provided for the committer, before application of any mailmap
  },
  "commitTime": // A JavaScript Date object representing the time the commit was authored
  "subject": // A single-line string containing the subject line of the commit
  "body": // A potentially multiple-line string containing the rest of the commit message
  "diff": {
    "added": // A Set of strings containing the relative paths of any new files added by the commit
    "deleted": // A Set of strings containing the relative paths of any existing files deleted by the commit
    "modified": // A Set of strings containing the relative paths of any existing files modified by the commit
    "touched": // A Set of strings containing the relative paths of all files touched by the commit
  }
}
```

Note that, unless the `includeDiff` parameter is given, the value of the "diff" property will always be `undefined`. Otherwise, it will always be an object with the four properties listed, even if the commit is empty.

## License

The source code of this project is released under the [MIT Expat License](https://opensource.org/licenses/MIT), which freely permits reuse and redistribution. Feel free to use and/or modify it in any way, provided that you include the copyright notice and terms of this license with any copies that you make.

>*Copyright © 2018 "smhxx" (https://github.com/smhxx)*
>
>*Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:*
>
>*The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.*
>
>*THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*
