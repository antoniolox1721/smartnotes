// NoteCard.jsx — shows a single note, plus its "Summarize" and "Delete" buttons.

import { useState } from "react";
import { motion } from "framer-motion";
import * as api from "../api.js";

export default function NoteCard({ note, onChange }) {
  // The summary we show. Starts with whatever the note already had.
  const [summary, setSummary] = useState(note.summary);
  // True while we're waiting for the AI summary.
  const [busy, setBusy] = useState(false);

  async function summarize() {
    setBusy(true);
    const result = await api.summarizeNote(note.id);
    setSummary(result.summary);
    setBusy(false);
  }

  async function remove() {
    await api.deleteNote(note.id);
    onChange(); // ask the list to reload
  }

  return (
    // The motion.div makes the card fade/slide in when it appears and out when removed.
    <motion.div
      layout
      className="note"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
    >
      <h3>{note.title}</h3>
      <p className="body">{note.body}</p>

      {summary && <div className="summary">{summary}</div>}

      <div className="foot">
        <button className="mini" onClick={summarize} disabled={busy}>
          {busy ? <span className="spinner" /> : "✨ Summarize"}
        </button>
        <button className="mini danger" onClick={remove}>🗑 Delete</button>
        <span className="date">{note.created_at}</span>
      </div>
    </motion.div>
  );
}
