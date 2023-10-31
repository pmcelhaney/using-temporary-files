import fs from "node:fs";
import path from "node:path";

import { usingTemporaryFiles } from "../src/using-temporary-files.js";

describe("usingTemporaryFiles", () => {
	it("add a file", async () => {
		let timesCallbackCalled = 0;
		await usingTemporaryFiles(async ({ path, add }) => {
			await add("file.txt", "Hello, world!");
			timesCallbackCalled++;
			expect(fs.readFileSync(path("file.txt"), "utf8")).toBe("Hello, world!");
		});

		expect(timesCallbackCalled).toBe(1);
	});

	it("remove a file", async () => {
		let timesCallbackCalled = 0;
		await usingTemporaryFiles(async ({ path, add, remove }) => {
			timesCallbackCalled++;
			await add("file.txt", "Hello, world!");
			await remove("file.txt");
			expect(fs.existsSync(path("file.txt"))).toBe(false);
		});

		expect(timesCallbackCalled).toBe(1);
	});

	it("read a file", async () => {
		let timesCallbackCalled = 0;
		await usingTemporaryFiles(async ({ add, read }) => {
			timesCallbackCalled++;
			await add("file.txt", "Hello, world!");
			expect(await read("file.txt")).toBe("Hello, world!");
		});

		expect(timesCallbackCalled).toBe(1);
	});

	it("add a directory", async () => {
		let timesCallbackCalled = 0;
		await usingTemporaryFiles(async ({ path, addDirectory }) => {
			timesCallbackCalled++;
			await addDirectory("a/b/c");

			expect(fs.existsSync(path("a"))).toBe(true);
			expect(fs.existsSync(path("a/b"))).toBe(true);
			expect(fs.existsSync(path("a/b/c"))).toBe(true);
		});

		expect(timesCallbackCalled).toBe(1);
	});

	it("add a file to a directory that doesn't exist", async () => {
		let timesCallbackCalled = 0;
		await usingTemporaryFiles(async ({ path, add }) => {
			timesCallbackCalled++;
			await add("path/to/file.txt", "Hello, world!");

			expect(fs.existsSync(path("path/to"))).toBe(true);

			expect(fs.readFileSync(path("path/to/file.txt"), "utf8")).toBe(
				"Hello, world!"
			);
		});

		expect(timesCallbackCalled).toBe(1);
	});

	it("remove the temporary directory when done", async () => {
		let timesCallbackCalled = 0;
		let temporaryDirectoryPath;
		await usingTemporaryFiles(async ({ path }) => {
			timesCallbackCalled++;

			temporaryDirectoryPath = path(".");
			expect(fs.existsSync(temporaryDirectoryPath)).toBe(true);
		});

		expect(timesCallbackCalled).toBe(1);
		expect(fs.existsSync(temporaryDirectoryPath)).toBe(false);
	});

	it("remove the temporary directory even if something goes wrong", async () => {
		let timesCallbackCalled = 0;
		let temporaryDirectoryPath;

		try {
			await usingTemporaryFiles(async ({ path }) => {
				timesCallbackCalled++;

				temporaryDirectoryPath = path(".");

				throw new Error("Oops!");
			});
		} catch {
			// Ignore
		}

		expect(timesCallbackCalled).toBe(1);
		expect(fs.existsSync(temporaryDirectoryPath)).toBe(false);
	});

	it("calculate the full path to a file", async () => {
		let timesCallbackCalled = 0;
		let temporaryDirectoryPath;
		let deepPath1 = "";
		let deepPath2 = "";

		await usingTemporaryFiles(async ({ path }) => {
			timesCallbackCalled++;

			temporaryDirectoryPath = path(".");

			deepPath1 = path("a", "b", "c");
			deepPath2 = path("a/b/c");
		});

		const expected = path.join(temporaryDirectoryPath, "a", "b", "c");

		expect(timesCallbackCalled).toBe(1);
		expect(deepPath1).toBe(expected);
		expect(deepPath2).toBe(expected);
	});
});
