/* eslint-disable total-functions/no-unsafe-readonly-mutable-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-await-in-loop */
import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import nodePath from "node:path";
const RETRIES = 5;
const RETRY_TIMEOUT_MILLISECONDS = 200;
// eslint-disable-next-line n/no-process-env
const DEBUG = process.env.USING_TEMPORARY_FILES_DEBUG === "1";
async function ensureDirectoryExists(filePath) {
    const directory = nodePath.dirname(filePath);
    try {
        await fs.access(directory, fsConstants.W_OK);
    }
    catch {
        await fs.mkdir(directory, {
            recursive: true,
        });
    }
}
function createAddFunction(basePath) {
    return async function add(filePath, content) {
        const fullPath = nodePath.join(basePath, filePath);
        await ensureDirectoryExists(fullPath);
        await fs.writeFile(fullPath, content);
    };
}
function createAddDirectoryFunction(basePath) {
    return async function addDirectory(filePath) {
        const fullPath = nodePath.join(basePath, filePath);
        await fs.mkdir(fullPath, {
            recursive: true,
        });
    };
}
function createRemoveFunction(basePath) {
    return async function remove(filePath) {
        const fullPath = nodePath.join(basePath, filePath);
        await ensureDirectoryExists(fullPath);
        await fs.rm(fullPath);
    };
}
function createReadFunction(basePath) {
    return async function read(filePath, encoding = "utf8") {
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
function createOperations(temporaryDirectory, ready) {
    return {
        async add(filePath, contents) {
            await ready;
            await createAddFunction(temporaryDirectory)(filePath, contents);
        },
        async addDirectory(filePath) {
            await ready;
            await createAddDirectoryFunction(temporaryDirectory)(filePath);
        },
        path(...relativePaths) {
            return nodePath.join(temporaryDirectory, ...relativePaths);
        },
        async read(filePath) {
            await ready;
            return await createReadFunction(temporaryDirectory)(filePath);
        },
        async remove(filePath) {
            await ready;
            await createRemoveFunction(temporaryDirectory)(filePath);
        },
    };
}
async function removeTemporaryDirectory(temporaryDirectory) {
    let retries = RETRIES;
    while (retries > 0) {
        try {
            await fs.rm(temporaryDirectory, {
                recursive: true,
            });
            break;
        }
        catch {
            // eslint-disable-next-line promise/avoid-new, compat/compat
            await new Promise((resolve) => {
                setTimeout(resolve, RETRY_TIMEOUT_MILLISECONDS);
            });
            retries -= 1;
        }
    }
}
async function removeTemporaryDirectoryWhenReady(ready, temporaryDirectory) {
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
    let cleanupPromise = ready;
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
        disposed ||= true;
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
    const resource = {
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
export function temporaryFiles() {
    return createTemporaryFilesResource().resource;
}
export async function usingTemporaryFiles(...callbacks) {
    const { ready, resource: operations } = createTemporaryFilesResource();
    await ready;
    try {
        for (const callback of callbacks) {
            // eslint-disable-next-line n/callback-return
            await callback(operations);
        }
    }
    finally {
        await operations.asyncDispose();
    }
}
