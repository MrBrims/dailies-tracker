import { copyFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { VAULT_ROOT } from "./vault-config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginDir = join(VAULT_ROOT, ".obsidian", "plugins", "dailies-tracker");

mkdirSync(pluginDir, { recursive: true });

const files = ["main.js", "manifest.json", "styles.css"];

for (const file of files) {
  const source = join(root, file);
  if (!existsSync(source)) {
    console.warn(`Skip missing file: ${file}`);
    continue;
  }
  copyFileSync(source, join(pluginDir, file));
  console.log(`Copied ${file} -> ${pluginDir}`);
}
