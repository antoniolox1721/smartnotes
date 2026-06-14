// NotesPanel.jsx — the "Notes" tab: a box to write a new note, a search box,
// and the list of note cards for the selected folder.

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import * as api from "../api.js";
import NoteCard from "./NoteCard.jsx";

export default function NotesPanel({ activeFolder, folders }) {
  const [notes, setNotes] = useState([]);      // the notes we're showing
  const [title, setTitle] = useState("");       // new-note title box
  const [body, setBody] = useState("");         // new-note text box
  const [query, setQuery] = useState("");       // search box text
  const [searching, setSearching] = useState(false);

  // Reload the folder's notes whenever the selected folder changes.
  useEffect(() => { loadNotes(); }, [activeFolder]);

  async function loadNotes() {
    setQuery("");
    setNotes(await api.getNotes(activeFolder));
  }

  async function addNote() {
    if (!title.trim()) return;
    await api.addNote({ title, body, folder_id: activeFolder });
    setTitle("");
    setBody("");
    loadNotes();
  }

  async function runSearch() {
    if (!query.trim()) return loadNotes();
    setSearching(true);
    setNotes(await api.searchNotes(query));
    setSearching(false);
  }

  // A friendly title for the current view.
  const folderName = activeFolder
    ? folders.find((f) => f.id === activeFolder)?.name
    : "All notes";

  return (
    <div>
      {/* Write a new note */}
      <div className="composer">
        <input className="box" placeholder="Note title"
          value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="box" placeholder="Write something…" style={{ marginTop: 10 }}
          value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="row">
          <button className="primary" onClick={addNote}>Add note</button>
          <span style={{ color: "var(--muted)", fontSize: ".85rem" }}>
            Saving to: <b>{folderName}</b>
          </span>
        </div>
      </div>

      {/* Search by meaning */}
      <div className="composer" style={{ display: "flex", gap: 10 }}>
        <input className="box" placeholder="Search your notes by meaning…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()} />
        <button className="primary" onClick={runSearch}>
          {searching ? <span className="spinner" /> : "Search"}
        </button>
      </div>

      {/* The list of notes. AnimatePresence lets cards animate out when deleted. */}
      {notes.length === 0 ? (
        <div className="empty"><div className="big">📝</div>No notes here yet — add one above.</div>
      ) : (
        <AnimatePresence>
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onChange={loadNotes} />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}
