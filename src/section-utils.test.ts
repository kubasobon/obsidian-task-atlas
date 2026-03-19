import {
  getHeadingLevel,
  isCompleteTask,
  extractHeadingSection,
  removeCompletedTasksFromSection,
  removeIncompleteTasksFromSection,
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

// ─── isCompleteTask ───────────────────────────────────────────────────────────

describe("isCompleteTask", () => {
  it("returns true for done-marked tasks", () => {
    expect(isCompleteTask("- [x] done", DONE)).toBe(true);
    expect(isCompleteTask("- [X] done", DONE)).toBe(true);
    expect(isCompleteTask("- [-] cancelled", DONE)).toBe(true);
  });

  it("returns false for incomplete tasks", () => {
    expect(isCompleteTask("- [ ] not done", DONE)).toBe(false);
  });

  it("returns false for non-task lines", () => {
    expect(isCompleteTask("### Heading", DONE)).toBe(false);
    expect(isCompleteTask("plain text", DONE)).toBe(false);
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

// ─── removeCompletedTasksFromSection ─────────────────────────────────────────

describe("removeCompletedTasksFromSection", () => {
  it("keeps incomplete tasks", () => {
    const lines = ["- [ ] keep me"];
    expect(removeCompletedTasksFromSection(lines, DONE)).toEqual(["- [ ] keep me"]);
  });

  it("removes complete tasks with no children", () => {
    const lines = ["- [x] done"];
    expect(removeCompletedTasksFromSection(lines, DONE)).toEqual([]);
  });

  it("removes complete tasks whose children are all complete", () => {
    const lines = ["- [x] parent", "  - [x] child"];
    expect(removeCompletedTasksFromSection(lines, DONE)).toEqual([]);
  });

  it("keeps complete tasks that have at least one incomplete child, with ALL their children", () => {
    // Complete parent has a done child AND an incomplete child → keep everything
    const lines = ["- [x] parent", "  - [x] done child", "  - [ ] not done child"];
    expect(removeCompletedTasksFromSection(lines, DONE)).toEqual([
      "- [x] parent",
      "  - [x] done child",
      "  - [ ] not done child",
    ]);
  });

  it("always keeps headings and non-task lines", () => {
    const lines = ["### Work", "some note", "- [x] done"];
    expect(removeCompletedTasksFromSection(lines, DONE)).toEqual(["### Work", "some note"]);
  });

  it("keeps ALL children of an incomplete parent, including done ones", () => {
    const lines = ["- [ ] parent", "  - [x] done child"];
    expect(removeCompletedTasksFromSection(lines, DONE)).toEqual([
      "- [ ] parent",
      "  - [x] done child",
    ]);
  });

  it("3-level nesting: incomplete root keeps the entire subtree as-is", () => {
    // A(incomplete) → B(incomplete) → C(incomplete), D(done)
    // Root is incomplete → everything moves to today unchanged
    const lines = [
      "- [ ] A",
      "  - [ ] B",
      "    - [ ] C",
      "    - [x] D",
    ];
    expect(removeCompletedTasksFromSection(lines, DONE)).toEqual([
      "- [ ] A",
      "  - [ ] B",
      "    - [ ] C",
      "    - [x] D",
    ]);
  });
});

// ─── removeIncompleteTasksFromSection ────────────────────────────────────────

describe("removeIncompleteTasksFromSection", () => {
  it("removes an incomplete task with no children", () => {
    const lines = ["- [ ] todo"];
    expect(removeIncompleteTasksFromSection(lines, DONE)).toEqual([]);
  });

  it("removes incomplete children of an incomplete parent", () => {
    const lines = ["- [ ] todo", "  - [ ] child"];
    expect(removeIncompleteTasksFromSection(lines, DONE)).toEqual([]);
  });

  it("keeps complete children of an incomplete parent as a record, with the parent for context", () => {
    const lines = ["- [ ] todo", "  - [ ] child", "  - [x] done child"];
    expect(removeIncompleteTasksFromSection(lines, DONE)).toEqual([
      "- [ ] todo",
      "  - [x] done child",
    ]);
  });

  it("keeps complete tasks", () => {
    const lines = ["- [x] done"];
    expect(removeIncompleteTasksFromSection(lines, DONE)).toEqual(["- [x] done"]);
  });

  it("keeps headings and non-task lines", () => {
    const lines = ["### Work", "- [ ] todo", "prose line"];
    expect(removeIncompleteTasksFromSection(lines, DONE)).toEqual(["### Work", "prose line"]);
  });

  it("removes only incomplete tasks, leaving complete ones", () => {
    const lines = ["- [x] done task", "- [ ] pending task", "- [x] another done"];
    expect(removeIncompleteTasksFromSection(lines, DONE)).toEqual([
      "- [x] done task",
      "- [x] another done",
    ]);
  });

  it("removes an incomplete parent with a complete child — keeps both parent and done child", () => {
    const lines = ["- [ ] parent", "  - [x] done child"];
    expect(removeIncompleteTasksFromSection(lines, DONE)).toEqual([
      "- [ ] parent",
      "  - [x] done child",
    ]);
  });

  it("3-level nesting: preserves the full ancestor chain down to a completed leaf", () => {
    // A(incomplete) → B(incomplete) → C(incomplete), D(done)
    // C has no done descendants → dropped entirely
    // D is done → kept; B is kept as context for D; A is kept as context for B
    const lines = [
      "- [ ] A",
      "  - [ ] B",
      "    - [ ] C",
      "    - [x] D",
    ];
    expect(removeIncompleteTasksFromSection(lines, DONE)).toEqual([
      "- [ ] A",
      "  - [ ] B",
      "    - [x] D",
    ]);
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
