/**
 * Returns true if a task line is an empty (text-less) checkbox.
 */
export function isEmptyTask(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "- [ ]" || trimmed === "- [  ]";
}

/**
 * Builds a human-readable carry summary for a Notice.
 * Returns null if there is nothing to report.
 */
export function buildCarryNotice(
  tasksKept: number,
  headingNotFoundMessage: string | null,
): string | null {
  const parts: string[] = [];
  if (headingNotFoundMessage) parts.push(headingNotFoundMessage);
  if (tasksKept > 0)
    parts.push(
      `Carried ${tasksKept} incomplete task${tasksKept > 1 ? "s" : ""} forward.`,
    );
  return parts.length > 0 ? parts.join("\n") : null;
}
