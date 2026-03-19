# TaskAtlas

[![Build](https://github.com/kubasobon/obsidian-task-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/kubasobon/obsidian-task-atlas/actions/workflows/ci.yml)

> **Requires** the **Daily notes** core plugin (Settings → Core plugins → Daily notes).

An [Obsidian](https://obsidian.md) plugin that carries incomplete tasks from your previous daily note into today's. It preserves your heading structure, sub-headings, and nested tasks — not just individual lines.


## Preview

<!-- TODO: add screenshot or GIF here -->

## How it works

When you run the plugin (automatically or via command), it finds the most recent past daily note and:

1. **Copies** the entire task section into today's note.
2. **Cleans today's note** — removes tasks where every item (and all their children) is complete.
3. **Cleans yesterday's note** *(if "Clean up yesterday's note" is enabled)* — removes incomplete tasks, but keeps completed ones as a record.

### Example

**Yesterday's note** (before):
```markdown
## Tasks

### Morning
- [x] Make coffee
- [ ] Review emails
  - [x] Reply to Alice
  - [ ] Reply to Bob

### Evening
- [ ] Go for a walk
```

**Today's note** (after carrying tasks forward):
```markdown
## Tasks

### Morning
- [ ] Review emails
  - [x] Reply to Alice
  - [ ] Reply to Bob

### Evening
- [ ] Go for a walk
```

**Yesterday's note** (after carrying tasks forward, with "Clean up yesterday's note" enabled):
```markdown
## Tasks

### Morning
- [x] Make coffee
- [ ] Review emails
  - [x] Reply to Alice
```

> `Make coffee` is done — removed from today. `Review emails` is incomplete — it moves to today with all its children. In yesterday's note, the parent and its completed child `Reply to Alice` are kept as a record; the incomplete `Reply to Bob` is removed.

## Installation

Install directly from Obsidian: **Settings → Community plugins → Browse** and search for **TaskAtlas**, or visit the [plugin page](https://obsidian.md/plugins?id=task-atlas).

Make sure the **Daily notes** core plugin is enabled (Settings → Core plugins → Daily notes) and configured with a notes folder.

## Usage

**Automatically:** The plugin runs whenever you create a new daily note.

**Manually:** Open the Command Palette (`Cmd/Ctrl+P`) and run **Carry Tasks Forward**.

## Settings

| Setting | Description |
|---|---|
| **Template heading** | The heading in your daily note template under which tasks will be placed. If set to *None*, tasks are appended to the end of the note. |
| **Run automatically on daily note creation** | Automatically carries tasks forward when a new daily note is created. Disable if you prefer to trigger it manually. |
| **Clean up yesterday's note** | After copying to today, removes incomplete tasks from yesterday's note. Completed tasks stay as a record. ⚠️ Destructive — enable with caution. |
| **Skip empty checkboxes** | Empty checkboxes (`- [ ]`) are not carried over. |
| **Completed task markers** | Characters treated as "done". Defaults to `xX-`. Add characters like `>?+` to support custom statuses (e.g. from the [Tasks plugin](https://publish.obsidian.md/tasks)). |
| **Blank line after heading** | Inserts a blank line between the template heading and the first task. |

## Attribution

Forked from [obsidian-rollover-daily-todos](https://github.com/lumoe/obsidian-rollover-daily-todos) by [lumoe](https://github.com/lumoe), licensed under MIT.
