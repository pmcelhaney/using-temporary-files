/* eslint-disable n/no-sync */
import assert from "node:assert/strict";
import fs from "node:fs";
import nodePath from "node:path";
import { describe, it } from "node:test";

import {
  temporaryFiles,
  usingTemporaryFiles,
} from "../dist/using-temporary-files.js";

const asyncDisposeSymbol =
  Symbol.asyncDispose ?? Symbol.for("Symbol.asyncDispose");
const disposeSymbol = Symbol.dispose ?? Symbol.for("Symbol.dispose");

async function waitForPathToDisappear(path, retries = 20) {
  if (!fs.existsSync(path) || retries === 0) {
    return;
  }

  // eslint-disable-next-line promise/avoid-new, compat/compat
  await new Promise((resolve) => {
    setTimeout(resolve, 10);
  });

  await waitForPathToDisappear(path, retries - 1);
}

describe("usingTemporaryFiles", () => {
  it("add a file", async () => {
    let timesCallbackCalled = 0;

    await usingTemporaryFiles(async ({ add, path }) => {
      await add("file.txt", "Hello, world!");
      timesCallbackCalled += 1;
      assert.strictEqual(
        fs.readFileSync(path("file.txt"), "utf8"),
        "Hello, world!"
      );
    });

    assert.strictEqual(timesCallbackCalled, 1);
  });

  it("remove a file", async () => {
    let timesCallbackCalled = 0;

    await usingTemporaryFiles(async ({ add, path, remove }) => {
      timesCallbackCalled += 1;
      await add("file.txt", "Hello, world!");
      await remove("file.txt");
      assert.strictEqual(fs.existsSync(path("file.txt")), false);
    });

    assert.strictEqual(timesCallbackCalled, 1);
  });

  it("read a file", async () => {
    let timesCallbackCalled = 0;

    await usingTemporaryFiles(async ({ add, read }) => {
      timesCallbackCalled += 1;
      await add("file.txt", "Hello, world!");
      assert.strictEqual(await read("file.txt"), "Hello, world!");
    });

    assert.strictEqual(timesCallbackCalled, 1);
  });

  it("add a directory", async () => {
    let timesCallbackCalled = 0;

    await usingTemporaryFiles(async ({ addDirectory, path }) => {
      timesCallbackCalled += 1;
      await addDirectory("a/b/c");

      assert.strictEqual(fs.existsSync(path("a")), true);
      assert.strictEqual(fs.existsSync(path("a/b")), true);
      assert.strictEqual(fs.existsSync(path("a/b/c")), true);
    });

    assert.strictEqual(timesCallbackCalled, 1);
  });

  it("add a file to a directory that doesn't exist", async () => {
    let timesCallbackCalled = 0;

    await usingTemporaryFiles(async ({ add, path }) => {
      timesCallbackCalled += 1;
      await add("path/to/file.txt", "Hello, world!");

      assert.strictEqual(fs.existsSync(path("path/to")), true);
      assert.strictEqual(
        fs.readFileSync(path("path/to/file.txt"), "utf8"),
        "Hello, world!"
      );
    });

    assert.strictEqual(timesCallbackCalled, 1);
  });

  it("remove the temporary directory when done", async () => {
    let timesCallbackCalled = 0;
    let temporaryDirectoryPath = "";

    await usingTemporaryFiles(({ path }) => {
      timesCallbackCalled += 1;

      temporaryDirectoryPath = path(".");
      assert.strictEqual(fs.existsSync(temporaryDirectoryPath), true);
    });

    assert.strictEqual(timesCallbackCalled, 1);
    assert.strictEqual(fs.existsSync(temporaryDirectoryPath), false);
  });

  it("remove the temporary directory even if something goes wrong", async () => {
    let timesCallbackCalled = 0;
    let temporaryDirectoryPath = "";

    try {
      await usingTemporaryFiles(({ path }) => {
        timesCallbackCalled += 1;

        temporaryDirectoryPath = path(".");

        throw new Error("Oops!");
      });
    } catch {
      // Ignore
    }

    assert.strictEqual(timesCallbackCalled, 1);
    assert.strictEqual(fs.existsSync(temporaryDirectoryPath), false);
  });

  it("calculate the full path to a file", async () => {
    let timesCallbackCalled = 0;
    let temporaryDirectoryPath = "";
    let deepPath1 = "";
    let deepPath2 = "";

    await usingTemporaryFiles(({ path }) => {
      timesCallbackCalled += 1;

      temporaryDirectoryPath = path(".");

      deepPath1 = path("a", "b", "c");
      deepPath2 = path("a/b/c");
    });

    const expected = nodePath.join(temporaryDirectoryPath, "a", "b", "c");

    assert.strictEqual(timesCallbackCalled, 1);
    assert.strictEqual(deepPath1, expected);
    assert.strictEqual(deepPath2, expected);
  });
});

describe("temporaryFiles", () => {
  it("supports explicit resource management", async () => {
    const files = temporaryFiles();
    const temporaryDirectory = files.path(".");

    assert.strictEqual(typeof files[disposeSymbol], "function");
    assert.strictEqual(typeof files[asyncDisposeSymbol], "function");
    assert.strictEqual(files[disposeSymbol], files.dispose);
    assert.strictEqual(files[asyncDisposeSymbol], files.asyncDispose);

    await files.add("file.txt", "Hello, world!");
    assert.strictEqual(
      fs.readFileSync(files.path("file.txt"), "utf8"),
      "Hello, world!"
    );

    await files.asyncDispose();
    assert.strictEqual(fs.existsSync(temporaryDirectory), false);
  });

  it("supports synchronous disposal", async () => {
    const files = temporaryFiles();
    const temporaryDirectory = files.path(".");

    await files.add("file.txt", "Hello, world!");
    files.dispose();
    await waitForPathToDisappear(temporaryDirectory);

    assert.strictEqual(fs.existsSync(temporaryDirectory), false);
  });

  it("is safe to dispose more than once", async () => {
    const files = temporaryFiles();
    const temporaryDirectory = files.path(".");

    files.dispose();
    files.dispose();
    await files.asyncDispose();

    assert.strictEqual(fs.existsSync(temporaryDirectory), false);
  });
});
