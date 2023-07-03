import fs from "node:fs";

import { usingTemporaryFiles } from "../src/using-temporary-files.js";

describe("smoke test", () => {
	it("add a file and then read it", () => {
		usingTemporaryFiles(async ({ path, add }) => {
			add("file.txt", "Hello, world!");
			expect(fs.readFileSync(path("file.txt"), "utf8")).toBe("Hello, world!");
		});
	});
});
