import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import os from "node:os";
import nodePath from "node:path";

const DEBUG = false;

async function ensureDirectoryExists(filePath) {
	const directory = nodePath.dirname(filePath);

	try {
		await fs.access(directory, fsConstants.W_OK);
	} catch {
		await fs.mkdir(directory, { recursive: true });
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

		await fs.mkdir(fullPath, { recursive: true });
	};
}

function createRemoveFunction(basePath) {
	return async function remove(filePath) {
		const fullPath = nodePath.join(basePath, filePath);

		await ensureDirectoryExists(fullPath);
		await fs.rm(fullPath);
	};
}

export async function usingTemporaryFiles(...callbacks) {
	const baseDirectory = DEBUG
		? nodePath.resolve(process.cwd(), "./")
		: os.tmpdir();

	const temporaryDirectory = `${await fs.mkdtemp(
		nodePath.join(baseDirectory, "utf-")
	)}/`;

	try {
		for (const callback of callbacks) {
			await callback({
				add: createAddFunction(temporaryDirectory),
				remove: createRemoveFunction(temporaryDirectory),
				addDirectory: createAddDirectoryFunction(temporaryDirectory),

				path(...relativePaths) {
					return nodePath.join(temporaryDirectory, ...relativePaths);
				},
			});
		}
	} finally {
		if (!DEBUG) {
			await fs.rm(temporaryDirectory, { recursive: true });
		}
	}
}
