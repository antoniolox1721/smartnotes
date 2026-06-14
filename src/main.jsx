// main.jsx — the starting point of the React app.
// It finds the empty <div id="root"> in index.html and tells React to draw
// our whole <App /> inside it.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
