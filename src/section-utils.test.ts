import {
  getHeadingLevel,
  isCompleteTodo,
  extractHeadingSection,
  removeCompletedTodosFromSection,
  removeIncompleteTodosFromSection,
  replaceHeadingSection,
} from "./section-utils";

const DONE = ["x", "X", "-"];

// ─── getHeadingLevel ──────────────────────────────────────────────────────────

describe("getHeadingLevel", () => {
  it("returns 0 for non-heading lines", () => {
    expect(getHeadingLevel("- [ ] todo")).toBe(0);
    expect(getHeadingLevel("some prose")).toBe(0);
    expect(getHeadingLevel("")).toBe(0);
    expect(getHeadingLevel("#no-space")).toBe(0);
  });

  it("returns the correct level for headings", () => {
    expect(getHeadingLevel("# H1")).toBe(1);
    expect(getHeadingLevel("## H2")).toBe(2);
    expect(getHeadingLevel("### H3")).toBe(3);
    expect(getHeadingLevel("###### H6")).toBe(6);
  });
});

// ─── isCompleteTodo ───────────────────────────────────────────────────────────

describe("isCompleteTodo", () => {
  it("returns true for done-marked todos", () => {
    expect(isCompleteTodo("- [x] done", DONE)).toBe(true);
    expect(isCompleteTodo("- [X] done", DONE)).toBe(true);
    expect(isCompleteTodo("- [-] cancelled", DONE)).toBe(true);
  });

  it("returns false for incomplete todos", () => {
    expect(isCompleteTodo("- [ ] not done", DONE)).toBe(false);
  });

  it("returns false for non-todo lines", () => {
    expect(isCompleteTodo("### Heading", DONE)).toBe(false);
    expect(isCompleteTodo("plain text", DONE)).toBe(false);
  });
});

// ─── extractHeadingSection ────────────────────────────────────────────────────

describe("extractHeadingSection", () => {
  it("returns null when heading is not found", () => {
    const lines = ["# Other", "content"];
    expect(extractHeadingSection(lines, "## Tasks")).toBeNull();
  });

  it("returns null for non-heading strings", () => {
    expect(extractHeadingSection(["content"], "none")).toBeNull();
    expect(extractHeadingSection(["content"], "")).toBeNull();
  });

  it("extracts lines until end of file when heading is last", () => {
    const lines = ["## Tasks", "- [ ] Task 1", "- [x] Task 2"];
    const result = extractHeadingSection(lines, "## Tasks");
    expect(result).not.toBeNull();
    expect(result!.sectionLines).toEqual(["- [ ] Task 1", "- [x] Task 2"]);
    expect(result!.headingIndex).toBe(0);
    expect(result!.endIndex).toBe(3);
  });

  it("stops at the next same-level heading", () => {
    const lines = ["## Tasks", "- [ ] Task 1", "## Journal", "some text"];
    const result = extractHeadingSection(lines, "## Tasks");
    expect(result!.sectionLines).toEqual(["- [ ] Task 1"]);
    expect(result!.endIndex).toBe(2);
  });

  it("stops at a higher-level heading", () => {
    const lines = ["## Tasks", "- [ ] Task 1", "# Day Note", "text"];
    const result = extractHeadingSection(lines, "## Tasks");
    expect(result!.sectionLines).toEqual(["- [ ] Task 1"]);
    expect(result!.endIndex).toBe(2);
  });

  it("does NOT stop at a lower-level heading (sub-heading)", () => {
    const lines = ["## Tasks", "### Work", "- [ ] Task 1", "## Journal"];
    const result = extractHeadingSection(lines, "## Tasks");
    expect(result!.sectionLines).toEqual(["### Work", "- [ ] Task 1"]);
  });

  it("handles an empty section", () => {
    const lines = ["## Tasks", "## Journal"];
    const result = extractHeadingSection(lines, "## Tasks");
    expect(result!.sectionLines).toEqual([]);
  });
});

// ─── removeCompletedTodosFromSection ─────────────────────────────────────────

