# Complete VS Code Guide for Smart Search

This document explains everything you need to know about opening, configuring, running, and monitoring the **Smart Search** project in **Visual Studio Code**.

---

## 🖥️ 1. Opening the Project in VS Code

1. Open **Visual Studio Code**.
2. Click **File** > **Open Folder...** (or press `Ctrl+K Ctrl+O` on Windows, `Cmd+O` on macOS).
3. Select your root project folder `smart-search`.
4. Your Explorer sidebar should display:
   ```text
   smart-search/
   ├── backend/
   │   ├── package.json
   │   └── server.js
   ├── frontend/
   │   ├── package.json
   │   ├── vite.config.js
   │   ├── index.html
   │   └── src/
   │       ├── App.jsx
   │       ├── main.jsx
   │       ├── index.css
   │       ├── hooks/useDebounce.js
   │       └── components/
   ├── VS_CODE_GUIDE.md
   └── README.md
   ```

---

## ⚡ 2. Understanding the Two Terminals

Because this is a full-stack project, you need **two separate integrated terminals** running side-by-side or in tabs inside VS Code:

| Terminal | Purpose | Directory | Port | Command to Run |
| :--- | :--- | :--- | :--- | :--- |
| **Terminal 1** | Node.js + Express Backend API | `/backend` | `5000` | `node server.js` |
| **Terminal 2** | React + Vite Frontend UI | `/frontend` | `5173` | `npm run dev` |

---

## 🟢 3. Terminal 1: The Backend Terminal

### How to open and run:
1. In VS Code, open the terminal by pressing ``Ctrl + ` `` (backtick) or clicking **Terminal** > **New Terminal**.
2. Run:
   ```bash
   cd backend
   npm install
   node server.js
   ```

### What Terminal 1 prints when it starts:
```text
====================================================
🚀 Smart Search Backend is running on:
   http://localhost:5000
   Endpoint: GET http://localhost:5000/search?q=react
   Cache Inspector: GET http://localhost:5000/cache
====================================================
```

### What Terminal 1 prints while you use the application:
The backend terminal is a **live activity monitor**. Every time you search or a request is processed, logs will stream here:

1. **First-time search (Cache MISS):**
   ```text
   [INCOMING REQUEST] Query: "react" (Normalized: "react")
   ⏳ [CACHE MISS] Waiting ~800ms intentional delay for "react"...
   ✅ [CACHE STORED] Saved "react" to cache (4 results)
   ```
2. **Repeated search (Cache HIT):**
   ```text
   [INCOMING REQUEST] Query: "react" (Normalized: "react")
   ⚡ [CACHE HIT] Returning cached results immediately for "react"
   ```
3. **Expired cache after 60 seconds (TTL eviction):**
   ```text
   [CACHE EVICT] Key "react" expired after 60s
   ```

### ⚠️ Golden Rules for the Backend Terminal:
- **DO NOT CLOSE IT:** If you close Terminal 1 or press `Ctrl + C`, the server shuts down. If the server is off, the React frontend cannot fetch any search results!
- **To Stop the Backend:** Press `Ctrl + C` (or `Cmd + C` on Mac).
- **Auto-restart mode:** You can also run `npm run dev` in the backend folder, which uses Node's built-in `--watch` mode to auto-restart whenever you edit `server.js`.

---

## 🔵 4. Terminal 2: The Frontend Terminal

### How to open and run:
1. In the VS Code terminal window, look at the top right and click the **`+` (Split or New Terminal)** icon.
2. In this second terminal tab, run:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### What Terminal 2 prints:
```text
  VITE v5.3.1  ready in 240 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Accessing the App:
Hold `Ctrl` and click `http://localhost:5173` (or open Chrome and navigate to `http://localhost:5173`).

---

## 🔍 5. Inspecting in Chrome DevTools

1. Open `http://localhost:5173` in Google Chrome.
2. Press `F12` (or Right-Click &rarr; **Inspect**).
3. Click the **Network** tab at the top.
4. Filter by **Fetch/XHR**.
5. Type quickly: `r`, `e`, `a`, `c`, `t`.
6. Look at the status column:
   - Superseded requests show **`(canceled)`** in red/grey. This proves `AbortController` is working!
   - The final request shows **`200 OK`**.
7. Click the `200 OK` request and look at the **Response Headers**:
   - `X-Cache: MISS` (first time)
   - `X-Cache: HIT` (second time)

---

## 🛠️ 6. Troubleshooting

- **Error: `'-cache\frontend\node_modules\.bin\' is not recognized as an internal or external command`:**
  - This happens on Windows when the project folder name contains an ampersand (`&`) or em-dash (`–`), which `cmd.exe` interprets as a command separator.
  - **The fix is already built into `frontend/package.json`**: `"dev": "node ./node_modules/vite/bin/vite.js"`. This bypasses Windows `.cmd` files and runs Vite directly via Node!
  - You can also simply rename your folder to `smart-search`.
- **Error: `Failed to fetch` or `Connection Error` in the UI:**
  - Check Terminal 1. Is `node server.js` running? If not, run `cd backend && node server.js`.
- **Error: `Port 5000 is already in use`:**
  - Another process is using port 5000. Stop it, or change `PORT = 5001` in `backend/server.js` and update `BACKEND_URL` in `frontend/src/App.jsx`.
- **Error: `sh: vite: not found`:**
  - Make sure you ran `npm install` inside the `frontend` folder before running `npm run dev`.
