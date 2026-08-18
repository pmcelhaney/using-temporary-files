# Deprecated callback API

> `usingTemporaryFiles()` is deprecated. New code should use
> [`temporaryFiles()`](../README.md#working-with-the-temporary-directory) so that
> resource ownership and cleanup are explicit.

The callback API remains available for backward compatibility. It accepts any
number of callbacks, calls them in order with operations for the same temporary
directory, and removes the directory after the callbacks complete or one throws.

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

## Migrating to explicit resource management

Move the callback body into the surrounding scope and replace the callback wrapper
with an `await using` declaration:

```js copy
import { temporaryFiles } from "using-temporary-files";

await using files = temporaryFiles();

await files.add("file.txt", "Hello, world!");
console.log(await files.read("file.txt")); // "Hello, world!"
```

The newer form makes the directory's owner and lifetime visible without adding
another callback nesting level. JavaScript invokes the resource's asynchronous
disposer when the scope exits.

## Historical name

The original Counterfact helper was named `withTemporaryFiles()`. It was later
renamed to `usingTemporaryFiles()` in anticipation of JavaScript's explicit
resource management syntax. New code should use `temporaryFiles()`; the deprecated
callback API is planned for removal in version 3.0.

See the [main README](../README.md) for installation, current usage, and the
motivation behind explicit resource management.
