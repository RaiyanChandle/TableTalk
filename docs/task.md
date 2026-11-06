# task.md — AI Data Analyst

## 1. Goal

Build a web app where a logged-in user uploads **one or many CSV files at once**, picks which ones to analyze, asks questions in plain English, and gets back an answer, the SQL that produced it, a data table, and (when useful) a chart. An agent built with LangChain.js and the **Gemini API** writes SQL (including joins across files), runs it in a locked-down DuckDB sandbox, and returns a chart spec that the frontend renders with Recharts.

The agent also keeps a **detailed, living analysis report** of everything it did and used (data, model, tools, every SQL attempt, errors, timings), so the project can be explained confidently in interviews.

## 2. Scope

**In scope (v1)**

- Register, login, logout (email + password, cookie-based session)
- Upload up to 10 CSVs in one go (drag and drop), each becomes one table
- Select 1 to 5 datasets per conversation; questions can join across them
- Chat with streaming responses, SQL toggle, result table, charts
- Agent tools: get schema (with join hints), run SQL, create chart
- Self-correction when SQL fails (retry loop, max 3)
- Per-question trace stored in the database (steps, SQL attempts, tokens, timings)
- Analysis report per conversation: viewable in the app and downloadable as Markdown
- Basic evals with a fixed question set

**Out of scope (v1)**

- Arbitrary JS code execution (add in v2 using `isolated-vm`)
- Excel / Parquet / JSON uploads
- Adding or removing datasets in the middle of a conversation (start a new conversation)
- OAuth, password reset emails, roles
- Sharing datasets or reports between users

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript, Tailwind, Recharts, React Router, `react-markdown` (report view) |
| Backend | Node.js + Express + TypeScript |
| Agent | LangChain.js + LangGraph.js (`createReactAgent`), Zod tool schemas |
| LLM | Gemini API via `@langchain/google-genai` (`ChatGoogleGenerativeAI`) |
| Analytics engine | DuckDB (`@duckdb/node-api`), in-memory, one instance per question |
| App database | MongoDB + Mongoose (users, datasets, conversations, messages, run logs) |
| Auth | bcrypt + JWT in httpOnly cookie |
| File storage | Local disk `backend/storage/<userId>/<datasetId>.csv` (swap to S3 later) |

## 4. Phases and Checklist

Mark items as you finish them.

### Phase 0 — Project setup (0.5 day)

- [x] check and Create one git repo with two top-level folders, `frontend/` and `backend/`, each with its own `package.json` (no root package, no npm workspaces)
- [x] Add root `docs/` (the four docs), `.gitignore`, and `README.md`
- [x] check and Configure TypeScript, ESLint, Prettier separately in each folder
- [x] Copy `backend.env.example` → `backend/.env.example` and `frontend.env.example` → `frontend/.env.example`; create real `.env` files (gitignored)
- [x] Load env with Zod validation (fail fast if `GOOGLE_API_KEY` or `JWT_SECRET` is missing)
- [x] Connect MongoDB, add `/api/health` route
- [x] Add Vite proxy (`/api` → `http://localhost:4000`) so cookies work in dev
- [x] Mirror API types in `frontend/src/types/` and keep them in sync with `backend/src/schemas/`

### Phase 1 — Authentication: login and logout (1 day)

- [x] `User` model: email (unique, lowercase), passwordHash, createdAt
- [x] `POST /api/auth/register` — validate, hash with bcrypt (cost 12), set cookie
- [x] `POST /api/auth/login` — verify, set httpOnly cookie (`SameSite=Lax`, `Secure` in prod)
- [x] `POST /api/auth/logout` — clear cookie
- [x] `GET /api/auth/me` — return current user or 401
- [x] `requireAuth` middleware
- [x] Rate limit auth routes
- [x] Frontend: Login page, Register page, `AuthContext`, `ProtectedRoute`
- [x] Navbar with user email and Logout button
- [x] On 401 from any API call, redirect to login

**Done when:** a logged-out user cannot open `/app` or call any `/api/datasets` or `/api/conversations` route, and logout takes effect immediately in the browser.

### Phase 2 — Multi-CSV upload and dataset management (1.5 days)

