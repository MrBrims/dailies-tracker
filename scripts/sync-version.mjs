import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { VERSION } from "./changelog-version.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function updateJsonVersion(filePath, label) {
  const data = JSON.parse(readFileSync(filePath, "utf8"));

  if (data.version === VERSION) {
    return false;
  }

  data.version = VERSION;
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  console.log(`Updated ${label} version -> ${VERSION}`);
  return true;
}

const manifestUpdated = updateJsonVersion(join(root, "manifest.json"), "manifest.json");
const packageUpdated = updateJsonVersion(join(root, "package.json"), "package.json");

const readmePath = join(root, "README.md");
const readme = readFileSync(readmePath, "utf8");
const badgePattern =
  /(\[!\[Version\]\(https:\/\/img\.shields\.io\/badge\/Version-)[\d.]+(-green\.svg\)\]\(#changelog\))/;
const updatedReadme = readme.replace(badgePattern, `$1${VERSION}$2`);

if (updatedReadme !== readme) {
  writeFileSync(readmePath, updatedReadme);
  console.log(`Updated README Version badge -> ${VERSION}`);
}

if (!manifestUpdated && !packageUpdated && updatedReadme === readme) {
  console.log(`Version already ${VERSION}`);
}
