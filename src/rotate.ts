import { App } from "obsidian";
import {
  getISOWeekInfo,
  parseDailiesList,
  parseTable,
  serializeArchive,
  serializeTable,
  todayString,
} from "./parser";
import { DailiesTrackerSettings } from "./settings";
import { syncTableFromSource } from "./sync";
import { needsRotation } from "./week";
import { VaultWriter } from "./writer";

async function ensureArchiveFolder(
  app: App,
  settings: DailiesTrackerSettings
): Promise<void> {
  await app.vault.createFolder(settings.archiveFolder).catch(() => undefined);
}

export async function rotateWeek(
  app: App,
  settings: DailiesTrackerSettings,
  writer: VaultWriter,
  force = false
): Promise<boolean> {
  await ensureArchiveFolder(app, settings);

  const tableContent = await writer.read(app, settings.tablePath);
  const weekInfo = getISOWeekInfo();
  const today = todayString();

  if (!tableContent) {
    await syncTableFromSource(app, settings, writer);
    return true;
  }

  const parsed = parseTable(tableContent);
  if (!parsed) {
    await syncTableFromSource(app, settings, writer);
    return true;
  }

  if (!force && !needsRotation(parsed.frontmatter.current_week)) {
    return false;
  }

  const archivePath = `${settings.archiveFolder}/${parsed.frontmatter.current_week}.md`;
  const archiveContent = serializeArchive(
    {
      week: parsed.frontmatter.current_week,
      week_start: parsed.frontmatter.week_start,
      archived_at: today,
      current_week: parsed.frontmatter.current_week,
      last_rotation: parsed.frontmatter.last_rotation,
    },
    parsed.rows
  );

  const existingArchive = app.vault.getAbstractFileByPath(archivePath);
  if (!existingArchive) {
    await writer.write(app, archivePath, archiveContent);
  }

  const sourceContent = await writer.read(app, settings.sourcePath);
  const dailies = sourceContent ? parseDailiesList(sourceContent) : parsed.rows.map((r) => r.name);
  const freshFrontmatter = {
    current_week: weekInfo.week,
    week_start: weekInfo.weekStart,
    last_rotation: today,
  };
  const freshRows = dailies.map((name) => ({
    name,
    checks: Array(7).fill(false) as boolean[],
  }));

  await writer.write(app, settings.tablePath, serializeTable(freshFrontmatter, freshRows));
  return true;
}

export async function checkAndRotateOnStartup(
  app: App,
  settings: DailiesTrackerSettings,
  writer: VaultWriter
): Promise<void> {
  const tableContent = await writer.read(app, settings.tablePath);
  if (!tableContent) {
    await syncTableFromSource(app, settings, writer);
    return;
  }

  const parsed = parseTable(tableContent);
  if (!parsed || needsRotation(parsed.frontmatter.current_week)) {
    await rotateWeek(app, settings, writer);
  }
}
