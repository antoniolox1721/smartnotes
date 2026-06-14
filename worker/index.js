// ============================================================================
// worker/index.js  —  the backend (a Cloudflare Worker).
//
// This file ONLY answers data requests (the "/api/..." URLs). The actual
// web page is now a React app that Cloudflare serves for us as static files,
// so this Worker no longer returns any HTML — it just sends/receives data.
//
// Cloudflare calls `fetch` for every request. The `env` argument holds the
// tools we set up in wrangler.toml:
//   env.DB        -> the database (notes + folders)
//   env.AI        -> the AI models (summaries, answers, search "meaning")
//   env.VECTORIZE -> the search index that finds notes by meaning
//   env.CACHE     -> fast storage that remembers the daily digest
// ============================================================================

const CHAT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"; // writes summaries & answers
const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5";               // turns text into "meaning" numbers

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // --- Folders ---
    if (path === "/api/folders" && method === "GET") {
      const { results } = await env.DB
        .prepare("SELECT * FROM folders ORDER BY created_at")
        .all();
      return json(results);
    }
    if (path === "/api/folders" && method === "POST") {
      const { name } = await request.json();
      if (!name) return json({ error: "Folder needs a name." }, 400);
      await env.DB.prepare("INSERT INTO folders (name) VALUES (?)").bind(name).run();
      return json({ ok: true }, 201);
    }
    if (path.startsWith("/api/folders/") && method === "DELETE") {
      const id = lastPart(path);
      // Move that folder's notes back to "no folder", then delete the folder.
      await env.DB.prepare("UPDATE notes SET folder_id = NULL WHERE folder_id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM folders WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    // --- Notes ---
    // GET /api/notes           -> every note
    // GET /api/notes?folder=3  -> only notes inside folder 3
    if (path === "/api/notes" && method === "GET") {
      const folder = url.searchParams.get("folder");
      const query = folder
        ? env.DB.prepare("SELECT * FROM notes WHERE folder_id = ? ORDER BY created_at DESC").bind(folder)
        : env.DB.prepare("SELECT * FROM notes ORDER BY created_at DESC");
      const { results } = await query.all();
      return json(results);
    }
    if (path === "/api/notes" && method === "POST") {
      return createNote(request, env);
    }
    if (path.startsWith("/api/notes/") && path.endsWith("/summarize") && method === "POST") {
      return summarizeNote(path.split("/")[3], env);
    }
    if (path.startsWith("/api/notes/") && method === "DELETE") {
      const id = lastPart(path);
      await env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();
      await env.VECTORIZE.deleteByIds([id]); // also forget it from search
      return json({ ok: true });
    }

    // --- AI features ---
    if (path === "/api/ask" && method === "POST") return askNotes(request, env);
    if (path === "/api/search" && method === "POST") return searchNotes(request, env);

    // --- Daily digest (kept ready in fast storage) ---
    if (path === "/api/digest" && method === "GET") {
      const digest = await env.CACHE.get("digest");
      return json({ digest: digest || "No digest yet — add a few notes and check back tomorrow." });
    }

    return new Response("Not found", { status: 404 });
  },

  // Runs automatically once a day (schedule is in wrangler.toml).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(buildDigest(env));
  },
};

// ----------------------------------------------------------------------------
// Features
// ----------------------------------------------------------------------------

// Save a new note, then teach the search index what it's about.
async function createNote(request, env) {
  const { title, body, folder_id } = await request.json();
  if (!title) return json({ error: "Please give the note a title." }, 400);

  const result = await env.DB
    .prepare("INSERT INTO notes (title, body, folder_id) VALUES (?, ?, ?)")
    .bind(title, body || "", folder_id || null)
    .run();

  const id = String(result.meta.last_row_id);
  const meaning = await toMeaning(env, title + "\n" + body);
  await env.VECTORIZE.upsert([{ id, values: meaning, metadata: { title } }]);

  return json({ ok: true, id }, 201);
}

// Ask the AI for a one-line summary of a note, save it, send it back.
async function summarizeNote(id, env) {
  const note = await env.DB.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
  if (!note) return json({ error: "That note doesn't exist." }, 404);

  const summary = await askAi(env, [
    { role: "system", content: "Summarize the note in one short, clear sentence." },
    { role: "user", content: note.title + "\n" + note.body },
  ]);

  await env.DB.prepare("UPDATE notes SET summary = ? WHERE id = ?").bind(summary, id).run();
  return json({ summary });
}

// Answer a question using the few notes most related to it.
async function askNotes(request, env) {
  const { question } = await request.json();
  if (!question) return json({ error: "Please type a question." }, 400);

  const notes = await findRelatedNotes(env, question, 4);
  const background = notes.map(n => "- " + n.title + ": " + n.body).join("\n") || "(no notes yet)";

  const answer = await askAi(env, [
    { role: "system", content: "Answer using only the notes below. If they don't cover it, say so." },
    { role: "user", content: "Notes:\n" + background + "\n\nQuestion: " + question },
  ]);

  return json({ answer });
}

// Return the notes that best match a search phrase (by meaning).
async function searchNotes(request, env) {
  const { query } = await request.json();
  if (!query) return json({ error: "Please type something to search for." }, 400);
  return json(await findRelatedNotes(env, query, 8));
}

// Build a friendly recap of all notes and remember it in fast storage.
async function buildDigest(env) {
  const { results } = await env.DB.prepare("SELECT title, body FROM notes").all();
  if (results.length === 0) return;

  const list = results.map(n => "- " + n.title + ": " + n.body).join("\n");
  const digest = await askAi(env, [
    { role: "system", content: "Write a short, friendly daily digest of these notes." },
    { role: "user", content: list },
  ]);
  await env.CACHE.put("digest", digest);
}

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------

// Find notes related to some text: turn it into meaning, ask the search index
// for the closest ids, then look those notes up in the database.
async function findRelatedNotes(env, text, howMany) {
  const meaning = await toMeaning(env, text);
  const matches = await env.VECTORIZE.query(meaning, { topK: howMany });
  const ids = matches.matches.map(m => m.id);
  if (ids.length === 0) return [];

  const slots = ids.map(() => "?").join(",");
  const { results } = await env.DB
    .prepare("SELECT * FROM notes WHERE id IN (" + slots + ")")
    .bind(...ids)
    .all();
  return results;
}

// Turn text into a list of numbers that represent its meaning.
async function toMeaning(env, text) {
  const result = await env.AI.run(EMBED_MODEL, { text: [text] });
  return result.data[0];
}

// Send messages to the AI and get its reply as plain text.
async function askAi(env, messages) {
  const result = await env.AI.run(CHAT_MODEL, { messages });
  return result.response.trim();
}

// "/api/notes/5" -> "5"
function lastPart(path) {
  return path.split("/").pop();
}

// Send data back as JSON, with an optional status code.
function json(data, status = 200) {
  return Response.json(data, { status });
}
