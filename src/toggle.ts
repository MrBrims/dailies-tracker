import { parseTable, serializeTable } from "./parser";

export function toggleTableCheckbox(
  content: string,
  rowIndex: number,
  dayIndex: number
): string | null {
  const parsed = parseTable(content);
  if (!parsed) {
    return null;
  }
  if (rowIndex < 0 || rowIndex >= parsed.rows.length) {
    return null;
  }
  if (dayIndex < 0 || dayIndex >= 7) {
    return null;
  }

  parsed.rows[rowIndex].checks[dayIndex] = !parsed.rows[rowIndex].checks[dayIndex];
  return serializeTable(parsed.frontmatter, parsed.rows);
}
