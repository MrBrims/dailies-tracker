export const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

export interface TableFrontmatter {
  current_week: string;
  week_start: string;
  last_rotation: string;
}

export interface TableRow {
  name: string;
  checks: boolean[];
}

export interface ParsedTable {
  frontmatter: TableFrontmatter;
  rows: TableRow[];
}

export interface ArchiveFrontmatter extends TableFrontmatter {
  week: string;
  archived_at: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

export function parseDailiesList(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^-\s+/.test(line))
    .map((line) => line.replace(/^-\s+/, "").trim())
    .filter(Boolean);
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) {
      result[key] = value;
    }
  }
  return result;
}

function serializeFrontmatter(data: Record<string, string>): string {
  const lines = Object.entries(data).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\n---\n\n`;
}

function parseCheckbox(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "[x]";
}

function formatCheckbox(checked: boolean): string {
  return checked ? "[x]" : "[ ]";
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.every((cell) => /^:?-+:?$/.test(cell));
}

export function parseTable(content: string): ParsedTable | null {
  const frontmatterRaw = parseFrontmatter(content);
  const currentWeek = frontmatterRaw.current_week;
  const weekStart = frontmatterRaw.week_start;
  const lastRotation = frontmatterRaw.last_rotation;

  if (!currentWeek || !weekStart || !lastRotation) {
    return null;
  }

  const rows: TableRow[] = [];
  let headerFound = false;

  for (const line of content.split("\n")) {
    if (!line.trim().startsWith("|")) {
      continue;
    }

    const cells = splitTableRow(line);
    if (cells.length < 8) {
      continue;
    }

    if (!headerFound) {
      headerFound = true;
      continue;
    }

    if (isSeparatorRow(cells)) {
      continue;
    }

    const name = cells[0];
    const checks = cells.slice(1, 8).map(parseCheckbox);
    while (checks.length < 7) {
      checks.push(false);
    }
    rows.push({ name, checks: checks.slice(0, 7) });
  }

  return {
    frontmatter: {
      current_week: currentWeek,
      week_start: weekStart,
      last_rotation: lastRotation,
    },
    rows,
  };
}

export function buildTableRows(
  dailies: string[],
  existingRows: TableRow[]
): TableRow[] {
  const existingMap = new Map(existingRows.map((row) => [row.name, row.checks]));

  return dailies.map((name) => {
    const checks = existingMap.get(name);
    if (checks) {
      return { name, checks: [...checks] };
    }
    return { name, checks: Array(7).fill(false) as boolean[] };
  });
}

export function serializeTable(
  frontmatter: TableFrontmatter,
  rows: TableRow[]
): string {
  const header = `| Дейлик | ${DAY_LABELS.join(" | ")} |`;
  const separator = `|--------|${DAY_LABELS.map(() => "----").join("|")}|`;
  const body = rows
    .map((row) => {
      const checks = row.checks.map(formatCheckbox).join(" | ");
      return `| ${row.name} | ${checks} |`;
    })
    .join("\n");

  return (
    serializeFrontmatter({
      current_week: frontmatter.current_week,
      week_start: frontmatter.week_start,
      last_rotation: frontmatter.last_rotation,
    }) +
    `# Таблица дейликов\n\n${header}\n${separator}\n${body}\n`
  );
}

export function serializeArchive(
  frontmatter: ArchiveFrontmatter,
  rows: TableRow[]
): string {
  const header = `| Дейлик | ${DAY_LABELS.join(" | ")} |`;
  const separator = `|--------|${DAY_LABELS.map(() => "----").join("|")}|`;
  const body = rows
    .map((row) => {
      const checks = row.checks.map(formatCheckbox).join(" | ");
      return `| ${row.name} | ${checks} |`;
    })
    .join("\n");

  return (
    serializeFrontmatter({
      week: frontmatter.week,
      week_start: frontmatter.week_start,
      archived_at: frontmatter.archived_at,
      current_week: frontmatter.current_week,
      last_rotation: frontmatter.last_rotation,
    }) +
    `# Архив дейликов ${frontmatter.week}\n\n${header}\n${separator}\n${body}\n`
  );
}

export function getISOWeekInfo(date: Date = new Date()): {
  week: string;
  weekStart: string;
} {
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

  return {
    week,
    weekStart: formatDateLocal(local),
  };
}

export function todayString(): string {
  return formatDateLocal(new Date());
}
