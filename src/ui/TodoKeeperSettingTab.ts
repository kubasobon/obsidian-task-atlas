import { App, PluginSettingTab, Setting, TFile } from "obsidian";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";
import type TodoKeeperPlugin from "../index";
import { DEFAULT_DONE_MARKERS } from "../types";

export default class TodoKeeperSettingTab extends PluginSettingTab {
  plugin: TodoKeeperPlugin;

  constructor(app: App, plugin: TodoKeeperPlugin) {
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
      ([heading]) => heading
    );
    return allHeadings;
  }

  async display() {
    const templateHeadings = await this.getTemplateHeadings();

    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName("Template heading")
      .setDesc("Heading in your daily note template where unfinished todos will be placed.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            ...templateHeadings.reduce<Record<string, string>>((acc, heading) => {
              acc[heading] = heading;
              return acc;
            }, {}),
            none: "None",
          })
          .setValue(this.plugin?.settings.templateHeading)
          .onChange((value) => {
            this.plugin.settings.templateHeading = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(this.containerEl)
      .setName("Clean up yesterday's note")
      .setDesc(
        `After copying to today, removes incomplete todos from yesterday's note. Completed todos remain as a record of what was done. ⚠️ Destructive — enable with caution.`
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.deleteOnComplete || false)
          .onChange((value) => {
            this.plugin.settings.deleteOnComplete = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(this.containerEl)
      .setName("Skip empty checkboxes")
      .setDesc("Empty checkboxes (- [ ]) will not be carried over to today's note.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.removeEmptyTodos || false)
          .onChange((value) => {
            this.plugin.settings.removeEmptyTodos = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(this.containerEl)
      .setName("Run automatically on daily note creation")
      .setDesc("Automatically keeps todos when a new daily note is created.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.keepOnFileCreate ?? true)
          .onChange((value) => {
            this.plugin.settings.keepOnFileCreate = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(this.containerEl)
      .setName("Completed task markers")
      .setDesc(
        `Characters that mark a checkbox as done. Defaults to "${DEFAULT_DONE_MARKERS}". Any character listed here is treated as complete.`
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.doneStatusMarkers || DEFAULT_DONE_MARKERS)
          .onChange((value) => {
            this.plugin.settings.doneStatusMarkers = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(this.containerEl)
      .setName("Blank line after heading")
      .setDesc("Insert a blank line between the template heading and the first todo.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.leadingNewLine ?? true)
          .onChange((value) => {
            this.plugin.settings.leadingNewLine = value;
            this.plugin.saveSettings();
          })
      );
  }
}

