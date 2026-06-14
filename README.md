# 📝 SmartNotes

A small full-stack notes app built entirely on the **Cloudflare developer platform**.
You can write notes, **search them by meaning**, **ask an AI questions** about them,
get **one-line AI summaries**, and read an automatic **daily digest**.

**Live demo:** https://smartnotes.aloureiro-pedro.workers.dev

---

## What it does

- ✍️ **Create / delete notes** — saved in a real database.
- 🔎 **Semantic search** — finds notes by *idea*, not just exact words
  (searching "what should I buy" finds your "Grocery list").
- 🤖 **Ask AI** — answers questions using your own notes as context.
- ✨ **Summarize** — one-click AI summary for any note.
- 🗞️ **Daily digest** — a friendly recap rebuilt automatically every morning.

---

## Cloudflare services used

This project intentionally combines several parts of Cloudflare's platform:

| Service | What it does here |
|---|---|
| **Workers** | Runs all the code at the edge (the app's backend + serves the page). |
| **D1** | SQLite database that stores the notes. |
| **Workers AI** | LLM for summaries & answers (Llama 3.3) and an embedding model for search. |
| **Vectorize** | Vector index that powers semantic ("by meaning") search. |
| **KV** | Fast key/value store that caches the daily digest. |
| **Cron Triggers** | Runs a scheduled job once a day to rebuild the digest. |

---

## How it works (the short version)

1. The browser loads the page (`src/page.js`) from a Worker.
2. The page calls a small JSON API also handled by the Worker (`src/index.js`).
3. When a note is created, its text is turned into an *embedding* (numbers that
   capture meaning) and stored in **Vectorize**, so it becomes searchable.
4. Search/Ask turn your query into an embedding too, find the closest notes,
   and (for Ask) hand them to the **Workers AI** model to write an answer.

```
Browser ──▶ Worker (src/index.js)
               ├─ D1        (store/read notes)
               ├─ Workers AI(summaries, answers, embeddings)
               ├─ Vectorize (semantic search)
               └─ KV        (cached daily digest)
Cron (daily) ─▶ Worker.scheduled() ─▶ rebuilds the digest in KV
```

---

## Project structure

```
src/index.js   # the backend: routes + all the logic (well commented)
src/page.js    # the frontend: HTML + CSS + browser JS in one file
schema.sql     # the database table definition
wrangler.toml  # Cloudflare settings + service bindings
```

---

## Run it yourself

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up) and Node.js.

```bash
npm install                 # install Wrangler (Cloudflare's CLI)
npm run dev                 # run locally at http://localhost:8787
npm run deploy              # publish it live
```

Set up the database once:

```bash
npx wrangler d1 execute smartnotes-db --remote --file=schema.sql
```

> Note: semantic search uses Vectorize, which only runs against the real
> Cloudflare service (use `npm run dev -- --remote` to test it locally).

---

Built as a learning project to get hands-on with the Cloudflare stack.
