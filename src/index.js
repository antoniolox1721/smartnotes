// ============================================================================
// index.js  —  the "brain" of the app (this is the Cloudflare Worker).
//
// HOW A WORKER WORKS, in one sentence:
//   Every time someone visits a URL of our app, Cloudflare calls our `fetch`
//   function below, hands us the incoming `request`, and sends back whatever
//   we `return`.
//
// The second argument, `env`, is a box of tools Cloudflare gives us. We set
// these up in wrangler.toml:
//   env.DB        -> the database where notes are saved
//   env.AI        -> the AI models (summaries, answers, search "meaning")
//   env.VECTORIZE -> the search index that finds notes by meaning
//   env.CACHE     -> fast storage that remembers the daily digest
// ============================================================================

import { page } from "./page.js"; // the HTML for the web page lives in page.js

// The two AI models we use. Think of these as "which AI to call".
const CHAT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"; // writes summaries & answers
const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5";               // turns text into "meaning" numbers

export default {
  // This runs for every incoming web request.
  async fetch(request, env) {
    // Break the web address into pieces so we can see which path was asked for.
    const url = new URL(request.url);
    const path = url.pathname;             // e.g. "/api/notes"
    const method = request.method;         // e.g. "GET" or "POST"

    // If someone opens the site root, send back the web page.
    if (path === "/") {
      return sendPage(page);
    }

    // Show every note, newest first.
    if (path === "/api/notes" && method === "GET") {
      const { results } = await env.DB
        .prepare("SELECT * FROM notes ORDER BY created_at DESC")
        .all();
      return sendJson(results);
    }

    // Save a brand-new note.
    if (path === "/api/notes" && method === "POST") {
      return createNote(request, env);
    }

    // Delete a note. The URL looks like "/api/notes/5".
    if (path.startsWith("/api/notes/") && method === "DELETE") {
      const id = lastPart(path);
      await env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();
      await env.VECTORIZE.deleteByIds([id]); // also forget it from search
      return sendJson({ ok: true });
    }

    // Ask the AI to summarize one note. URL: "/api/notes/5/summarize".
    if (path.endsWith("/summarize") && method === "POST") {
      const id = path.split("/")[3];
      return summarizeNote(id, env);
    }

    // Ask a question and let the AI answer using your notes.
    if (path === "/api/ask" && method === "POST") {
      return askNotes(request, env);
    }

    // Search your notes by meaning.
    if (path === "/api/search" && method === "POST") {
      return searchNotes(request, env);
    }

    // Show the pre-made daily digest (kept ready in fast storage).
    if (path === "/api/digest" && method === "GET") {
      const digest = await env.CACHE.get("digest");
      return sendJson({ digest: digest || "No digest yet — add a few notes and check back tomorrow." });
    }

    // If nothing above matched, the page/route doesn't exist.
    return new Response("Not found", { status: 404 });
  },

  // This runs automatically on a schedule (set in wrangler.toml), NOT when a
  // person visits. We use it to rebuild the daily digest once a day.
  async scheduled(event, env, ctx) {
    // waitUntil tells Cloudflare "please finish this background job before stopping".
    ctx.waitUntil(buildDigest(env));
  },
};

// ----------------------------------------------------------------------------
// The actual features. Each function does one clear thing.
// ----------------------------------------------------------------------------

// Save a new note, then teach the search index what it's about.
async function createNote(request, env) {
  const { title, body } = await request.json(); // read what the browser sent
  if (!title) return sendJson({ error: "Please give the note a title." }, 400);

  // Step 1: put the note in the database.
  const result = await env.DB
    .prepare("INSERT INTO notes (title, body) VALUES (?, ?)")
    .bind(title, body || "")
    .run();

  // The database gives the new note a number; we reuse it as the search id.
  const id = String(result.meta.last_row_id);

  // Step 2: turn the note into "meaning numbers" and store them for searching.
  const meaning = await toMeaning(env, title + "\n" + body);
  await env.VECTORIZE.upsert([{ id, values: meaning, metadata: { title } }]);

  return sendJson({ ok: true, id }, 201);
}

