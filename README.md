# TaskAtlas

[![Build](https://github.com/kubasobon/obsidian-task-atlas/actions/workflows/ci.yml/badge.svg)](https://github.com/kubasobon/obsidian-task-atlas/actions/workflows/ci.yml)

An [Obsidian](https://obsidian.md) plugin that carries incomplete tasks from your previous daily note into today's, preserving headings, sub-headings, and nested tasks.

Requires the **Daily notes** core plugin (Settings → Core plugins → Daily notes).

## Preview

<!-- TODO: add screenshot or GIF here -->

## What it does

TaskAtlas copies your task section from the previous daily note into today's, then removes any tasks that are fully complete. If you enable "Clean up yesterday's note", it also clears incomplete tasks from yesterday, keeping completed ones as a record.

Tasks and subtasks always travel together. If a parent task is unfinished, all its subtasks come with it, done or not. The plugin also waits a few seconds after a note is created before acting, so it won't conflict with Obsidian Sync if the note is still arriving from another device.

## Example

**Before** (yesterday's note):
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

**After** (today's note):
```markdown
## Tasks

### Morning
- [ ] Review emails
  - [x] Reply to Alice
  - [ ] Reply to Bob

### Evening
- [ ] Go for a walk
```

**After** (yesterday's note, with "Clean up yesterday's note" enabled):
```markdown
## Tasks

### Morning
- [x] Make coffee
- [ ] Review emails
  - [x] Reply to Alice
```

`Make coffee` is fully done, so it stays in yesterday and is dropped from today. `Review emails` is incomplete, so it moves forward with all its subtasks. `Reply to Bob` is removed from yesterday; `Reply to Alice` stays as a record.

## Installation

Install from Obsidian: **Settings → Community plugins → Browse**, search for **TaskAtlas**, or visit the [plugin page](https://obsidian.md/plugins?id=task-atlas).

Make sure Daily Notes is enabled (Settings → Core plugins → Daily notes) and configured with a notes folder.

## Usage

The plugin runs automatically when you create a new daily note.

To run it manually, open the Command Palette (`Cmd/Ctrl+P`) and run **Carry Tasks Forward**.

## Settings

| Setting | Description |
|---|---|
| **Template heading** | Tasks are placed under this heading in today's note. If set to *None*, they are appended to the end. |
| **Run automatically on daily note creation** | Carries tasks forward whenever a new daily note is created. Turn this off to trigger manually. |
| **Clean up yesterday's note** | Removes incomplete tasks from yesterday's note after copying them to today. Completed tasks remain. Deleted tasks cannot be recovered. |
| **Completed task markers** | Characters that count as "done". Defaults to `xX-`. Add characters like `>?+` to support custom statuses (e.g. from the [Tasks plugin](https://publish.obsidian.md/tasks)). |
| **Blank line after heading** | Adds a blank line between the template heading and the first task. |

## Attribution

Forked from [obsidian-rollover-daily-todos](https://github.com/lumoe/obsidian-rollover-daily-todos) by [lumoe](https://github.com/lumoe), licensed under MIT.
