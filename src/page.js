// ============================================================================
// page.js  —  the web page people actually see and click.
//
// A web page is made of three things, and ALL THREE live in the big text
// below (called a "template string", wrapped in backticks ` `):
//
//   1. HTML  -> the structure (headings, inputs, buttons).
//   2. CSS   -> inside <style>, the looks (colors, spacing, fonts).
//   3. JS    -> inside <script>, the behavior (what happens on a click).
//
// index.js sends this whole string to the browser when someone opens the app.
// The browser reads it top to bottom and draws the page.
// ============================================================================

export const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SmartNotes — AI notes on Cloudflare</title>

  <style>
    /* --- Colors and shared values, named once so we can reuse them everywhere.
           Change a value here and it updates across the whole page. --- */
    :root {
      --bg-1: #eef2ff;          /* page background, top */
      --bg-2: #faf5ff;          /* page background, bottom */
      --ink: #1e1b3a;           /* main text color (dark) */
      --muted: #6b7280;         /* softer grey text */
      --card: #ffffff;          /* card background */
      --line: #e9e7f5;          /* thin border color */
      --brand: #6d5efc;         /* main purple accent */
      --brand-2: #a855f7;       /* second purple for gradients */
      --ring: rgba(109,94,252,.25); /* glow when an input is focused */
      --shadow: 0 12px 40px rgba(76,57,160,.12); /* soft card shadow */
      --radius: 18px;           /* how round the corners are */
    }

    /* Make every element size itself in a predictable way. */
    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      padding: 40px 16px 80px;
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      /* A soft two-color gradient background. */
      background: linear-gradient(180deg, var(--bg-1), var(--bg-2));
    }

    /* Keeps content centered and not too wide on big screens. */
    .wrap { max-width: 720px; margin: 0 auto; }

    /* --- Top header with the logo and tagline --- */
    header { text-align: center; margin-bottom: 28px; }
    .logo {
      display: inline-flex; align-items: center; gap: 10px;
      font-size: 1.9rem; font-weight: 800; letter-spacing: -.02em;
    }
    .logo .dot {
      width: 34px; height: 34px; border-radius: 10px;
      background: linear-gradient(135deg, var(--brand), var(--brand-2));
      display: grid; place-items: center; color: #fff; font-size: 1.1rem;
    }
    header p { color: var(--muted); margin: 10px 0 0; }
    .badge {
      display: inline-block; margin-top: 12px; padding: 4px 12px;
      font-size: .78rem; font-weight: 600; color: var(--brand);
      background: #fff; border: 1px solid var(--line); border-radius: 999px;
    }

    /* --- Cards: the white rounded boxes that hold everything --- */
    .card {
      background: var(--card); border: 1px solid var(--line);
      border-radius: var(--radius); padding: 20px;
      box-shadow: var(--shadow); margin-bottom: 18px;
    }

    /* --- Text boxes you type into --- */
    input, textarea {
      width: 100%; padding: 13px 15px; font-size: 1rem; color: var(--ink);
      background: #fff; border: 1px solid var(--line); border-radius: 12px;
      font-family: inherit;
    }
    input::placeholder, textarea::placeholder { color: #9ca3af; }
    textarea { resize: vertical; min-height: 84px; }
    /* A soft glow when a text box is selected. */
    input:focus, textarea:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 4px var(--ring); }

    /* --- Buttons --- */
    button {
      font: inherit; font-weight: 600; cursor: pointer; border-radius: 12px;
      padding: 12px 18px; border: 1px solid transparent;
      transition: transform .05s ease, opacity .15s ease, background .15s ease;
    }
    button:active { transform: translateY(1px); }
    /* The main filled purple button. */
    .btn-primary { color: #fff; background: linear-gradient(135deg, var(--brand), var(--brand-2)); }
    .btn-primary:hover { opacity: .92; }
    /* A lighter outlined button. */
    .btn-ghost { color: var(--ink); background: #fff; border-color: var(--line); }
    .btn-ghost:hover { background: #f7f6ff; }
    /* A tiny text-only button (for note actions). */
    .btn-mini { padding: 7px 12px; font-size: .85rem; color: var(--muted); background: transparent; border-color: var(--line); }
    .btn-mini:hover { color: var(--brand); border-color: var(--brand); }
    .btn-mini.danger:hover { color: #e11d48; border-color: #fca5a5; }

    /* --- The search / ask bar --- */
    .search-row { display: flex; gap: 10px; }
    .search-row input { flex: 1; }
    .answer {
      margin-top: 14px; padding: 14px 16px; border-radius: 12px;
      background: linear-gradient(135deg, #f5f3ff, #faf5ff);
      border: 1px solid var(--line); color: var(--ink); white-space: pre-wrap;
      display: none; /* hidden until there is something to show */
    }
    .answer.show { display: block; }
    .answer .who { font-weight: 700; color: var(--brand); margin-right: 6px; }

    /* --- A single note --- */
    .note { position: relative; }
    .note h3 { margin: 0 0 6px; font-size: 1.15rem; }
    .note .body { margin: 0; color: #4b5563; white-space: pre-wrap; line-height: 1.5; }
    .note .summary {
      margin-top: 12px; padding: 10px 14px; border-radius: 10px;
      background: #f5f3ff; border-left: 3px solid var(--brand); color: #4338ca; font-size: .95rem;
    }
    .note .meta { margin-top: 12px; font-size: .8rem; color: var(--muted); }
    .note .actions { display: flex; gap: 8px; margin-top: 14px; }

    /* --- The "no notes yet" message --- */
    .empty { text-align: center; color: var(--muted); padding: 36px 10px; }
    .empty .big { font-size: 2.2rem; }

    /* --- Little pop-up messages (toasts) in the corner --- */
    #toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: var(--ink); color: #fff; padding: 12px 18px; border-radius: 12px;
      font-size: .9rem; box-shadow: var(--shadow); opacity: 0; pointer-events: none;
      transition: opacity .2s ease; z-index: 10;
    }
    #toast.show { opacity: 1; }

    /* A small spinning circle to show "loading". */
    .spinner {
      display: inline-block; width: 16px; height: 16px; vertical-align: -3px;
      border: 2px solid var(--line); border-top-color: var(--brand);
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>

<body>
  <div class="wrap">

    <!-- Header -->
    <header>
      <div class="logo"><span class="dot">✦</span> SmartNotes</div>
      <p>Write notes, then search and ask questions with AI.</p>
      <span class="badge">Running on the Cloudflare edge</span>
    </header>

    <!-- Search / Ask box -->
    <div class="card">
      <div class="search-row">
        <input id="q" placeholder="Search your notes, or ask a question…" onkeydown="if(event.key==='Enter') ask()" />
        <button class="btn-ghost" onclick="search()">Search</button>
        <button class="btn-primary" onclick="ask()">Ask AI</button>
      </div>
      <div id="answer" class="answer"></div>
    </div>

    <!-- New note box -->
    <div class="card">
      <input id="title" placeholder="Note title" />
      <textarea id="body" placeholder="Write something…" style="margin-top:12px"></textarea>
      <button class="btn-primary" style="margin-top:12px" onclick="addNote()">Add note</button>
    </div>

    <!-- All notes get drawn inside here by the code below. -->
    <div id="list"></div>
  </div>

  <!-- The little pop-up message element. -->
  <div id="toast"></div>

  <script>
    // ----- Tiny shortcuts so the code below reads nicely -----

    // Find an element on the page by its id (e.g. byId("title")).
    const byId = id => document.getElementById(id);

    // Call our own API and return the reply already turned into data.
    const callApi = (url, options) => fetch(url, options).then(r => r.json());

    // Build the settings for a POST request that sends some data as JSON.
    const asPost = data => ({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });

    // Show a small pop-up message for a couple of seconds.
    function toast(message) {
      const el = byId("toast");
      el.textContent = message;
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 2200);
    }

    // Make user-typed text safe to show (so it can't break the page layout).
    function safe(text) {
      const box = document.createElement("div");
      box.textContent = text || "";
      return box.innerHTML;
    }

    // ----- Drawing notes on the page -----

    // Ask the server for all notes, then draw them.
    async function loadNotes() {
      drawNotes(await callApi("/api/notes"));
    }

    // Turn a list of notes into HTML and put it on the page.
    function drawNotes(notes) {
      // If there are no notes, show a friendly empty message instead.
      if (!notes.length) {
        byId("list").innerHTML =
          '<div class="card empty"><div class="big">📝</div>No notes yet — add your first one above.</div>';
        return;
      }

      // For each note, build one card. (.map makes a card for every note,
      // and .join glues them into one block of HTML.)
      byId("list").innerHTML = notes.map(note => \`
        <div class="card note">
          <h3>\${safe(note.title)}</h3>
          <p class="body">\${safe(note.body)}</p>
          \${note.summary ? '<div class="summary">' + safe(note.summary) + '</div>' : ''}
          <div class="meta">\${note.created_at}</div>
          <div class="actions">
            <button class="btn-mini" onclick="summarize(\${note.id})">✨ Summarize</button>
            <button class="btn-mini danger" onclick="remove(\${note.id})">🗑 Delete</button>
          </div>
        </div>\`).join("");
    }

    // ----- Actions triggered by the buttons -----

    // Save a new note from the title and body boxes.
    async function addNote() {
      const title = byId("title").value.trim();
      const body = byId("body").value.trim();
      if (!title) return toast("Please add a title first.");

      await callApi("/api/notes", asPost({ title, body }));
      byId("title").value = "";
      byId("body").value = "";
      toast("Note added ✓");
      loadNotes();
    }

    // Delete a note by its id.
    async function remove(id) {
      await fetch("/api/notes/" + id, { method: "DELETE" });
      toast("Note deleted");
      loadNotes();
    }

    // Ask the AI to summarize one note, then refresh to show the summary.
    async function summarize(id) {
      toast("Summarizing…");
      await callApi("/api/notes/" + id + "/summarize", { method: "POST" });
      loadNotes();
    }

    // Search notes by meaning and show only the matches.
    async function search() {
      const query = byId("q").value.trim();
      if (!query) return;
      hideAnswer();
      byId("list").innerHTML = '<div class="card empty"><span class="spinner"></span> Searching…</div>';
      drawNotes(await callApi("/api/search", asPost({ query })));
    }

    // Ask the AI a question and show its answer in the box.
    async function ask() {
      const question = byId("q").value.trim();
      if (!question) return;
      showAnswer('<span class="spinner"></span> Thinking…');
      const { answer } = await callApi("/api/ask", asPost({ question }));
      showAnswer('<span class="who">AI</span>' + safe(answer));
    }

    // Helpers to show/hide the answer box.
    function showAnswer(html) { const a = byId("answer"); a.innerHTML = html; a.classList.add("show"); }
    function hideAnswer() { byId("answer").classList.remove("show"); }

    // When the page first opens, load the notes.
    loadNotes();
  </script>
</body>
</html>`;
