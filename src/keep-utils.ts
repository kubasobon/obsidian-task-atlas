/**
 * Returns true if a todo line is an empty (text-less) checkbox.
 */
export function isEmptyTodo(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "- [ ]" || trimmed === "- [  ]";
}

/**
 * Builds a human-readable keep summary for a Notice.
 * Returns null if there is nothing to report.
 */
export function buildKeepNotice(
  todosAdded: number,
  emptiesRemoved: number,
  headingNotFoundMessage: string | null
): string | null {
  const parts: string[] = [];
  if (headingNotFoundMessage) parts.push(headingNotFoundMessage);
  if (todosAdded > 0)
    parts.push(`- ${todosAdded} todo${todosAdded > 1 ? "s" : ""} kept.`);
  if (emptiesRemoved > 0)
    parts.push(
      `- ${emptiesRemoved} empty todo${emptiesRemoved > 1 ? "s" : ""} removed.`
    );
  return parts.length > 0 ? parts.join("\n") : null;
}
