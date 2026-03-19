import { App, PluginSettingTab, Setting, TFile } from "obsidian";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";
import type TodoKeeperPlugin from "../index";

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
      .setDesc("Which heading from your template should the todos go under")
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
      .setName("Clean up previous day's note")
      .setDesc(
        `After copying to today's note, remove incomplete todos (and their children) from yesterday's note. Complete todos stay in yesterday as a record of what was done. Destructive — back up your notes before enabling.`
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
      .setName("Remove empty todos when keeping")
      .setDesc(`Empty checkboxes (- [ ]) will be dropped and not carried into today's note.`)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.removeEmptyTodos || false)
          .onChange((value) => {
            this.plugin.settings.removeEmptyTodos = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(this.containerEl)
      .setName("Automatically keep todos on daily note open")
      .setDesc(`If enabled, the plugin will automatically keep todos when you open a daily note.`)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.keepOnFileCreate ?? true)
          .onChange((value) => {
            this.plugin.settings.keepOnFileCreate = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(this.containerEl)
      .setName("Done status markers")
      .setDesc(
        `Characters that represent done status in checkboxes. Default is "xX-". Add any characters that should be considered as marking a task complete.`
      )
      .addText((text) =>
        text
          .setValue(this.plugin.settings.doneStatusMarkers || "xX-")
          .onChange((value) => {
            this.plugin.settings.doneStatusMarkers = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(this.containerEl)
      .setName("Add extra blank line between Heading and Todos")
      .setDesc(
        `Whether to add an extra blank line between the selected Heading and the kept todos. This will only work in combination with a configured Template Heading.`
      )
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

