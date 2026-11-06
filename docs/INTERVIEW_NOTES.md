# INTERVIEW_NOTES.md — AI Data Analyst

This document captures architectural decisions, trade-offs, security safeguards, and interview talking points for the AI Data Analyst project. Keep this document updated as new capabilities and fixes are implemented.

---

## 1. 30-Second Elevator Pitch

The **AI Data Analyst** allows users to drop in multiple CSV files and immediately perform ad-hoc analytical queries in plain English. An autonomous agent powered by Google Gemini and LangGraph.js generates DuckDB SQL queries across one or multiple joined datasets, runs them inside a locked-down in-memory DuckDB sandbox, automatically self-corrects if a query fails, and delivers streaming responses paired with interactive charts and data tables. Crucially, every question leaves a tamper-proof trace (`RunLog`), powering a living, deterministic analysis report that documents the exact tools, SQL attempts, token metrics, and schemas used.

---

## 2. Architecture Walkthrough

- **Decoupled Monorepo**: Frontend and backend are maintained in independent folders without npm workspaces or shared build dependencies to avoid dependency pollution. Communication is strictly HTTP/SSE.
- **Client (React + Vite)**: Handles user authentication, multi-file upload progress, streaming chat output, interactive charts (Recharts), and renders the living analysis report via Markdown. In development, a Vite proxy routes `/api` to the backend so `httpOnly` session cookies work naturally without third-party cookie restrictions.
- **API & Orchestrator (Node.js + Express + TypeScript)**: Enforces authentication (`httpOnly` JWT cookies), validates all inputs with Zod, checks ownership on every resource, and coordinates agent execution.
- **Analytics Sandbox (DuckDB)**: Fast, in-process analytical SQL engine. Creates a fresh in-memory instance per question, loads the conversation's selected CSVs into distinct tables, and disables external access and config modification before running user-prompted queries.
- **Agent (LangGraph.js + Gemini)**: Equipped with exactly three strictly defined tools (`get_schema`, `run_sql`, `create_chart`). If SQL execution fails, the error message feeds back into the agent loop for self-correction (up to 3 attempts).
- **Auditability (`RunLog` & Report Service)**: Custom `TraceCollector` LangChain callback records all model prompts, tool arguments, timings, SQL attempts, and token usages into MongoDB. The analysis report is compiled dynamically from these logs.

---

## 3. Technology Choices & Justification

| Technology | Why Chosen | Alternatives Considered & Why Rejected |
|---|---|---|
| **DuckDB (`@duckdb/node-api`)** | Runs in-process, excels at columnar analytical queries on CSVs, has zero external server overhead, and provides fine-grained runtime lockdown (`enable_external_access=false`). | SQLite (poor native CSV querying, weaker analytical SQL functions), Postgres (heavy external database requirement per user/query). |
| **Gemini API (`ChatGoogleGenerativeAI`)** | Excellent function/tool calling reliability, large context window, fast inference, and cost-effective Flash models. | Local models (high GPU dependency for multi-table schemas), OpenAI (higher API costs). |
| **LangGraph.js (`createReactAgent`)** | Deterministic state machine and cycle support for retry loops; first-class streaming and callback hooks for tracing. | Custom `while` loops (fragile state management), AutoGen (Python-centric). |
| **MongoDB + Mongoose** | Flexible document model ideally suited for polymorphic `RunLog` traces, message histories, and nested dataset snapshot schemas. | PostgreSQL (schema migrations for evolving audit log structures add friction). |
| **Recharts** | Declarative, customizable React charting library that maps cleanly to standardized `ChartSpec` JSON definitions. | Chart.js (imperative canvas rendering, harder to theme with React state). |

---

## 4. Key Decisions & Trade-offs

1. **SQL-Only Sandbox in v1 vs Arbitrary JavaScript**:
   - *Decision*: Restrict the agent to pure DuckDB SQL queries in v1.
   - *Trade-off*: Advanced mathematical transforms or proprietary algorithms cannot be executed in v1, but the security surface is dramatically minimized compared to executing untrusted JavaScript code in Node.
