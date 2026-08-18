# Temporary files that clean up after themselves

Tests sometimes need to touch the real file system. A compiler test may need a
directory full of source files; an import test may need to read a configuration
file; an end-to-end test may need to watch files appear and disappear.

Creating those files is easy. Remembering to remove them is the awkward part.
Cleanup has to happen when the test passes, when an assertion fails, and when the
code returns early. Miss one of those paths and temporary files accumulate—or,
worse, one test leaves state that changes the result of another.

`using-temporary-files` treats a temporary directory as a resource with a defined
lifetime. It creates an isolated directory, gives you a small set of operations
for working inside it, and removes the entire directory when its scope ends.

```js copy
import { temporaryFiles } from "using-temporary-files";

async function compileFixture() {
  await using files = temporaryFiles();

  await files.add(
    "src/message.ts",
    'export const message: string = "Hello, world!";\n'
  );
  await compile(files.path("src"));

  return await files.read("dist/message.js");
} // the temporary directory is removed here—even if compile() throws
```

## What explicit resource management means

Some values represent more than data. An open file, a network connection, a lock,
and a temporary directory all hold something that eventually needs to be released.
The code that acquires one of these resources should also make its lifetime clear.

JavaScript's [explicit resource management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Resource_management), i.e. the `using` keyword, does that.

`await using files = temporaryFiles()` says two useful things at the point of declaration:

- `files` owns a disposable temporary directory.
- The current scope owns the responsibility for cleaning it up.

This is the same safety you can build with `try` / `finally`, expressed as part of
the resource's API instead of repeated around every use.

## Why use it in tests?

Mocking the file system is still a good fit for most unit tests. A smaller number
of integration and end-to-end tests should exercise the real thing, though. They
can catch assumptions about paths, encodings, permissions, and file-system behavior
that a mock faithfully repeats instead of challenging.

For those tests, `using-temporary-files` provides:

- isolation, because each call creates a new directory in the system's temp folder;
- predictable cleanup, even when the test fails;
- concise setup helpers that create parent directories as needed; and
- a debug mode that makes the generated files easy to locate while a test runs.

Here is a complete test using Node's built-in test runner. The fixture is set up
outside the test function and disposed after the awaited test finishes, including
when the file processing or assertion throws:

```js copy unit-test
import assert from "node:assert/strict";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { temporaryFiles } from "using-temporary-files";

async function combineTextFiles(inputDirectory, outputFile) {
  const fileNames = (await readdir(inputDirectory)).filter((fileName) =>
    fileName.endsWith(".txt")
  );
  const contents = await Promise.all(
    fileNames.map((fileName) => readFile(join(inputDirectory, fileName), "utf8"))
  );
  const lines = contents.flatMap((content) => content.trim().split("\n")).sort();

  await writeFile(outputFile, `${lines.join("\n")}\n`);
}

await using files = temporaryFiles();

await test("combines text files in sorted order", async () => {
  await files.add("input/fruit.txt", "pear\napple\n");
  await files.add("input/colors.txt", "violet\nblue\n");

  await combineTextFiles(files.path("input"), files.path("combined.txt"));

  assert.equal(
    await files.read("combined.txt"),
    "apple\nblue\npear\nviolet\n"
  );
});
```

## Installation

```sh copy
npm install --save-dev using-temporary-files
```

## Working with the temporary directory

The resource exposes five file operations:

```js copy
await using files = temporaryFiles();

files.path("."); // full path to the temporary directory
files.path("path/to/file.txt"); // full path to a particular file
files.path("a", "b", "c"); // path segments joined inside the directory

await files.add("path/to/file.txt", "content"); // creates parent directories as needed
await files.addDirectory("dir/nested"); // also creates parent directories
const text = await files.read("file.txt"); // reads text as UTF-8
await files.remove("file.txt");
```

## Using without `using`

`temporaryFiles()` also exposes `dispose()` / `asyncDispose()` and their
`Symbol.dispose` / `Symbol.asyncDispose` equivalents. If `using` syntax is not
available in your runtime, call the asynchronous disposer in a `finally` block:

```js copy
import { temporaryFiles } from "using-temporary-files";

const files = temporaryFiles();

try {
  await files.add("file.txt", "Hello, world!");
} finally {
  await files.asyncDispose();
}
```

## Finding files while debugging

Set `USING_TEMPORARY_FILES_DEBUG=1` to create the temporary directory in the
current working directory instead of the operating system's temporary directory:

```sh copy
USING_TEMPORARY_FILES_DEBUG=1 npm test
```

This makes the exact files your test produced easy to find while the test is running
or paused in a debugger. Disposal still removes the directory when the resource's
scope ends. The directory name starts with `utf-` followed by a unique identifier.

## Migrating from the callback API

The callback-based `usingTemporaryFiles()` API is deprecated but remains available
for backward compatibility. See [Deprecated callback API](docs/deprecated-api.md)
for its reference and a migration example.

## Background

This utility was extracted from
[Counterfact](https://github.com/pmcelhaney/counterfact), where tests need both fast
mocked file-system checks and a few realistic tests against disk. Solid-state drives
have made those selective real-file-system tests cheap enough that clarity and
confidence often matter more than avoiding every disk operation.