describe("removeCompletedTodosFromSection", () => {
  it("keeps incomplete todos", () => {
    const lines = ["- [ ] keep me"];
    expect(removeCompletedTodosFromSection(lines, DONE)).toEqual(["- [ ] keep me"]);
  });

  it("removes complete todos with no children", () => {
    const lines = ["- [x] done"];
    expect(removeCompletedTodosFromSection(lines, DONE)).toEqual([]);
  });

  it("removes complete todos whose children are all complete", () => {
    const lines = ["- [x] parent", "  - [x] child"];
    expect(removeCompletedTodosFromSection(lines, DONE)).toEqual([]);
  });

  it("keeps complete todos that have at least one incomplete child; removes done children with no further incomplete children", () => {
    const lines = ["- [x] parent", "  - [x] done child", "  - [ ] not done child"];
    // Parent kept (has incomplete child). Done child removed (no incomplete sub-children).
    expect(removeCompletedTodosFromSection(lines, DONE)).toEqual([
      "- [x] parent",
      "  - [ ] not done child",
    ]);
  });

  it("always keeps headings and non-todo lines", () => {
    const lines = ["### Work", "some note", "- [x] done"];
    expect(removeCompletedTodosFromSection(lines, DONE)).toEqual(["### Work", "some note"]);
  });

  it("removes complete child todos that have no incomplete sub-children", () => {
    // Parent incomplete → keep; done child with no incomplete grandchildren → remove
    const lines = ["- [ ] parent", "  - [x] done child"];
    expect(removeCompletedTodosFromSection(lines, DONE)).toEqual([
      "- [ ] parent",
    ]);
  });
});

// ─── removeIncompleteTodosFromSection ────────────────────────────────────────

describe("removeIncompleteTodosFromSection", () => {
  it("removes incomplete todos and their children", () => {
    const lines = ["- [ ] todo", "  - [ ] child", "  - [x] done child"];
    expect(removeIncompleteTodosFromSection(lines, DONE)).toEqual([]);
  });

  it("keeps complete todos", () => {
    const lines = ["- [x] done"];
    expect(removeIncompleteTodosFromSection(lines, DONE)).toEqual(["- [x] done"]);
  });

  it("keeps headings and non-todo lines", () => {
    const lines = ["### Work", "- [ ] todo", "prose line"];
    expect(removeIncompleteTodosFromSection(lines, DONE)).toEqual(["### Work", "prose line"]);
  });

  it("removes only incomplete todos, leaving complete ones", () => {
    const lines = ["- [x] done task", "- [ ] pending task", "- [x] another done"];
    expect(removeIncompleteTodosFromSection(lines, DONE)).toEqual([
      "- [x] done task",
      "- [x] another done",
    ]);
  });

  it("removes an incomplete parent with a complete child", () => {
    const lines = ["- [ ] parent", "  - [x] done child"];
    expect(removeIncompleteTodosFromSection(lines, DONE)).toEqual([]);
  });
});

// ─── replaceHeadingSection ────────────────────────────────────────────────────

describe("replaceHeadingSection", () => {
  it("replaces the section content under the heading", () => {
    const content = "## Tasks\n- [x] old\n## Journal\ntext";
    const { content: result, headingFound } = replaceHeadingSection(
      content,
      "## Tasks",
      ["- [ ] new"],
      false
    );
    expect(headingFound).toBe(true);
    expect(result).toBe("## Tasks\n- [ ] new\n## Journal\ntext");
  });

  it("adds a leading blank line when leadingNewLine is true", () => {
    const content = "## Tasks\n## Journal";
    const { content: result } = replaceHeadingSection(content, "## Tasks", ["- [ ] todo"], true);
    expect(result).toBe("## Tasks\n\n- [ ] todo\n## Journal");
  });

  it("appends to end when heading is not found", () => {
    const content = "# Note\nsome text";
    const { content: result, headingFound } = replaceHeadingSection(
      content,
      "## Missing",
      ["- [ ] todo"],
      false
    );
    expect(headingFound).toBe(false);
    expect(result).toBe("# Note\nsome text\n- [ ] todo");
  });

  it('appends to end when heading is "none"', () => {
    const content = "# Note";
    const { content: result, headingFound } = replaceHeadingSection(
      content,
      "none",
      ["- [ ] todo"],
      false
    );
    expect(headingFound).toBe(false);
    expect(result).toBe("# Note\n- [ ] todo");
  });

  it("replaces an empty section correctly", () => {
    const content = "## Tasks\n## Journal";
    const { content: result } = replaceHeadingSection(
      content,
      "## Tasks",
      ["- [ ] new task"],
      false
    );
    expect(result).toBe("## Tasks\n- [ ] new task\n## Journal");
  });

  it("handles empty new section (clears heading content)", () => {
    const content = "## Tasks\n- [ ] old\n## Journal";
    const { content: result } = replaceHeadingSection(content, "## Tasks", [], false);
    expect(result).toBe("## Tasks\n## Journal");
  });
});
