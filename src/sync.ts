import { App } from "obsidian";
import {
  buildTableRows,
  getISOWeekInfo,
  parseDailiesList,
  parseTable,
  serializeTable,
  todayString,
} from "./parser";
import { DailiesTrackerSettings } from "./settings";
import { VaultWriter } from "./writer";

export async function syncTableFromSource(
  app: App,
  settings: DailiesTrackerSettings,
  writer: VaultWriter
): Promise<void> {
  const sourceContent = await writer.read(app, settings.sourcePath);
  if (sourceContent === null) {
    return;
  }

  const dailies = parseDailiesList(sourceContent);
  const tableContent = await writer.read(app, settings.tablePath);
  const weekInfo = getISOWeekInfo();
  const today = todayString();

  let existingRows: ReturnType<typeof buildTableRows> = [];
  let frontmatter = {
    current_week: weekInfo.week,
    week_start: weekInfo.weekStart,
    last_rotation: today,
  };

  if (tableContent) {
    const parsed = parseTable(tableContent);
    if (parsed) {
      existingRows = parsed.rows;
      frontmatter = parsed.frontmatter;
    }
  }

  const rows = buildTableRows(dailies, existingRows);
  const output = serializeTable(frontmatter, rows);
  await writer.write(app, settings.tablePath, output);
}

export async function ensureTableExists(
  app: App,
  settings: DailiesTrackerSettings,
  writer: VaultWriter
): Promise<void> {
  const tableContent = await writer.read(app, settings.tablePath);
  if (tableContent !== null) {
    return;
  }
  await syncTableFromSource(app, settings, writer);
}
