import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readme = readFileSync(join(root, "README.md"), "utf8");

const match = readme.match(/## Changelog\s*\r?\n\s*### (\d+\.\d+\.\d+)/);

if (!match) {
  throw new Error(
    "Cannot find version in README.md Changelog (expected '### X.Y.Z' after '## Changelog')"
  );
}

export const VERSION = match[1];
