import { App, PluginSettingTab, Setting } from "obsidian";
import type DailiesTrackerPlugin from "./main";

export interface DailiesTrackerSettings {
  sourcePath: string;
  tablePath: string;
  archiveFolder: string;
}

export const DEFAULT_SETTINGS: DailiesTrackerSettings = {
  sourcePath: BUILD_DEFAULT_SOURCE_PATH,
  tablePath: BUILD_DEFAULT_TABLE_PATH,
  archiveFolder: BUILD_DEFAULT_ARCHIVE_FOLDER,
};

export class DailiesTrackerSettingTab extends PluginSettingTab {
  plugin: DailiesTrackerPlugin;

  constructor(app: App, plugin: DailiesTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Dailies Tracker" });

    new Setting(containerEl)
      .setName("Source file")
      .setDesc("Path to the dailies list (source of truth)")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.sourcePath)
          .setValue(this.plugin.settings.sourcePath)
          .onChange(async (value) => {
            this.plugin.settings.sourcePath = value.trim() || DEFAULT_SETTINGS.sourcePath;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Table file")
      .setDesc("Path to the weekly checkbox table")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.tablePath)
          .setValue(this.plugin.settings.tablePath)
          .onChange(async (value) => {
            this.plugin.settings.tablePath = value.trim() || DEFAULT_SETTINGS.tablePath;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Archive folder")
      .setDesc("Folder for archived weekly tables")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.archiveFolder)
          .setValue(this.plugin.settings.archiveFolder)
          .onChange(async (value) => {
            this.plugin.settings.archiveFolder = value.trim() || DEFAULT_SETTINGS.archiveFolder;
            await this.plugin.saveSettings();
          })
      );
  }
}
