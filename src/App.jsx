// App.jsx — the top-level component. It decides the overall layout:
//   [ Sidebar (folders) ] [ Tabs + the active panel ]
//
// React idea in one line: a "component" is a function that returns what to show.
// "state" (useState) is data that, when changed, makes the screen redraw.

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as api from "./api.js";
import Sidebar from "./components/Sidebar.jsx";
import NotesPanel from "./components/NotesPanel.jsx";
import AskPanel from "./components/AskPanel.jsx";

export default function App() {
  // The folders shown in the sidebar.
  const [folders, setFolders] = useState([]);
  // Which folder is selected. `null` means "All notes".
  const [activeFolder, setActiveFolder] = useState(null);
  // Which tab is open: "notes" or "ask".
  const [tab, setTab] = useState("notes");

  // Load the folder list once, when the app first opens.
  useEffect(() => { refreshFolders(); }, []);

  async function refreshFolders() {
    setFolders(await api.getFolders());
  }

  return (
    <div className="app">
      <Sidebar
        folders={folders}
        activeFolder={activeFolder}
        onSelect={setActiveFolder}
        onChange={refreshFolders}
      />

      <div className="main">
        {/* Tabs */}
        <div className="tabs">
          <TabButton id="notes" tab={tab} setTab={setTab}>📝 Notes</TabButton>
          <TabButton id="ask" tab={tab} setTab={setTab}>💬 Ask AI</TabButton>
        </div>

        {/* Show the panel for the active tab, with a gentle fade between them. */}
        <div className="content">
          <div className="content-inner" style={{ height: "100%" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{ height: "100%" }}
              >
                {tab === "notes"
                  ? <NotesPanel activeFolder={activeFolder} folders={folders} />
                  : <AskPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// One tab button. The purple underline slides between tabs because both
// buttons share the same layoutId — Framer Motion animates it for us.
function TabButton({ id, tab, setTab, children }) {
  const active = tab === id;
  return (
    <button className={"tab" + (active ? " active" : "")} onClick={() => setTab(id)}>
      {children}
      {active && <motion.div layoutId="tab-underline" className="tab-underline" />}
    </button>
  );
}
