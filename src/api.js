// api.js — all the "talk to the backend" code in one place.
//
// Each function here calls one of our Worker's "/api/..." URLs and hands back
// the result. Keeping them together means the rest of the app never has to
// think about fetch(), URLs, or JSON — it just calls these friendly functions.

// Small helper: GET a URL and return the data.
const get = (url) => fetch(url).then((r) => r.json());

// Small helper: POST some data to a URL and return the reply.
const post = (url, data) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data || {}),
  }).then((r) => r.json());

// Small helper: DELETE a URL.
const del = (url) => fetch(url, { method: "DELETE" }).then((r) => r.json());

// --- Folders ---
export const getFolders = () => get("/api/folders");
export const addFolder = (name) => post("/api/folders", { name });
export const deleteFolder = (id) => del("/api/folders/" + id);

// --- Notes ---
// If a folderId is given, only that folder's notes come back.
export const getNotes = (folderId) =>
  get("/api/notes" + (folderId ? "?folder=" + folderId : ""));
export const addNote = (note) => post("/api/notes", note);
export const deleteNote = (id) => del("/api/notes/" + id);
export const summarizeNote = (id) => post("/api/notes/" + id + "/summarize");

// --- AI ---
export const askAi = (question) => post("/api/ask", { question });
export const searchNotes = (query) => post("/api/search", { query });
