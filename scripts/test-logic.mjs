import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { VAULT_ROOT } from "./vault-config.mjs";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatDateLocal(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDailiesList(content) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^-\s+/.test(line))
    .map((line) => line.replace(/^-\s+/, "").trim())
    .filter(Boolean);
}

function getISOWeekInfo(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const week = `${utc.getUTCFullYear()}-W${pad2(weekNo)}`;
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  local.setDate(local.getDate() + diff);
  return { week, weekStart: formatDateLocal(local) };
}

function parseCheckbox(value) {
  return value.trim().toLowerCase() === "[x]";
}

function formatCheckbox(checked) {
  return checked ? "[x]" : "[ ]";
}

function parseTable(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!fm.current_week || !fm.week_start || !fm.last_rotation) return null;

  const rows = [];
  let headerFound = false;
  for (const line of content.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    if (cells.length < 8) continue;
    if (!headerFound) {
      headerFound = true;
      continue;
    }
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    rows.push({
      name: cells[0],
      checks: cells.slice(1, 8).map(parseCheckbox),
    });
  }
  return {
    frontmatter: {
      current_week: fm.current_week,
      week_start: fm.week_start,
      last_rotation: fm.last_rotation,
    },
    rows,
  };
}

function serializeTable(frontmatter, rows) {
  const fm = `---\ncurrent_week: ${frontmatter.current_week}\nweek_start: ${frontmatter.week_start}\nlast_rotation: ${frontmatter.last_rotation}\n---\n\n`;
  const header = `| Дейлик | ${DAY_LABELS.join(" | ")} |`;
  const separator = `|--------|${DAY_LABELS.map(() => "----").join("|")}|`;
  const body = rows.map((row) => `| ${row.name} | ${row.checks.map(formatCheckbox).join(" | ")} |`).join("\n");
  return `${fm}# Таблица дейликов\n\n${header}\n${separator}\n${body}\n`;
}

function serializeArchive(frontmatter, rows) {
  const fm = `---\nweek: ${frontmatter.week}\nweek_start: ${frontmatter.week_start}\narchived_at: ${frontmatter.archived_at}\ncurrent_week: ${frontmatter.current_week}\nlast_rotation: ${frontmatter.last_rotation}\n---\n\n`;
  const header = `| Дейлик | ${DAY_LABELS.join(" | ")} |`;
  const separator = `|--------|${DAY_LABELS.map(() => "----").join("|")}|`;
  const body = rows.map((row) => `| ${row.name} | ${row.checks.map(formatCheckbox).join(" | ")} |`).join("\n");
  return `${fm}# Архив дейликов ${frontmatter.week}\n\n${header}\n${separator}\n${body}\n`;
}

function buildTableRows(dailies, existingRows) {
  const map = new Map(existingRows.map((row) => [row.name, row.checks]));
  return dailies.map((name) => ({
    name,
    checks: map.has(name) ? [...map.get(name)] : Array(7).fill(false),
  }));
}

function needsRotation(currentWeek, date = new Date()) {
  if (!currentWeek) return true;
  return currentWeek !== getISOWeekInfo(date).week;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const vaultRoot = VAULT_ROOT;
const sourcePath = join(vaultRoot, "Задачи и заметки/Дейлики и задачи/Дейлики.md");
const tablePath = join(vaultRoot, "Задачи и заметки/Дейлики и задачи/Таблица дейликов.md");
const archiveDir = join(vaultRoot, "Задачи и заметки/Дейлики и задачи/Архив дейликов");

const source = readFileSync(sourcePath, "utf8");
const dailies = parseDailiesList(source);
assert(dailies.length === 5, `Expected 5 dailies, got ${dailies.length}`);

const weekInfo = getISOWeekInfo(new Date("2026-08-29"));
assert(weekInfo.week === "2026-W35", `Expected 2026-W35, got ${weekInfo.week}`);
assert(weekInfo.weekStart === "2026-08-24", `Expected 2026-08-24, got ${weekInfo.weekStart}`);

const rows = buildTableRows(dailies, []);
rows[0].checks[1] = true;
const table = serializeTable(
  {
    current_week: weekInfo.week,
    week_start: weekInfo.weekStart,
    last_rotation: formatDateLocal(new Date("2026-08-29")),
  },
  rows
);

const reparsed = parseTable(table);
assert(reparsed !== null, "parseTable returned null");
assert(reparsed.rows.length === 5, "Reparsed row count mismatch");
assert(reparsed.rows[0].checks[1] === true, "Checkbox state not preserved");

const merged = buildTableRows([...dailies, "New daily task"], reparsed.rows);
assert(merged.length === 6, "Merged row count should be 6");
assert(merged[0].checks[1] === true, "Existing checkbox lost after merge");
assert(merged[5].checks.every((c) => c === false), "New row should be empty");

assert(needsRotation("2026-W34", new Date("2026-08-29")) === true, "Rotation should be needed");
assert(needsRotation("2026-W35", new Date("2026-08-29")) === false, "Rotation should not be needed");

function toggleTableCheckbox(content, rowIndex, dayIndex) {
  const parsed = parseTable(content);
  if (!parsed || rowIndex < 0 || rowIndex >= parsed.rows.length || dayIndex < 0 || dayIndex >= 7) {
    return null;
  }
  parsed.rows[rowIndex].checks[dayIndex] = !parsed.rows[rowIndex].checks[dayIndex];
  return serializeTable(parsed.frontmatter, parsed.rows);
}

const toggled = toggleTableCheckbox(table, 0, 0);
assert(toggled !== null, "toggleTableCheckbox failed");
const toggledParsed = parseTable(toggled);
assert(toggledParsed.rows[0].checks[0] === true, "Toggle should check first cell");
assert(toggledParsed.rows[0].checks[1] === true, "Other checks must stay intact");

const archivePath = join(archiveDir, "2026-W34.md");
const archiveContent = serializeArchive(
  {
    week: "2026-W34",
    week_start: "2026-08-17",
    archived_at: "2026-08-24",
    current_week: "2026-W34",
    last_rotation: "2026-08-17",
  },
  reparsed.rows
);
writeFileSync(archivePath, archiveContent, "utf8");

const newWeek = getISOWeekInfo(new Date("2026-08-31"));
const freshTable = serializeTable(
  {
    current_week: newWeek.week,
    week_start: newWeek.weekStart,
    last_rotation: "2026-08-31",
  },
  buildTableRows(dailies, [])
);
assert(parseTable(freshTable).rows.every((row) => row.checks.every((c) => c === false)), "Fresh table must be empty");
assert(newWeek.week === "2026-W36", `Expected W36 after rotate, got ${newWeek.week}`);

mkdirSync(archiveDir, { recursive: true });
writeFileSync(tablePath, table, "utf8");

console.log("All parser/sync/rotate tests passed.");
console.log(`Table written to ${tablePath}`);
