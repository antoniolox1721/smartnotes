// Sidebar.jsx — the dark left column: the logo, the folder list, and a small
// box to add a new folder. Clicking a folder tells App which one is selected.

import { useState } from "react";
import { motion } from "framer-motion";
import * as api from "../api.js";

export default function Sidebar({ folders, activeFolder, onSelect, onChange }) {
  // The text currently typed in the "new folder" box.
  const [newName, setNewName] = useState("");

  async function createFolder() {
    const name = newName.trim();
    if (!name) return;
    await api.addFolder(name);
    setNewName("");
    onChange(); // ask App to reload the folder list
  }

  async function removeFolder(id, event) {
    event.stopPropagation();        // don't also "select" the folder when deleting
    await api.deleteFolder(id);
    if (activeFolder === id) onSelect(null); // fall back to "All notes"
    onChange();
  }

  return (
    <div className="sidebar">
      <div className="brand"><span className="mark">✦</span> SmartNotes</div>

      <div className="side-label">Folders</div>

      {/* "All notes" is always first and selected when no folder is chosen. */}
      <div
        className={"folder" + (activeFolder === null ? " active" : "")}
        onClick={() => onSelect(null)}
      >
        <span>🗂 All notes</span>
      </div>

      {/* One row per folder. Each row gently slides in when it appears. */}
      {folders.map((folder) => (
        <motion.div
          key={folder.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className={"folder" + (activeFolder === folder.id ? " active" : "")}
          onClick={() => onSelect(folder.id)}
        >
          <span>📁 {folder.name}</span>
          <span className="x" onClick={(e) => removeFolder(folder.id, e)}>✕</span>
        </motion.div>
      ))}

      {/* Add-a-folder box. Pressing Enter also creates it. */}
      <div className="add-folder">
        <input
          value={newName}
          placeholder="New folder…"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createFolder()}
        />
        <button onClick={createFolder}>+</button>
      </div>

      <div className="side-foot">Built on Cloudflare Workers, D1, AI &amp; Vectorize.</div>
    </div>
  );
}
