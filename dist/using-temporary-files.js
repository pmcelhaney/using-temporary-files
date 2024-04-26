/* eslint-disable total-functions/no-unsafe-readonly-mutable-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-await-in-loop */
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
// eslint-disable-next-line max-statements
export async function usingTemporaryFiles(...callbacks) {
    const baseDirectory = DEBUG
        ? nodePath.resolve(process.cwd(), "./")
        : os.tmpdir();
    const temporaryDirectory = String(await fs.mkdtemp(nodePath.join(baseDirectory, "utf-")));
    try {
        for (const callback of callbacks) {
            // eslint-disable-next-line n/callback-return
            await callback({
                add: createAddFunction(temporaryDirectory),
                addDirectory: createAddDirectoryFunction(temporaryDirectory),
                path(...relativePaths) {
                    return nodePath.join(temporaryDirectory, ...relativePaths);
                },
                read: createReadFunction(temporaryDirectory),
                remove: createRemoveFunction(temporaryDirectory),
            });
        }
    }
    finally {
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
}
