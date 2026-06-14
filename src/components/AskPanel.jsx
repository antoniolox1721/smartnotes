// AskPanel.jsx — the "Ask AI" tab: a simple chat. You type a question, it
// shows up as your message, and the AI's answer appears below it.

import { useState } from "react";
import { motion } from "framer-motion";
import * as api from "../api.js";

export default function AskPanel() {
  // The list of chat messages so far. Each is { who: "me" | "ai", text }.
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");     // what's typed in the box
  const [busy, setBusy] = useState(false);   // true while waiting for the AI

  async function send() {
    const question = text.trim();
    if (!question || busy) return;

    // Show the user's message right away, then clear the box.
    setMessages((old) => [...old, { who: "me", text: question }]);
    setText("");
    setBusy(true);

    // Ask the backend and add the AI's reply.
    const { answer } = await api.askAi(question);
    setMessages((old) => [...old, { who: "ai", text: answer }]);
    setBusy(false);
  }

  return (
    <div className="chat">
      <div className="messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            💬 Ask anything about your notes.<br />
            e.g. “What do I need to buy?” or “Summarize my ideas.”
          </div>
        )}

        {messages.map((m, i) => (
          <motion.div
            key={i}
            className={"bubble " + (m.who === "me" ? "me" : "ai")}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {m.text}
          </motion.div>
        ))}

        {busy && <div className="bubble ai"><span className="spinner" /> Thinking…</div>}
      </div>

      <div className="chat-input">
        <input className="box" placeholder="Type your question…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="primary" onClick={send}>Send</button>
      </div>
    </div>
  );
}
