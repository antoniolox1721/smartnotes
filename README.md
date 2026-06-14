# 📝 SmartNotes

A full-stack, AI-powered notes app built on the **Cloudflare developer platform**,
with a **React** front end. Organize notes into folders, search them by meaning,
and chat with an AI about them.

**Live demo:** https://smartnotes.aloureiro-pedro.workers.dev

---

## What it does

- 🗂️ **Folders** — group notes (Work, Ideas, …) in a ChatGPT-style sidebar.
- 📝 **Notes tab** — create/delete notes and get one-click **AI summaries**.
- 🔎 **Semantic search** — finds notes by *idea*, not just exact words.
- 💬 **Ask AI tab** — a chat that answers questions using your own notes.
- 🗞️ **Daily digest** — a friendly recap rebuilt automatically every morning.
- ✨ **Smooth UI** — small Framer Motion animations (tab slide, cards fade in).

---

## Tech used

**Front end:** React + Vite + Framer Motion (animations).

**Back end (Cloudflare):**

| Service | Role |
|---|---|
| **Workers** | Runs the API at the edge and serves the React app. |
| **D1** | SQLite database for notes and folders. |
| **Workers AI** | LLM for summaries & answers (Llama 3.3) + an embedding model. |
| **Vectorize** | Vector index that powers semantic ("by meaning") search. |
| **KV** | Caches the daily digest. |
| **Cron Triggers** | Daily scheduled job that rebuilds the digest. |

---

## How it fits together

```
React app (src/) ──▶ Worker API (worker/index.js)
                         ├─ D1         (notes + folders)
                         ├─ Workers AI (summaries, answers, embeddings)
                         ├─ Vectorize  (semantic search)
                         └─ KV         (cached daily digest)
Cron (daily) ─▶ Worker.scheduled() ─▶ rebuilds the digest in KV
```

Vite builds the React app into `dist/`. Cloudflare serves `dist/` as the website
and runs the Worker for any `/api/*` request (see `wrangler.toml`).

---

## Project structure

```
index.html            # the page React mounts into
vite.config.js        # build settings + local dev API proxy
wrangler.toml         # Cloudflare settings + service bindings
schema.sql            # database tables (notes, folders)
worker/index.js       # the backend API (well commented)
src/
  main.jsx            # starts React
  App.jsx             # layout: sidebar + tabs
  api.js              # all calls to the backend
  styles.css          # all the styling
  components/
    Sidebar.jsx       # folders list
    NotesPanel.jsx    # notes tab (compose, search, list)
    NoteCard.jsx      # a single note
    AskPanel.jsx      # the Ask-AI chat
```

---

## Run it yourself

Needs a free [Cloudflare account](https://dash.cloudflare.com/sign-up) and Node.js.

```bash
npm install        # install dependencies
npm run dev        # React with hot reload at http://localhost:5173
                   # (API calls are proxied to the live Worker — see vite.config.js)
npm run deploy     # build the React app and publish everything to Cloudflare
```

Set up the database once:

```bash
npx wrangler d1 execute smartnotes-db --remote --file=schema.sql
```

---

Built as a learning project to get hands-on with the full Cloudflare stack + React.
