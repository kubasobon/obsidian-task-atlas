import { toGraphemes, isIncompleteTodo, getChildLines, INVALID_GRAPHEMES } from "./get-todos";

/** Returns the heading level (number of `#` chars), or 0 if not a heading. */
export function getHeadingLevel(line: string): number {
  const match = line.match(/^(#{1,6})\s/);
  return match ? match[1].length : 0;
}

/** Returns true if the line is a complete (done) todo. */
export function isCompleteTodo(line: string, doneMarkers: string[]): boolean {
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
  heading: string
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
 * Returns section lines with complete todos removed — but only when ALL of
 * their child todo lines are also complete. Incomplete todos, non-todo lines
 * (headings, prose), and complete todos that have at least one incomplete child
 * are all preserved.
 */
export function removeCompletedTodosFromSection(
  lines: string[],
  doneMarkers: string[]
): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isCompleteTodo(lines[i], doneMarkers)) {
      const children = getChildLines(lines, i);
      const hasIncompleteChild = children.some((c) => isIncompleteTodo(c, doneMarkers));
      if (!hasIncompleteChild) {
        // All children are done (or there are none) — drop the whole block
        i += 1 + children.length;
        continue;
      }
    }
    result.push(lines[i]);
    i++;
  }
  return result;
}

/**
 * Returns section lines with incomplete todos (and all their children) removed.
 * Complete todos, headings, and other non-todo lines are always kept.
 */
export function removeIncompleteTodosFromSection(
  lines: string[],
  doneMarkers: string[]
): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isIncompleteTodo(lines[i], doneMarkers)) {
      const children = getChildLines(lines, i);
      // Drop this incomplete todo and all its children
      i += 1 + children.length;
      continue;
    }
    result.push(lines[i]);
    i++;
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
  leadingNewLine: boolean
): { content: string; headingFound: boolean } {
  if (heading === "none") {
    const appended = newSectionLines.length > 0 ? content + "\n" + newSectionLines.join("\n") : content;
    return { content: appended, headingFound: false };
  }

  const lines = content.split("\n");
  const headingTrimmed = heading.trim();
  const headingLevel = getHeadingLevel(headingTrimmed);

  const headingIndex = lines.findIndex((l) => l.trim() === headingTrimmed);
  if (headingIndex === -1) {
    const appended = newSectionLines.length > 0 ? content + "\n" + newSectionLines.join("\n") : content;
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
