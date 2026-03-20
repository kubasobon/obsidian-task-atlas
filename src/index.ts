import { Notice, Plugin, TAbstractFile, TFile, normalizePath } from "obsidian";
import {
  getDailyNoteSettings,
  getAllDailyNotes,
  getDailyNote,
} from "obsidian-daily-notes-interface";
import TaskAtlasSettingTab from "./ui/TaskAtlasSettingTab";
import { parseDoneMarkers, isIncompleteTask } from "./get-tasks";
import {
  DEFAULT_DONE_MARKERS,
  DEFAULT_SETTINGS,
  PluginSettings,
} from "./types";
import { isEmptyTask, buildCarryNotice } from "./carry-utils";
import {
  extractHeadingSection,
  removeCompletedTasksFromSection,
  removeIncompleteTasksFromSection,
  replaceHeadingSection,
} from "./section-utils";

const MAX_TIME_SINCE_CREATION = 5000; // 5 seconds
const SYNC_DEBOUNCE_MS = 3000; // wait for sync to settle

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
function isTodaysDailyNote(
  file: TFile,
  folder: string,
  format: string,
): boolean {
  const folderPrefix = folder ? folder + "/" : "";
  const todayFormatted = window.moment().format(format);
  return file.path === `${folderPrefix}${todayFormatted}.${file.extension}`;
}

/** Returns the most recent daily note before today. */
function getPreviousDailyNote(
  folder: string,
  format: string,
): TFile | undefined {
  const allDailyNotes = getAllDailyNotes();
  const folderPrefix = folder ? folder + "/" : "";
  const todayMoment = window.moment();

  const sorted = Object.values(allDailyNotes)
    .map((file) => ({ file, moment: fileToMoment(file, folderPrefix, format) }))
    .filter(
      ({ moment }) => moment.isValid() && moment.isBefore(todayMoment, "day"),
    )
    .sort((a, b) => b.moment.valueOf() - a.moment.valueOf());

  return sorted[0]?.file;
}

export default class TaskAtlasPlugin extends Plugin {
  settings!: PluginSettings;
  // Pending debounce timer for auto-carry on file creation.
  private carryDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingCarryFile: TFile | null = null;

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  isDailyNotesEnabled(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = this.app as any;
    return !!app.internalPlugins?.plugins["daily-notes"]?.enabled;
  }

  async carryOverTasks(inputFile?: TFile): Promise<void> {
    // Resolve today's daily note (from argument or the daily notes index)
    const allDailyNotes = getAllDailyNotes();
    const file = inputFile ?? getDailyNote(window.moment(), allDailyNotes);
    if (!file) return;

    // Validate the file is actually today's daily note
    const { folder: rawFolder, format } = getDailyNoteSettings();
    const folder = cleanFolder(rawFolder);
    if (!isTodaysDailyNote(file, folder, format ?? "YYYY-MM-DD")) return;

    // When triggered by file creation, skip if the file is not brand new
    if (inputFile && Date.now() - file.stat.ctime > MAX_TIME_SINCE_CREATION)
      return;

    if (!this.isDailyNotesEnabled()) {
      new Notice(
        "TaskAtlas: Daily Notes plugin is not enabled. Enable it under Settings → Core plugins → Daily notes.",
        10000,
      );
      return;
    }

    const yesterday = getPreviousDailyNote(folder, format ?? "YYYY-MM-DD");
    if (!yesterday) return;

    const {
      templateHeading,
      deleteOnComplete,
      doneStatusMarkers,
      leadingNewLine,
    } = this.settings;
    const doneMarkers = parseDoneMarkers(
      doneStatusMarkers ?? DEFAULT_DONE_MARKERS,
    );

    // Atomically read (and optionally clean) yesterday's note.
    // The section lines are captured from the callback for use below.
    let sectionLines: string[] | null = null;
    await this.app.vault.process(yesterday, (content) => {
      const section = extractHeadingSection(
        content.split("\n"),
        templateHeading,
      );
      if (!section) return content;
      sectionLines = section.sectionLines;
      if (!deleteOnComplete) return content;
      const cleaned = removeIncompleteTasksFromSection(
        sectionLines,
        doneMarkers,
      );
      return replaceHeadingSection(content, templateHeading, cleaned, false)
        .content;
    });

    if (!sectionLines) {
      if (templateHeading !== "none") {
        new Notice(
          `TaskAtlas: '${templateHeading}' not found in yesterday's note.`,
          6000,
        );
      }
      return;
    }

    // Atomically write the cleaned section into today's note.
    const captured: string[] = sectionLines;
    let keptCount = 0;
    let headingFound = true;
    await this.app.vault.process(file, (content) => {
      let todaySectionLines = removeCompletedTasksFromSection(
        captured,
        doneMarkers,
      );
      // Always filter out empty checkboxes
      todaySectionLines = todaySectionLines.filter((l) => !isEmptyTask(l));
      keptCount = todaySectionLines.filter((l) =>
        isIncompleteTask(l, doneMarkers),
      ).length;
      const { content: newContent, headingFound: found } =
        replaceHeadingSection(
          content,
          templateHeading,
          todaySectionLines,
          leadingNewLine,
        );
      headingFound = found;
      return newContent;
    });

    const headingNotFoundMessage = !headingFound
      ? `TaskAtlas: '${templateHeading}' not found in today's note — tasks appended to the end.`
      : null;
    const notice = buildCarryNotice(keptCount, headingNotFoundMessage);
    if (notice) new Notice(notice, 4000 + notice.length * 3);
  }

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new TaskAtlasSettingTab(this.app, this));

    this.registerEvent(
      this.app.vault.on("create", async (file: TAbstractFile) => {
        if (!this.settings.carryOnFileCreate) return;
        if (!(file instanceof TFile)) return;
        this.scheduleCarryOver(file);
      }),
    );

    this.registerEvent(
      this.app.vault.on("modify", (file: TAbstractFile) => {
        if (!(file instanceof TFile)) return;
        if (this.pendingCarryFile?.path !== file.path) return;
        this.scheduleCarryOver(file);
      }),
    );

    this.addCommand({
      id: "task-atlas-carry-over",
      name: "Carry Tasks Forward",
      callback: () => this.carryOverTasks(),
    });
  }

  /**
   * Shows a notice immediately, then waits SYNC_DEBOUNCE_MS without any
   * further modify events on the same file before calling carryOverTasks.
   * This lets Obsidian Sync finish pushing remote content before we act.
   */
  private scheduleCarryOver(file: TFile) {
    const isFirstSchedule = this.pendingCarryFile?.path !== file.path;
    this.pendingCarryFile = file;

    if (this.carryDebounceTimer) clearTimeout(this.carryDebounceTimer);

    if (isFirstSchedule) {
      new Notice("TaskAtlas: Carrying tasks forward…", SYNC_DEBOUNCE_MS);
    }

    this.carryDebounceTimer = setTimeout(() => {
      this.carryDebounceTimer = null;
      this.pendingCarryFile = null;
      this.carryOverTasks(file);
    }, SYNC_DEBOUNCE_MS);
  }
}
