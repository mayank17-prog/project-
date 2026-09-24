# Smart Search – React + Node.js Search with Debounce, AbortController and Server Cache

A production-grade, educational full-stack demonstration showing how to prevent asynchronous search race conditions in web applications using **Debouncing**, **AbortController cancellation**, **React useEffect cleanup**, and an in-memory **Server Cache** with TTL.

---

## 📖 1. What This Project Does (In Plain English)

When a user types into a live search input on a website, each letter typed triggers an asynchronous HTTP network request to the backend server.

### The Problem: Asynchronous Race Conditions
Imagine typing the word **`react`**:
1. When you type **`rea`**, the browser fires **Request 1**.
2. A fraction of a second later, you type **`react`**, so the browser fires **Request 2**.
3. Because internet traffic and server workloads vary:
   - **Request 2 (`react`)** takes **200 ms** and arrives **first**. The screen displays results for `"react"`.
   - **Request 1 (`rea`)** takes **900 ms** and arrives **second**. It suddenly overwrites your screen with results for `"rea"`.
4. **The Bug:** The search bar says `"react"`, but the user sees results for `"rea"`!

### The Solution (The 3 Defenses):
1. **Debounce (`useDebounce` hook — 400ms):** Delays sending the request until the user pauses typing for 400ms. Typing 10 letters sends **1 request instead of 10**, reducing server load by 90%.
2. **AbortController (Browser Request Cancellation):** If a previous request is still in-flight when a new search starts, the browser forcefully cancels it with status `(canceled)`. Stale data can never reach the screen.
3. **React `useEffect` Cleanup:** Guarantees that any cancelled fetch promise does not update component state, preventing memory leaks and UI glitches.
4. **Server Cache (`Map` with TTL):** The Node.js server caches search results in RAM. The first search takes ~800ms (`Cache: MISS`). The second identical search returns in ~2ms (`Cache: HIT`).

---

## 📂 2. Project Folder Structure

```text
smart-search/
│
├── backend/
│   ├── server.js          # Express server with Map cache & intentional 800ms delay
│   └── package.json       # Backend dependencies (express, cors)
│
├── frontend/
│   ├── index.html         # HTML entry point
│   ├── vite.config.js     # Vite configuration
│   ├── package.json       # Frontend dependencies (react, lucide-react, tailwindcss)
│   └── src/
│       ├── components/
│       │   ├── SearchBox.jsx     # Modern input with clear & loading spinner
│       │   ├── CacheBadge.jsx    # HIT (green) vs MISS (amber) badge
│       │   └── ResultsList.jsx   # List of matching items with highlights
│       ├── hooks/
│       │   └── useDebounce.js    # Reusable custom debounce hook with cleanup
│       ├── App.jsx               # Main UI, fetch with AbortController & demo toggle
│       ├── main.jsx              # React DOM mounting
│       └── index.css             # Tailwind CSS styles
│
├── VS_CODE_GUIDE.md       # Dedicated guide for running in VS Code with terminals
└── README.md              # Complete guide, installation, and presentation script
```

---

## 🖥️ 3. How to Run in VS Code (Step-by-Step)

Because this is a full-stack project, you will use **two terminals** in VS Code:

### Terminal 1: The Backend Terminal (Port 5000)
1. Open VS Code and open your `smart-search` folder.
2. Open an integrated terminal (press ``Ctrl + ` ``).
3. Run:
   ```bash
   cd backend
   npm install
   node server.js
   ```
4. **What Terminal 1 prints when it starts:**
   ```text
   ====================================================
   🚀 Smart Search Backend is running on:
      http://localhost:5000
      Endpoint: GET http://localhost:5000/search?q=react
      Cache Inspector: GET http://localhost:5000/cache
   ====================================================
   ```
5. **What Terminal 1 prints while you use the app:**
   - On new search (`Cache MISS`):
     ```text
     [INCOMING REQUEST] Query: "react" (Normalized: "react")
     ⏳ [CACHE MISS] Waiting ~800ms intentional delay for "react"...
     ✅ [CACHE STORED] Saved "react" to cache (4 results)
     ```
   - On repeat search (`Cache HIT`):
     ```text
     [INCOMING REQUEST] Query: "react" (Normalized: "react")
     ⚡ [CACHE HIT] Returning cached results immediately for "react"
     ```
   - On expired key (TTL):
     ```text
     [CACHE EVICT] Key "react" expired after 60s
     ```
   > ⚠️ **Important:** Keep Terminal 1 open and running at all times! If closed, the backend stops and the frontend will show a connection error.

---

### Terminal 2: The Frontend Terminal (Port 5173)
1. In VS Code, click the **`+` icon** in the top right of the terminal panel to open a second terminal.
2. Run:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. **What Terminal 2 prints:**
   ```text
     VITE v5.3.1  ready in 240 ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: use --host to expose
   ```
4. Open your browser and visit: **`http://localhost:5173`**.

---

## 🔌 4. API Documentation

### `GET /search?q={keyword}`
Searches the 24-item dataset for technologies matching `{keyword}`.

#### Query Parameters:
- `q` *(string, required)*: The search term (e.g. `react`, `node`, `python`).

#### Server Behavior:
1. Normalizes the query (trimmed, lowercase).
2. Looks up the query in `const cache = new Map();`.
3. If found in cache and not expired (within 60s TTL):
   - Sets header `X-Cache: HIT`.
   - Returns results immediately (~2ms).
4. If not found in cache:
   - Sets header `X-Cache: MISS`.
   - Waits ~800ms artificial delay to simulate real network latency.
   - Filters matching technologies.
   - Stores `{ results, timestamp }` in the Map.
   - Returns results.

#### Example Response (Cache MISS):
```json
{
  "results": [
    "React",
    "React Native",
    "React Router",
    "React Query"
  ],
  "cache": "MISS"
}
```

#### Example Response (Cache HIT):
```json
{
  "results": [
    "React",
    "React Native",
    "React Router",
    "React Query"
  ],
  "cache": "HIT"
}
```

### `GET /cache`
Diagnostic endpoint to inspect active keys in server RAM and their remaining TTL.

---

## 🔬 5. How to Demonstrate in Chrome DevTools

1. Open `http://localhost:5173` in Google Chrome.
2. Press **`F12`** (or right-click &rarr; **Inspect**) and click the **Network** tab.
3. In the filter bar, click **Fetch/XHR**.
4. Type rapidly: `r` &rarr; `e` &rarr; `a` &rarr; `c` &rarr; `t`.
5. Look at the **Status** column:
   - Notice previous requests show **`(canceled)`** in red/grey. This confirms `AbortController` aborted them!
   - Only the final request completes with **`200 OK`**.
6. Click the completed request and check **Response Headers**:
   - `X-Cache: MISS` (took ~800ms)
7. Now type `react` again:
   - Notice the status is `200 OK` and response time is **~2ms** with `X-Cache: HIT`!

---

## 🧪 6. Testing Checklist

1. **Empty Search:** Clearing input clears results immediately with zero errors.
2. **Normal Search:** Typing `react` waits 400ms (debounce), spins for 800ms, and shows results with `Cache: MISS`.
3. **Cache HIT:** Typing `react` a second time shows results instantly in ~2ms with `Cache: HIT`.
4. **Fast Typing:** Typing rapidly sends only 1 debounced request instead of multiple requests.
5. **Cancelled Requests:** In-flight queries are aborted when new keystrokes are typed.
6. **No Results State:** Searching `xyz123` shows clean *"No matching technologies"* UI.
7. **Offline Error Test:** Stopping the backend terminal displays a friendly red connection error.

---

## 🎓 7. College Viva / Presentation Script

Use this script during your demo to your professor:

> **Opening:**
> *"Good morning Professor. Today I am presenting **Smart Search**, which tackles one of the most critical asynchronous bugs in web development: **search race conditions**."*
>
> **The Race Condition:**
> *"When a user types into a live search box, every keystroke fires an asynchronous request. Because network speeds vary, Request 1 for 'rea' might finish slower than Request 2 for 'react'. If Request 1 finishes last, it displays outdated results for an old keystroke. Our Node.js server includes a deliberate 800ms delay to expose this problem."*
>
> **Step 1 — Debounce (400ms):**
> *"We implemented a reusable custom hook called `useDebounce`. It waits until the user pauses typing for 400ms before sending the request. This cuts network calls by up to 90%."*
>
> **Step 2 — AbortController & Cleanup:**
> *"Debouncing reduces requests, but cannot prevent race conditions if network latency fluctuates. Inside `useEffect`, we instantiate an `AbortController`. The moment a new query starts or the component unmounts, React's cleanup function runs `controller.abort()`. In Chrome DevTools Network Tab, you can see cancelled requests marked as `(canceled)`."*
>
> **Step 3 — Server Map Cache:**
> *"Our Node.js backend caches search results using an in-memory JavaScript `Map` with a 60-second TTL. The first search takes 800ms (`Cache: MISS`), while repeat searches return in 2 milliseconds (`Cache: HIT`) directly from memory."*