2. **Fresh DuckDB Instance Per Question vs Long-Lived Shared Instance**:
   - *Decision*: Spin up an in-memory DuckDB instance per question loading only the conversation's 1–5 tables.
   - *Trade-off*: Minor loading latency per question (tens of milliseconds for CSVs under 25MB), but guarantees total cross-user and cross-conversation isolation with zero state pollution.
3. **Stateless Report Generation vs Storing Compiled Reports**:
   - *Decision*: Compile Markdown reports on demand from immutable `RunLog` records and dataset snapshots.
   - *Trade-off*: Small on-the-fly rendering compute on GET `/api/conversations/:id/report`, but guarantees the report can never drift from what actually happened during the conversation.

4. **httpOnly Cookie-Based Auth vs Bearer Tokens in LocalStorage**:
   - *Decision*: Store signed JWTs strictly in `httpOnly`, `SameSite=Lax` cookies with a centralized 401 redirect handler.
   - *Trade-off*: Requires proxying `/api` in development and managing cookie domain scopes, but completely protects authentication tokens from client-side script injection (XSS attacks).
5. **Generic Error Responses on Authentication**:
   - *Decision*: Return the identical message `"Invalid email or password"` whether the user does not exist or the password does not match.
   - *Trade-off*: Slightly less specific feedback for legitimate users during typos, but effectively neutralizes user enumeration attacks.
6. **Independent Per-File Ingestion vs Atomic Batch Rollback**:
   - *Decision*: In multi-CSV upload (`POST /api/datasets`), process files sequentially and return per-file status objects (`ok` with dataset metadata or `error` with a parse error message).
   - *Trade-off*: The client must render partial-success states, but uploading 9 valid datasets and 1 broken CSV does not discard the 9 valid files.
7. **Server-Enforced Table-Name Sanitization & Suffixing**:
   - *Decision*: Sanitize filenames on the server to valid SQL identifiers (`lowercase_snake_case`, prefix `t_` for numeric starts, 40-char cap) and automatically append `_2`, `_3` on collisions within the user's workspace.
   - *Trade-off*: The user's original filename is preserved purely as display metadata rather than the queryable table name, but completely eliminates SQL syntax failures and table shadowing.
8. **Editorial Typography Hierarchy & The Printed Report Sheet Model**:
   - *Decision*: Restrict monospace strictly to SQL queries, table/column identifiers, and right-aligned numeric cells. Present answers as printed editorial report sheets (2px ink rule, 28px serif question, metadata, finding, 40px table, collapsed SQL disclosure) rather than generic chat bubbles.
   - *Trade-off*: Demands disciplined typography and zero-shadow 1px border constraints (`#DDD8CB`), but elevates the UI into a publication-grade analytical workbench.
9. **Multi-Tier Sandbox Lockdown (AST / String Filter + Kernel Lock + Asynchronous Interrupt)**:
   - *Decision*: Combine pre-execution SQL validation (blocking multi-statements, DDL, file functions, and comment evasion) with DuckDB's engine lockdown (`SET enable_external_access=false; SET lock_configuration=true;`) and Node timer-based `conn.interrupt()`.
   - *Trade-off*: Adds minimal pre-parsing overhead (~0.2ms per query), but creates impossible-to-bypass defense in depth where even unknown zero-day SQL functions cannot access the filesystem or freeze worker threads.

10. **Agent State Machine & Deterministic 3-Tool Contract**:
    - *Decision*: Provide the agent with exactly three granular tools (`get_schema`, `run_sql`, `create_chart`). Decouple chart generation from SQL execution via an ephemeral server-side `resultId` pointer rather than streaming megabytes of raw table data back and forth through the LLM context window.
    - *Trade-off*: Requires an in-memory `ResultStore` with a 15-minute TTL, but reduces prompt token consumption by >80% and ensures charting operations work directly on deterministic column definitions.
