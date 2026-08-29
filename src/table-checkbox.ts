import { App, Plugin, TFile } from "obsidian";
import { toggleTableCheckbox } from "./toggle";
import { DailiesTrackerSettings } from "./settings";
import { VaultWriter } from "./writer";

function isCheckboxText(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === "[ ]" || normalized === "[x]";
}

function cellText(cell: HTMLTableCellElement): string {
  return (cell.textContent ?? "").trim();
}

export function registerTableCheckboxProcessor(
  plugin: Plugin,
  app: App,
  settings: DailiesTrackerSettings,
  writer: VaultWriter
): void {
  plugin.registerMarkdownPostProcessor((element, context) => {
    if (context.sourcePath !== settings.tablePath) {
      return;
    }

    const tables = Array.from(element.querySelectorAll("table"));
    for (const table of tables) {
      const rows = Array.from(table.querySelectorAll("tr"));
      let dataRowIndex = 0;

      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td"));
        if (cells.length < 8) {
          continue;
        }

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const cell = cells[dayIndex + 1];
          const text = cellText(cell);
          if (!isCheckboxText(text)) {
            continue;
          }

          const previousChecked = text.toLowerCase() === "[x]";
          const rowIndex = dataRowIndex;

          cell.empty();
          cell.addClass("dailies-tracker-cell");

          const checkbox = cell.createEl("input", {
            type: "checkbox",
            cls: "dailies-tracker-checkbox",
          });
          checkbox.checked = previousChecked;
          checkbox.setAttr("aria-label", `Day ${dayIndex + 1}, row ${rowIndex + 1}`);

          checkbox.addEventListener("click", (event: MouseEvent) => {
            event.stopPropagation();
          });

          checkbox.addEventListener("change", () => {
            void (async () => {
              const file = app.vault.getAbstractFileByPath(settings.tablePath);
              if (!(file instanceof TFile)) {
                checkbox.checked = previousChecked;
                return;
              }

              const content = await app.vault.read(file);
              const updated = toggleTableCheckbox(content, rowIndex, dayIndex);
              if (updated === null) {
                checkbox.checked = previousChecked;
                return;
              }

              await writer.write(app, settings.tablePath, updated);
            })();
          });
        }

        dataRowIndex++;
      }
    }
  });
}