// Ask the AI for a one-line summary of a note, save it, and send it back.
async function summarizeNote(id, env) {
  const note = await env.DB.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
  if (!note) return sendJson({ error: "That note doesn't exist." }, 404);

  const summary = await askAi(env, [
    { role: "system", content: "Summarize the note in one short, clear sentence." },
    { role: "user", content: note.title + "\n" + note.body },
  ]);

  await env.DB.prepare("UPDATE notes SET summary = ? WHERE id = ?").bind(summary, id).run();
  return sendJson({ summary });
}

// Answer a question using the few notes most related to it.
async function askNotes(request, env) {
  const { question } = await request.json();
  if (!question) return sendJson({ error: "Please type a question." }, 400);

  // Find the most relevant notes, then hand them to the AI as background info.
  const notes = await findRelatedNotes(env, question, 4);
  const background = notes.map(n => "- " + n.title + ": " + n.body).join("\n") || "(no notes yet)";

  const answer = await askAi(env, [
    { role: "system", content: "Answer using only the notes below. If they don't cover it, say so." },
    { role: "user", content: "Notes:\n" + background + "\n\nQuestion: " + question },
  ]);

  return sendJson({ answer });
}

// Return the notes that best match a search phrase (by meaning, not keywords).
async function searchNotes(request, env) {
  const { query } = await request.json();
  if (!query) return sendJson({ error: "Please type something to search for." }, 400);
  return sendJson(await findRelatedNotes(env, query, 5));
}

// Build a friendly summary of all notes and remember it in fast storage.
// (Called by the daily scheduled job.)
async function buildDigest(env) {
  const { results } = await env.DB.prepare("SELECT title, body FROM notes").all();
  if (results.length === 0) return; // nothing to summarize yet

  const list = results.map(n => "- " + n.title + ": " + n.body).join("\n");
  const digest = await askAi(env, [
    { role: "system", content: "Write a short, friendly daily digest of these notes." },
    { role: "user", content: list },
  ]);

  await env.CACHE.put("digest", digest);
}

// ----------------------------------------------------------------------------
// Small helpers used by the functions above. Each is tiny on purpose.
// ----------------------------------------------------------------------------

// Find notes related to some text, in 3 steps.
async function findRelatedNotes(env, text, howMany) {
  // 1. Turn the search text into meaning numbers.
  const meaning = await toMeaning(env, text);

  // 2. Ask the search index for the closest matching note ids.
  const matches = await env.VECTORIZE.query(meaning, { topK: howMany });
  const ids = matches.matches.map(m => m.id);
  if (ids.length === 0) return [];

  // 3. Look those ids up in the database to get the full notes.
  const slots = ids.map(() => "?").join(","); // makes "?,?,?" for the query
  const { results } = await env.DB
    .prepare("SELECT * FROM notes WHERE id IN (" + slots + ")")
    .bind(...ids)
    .all();
  return results;
}

// Turn a piece of text into a list of numbers that represent its meaning.
// (This is what makes "search by idea" possible.)
async function toMeaning(env, text) {
  const result = await env.AI.run(EMBED_MODEL, { text: [text] });
  return result.data[0];
}

// Send some messages to the AI and get its reply as plain text.
async function askAi(env, messages) {
  const result = await env.AI.run(CHAT_MODEL, { messages });
  return result.response.trim();
}

// Grab the last piece of a path, e.g. "/api/notes/5" -> "5".
function lastPart(path) {
  return path.split("/").pop();
}

// Send back a web page (HTML).
function sendPage(html) {
  return new Response(html, { headers: { "content-type": "text/html" } });
}

// Send back data as JSON, with an optional status code (200 = OK by default).
function sendJson(data, status = 200) {
  return Response.json(data, { status });
}
