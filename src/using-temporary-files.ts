/* eslint-disable total-functions/no-unsafe-readonly-mutable-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-await-in-loop */
import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import nodePath from "node:path";

type BufferEncoding =
  | "ascii"
  | "base64"
  | "base64url"
  | "binary"
  | "hex"
  | "latin1"
  | "ucs-2"
  | "ucs2"
  // eslint-disable-next-line unicorn/text-encoding-identifier-case
  | "utf-8"
  | "utf-16le"
  | "utf8"
  | "utf16le";

const RETRIES = 5;
const RETRY_TIMEOUT_MILLISECONDS = 200;

// eslint-disable-next-line n/no-process-env
const DEBUG = process.env.USING_TEMPORARY_FILES_DEBUG === "1";

interface Operations {
  add: (path: string, contents: string) => Promise<void>;
  addDirectory: (path: string) => Promise<void>;
  path: (...relativePaths: Readonly<string[]>) => string;
  read: (path: string) => Promise<string>;
  remove: (path: string) => Promise<void>;
}

interface DisposableOperations extends Readonly<Operations> {
  [Symbol.asyncDispose]: () => Promise<void>;
  [Symbol.dispose]: () => void;
  asyncDispose: () => Promise<void>;
  dispose: () => void;
}

// eslint-disable-next-line etc/prefer-interface
type Callback = (operations: Readonly<Operations>) => Promise<void>;

async function ensureDirectoryExists(filePath: string) {
  const directory = nodePath.dirname(filePath);

  try {
    await fs.access(directory, fsConstants.W_OK);
  } catch {
    await fs.mkdir(directory, {
      recursive: true,
    });
  }
}

function createAddFunction(basePath: string) {
  return async function add(filePath: string, content: string) {
    const fullPath = nodePath.join(basePath, filePath);

    await ensureDirectoryExists(fullPath);
    await fs.writeFile(fullPath, content);
  };
}

function createAddDirectoryFunction(basePath: string) {
  return async function addDirectory(filePath: string) {
    const fullPath = nodePath.join(basePath, filePath);

    await fs.mkdir(fullPath, {
      recursive: true,
    });
  };
}

function createRemoveFunction(basePath: string) {
  return async function remove(filePath: string) {
    const fullPath = nodePath.join(basePath, filePath);

    await ensureDirectoryExists(fullPath);
    await fs.rm(fullPath);
  };
}

function createReadFunction(basePath: string) {
  return async function read(
    filePath: string,
    encoding: BufferEncoding = "utf8"
  ) {
    const fullPath = nodePath.join(basePath, filePath);

    return await fs.readFile(fullPath, encoding);
  };
}

function createTemporaryDirectory() {
  const baseDirectory = DEBUG
    ? nodePath.resolve(process.cwd(), "./")
    : os.tmpdir();

  return nodePath.join(baseDirectory, `utf-${randomUUID()}`);
}

function createOperations(
  temporaryDirectory: string,
  ready: Readonly<Promise<unknown>>
): Readonly<Operations> {
  return {
    async add(filePath: string, contents: string) {
      await ready;
      await createAddFunction(temporaryDirectory)(filePath, contents);
    },

    async addDirectory(filePath: string) {
      await ready;
      await createAddDirectoryFunction(temporaryDirectory)(filePath);
    },

    path(...relativePaths: Readonly<string[]>) {
      return nodePath.join(temporaryDirectory, ...relativePaths);
    },

    async read(filePath: string) {
      await ready;

      return await createReadFunction(temporaryDirectory)(filePath);
    },

    async remove(filePath: string) {
      await ready;
      await createRemoveFunction(temporaryDirectory)(filePath);
    },
  };
}

async function removeTemporaryDirectory(temporaryDirectory: string) {
  let retries = RETRIES;

  while (retries > 0) {
    try {
      await fs.rm(temporaryDirectory, {
        recursive: true,
      });

      break;
    } catch {
      // eslint-disable-next-line promise/avoid-new, compat/compat
      await new Promise((resolve) => {
        setTimeout(resolve, RETRY_TIMEOUT_MILLISECONDS);
      });
      retries -= 1;
    }
  }
}

async function removeTemporaryDirectoryWhenReady(
  ready: Readonly<Promise<unknown>>,
  temporaryDirectory: string
) {
  await ready;
  await removeTemporaryDirectory(temporaryDirectory);
}

// eslint-disable-next-line max-statements
function createTemporaryFilesResource() {
  const temporaryDirectory = createTemporaryDirectory();
  const ready = fs.mkdir(temporaryDirectory, {
    recursive: true,
  });

  let disposed = false;
  let cleanupPromise: Promise<unknown> = ready;
  let cleanupQueued = false;

  const operations = createOperations(temporaryDirectory, ready);

  function queueCleanup() {
    if (cleanupQueued) {
      return;
    }

    cleanupQueued = true;
    cleanupPromise = removeTemporaryDirectoryWhenReady(ready, temporaryDirectory);
  }

  async function asyncDispose() {
    if (disposed) {
      await cleanupPromise;

      return;
    }

    disposed = true;

    queueCleanup();
    await cleanupPromise;
  }

  function dispose() {
    if (disposed) {
      return;
    }

    disposed = true;
    queueCleanup();
  }

  const resource: DisposableOperations = {
    ...operations,
    asyncDispose,
    dispose,
    [Symbol.asyncDispose]: asyncDispose,
    [Symbol.dispose]: dispose,
  };

  return {
    ready,
    resource,
  };
}

export function temporaryFiles(): DisposableOperations {
  return createTemporaryFilesResource().resource;
}

export async function usingTemporaryFiles(...callbacks: Readonly<Callback[]>) {
  const { ready, resource: operations } = createTemporaryFilesResource();

  await ready;

  try {
    for (const callback of callbacks) {
      // eslint-disable-next-line n/callback-return
      await callback(operations);
    }
  } finally {
    await operations.asyncDispose();
  }
}
