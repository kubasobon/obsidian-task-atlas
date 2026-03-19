import { Notice, Plugin, TAbstractFile, TFile, normalizePath } from "obsidian";
import {
  getDailyNoteSettings,
  getAllDailyNotes,
  getDailyNote,
} from "obsidian-daily-notes-interface";
import TodoKeeperSettingTab from "./ui/TodoKeeperSettingTab";
import { parseDoneMarkers, isIncompleteTodo } from "./get-todos";
import { DEFAULT_DONE_MARKERS, DEFAULT_SETTINGS, PluginSettings } from "./types";
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
  return normalizePath(folder ?? "");
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
        "Todo Keeper: Daily Notes is not enabled. Enable the Daily Notes or Periodic Notes plugin to use this plugin.",
        10000
      );
      return;
    }

    const yesterday = getPreviousDailyNote(folder, format ?? "YYYY-MM-DD");
    if (!yesterday) return;

    const { templateHeading, deleteOnComplete, removeEmptyTodos, doneStatusMarkers, leadingNewLine } =
      this.settings;
    const doneMarkers = parseDoneMarkers(doneStatusMarkers ?? DEFAULT_DONE_MARKERS);

    // Atomically read (and optionally clean) yesterday's note.
    // The section lines are captured from the callback for use below.
    let sectionLines: string[] | null = null;
    await this.app.vault.process(yesterday, (content) => {
      const section = extractHeadingSection(content.split("\n"), templateHeading);
      if (!section) return content;
      sectionLines = section.sectionLines;
      if (!deleteOnComplete) return content;
      const cleaned = removeIncompleteTodosFromSection(sectionLines, doneMarkers);
      return replaceHeadingSection(content, templateHeading, cleaned, false).content;
    });

    if (!sectionLines) {
      if (templateHeading !== "none") {
        new Notice(`Todo Keeper: '${templateHeading}' not found in yesterday's note.`, 6000);
      }
      return;
    }

    // Atomically write the cleaned section into today's note.
    const captured: string[] = sectionLines;
    let keptCount = 0;
    let headingFound = true;
    await this.app.vault.process(file, (content) => {
      let todaySectionLines = removeCompletedTodosFromSection(captured, doneMarkers);
      if (removeEmptyTodos) {
        todaySectionLines = todaySectionLines.filter((l) => !isEmptyTodo(l));
      }
      keptCount = todaySectionLines.filter((l) => isIncompleteTodo(l, doneMarkers)).length;
      const { content: newContent, headingFound: found } = replaceHeadingSection(
        content,
        templateHeading,
        todaySectionLines,
        leadingNewLine
      );
      headingFound = found;
      return newContent;
    });

    const headingNotFoundMessage = !headingFound
      ? `Todo Keeper: '${templateHeading}' not found in today's note — todos appended to the end.`
      : null;
    const notice = buildKeepNotice(keptCount, headingNotFoundMessage);
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
      id: "todo-keeper-keep",
      name: "Keep Todos Now",
      callback: () => this.keepTodos(),
    });
  }
}
