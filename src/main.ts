import { Plugin, TAbstractFile, TFile } from "obsidian";
import { checkAndRotateOnStartup, rotateWeek } from "./rotate";
import {
  DEFAULT_SETTINGS,
  DailiesTrackerSettings,
  DailiesTrackerSettingTab,
} from "./settings";
import { syncTableFromSource } from "./sync";
import { registerTableCheckboxProcessor } from "./table-checkbox";
import { VaultWriter } from "./writer";

export default class DailiesTrackerPlugin extends Plugin {
  settings: DailiesTrackerSettings = DEFAULT_SETTINGS;
  writer = new VaultWriter();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new DailiesTrackerSettingTab(this.app, this));

    registerTableCheckboxProcessor(this, this.app, this.settings, this.writer);

    this.registerEvent(
      this.app.vault.on("modify", (file: TAbstractFile) => {
        if (!(file instanceof TFile)) {
          return;
        }
        if (file.path !== this.settings.sourcePath) {
          return;
        }
        if (this.writer.isInternalWrite(file.path)) {
          return;
        }
        this.writer.debounce("sync", () => this.runSync());
      })
    );

    this.app.workspace.onLayoutReady(() => {
      void this.runStartup();
    });

    this.addCommand({
      id: "sync-from-source",
      name: "Dailies: Sync from source",
      callback: () => {
        void this.runSync();
      },
    });

    this.addCommand({
      id: "rotate-week",
      name: "Dailies: Rotate week now",
      callback: () => {
        void rotateWeek(this.app, this.settings, this.writer, true);
      },
    });

    this.addCommand({
      id: "open-table",
      name: "Dailies: Open table",
      callback: () => {
        void this.openTable();
      },
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async runSync(): Promise<void> {
    await syncTableFromSource(this.app, this.settings, this.writer);
  }

  private async runStartup(): Promise<void> {
    await checkAndRotateOnStartup(this.app, this.settings, this.writer);
  }

  private async openTable(): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(this.settings.tablePath);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf().openFile(file);
      return;
    }
    await syncTableFromSource(this.app, this.settings, this.writer);
    const created = this.app.vault.getAbstractFileByPath(this.settings.tablePath);
    if (created instanceof TFile) {
      await this.app.workspace.getLeaf().openFile(created);
    }
  }
}
