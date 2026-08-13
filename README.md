# using-temporary-files

A utility for working with tests that need to write to / read from the file system,
using [explicit resource management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Resource_management).

It creates a temporary directory, provides file operations for working in it, and
deletes the directory when the resource is disposed.

## Installation

```sh copy
npm install --save-dev using-temporary-files
```

## Usage

### Explicit resource management (`temporaryFiles()`)

Use `temporaryFiles()` with JavaScript's `using` / `await using` declarations. The
temporary directory is disposed automatically when the declaration's scope ends.

```js copy
import { temporaryFiles } from "using-temporary-files";

async function example() {
  await using files = temporaryFiles();

  files.path("."); // full path to the temporary directory
  files.path("file.txt"); // full path to a particular file
  files.path("a", "b", "c"); // path segments are joined, e.g. "<tmpdir>/a/b/c"
  await files.add("file.txt", "content"); // add a file (creates parent directories as needed)
  const text = await files.read("file.txt"); // read the contents (encoding defaults to "utf8")
  const binary = await files.read("file.bin", "base64"); // read with a specific encoding
  await files.addDirectory("dir"); // add a directory (creates parent directories as needed)
  await files.remove("file.txt"); // remove a file
}
```

`temporaryFiles()` returns an object with the file operations `path`, `add`,
`addDirectory`, `read`, and `remove`, plus `dispose()` / `asyncDispose()` and
`Symbol.dispose` / `Symbol.asyncDispose`.

If `using` syntax is not available in your runtime, dispose the resource explicitly:

```js copy
import { temporaryFiles } from "using-temporary-files";

const files = temporaryFiles();

try {
  await files.add("file.txt", "Hello, world!");
} finally {
  await files.asyncDispose();
}
```

### Deprecated: `usingTemporaryFiles()`

`usingTemporaryFiles()` is deprecated. New code should use `temporaryFiles()` so
resource ownership and cleanup are explicit. The callback API remains available for
backward compatibility.

It accepts any number of callbacks. They share the same temporary directory and are
called in order; the directory is deleted after the callbacks complete or one throws.

```js copy
import { usingTemporaryFiles } from "using-temporary-files";

await usingTemporaryFiles(
  async ({ add }) => {
    await add("file.txt", "Hello, world!");
  },
  async ({ read }) => {
    console.log(await read("file.txt")); // "Hello, world!"
  }
);
```

### Debug mode

Set the environment variable `USING_TEMPORARY_FILES_DEBUG=1` to keep the temporary directory in the current working directory instead of deleting it. This is useful when you need to inspect the files after a test run.

```sh copy
USING_TEMPORARY_FILES_DEBUG=1 npm test
```

## Background

This code was extracted from [Counterfact](https://github.com/pmcelhaney/counterfact) so that it can be
used in other projects. The original function was named `withTemporaryFiles()` and took a callback function. It was renamed to `usingTemporaryFiles()` in anticipation of Explicit Resource Management. Both are deprecated and will be removed in 3.0.

To understand how it's used in practice, see the tests in [Counterfact](https://github.com/search?q=repo%3Apmcelhaney%2Fcounterfact%20withTemporaryFiles&type=code)

## FAQ

### Accessing the file system is slow. Isn't it better to mock the file system?

Yes, it is. And that's what I do most of the time. But it's good to have a couple of end-to-end tests
that exercise the real file system. This utility makes it easier to write those tests.

Also, the advice about keeping the file system out of unit tests dates back to hard disk drives.
Solid-state drives (SSDs) are much faster so the performance penalty is often small enough that it's not worth optimizing.
