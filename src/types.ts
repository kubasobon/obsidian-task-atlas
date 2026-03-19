export const DEFAULT_DONE_MARKERS = "xX-";

export interface PluginSettings {
  templateHeading: string;
  deleteOnComplete: boolean;
  removeEmptyTasks: boolean;
  carryOnFileCreate: boolean;
  doneStatusMarkers: string;
  leadingNewLine: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  templateHeading: "none",
  deleteOnComplete: false,
  removeEmptyTasks: false,
  carryOnFileCreate: true,
  doneStatusMarkers: DEFAULT_DONE_MARKERS,
  leadingNewLine: true,
};
