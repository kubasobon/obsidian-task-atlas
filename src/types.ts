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
  doneStatusMarkers: "xX-",
  leadingNewLine: true,
};
