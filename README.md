# usingTemporaryFiles()

A utility for working with tests that need to write to / read from the file system.

It creates a temporary directory, copies the specified files into it, provides some functions
for working with files in the temporary directory, and then deletes the directory
when the callback returns or an error occurs.

## Installation

```sh copy
npm install --save-dev using-temporary-files
```

## Usage

```js copy
import { usingTemporaryFiles } from "using-temporary-files";

await usingTemporaryFiles(async ({ path, add, addDirectory, remove }) => {
  path("."); // full path to the temporary directory
  path("file.txt"); // full path to a particular file
  await add("file.txt", "content"); // add a file
  const text = await read("file.txt" /*, encoding (optional) */); // read the contents of a file
  await addDirectory("dir"); // add a directory
  await remove("file.txt"); // remove a file
});
```

## Background

This code was extracted from [Counterfact](https://github.com/pmcelhaney/counterfact) so that it can be
used in other projects. The original function was named `withTemporaryFiles()`. It was renamed to
`usingTemporaryFiles` so that it resembles the
[Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management) proposal.

To understand how it's used in practice, see the tests in [Counterfact](https://github.com/search?q=repo%3Apmcelhaney%2Fcounterfact%20withTemporaryFiles&type=code)

Note that until I get around to updating Counterfact to use this package, the API for `withTemporaryFiles()`
has a few minor differences. Mainly extra arguments that we can do without.

## FAQ

### Accessing the file system is slow. Isn't it better to mock the file system?

Yes, it is. And that's what I do most of the time. But it's good to have a couple of end-to-end tests
that exercise the real file system. This utility makes it easier to write those tests.