11. **Self-Correction Retry Loop (Max 3 Attempts) with Error Feedback**:
    - *Decision*: When `run_sql` fails (e.g. column mismatch or syntax error), the exact DuckDB error string is formatted and returned directly to the model as tool output, incrementing an attempt counter capped at 3.
    - *Trade-off*: Consumes additional LLM roundtrips on error, but autonomously recovers from common LLM hallucinations like column casing or alias typos without surfacing premature errors to the user.
12. **Tamper-Proof Auditability (`RunLog` + `TraceCollector`)**:
    - *Decision*: Implement a custom LangChain `BaseCallbackHandler` (`TraceCollector`) that captures LLM inputs/outputs, exact tool invocations, duration timings, token metrics, and SQL errors, persisting a complete `RunLog` in MongoDB for every analytical question.
    - *Trade-off*: Adds minor document storage overhead per question, but unlocks full post-hoc explainability, debugging, and dynamic Markdown report generation.
13. **Dataset Schema Snapshots & Graceful Read-Only Degradation**:
    - *Decision*: When a Conversation is created, snapshot all dataset column schemas, table names, and row counts into the Conversation document. If a dataset is subsequently deleted by the user, mark associated conversations `readOnly = true` rather than deleting or corrupting historical conversations.
    - *Trade-off*: Small denormalization of metadata, but allows users to review previous questions, SQL results, charts, and generated reports without data loss even when underlying CSV files have been removed from disk.
14. **Streaming Protocol via Server-Sent Events (SSE)**:
    - *Decision*: Use standard SSE over `POST /api/conversations/:id/messages` delivering typed events (`status`, `step`, `sql`, `table`, `chart`, `token`, `done`, `error`).
    - *Trade-off*: Demands manual `ReadableStream` decoding on the frontend (since native browser `EventSource` lacks POST body support), but provides a lightweight, unidirectional streaming pipe without WebSocket connection management overhead.

---

## 5. Security & Isolation Model

- **Multi-Tenant Boundary**: Every database query filters by both record ID and `req.user.id`. Requests for resources belonging to other users return `404 Not Found` rather than `403 Forbidden` to prevent ID enumeration.
- **Path Traversal & Disk Quarantine**: Files are saved to disk under server-generated names (`storage/<userId>/<datasetId>.csv`). Original user filenames are metadata only. If DuckDB parsing or schema detection fails, the file is immediately purged from disk.
- **Defense-in-Depth for DuckDB**:
  1. Input SQL is parsed and validated (`SELECT`/`WITH` only; comments stripped; keywords like `INSTALL`, `LOAD`, `ATTACH`, `COPY` forbidden).
  2. `SET enable_external_access=false;` ensures DuckDB cannot read local files or make network requests.
  3. `SET lock_configuration=true;` locks the configuration settings against subsequent modification.
- **Server Authority**: File paths, dataset IDs, and table names are supplied strictly by the server from verified database entities, never accepted from user or LLM input.
- **Credential Storage**: Passwords hashed with bcrypt (cost 12). Sessions stored in `httpOnly` cookies with `SameSite=Lax`. Tokens and API keys are never stored in browser storage, database logs, or reports.

---

## 6. Interview Q&A Preparation

**Q: How do you prevent SQL injection and malicious queries when letting an LLM generate SQL?**
> **A:** We employ defense-in-depth:
> 1. We pre-validate SQL to allow only single-statement `SELECT` or `WITH` queries and reject administrative or filesystem keywords (`ATTACH`, `COPY`, `read_csv`, etc.).
> 2. The query is executed in a dedicated, in-memory DuckDB instance containing only the user's selected tables.
> 3. After loading the tables, we run `SET enable_external_access=false` followed by `SET lock_configuration=true`, preventing DuckDB from accessing the disk or network even if a bypass were attempted.
> 4. We enforce execution timeouts (5s) and memory caps (512MB).

**Q: How does the platform handle batch CSV uploads when one file in the batch is corrupted?**
> **A:** Rather than failing the entire batch atomically, we ingest files sequentially through a DuckDB trial probe. If a file fails parsing or schema inference, its temporary file is purged from disk, an error entry is recorded for that specific filename, and processing proceeds to the remaining files. The client receives a 201 response with an array of individual results, providing clear feedback on exactly which files succeeded and why any failed.

