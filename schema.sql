-- ============================================================================
-- schema.sql  —  the shape of our database (two simple tables).
--
-- Think of each table like a spreadsheet with named columns.
-- We run this once to set the database up (see README for the command).
-- ============================================================================

-- A "folder" is just a name you can group notes under (like "Work", "Ideas").
CREATE TABLE IF NOT EXISTS folders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT, -- unique number per folder
  name       TEXT NOT NULL,                      -- the folder's name
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A "note" has a title, some text, and (optionally) the folder it lives in.
CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT, -- unique number per note
  title      TEXT NOT NULL,                      -- the note's title (required)
  body       TEXT NOT NULL DEFAULT '',           -- the note's text
  summary    TEXT,                               -- an AI summary (only when asked for)
  folder_id  INTEGER,                            -- which folder it's in (can be empty)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
