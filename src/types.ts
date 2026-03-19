export const DEFAULT_DONE_MARKERS = "xX-";

export interface PluginSettings {
  templateHeading: string;
  deleteOnComplete: boolean;
  removeEmptyTodos: boolean;
  keepOnFileCreate: boolean;
  doneStatusMarkers: string;
  leadingNewLine: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  templateHeading: "none",
  deleteOnComplete: false,
  removeEmptyTodos: false,
  keepOnFileCreate: true,
  doneStatusMarkers: DEFAULT_DONE_MARKERS,
  leadingNewLine: true,
};