**Q: Why store a snapshot of dataset schemas in the Conversation document?**
> **A:** In an analytical platform, users may delete a dataset file later. By snapshotting the schema, row counts, and table names at conversation creation, past conversations, messages, and living audit reports remain fully renderable and readable in a read-only state even after the physical CSV file has been deleted from disk.

**Q: What is the rationale behind the editorial design (Newsreader + IBM Plex Sans/Mono, zero-shadow 1px borders, printed report sheets)?**
> **A:** Most AI tools default to noisy card-and-bubble chat UIs with harsh primary colors and excessive drop shadows. In contrast, data analysis is an executive, high-trust task. By utilizing a quiet warm palette (`#F6F4EF`, `#EFECE4`), 1px borders (`#DDD8CB`), Newsreader serif for executive headlines, and strictly confining monospace to table/column tokens and tabular figures, answers feel like authoritative printed reports rather than ephemeral chat output.

**Q: How do you prevent runaway queries or denial-of-service (DoS) via expensive Cartesian cross-joins in the sandbox?**
> **A:** We protect against compute and memory exhaustion across three dimensions:
> 1. Memory limit: We execute `SET memory_limit='512MB'` upon initialization to enforce a strict ceiling.
> 2. Execution timeout: We start an asynchronous timer matching `SQL_TIMEOUT_MS` (5000ms). If exceeded, we invoke `conn.interrupt()` on the active DuckDB connection, terminating execution immediately.
> 3. Result capping: Queries are wrapped with an outer `LIMIT (maxRows + 1)` layer to cap rows returned to the server and detect truncation without loading unbounded rows into Node memory.

**Q: Why decouple `run_sql` and `create_chart` via a `resultId` instead of having the model pass the raw dataset or generate charts in one step?**
> **A:** If the model had to receive the entire SQL result set and pass it into a chart tool, large analytical results (e.g. 500 rows) would flood the context window, drastically increasing token costs and latency while risking context truncation. By caching the typed SQL execution result in an in-memory `ResultStore` and returning an ephemeral `resultId` plus up to 50 sample rows, the model only needs to provide column mapping metadata (`type`, `x`, `y`, `title`). The server validates the mapping against the stored result and binds the chart data deterministically.

**Q: How does the agent self-correct when a generated SQL query contains an error?**
> **A:** In `runSqlTool`, errors from DuckDB or the SQL validator are caught and formatted as structured error feedback returned to the model as tool output (e.g., `Error: Binder Error: Referenced column "rev" not found. Available columns in "orders": id, customer_id, revenue, created_at`). The agent inspects the schema and available columns, refines its SQL, and tries again. We track execution attempts and enforce a hard limit of 3 tries to prevent infinite retry loops.

**Q: Why choose Server-Sent Events (SSE) over WebSockets for the chat streaming API?**
> **A:** Data analysis questions follow a discrete request-response paradigm: the user asks a question with JSON parameters, and the server emits an asynchronous stream of progressive steps, SQL queries, table data, tokens, and charts until completion. SSE operates cleanly over standard HTTP/1.1 and HTTP/2 with built-in connection reuse, works seamlessly with reverse proxies, avoids stateful WebSocket handshake overhead, and naturally propagates authentication cookies. On the client, a simple `ReadableStream` reader parses the text chunks into structured event handlers.

**Q: How do you handle dataset deletion when past conversations still reference that dataset?**
> **A:** When a user creates a conversation, we copy immutable `datasetSnapshots` (column names, types, table names, row counts) into the conversation record. If the user later deletes one of those datasets, we delete the physical file and the `Dataset` document, but mark all conversations containing that dataset ID as `readOnly = true`. This prevents attempting to run new SQL queries on nonexistent disk files, while ensuring all existing messages, SQL queries, charts, and report exports remain 100% readable and auditable.