- [x] `Dataset` model: userId, name, originalFilename, tableName, filePath, sizeBytes, rowCount, columns[{name, type}], createdAt
- [x] Table-name generator: lowercase snake_case from filename, no leading digit, unique per user, `_2`, `_3` on collisions
- [x] `POST /api/datasets` with `multer` array field `files` (max 10 files, 25 MB each, 100 MB total, `.csv` only)
- [x] Process files one by one; return a per-file result so one bad file does not fail the batch
- [x] On each file: load into DuckDB, infer schema, count rows, store metadata
- [x] `GET /api/datasets`, `GET /api/datasets/:id` (schema + first 20 rows), `PATCH /api/datasets/:id` (rename display name / table name), `DELETE /api/datasets/:id`
- [x] Ownership check on every dataset route
- [x] Frontend: multi-file dropzone with per-file progress and status (done / failed + reason), dataset list with checkboxes, preview table, delete with confirm

**Done when:** dropping 4 CSVs (one of them corrupt) creates 3 datasets and shows a clear error for the fourth, and one user cannot see another user's dataset by guessing an ID.

### Phase 3 — Multi-table sandbox (1.5 days)

- [x] `createSandbox(datasets[])` — new in-memory instance, one table per dataset (`CREATE TABLE <tableName> AS SELECT * FROM read_csv_auto(path, sample_size=-1)`)
- [x] After loading all tables: `SET enable_external_access=false;` then `SET lock_configuration=true;`
- [x] Set `memory_limit` and `threads`
- [x] `validateSql(sql)` — single statement, `SELECT` or `WITH` only, block forbidden keywords and file functions
- [x] Row cap (`SQL_MAX_RESULT_ROWS`) and timeout (`SQL_TIMEOUT_MS`, interrupt on expiry)
- [x] `findCandidateJoins(tables)` — same column name and compatible type across tables, returned as hints
- [x] Return `{ columns, rows, rowCount, truncated, durationMs }`
- [x] Unit tests: valid query, join across two tables, `DROP TABLE`, `COPY ... TO`, `read_csv('/etc/passwd')`, `SET enable_external_access=true`, multiple statements, long-running query

**Done when:** all malicious test queries are rejected, a two-table join returns correct rows, and a normal aggregate returns in under a second on a 100k-row file.

### Phase 4 — Agent with Gemini (2 days)

- [x] `getModel()` using `ChatGoogleGenerativeAI` (model, temperature 0, max output tokens, retries from env)
- [x] Tool `get_schema` — all selected tables: columns, types, row count, 5 sample rows, plus `candidateJoins`
- [x] Tool `run_sql` — validates and executes, returns a `resultId` plus up to 50 rows to the model
- [x] Tool `create_chart` — takes `resultId` and a mapping (type, x, y, title); validates with Zod
- [x] Keep tool schemas simple (strings, numbers, enums, arrays) so Gemini function calling stays reliable
- [x] Dataset ids and file paths bound by the server, never supplied by the model
- [x] System prompt versioned (`PROMPT_VERSION`), including join rules (see `design.md`)
- [x] Retry on SQL error: error goes back to the model, max 3 attempts
- [x] Step limit and per-question token budget
- [x] `TraceCollector` (LangChain callback handler) records every LLM call and tool call
- [x] Final answer shape: `{ answer, sql, table, chart }`

**Done when:** the agent answers "total revenue by customer country" over an `orders` and a `customers` CSV with a correct join and a bar chart, and recovers from a deliberately wrong column name.

### Phase 5 — Conversations, chat API, run logs (1.5 days)

- [ ] `Conversation` model: userId, title, datasetIds[], datasetSnapshots[] (name, tableName, columns), readOnly, createdAt
- [ ] `Message` model (userId, conversationId, role, content, sql, tablePreview, chartSpec, error, runId, createdAt)
- [ ] `RunLog` model (see `design.md`): one document per question
- [ ] `POST /api/conversations` — body `{ datasetIds, title? }`; verify all datasets belong to the user; max 5
- [ ] `GET /api/conversations`, `GET /api/conversations/:id`, `DELETE /api/conversations/:id`
- [ ] `POST /api/conversations/:id/messages` — streams SSE: `status`, `step`, `sql`, `table`, `chart`, `token`, `done`, `error`
- [ ] `GET /api/conversations/:id/messages`
- [ ] Save the `RunLog` even when the run fails
- [ ] Rate limits per user for chat and upload

