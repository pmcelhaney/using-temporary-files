import { execFile } from "node:child_process";
import { readdir, readFile, symlink } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { temporaryFiles } from "../dist/using-temporary-files.js";

const executeFile = promisify(execFile);
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const ignoredDirectories = new Set([".git", "coverage", "node_modules"]);

async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(directory, entry.name));
  const subdirectories = entries.filter(
    (entry) => entry.isDirectory() && !ignoredDirectories.has(entry.name)
  );
  const nestedFiles = await Promise.all(
    subdirectories.map((entry) =>
      findMarkdownFiles(join(directory, entry.name))
    )
  );

  return [...markdownFiles, ...nestedFiles.flat()];
}

function isUnitTestFence(line) {
  const tags = line?.startsWith("```")
    ? line.slice(3).trim().split(/\s+/u)
    : [];

  return tags[0] === "js" && tags.includes("unit-test");
}

function extractUnitTests(markdown, sourcePath) {
  const lines = markdown.split(/\r?\n/u);
  const unitTests = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (isUnitTestFence(lines.at(index))) {
      const firstCodeLine = index + 2;
      const code = [];

      for (
        index += 1;
        index < lines.length && lines[index] !== "```";
        index += 1
      ) {
        code.push(lines[index]);
      }

      if (index === lines.length) {
        throw new Error(
          `Unclosed unit-test block in ${sourcePath}:${firstCodeLine}`
        );
      }

      unitTests.push({
        code: code.join("\n"),
        line: firstCodeLine,
        sourcePath,
      });
    }
  }

  return unitTests;
}

const markdownFiles = await findMarkdownFiles(projectRoot);
const extractedUnitTests = await Promise.all(
  markdownFiles.map(async (sourcePath) =>
    extractUnitTests(await readFile(sourcePath, "utf8"), sourcePath)
  )
);
const unitTests = extractedUnitTests.flat();

for (const unitTest of unitTests) {
  const name = `${relative(projectRoot, unitTest.sourcePath)}:${unitTest.line}`;

  test(name, async () => {
    await using files = temporaryFiles();

    await files.addDirectory("node_modules");
    await symlink(
      projectRoot,
      files.path("node_modules", "using-temporary-files"),
      process.platform === "win32" ? "junction" : "dir"
    );

    const testFile = `${basename(unitTest.sourcePath, ".md")}.test.js`;

    await files.add(testFile, `${unitTest.code}\n`);
    await executeFile(process.execPath, ["--test", files.path(testFile)], {
      cwd: projectRoot,
    });
  });
}
