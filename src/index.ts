import { Notice, Plugin, TAbstractFile, TFile } from "obsidian";
import {
  getDailyNoteSettings,
  getAllDailyNotes,
  getDailyNote,
} from "obsidian-daily-notes-interface";
import TodoKeeperSettingTab from "./ui/TodoKeeperSettingTab";
import { parseDoneMarkers, isIncompleteTodo } from "./get-todos";
import { DEFAULT_SETTINGS, PluginSettings } from "./types";
import { isEmptyTodo, buildKeepNotice } from "./keep-utils";
import {
  extractHeadingSection,
  removeCompletedTodosFromSection,
  removeIncompleteTodosFromSection,
  replaceHeadingSection,
} from "./section-utils";

const MAX_TIME_SINCE_CREATION = 5000; // 5 seconds

/** Strips leading/trailing slashes from a folder path. */
function cleanFolder(folder: string | undefined): string {
  if (!folder) return "";
  return folder.replace(/^\/|\/$/g, "");
}

/** Parses a daily note's date from its file path. */
function fileToMoment(file: TFile, folderPrefix: string, format: string) {
  let name = file.path;
  if (name.startsWith(folderPrefix)) name = name.slice(folderPrefix.length);
  if (name.endsWith(`.${file.extension}`))
    name = name.slice(0, -file.extension.length - 1);
  return window.moment(name, format, true);
}

/** Returns true if the file corresponds to today's daily note. */
function isTodaysDailyNote(file: TFile, folder: string, format: string): boolean {
  const folderPrefix = folder ? folder + "/" : "";
  const todayFormatted = window.moment().format(format);
  return file.path === `${folderPrefix}${todayFormatted}.${file.extension}`;
}

/** Returns the most recent daily note before today. */
function getPreviousDailyNote(folder: string, format: string): TFile | undefined {
  const allDailyNotes = getAllDailyNotes();
  const folderPrefix = folder ? folder + "/" : "";
  const todayMoment = window.moment();

  const sorted = Object.values(allDailyNotes)
    .map((file) => ({ file, moment: fileToMoment(file, folderPrefix, format) }))
    .filter(({ moment }) => moment.isValid() && moment.isBefore(todayMoment, "day"))
    .sort((a, b) => b.moment.valueOf() - a.moment.valueOf());

  return sorted[0]?.file;
}

export default class TodoKeeperPlugin extends Plugin {
  settings!: PluginSettings;

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  isDailyNotesEnabled(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = this.app as any;
    const dailyNotesEnabled = app.internalPlugins?.plugins["daily-notes"]?.enabled;
    const periodicNotesEnabled =
      app.plugins?.getPlugin("periodic-notes")?.settings?.daily?.enabled;
    return !!(dailyNotesEnabled || periodicNotesEnabled);
  }

  async keepTodos(inputFile?: TFile): Promise<void> {
    // Resolve today's daily note (from argument or the daily notes index)
    const allDailyNotes = getAllDailyNotes();
    const file = inputFile ?? getDailyNote(window.moment(), allDailyNotes);
    if (!file) return;

    // Validate the file is actually today's daily note
    const { folder: rawFolder, format } = getDailyNoteSettings();
    const folder = cleanFolder(rawFolder);
    if (!isTodaysDailyNote(file, folder, format ?? "YYYY-MM-DD")) return;

    // When triggered by file creation, skip if the file is not brand new
    if (inputFile && Date.now() - file.stat.ctime > MAX_TIME_SINCE_CREATION) return;

    if (!this.isDailyNotesEnabled()) {
      new Notice(
        "Todo Keeper: unable to keep todos — please enable Daily Notes, or Periodic Notes (with daily notes enabled).",
        10000
      );
      return;
    }

    const yesterday = getPreviousDailyNote(folder, format ?? "YYYY-MM-DD");
    if (!yesterday) return;

    const { templateHeading, deleteOnComplete, removeEmptyTodos, doneStatusMarkers, leadingNewLine } =
      this.settings;
    const doneMarkers = parseDoneMarkers(doneStatusMarkers ?? "xX-");

    // Extract the full heading section from yesterday's note
    const yesterdayContent = await this.app.vault.read(yesterday);
    const yesterdayLines = yesterdayContent.split("\n");
    const section = extractHeadingSection(yesterdayLines, templateHeading);

    if (!section) {
      if (templateHeading !== "none") {
        new Notice(
          `Todo Keeper: couldn't find '${templateHeading}' in yesterday's note.`,
          6000
        );
      }
      return;
    }

    // Build today's section: copy everything, then drop complete todos (all children complete)
    let todaySectionLines = removeCompletedTodosFromSection(section.sectionLines, doneMarkers);

    if (removeEmptyTodos) {
      todaySectionLines = todaySectionLines.filter((l) => !isEmptyTodo(l));
    }

    // Write the cleaned section into today's note
    const todayContent = await this.app.vault.read(file);
    const { content: newTodayContent, headingFound } = replaceHeadingSection(
      todayContent,
      templateHeading,
      todaySectionLines,
      leadingNewLine
    );
    await this.app.vault.modify(file, newTodayContent);

    console.log(`todo-keeper: section copied from ${yesterday.basename} to ${file.basename}`);

    // Optionally clean yesterday: remove incomplete todos, keep completed ones as a record
    if (deleteOnComplete) {
      const yesterdaySectionLines = removeIncompleteTodosFromSection(
        section.sectionLines,
        doneMarkers
      );
      const { content: newYesterdayContent } = replaceHeadingSection(
        yesterdayContent,
        templateHeading,
        yesterdaySectionLines,
        false
      );
      await this.app.vault.modify(yesterday, newYesterdayContent);
    }

    // Count incomplete todos kept in today's section for the notice
    const keptCount = todaySectionLines.filter((l) => isIncompleteTodo(l, doneMarkers)).length;
    const headingNotFoundMessage = !headingFound
      ? `Todo Keeper: couldn't find '${templateHeading}' in today's note. Appended to end of file.`
      : null;
    const notice = buildKeepNotice(keptCount, 0, headingNotFoundMessage);
    if (notice) new Notice(notice, 4000 + notice.length * 3);
  }

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new TodoKeeperSettingTab(this.app, this));

    this.registerEvent(
      this.app.vault.on("create", async (file: TAbstractFile) => {
        if (!this.settings.keepOnFileCreate) return;
        if (!(file instanceof TFile)) return;
        this.keepTodos(file);
      })
    );

    this.addCommand({
      id: "obsidian-todo-keeper-keep",
      name: "Keep Todos Now",
      callback: () => this.keepTodos(),
    });
  }
}

