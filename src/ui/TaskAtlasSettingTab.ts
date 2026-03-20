import { App, PluginSettingTab, Setting, TFile } from "obsidian";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";
import type TaskAtlasPlugin from "../index";
import { DEFAULT_DONE_MARKERS } from "../types";

export default class TaskAtlasSettingTab extends PluginSettingTab {
  plugin: TaskAtlasPlugin;

  constructor(app: App, plugin: TaskAtlasPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async getTemplateHeadings(): Promise<string[]> {
    const { template } = getDailyNoteSettings();
    if (!template) return [];

    let file = this.app.vault.getAbstractFileByPath(template);

    if (file === null) {
      file = this.app.vault.getAbstractFileByPath(template + ".md");
    }

    if (!(file instanceof TFile)) {
      return [];
    }

    const templateContents = await this.app.vault.read(file);
    const allHeadings = Array.from(templateContents.matchAll(/#{1,} .*/g)).map(
      ([heading]) => heading,
    );
    return allHeadings;
  }

  async display() {
    const templateHeadings = await this.getTemplateHeadings();

    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName("Template heading")
      .setDesc(
        "Heading in your daily note template where unfinished tasks will be placed.",
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            ...templateHeadings.reduce<Record<string, string>>(
              (acc, heading) => {
                acc[heading] = heading;
                return acc;
              },
              {},
            ),
            none: "None",
          })
          .setValue(this.plugin?.settings.templateHeading)
          .onChange((value) => {
            this.plugin.settings.templateHeading = value;
            this.plugin.saveSettings();
          }),
      );

    new Setting(this.containerEl)
      .setName("Clean up yesterday's note")
      .setDesc(
        `After copying to today, removes incomplete tasks from yesterday's note. Completed tasks remain as a record of what was done. ⚠️ Destructive — enable with caution.`,
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.deleteOnComplete || false)
          .onChange((value) => {
            this.plugin.settings.deleteOnComplete = value;
            this.plugin.saveSettings();
          }),
      );

    new Setting(this.containerEl)
      .setName("Run automatically on daily note creation")
      .setDesc(
        "Automatically carries tasks forward when a new daily note is created.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.carryOnFileCreate ?? true)
          .onChange((value) => {
            this.plugin.settings.carryOnFileCreate = value;
            this.plugin.saveSettings();
          }),
      );

    new Setting(this.containerEl)
      .setName("Completed task markers")
      .setDesc(
        `Characters that mark a checkbox as done. Defaults to "${DEFAULT_DONE_MARKERS}". Any character listed here is treated as complete.`,
      )
      .addText((text) =>
        text
          .setValue(
            this.plugin.settings.doneStatusMarkers || DEFAULT_DONE_MARKERS,
          )
          .onChange((value) => {
            this.plugin.settings.doneStatusMarkers = value;
            this.plugin.saveSettings();
          }),
      );

    new Setting(this.containerEl)
      .setName("Blank line after heading")
      .setDesc(
        "Insert a blank line between the template heading and the first task.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.leadingNewLine ?? true)
          .onChange((value) => {
            this.plugin.settings.leadingNewLine = value;
            this.plugin.saveSettings();
          }),
      );
  }
}