### Phase 6 — Chat UI and charts (2 days)

- [ ] Layout: sidebar (datasets with checkboxes, conversations list) + main chat
- [ ] "Start analysis" button creates a conversation from the selected datasets; show "Tables in this chat" chips
- [ ] Message list with streaming text, "Show SQL" toggle, result table, live step status
- [ ] `ChartRenderer`: bar, line, area, pie, scatter
- [ ] Suggested questions generated from the schemas (including cross-table ideas)
- [ ] Loading, empty, and error states; Stop button aborts the stream
- [ ] Download chart as PNG and result as CSV
- [ ] Responsive layout for mobile

### Phase 7 — Analysis report: the living doc (1.5 days)

- [ ] `buildReport(conversationId)` service that assembles the report from `RunLog` records (always current, nothing hand-edited)
- [ ] Sections: overview, data used, system and tools used, how the agent works, question-by-question log, session statistics, notable issues (see `design.md`)
- [ ] `GET /api/conversations/:id/report` (JSON with the Markdown string and stats) and `?format=md` (file download)
- [ ] Redact: never include API keys, cookies, or file paths; limit result previews to 20 rows
- [ ] Frontend: "Report" tab in the conversation, rendered with `react-markdown`, with a Download .md button
- [ ] Per-question "View trace" drawer showing steps and SQL attempts
- [ ] Unit tests: report for a conversation with one success, one retry-then-success, and one failure

**Done when:** after a chat with a join, a retry, and a chart, the downloaded report lets you explain exactly what happened for every question without opening the code.

### Phase 8 — Hardening and evals (1 day)

- [ ] Eval set: 25 questions on a sample multi-file dataset (e.g. `orders.csv`, `customers.csv`, `products.csv`) in `backend/evals/`
- [ ] Script that runs the set and reports pass rate, average attempts, average latency, tokens
- [ ] Cases for joins, join fan-out, name collisions, unanswerable questions, prompt injection in a cell
- [ ] Optional: LangSmith tracing
- [ ] Helmet, CORS allowlist, request size limits
- [ ] Gemini rate-limit handling: backoff, friendly error, no crash
- [ ] Log every executed SQL with userId, conversationId, duration (no raw data)

### Phase 9 — Deploy and document (1 day)

- [ ] Dockerfile for the backend, static build for the frontend (two deployments)
- [ ] Deploy backend (Render/Railway) and frontend (Vercel) on subdomains of the same parent domain, with `Secure` cookies and correct CORS
- [ ] README with architecture diagram, GIF demo, setup steps
- [ ] Sample multi-CSV dataset included in the repo
- [ ] Write `docs/INTERVIEW_NOTES.md` and keep it updated (see `rules.md`): 30-second pitch, architecture walkthrough, why each technology, key decisions and trade-offs, security design, hardest bugs, eval numbers, what you would improve, likely questions with answers

## 5. Acceptance Criteria (v1)

1. User can register, log in, log out; protected routes enforce it.
2. User can upload several CSVs at once; each valid file becomes a dataset, each invalid file shows its own error.
3. User can start a conversation over 1 to 5 datasets and ask questions that need joins.
4. Each answer includes the SQL, a table, and a chart where relevant.
5. A failed query is retried automatically; the final error is shown clearly if it still fails.
6. No query can read files, write files, or touch another user's data.
7. Every question produces a stored trace, and the conversation report can be viewed and downloaded.
8. Eval pass rate is at least 80% on the sample set.

## 6. Stretch Goals (v2)

- [ ] JS execution tool in `isolated-vm` for transformations SQL cannot express
- [ ] Add or remove datasets in an existing conversation
- [ ] Pin a chart to a dashboard
- [ ] Export the report as PDF (ReportLab or a headless-browser render)
- [ ] LLM-written executive summary at the top of the report (clearly marked as generated)
- [ ] Column-level data profiling on upload (nulls, distinct, min/max)
- [ ] Excel and Parquet support
