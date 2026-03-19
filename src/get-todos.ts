// Unicode characters that look like valid single-character checkbox content but aren't:
//   U+202E  RIGHT-TO-LEFT OVERRIDE  — reverses text direction
//   U+200B  ZERO WIDTH SPACE        — invisible, zero-width
//   U+200C  ZERO WIDTH NON-JOINER   — invisible, prevents ligatures
//   U+200D  ZERO WIDTH JOINER       — invisible, joins emoji sequences (e.g. 👨‍👩‍👧‍👦)
// All four are zero-width or control characters that Intl.Segmenter counts as a single
// grapheme cluster, so without this list they would pass the length === 1 check.
const INVALID_GRAPHEMES = ["\u202E", "\u200B", "\u200C", "\u200D"];

// Splits text into Unicode grapheme clusters.
// Falls back to Array.from() which handles surrogate pairs but not complex clusters.
export function toGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  console.error("Intl.Segmenter not available, falling back to Array.from()");
  return Array.from(text);
}

// Parses a done-markers string (e.g. "xX-") into an array of grapheme clusters.
export function parseDoneMarkers(raw: string): string[] {
  return toGraphemes(raw);
}

// Returns the number of leading whitespace characters in a line (-1 for empty/blank lines).
export function getIndentation(line: string): number {
  return line.search(/\S/);
}

// Returns true if the line is an incomplete (open) todo that should be kept.
export function isIncompleteTodo(line: string, doneMarkers: string[]): boolean {
  const match = line.match(/\s*[*+-] \[(.+?)\]/);
  if (!match) return false;

  const chars = toGraphemes(match[1]);

  // Checkbox must contain exactly one grapheme cluster
  if (chars.length !== 1) return false;

  // Reject invisible/modifier graphemes
  if (chars.some((c) => INVALID_GRAPHEMES.includes(c))) return false;

  // Incomplete = not marked done
  return !doneMarkers.includes(chars[0]);
}

// Returns all lines immediately following parentIndex that are more indented than it.
export function getChildLines(lines: string[], parentIndex: number): string[] {
  const parentIndent = getIndentation(lines[parentIndex]);
  const children: string[] = [];
  for (let i = parentIndex + 1; i < lines.length; i++) {
    if (getIndentation(lines[i]) <= parentIndent) break;
    children.push(lines[i]);
  }
  return children;
}

interface GetTodosOptions {
  lines: string[];
  withChildren?: boolean;
  doneStatusMarkers?: string | null;
}

export function getTodos({
  lines,
  withChildren = false,
  doneStatusMarkers = null,
}: GetTodosOptions): string[] {
  const doneMarkers = parseDoneMarkers(doneStatusMarkers ?? "xX-");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!isIncompleteTodo(lines[i], doneMarkers)) continue;
    result.push(lines[i]);
    if (withChildren) {
      const children = getChildLines(lines, i);
      result.push(...children);
      i += children.length;
    }
  }

  return result;
}

