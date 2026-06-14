-- ============================================================================
-- schema.sql  —  the shape of our database.
--
-- A database is like a spreadsheet. This file describes ONE table called
-- "notes", and what columns (fields) each note has. We run this once to
-- set the database up (the README explains the command).
-- ============================================================================

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT, -- a unique number per note (1, 2, 3...), set automatically
  title      TEXT NOT NULL,                      -- the note's title (required)
  body       TEXT NOT NULL DEFAULT '',           -- the note's text (defaults to empty)
  summary    TEXT,                               -- an AI-written summary (added only when you ask for it)
  created_at TEXT NOT NULL DEFAULT (datetime('now')) -- when the note was made, filled in automatically
);
