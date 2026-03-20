import {
  toGraphemes,
  isIncompleteTask,
  getChildLines,
  INVALID_GRAPHEMES,
} from "./get-tasks";

/** Returns the heading level (number of `#` chars), or 0 if not a heading. */
export function getHeadingLevel(line: string): number {
  const match = line.match(/^(#{1,6})\s/);
  return match ? match[1].length : 0;
}

/** Returns true if the line is a complete (done) task. */
export function isCompleteTask(line: string, doneMarkers: string[]): boolean {
  const match = line.match(/\s*[*+-] \[(.+?)\]/);
  if (!match) return false;
  const chars = toGraphemes(match[1]);
  if (chars.length !== 1) return false;
  if (chars.some((c) => INVALID_GRAPHEMES.includes(c))) return false;
  return doneMarkers.includes(chars[0]);
}

export interface HeadingSection {
  /** Lines between the heading (exclusive) and the next same-or-higher-level heading (exclusive). */
  sectionLines: string[];
  /** Line index of the heading itself. */
  headingIndex: number;
  /** Line index of the first line after the section (next heading or EOF). */
  endIndex: number;
}

/**
 * Extracts the content lines under a given heading.
 * The section ends at the next heading of equal or higher level, or EOF.
 * Returns null if the heading is not found or the string is not a heading.
 */
export function extractHeadingSection(
  lines: string[],
  heading: string,
): HeadingSection | null {
  const headingTrimmed = heading.trim();
  const headingLevel = getHeadingLevel(headingTrimmed);
  if (headingLevel === 0) return null;

  const headingIndex = lines.findIndex((l) => l.trim() === headingTrimmed);
  if (headingIndex === -1) return null;

  let endIndex = lines.length;
  for (let i = headingIndex + 1; i < lines.length; i++) {
    const level = getHeadingLevel(lines[i]);
    if (level > 0 && level <= headingLevel) {
      endIndex = i;
      break;
    }
  }

  return {
    sectionLines: lines.slice(headingIndex + 1, endIndex),
    headingIndex,
    endIndex,
  };
}

/**
 * Returns section lines with complete tasks removed — but only when ALL of
 * their child task lines are also complete. Rules:
 * - Incomplete parent: kept with ALL its children as-is (no re-evaluation of children)
 * - Complete parent with any incomplete child: kept with ALL its children as-is
 * - Complete parent with no incomplete children: removed along with all children
 * - Non-task lines (headings, prose): always kept
 */
export function removeCompletedTasksFromSection(
  lines: string[],
  doneMarkers: string[],
): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isIncompleteTask(line, doneMarkers)) {
      // Incomplete parent: keep it and ALL its children without re-evaluating them
      const children = getChildLines(lines, i);
      result.push(line, ...children);
      i += 1 + children.length;
    } else if (isCompleteTask(line, doneMarkers)) {
      const children = getChildLines(lines, i);
      const hasIncompleteChild = children.some((c) =>
        isIncompleteTask(c, doneMarkers),
      );
      if (hasIncompleteChild) {
        // Complete parent with incomplete children: keep the whole block as-is
        result.push(line, ...children);
        i += 1 + children.length;
      } else {
        // Fully done: drop this task and all its children
        i += 1 + children.length;
      }
    } else {
      result.push(line);
      i++;
    }
  }
  return result;
}

/**
 * Returns section lines with incomplete tasks removed from yesterday's note.
 * When an incomplete task has complete children (done work worth recording),
 * the parent is kept as structural context alongside those complete children.
 * Incomplete children are removed recursively. A standalone incomplete task
 * with no complete children anywhere in its subtree is dropped entirely.
 */
export function removeIncompleteTasksFromSection(
  lines: string[],
  doneMarkers: string[],
): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isIncompleteTask(line, doneMarkers)) {
      const children = getChildLines(lines, i);
      const keptChildren = removeIncompleteTasksFromSection(
        children,
        doneMarkers,
      );
      if (keptChildren.length > 0) {
        // Keep the parent as structural context for its complete children
        result.push(line, ...keptChildren);
      }
      // If nothing survived from the subtree, drop the parent entirely
      i += 1 + children.length;
    } else {
      result.push(line);
      i++;
    }
  }
  return result;
}

/**
 * Replaces the content under a heading in `content` with `newSectionLines`.
 * - If the heading is not found, the new content is appended at the end.
 * - If `heading` is `"none"`, the new content is appended at the end.
 * - `leadingNewLine` inserts a blank line between the heading and the new content.
 *
 * Returns the modified content string and whether the heading was found.
 */
export function replaceHeadingSection(
  content: string,
  heading: string,
  newSectionLines: string[],
  leadingNewLine: boolean,
): { content: string; headingFound: boolean } {
  if (heading === "none") {
    const appended =
      newSectionLines.length > 0
        ? content + "\n" + newSectionLines.join("\n")
        : content;
    return { content: appended, headingFound: false };
  }

  const lines = content.split("\n");
  const headingTrimmed = heading.trim();
  const headingLevel = getHeadingLevel(headingTrimmed);

  const headingIndex = lines.findIndex((l) => l.trim() === headingTrimmed);
  if (headingIndex === -1) {
    const appended =
      newSectionLines.length > 0
        ? content + "\n" + newSectionLines.join("\n")
        : content;
    return { content: appended, headingFound: false };
  }

  let endIndex = lines.length;
  for (let i = headingIndex + 1; i < lines.length; i++) {
    const level = getHeadingLevel(lines[i]);
    if (level > 0 && level <= headingLevel) {
      endIndex = i;
      break;
    }
  }

  const newLines = [
    ...lines.slice(0, headingIndex + 1),
    ...(leadingNewLine && newSectionLines.length > 0 ? [""] : []),
    ...newSectionLines,
    ...lines.slice(endIndex),
  ];

  return { content: newLines.join("\n"), headingFound: true };
}
