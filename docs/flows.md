# flows.md — AI Data Analyst

All flows below use Mermaid diagrams (they render on GitHub and in VS Code with a Mermaid extension) followed by a short written description.

---

## 1. Registration

```mermaid
sequenceDiagram
    actor U as User
    participant C as Client
    participant S as Server
    participant DB as MongoDB

    U->>C: Enter email + password
    C->>S: POST /api/auth/register
    S->>S: Validate input (Zod)
    S->>DB: Find user by email
    alt Email exists
        S-->>C: 409 Email already registered
    else New email
        S->>S: bcrypt hash password
        S->>DB: Create user
        S->>S: Sign JWT
        S-->>C: 201 + Set-Cookie (httpOnly) + user
        C->>C: Store user in AuthContext, go to /app
    end
```

**Notes:** passwords are never stored or logged in plain text. Password rule: minimum 8 characters.

---

## 2. Login

```mermaid
sequenceDiagram
    actor U as User
    participant C as Client
    participant S as Server
    participant DB as MongoDB

    U->>C: Submit email + password
    C->>S: POST /api/auth/login
    S->>DB: Find user by email
    alt User not found or password mismatch
        S-->>C: 401 Invalid email or password
    else Valid
        S->>S: Sign JWT (7d expiry)
        S-->>C: 200 + Set-Cookie + user
        C->>C: Set user, navigate to /app
    end
```

**Notes:** the error message is identical for "no such user" and "wrong password" to avoid account enumeration. The auth routes are rate limited.

---

## 3. Session restore (page refresh)

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    C->>S: GET /api/auth/me (cookie sent automatically)
    alt Valid token
        S-->>C: 200 user
        C->>C: Render protected app
    else Missing / expired
        S-->>C: 401
        C->>C: Redirect to /login
    end
```

While this request is pending, the client shows a loading screen so the login page does not flash.

---

## 4. Logout

```mermaid
sequenceDiagram
    actor U as User
    participant C as Client
    participant S as Server

    U->>C: Click Logout
    C->>S: POST /api/auth/logout
    S-->>C: 200 + Set-Cookie (cleared, maxAge 0)
    C->>C: Clear AuthContext + cached queries
    C->>C: Navigate to /login
```

**Notes:** the client also clears any in-memory chat state so the next user on the same browser sees nothing from the previous session.

---

## 5. Upload multiple CSVs

```mermaid
sequenceDiagram
    actor U as User
    participant C as Client
    participant S as Server
    participant D as DuckDB (temp)
    participant FS as Disk
    participant DB as MongoDB

    U->>C: Drop 1 to 10 CSV files
    C->>C: Check count, size, extension
    C->>S: POST /api/datasets (multipart, files[])
    S->>S: requireAuth, check total size
    loop For each file
        S->>S: Validate extension, MIME, size
        S->>FS: Save as storage/userId/datasetId.csv
        S->>D: Load to validate and read schema
        alt Parse fails
            S->>FS: Delete file
            S->>S: Record error for this file
        else Parsed
            D-->>S: Columns, types, row count
            S->>S: Generate unique table name
            S->>DB: Save dataset metadata
            S->>S: Record success for this file
        end
    end
    S-->>C: 201 results[] (one entry per file: ok or error)
    C->>C: Show each file as done or failed with reason
    C->>C: Add new datasets to the list
```

One bad file never blocks the others. The user sees exactly which files worked and why a file failed.

---

## 6. Start a conversation with selected datasets

```mermaid
sequenceDiagram
    actor U as User
    participant C as Client
    participant S as Server
    participant DB as MongoDB

    U->>C: Tick 1 to 5 datasets, click "Start analysis"
    C->>S: POST /api/conversations { datasetIds }
    S->>S: requireAuth
    S->>DB: Find datasets where id IN ids AND userId = me
    alt Count mismatch or more than 5
        S-->>C: 404 / 422
    else All owned
        S->>DB: Create conversation + dataset snapshots
        S-->>C: 201 conversation
        C->>C: Open chat, show "Tables in this chat" chips + suggested questions
    end
```

If any id is not owned by the user, the whole request fails with 404 so nothing leaks about other users' data.

---

## 7. Ask a question (main flow, multi-table, with tracing)

```mermaid
sequenceDiagram
    actor U as User
    participant C as Client
    participant S as Server
    participant A as Agent (LangChain.js)
    participant T as TraceCollector
    participant L as Gemini API
    participant D as DuckDB Sandbox
    participant DB as MongoDB

    U->>C: "Revenue by customer country?"
    C->>S: POST /api/conversations/:id/messages (SSE)
    S->>S: requireAuth, load conversation (owner check)
    S->>D: Build sandbox with the conversation's tables, then lock it
    S->>A: Run agent (question + last 6 messages)
    A->>T: Attach trace callbacks
    A->>L: Prompt + tools
    L-->>A: Call get_schema
    A->>D: Read schemas, find candidate joins
    D-->>A: Tables, columns, samples, join hints
    T->>T: Record step
    L-->>A: Call run_sql(SELECT c.country, SUM(o.total) ... JOIN ...)
    A->>A: validateSql()
    A->>D: Execute with limits
    D-->>A: Rows + resultId
    T->>T: Record SQL attempt + join used
    S-->>C: event: step, event: sql, event: table
    L-->>A: Call create_chart(resultId, bar, x=country, y=revenue)
    A->>A: Validate chart spec
    S-->>C: event: chart
    L-->>A: Final answer text
    S-->>C: event: token (streamed), then event: done
    T->>DB: Save RunLog (steps, SQL attempts, tokens, timings)
    S->>DB: Save user + assistant messages
    C->>C: Render answer, SQL toggle, table, chart, "View trace"
```

The RunLog is saved on success, failure, and abort, so the report always reflects reality.

---

## 8. SQL error and self-correction loop

```mermaid
flowchart TD
    A[Agent writes SQL] --> B{validateSql passes?}
    B -- No --> C[Return validation error to model, log attempt as rejected]
    B -- Yes --> D[Execute in sandbox]
    D --> E{Execution OK?}
    E -- Yes --> F[Return rows + resultId, log attempt as ok]
    E -- No: error or timeout --> C2[Return DuckDB error to model, log attempt as error or timeout]
    C --> G{Attempts < 3?}
    C2 --> G
    G -- Yes --> A
    G -- No --> H[Stop: tell user the question could not be answered, show last error]
    F --> I[Model writes answer / chart]
```

Every attempt, including the failed ones, is in the trace and appears in the report. This is useful evidence of how the agent behaves and recovers.

---

## 9. Chart rendering

```mermaid
flowchart LR
    A[create_chart tool call] --> B[Zod validates spec]
    B -- invalid --> X[Return error to model, it retries]
    B -- valid --> C[Server attaches data from resultId]
    C --> D[SSE event: chart]
    D --> E[ChartRenderer]
    E --> F{spec.type}
    F -- bar --> G[BarChart]
    F -- line --> H[LineChart]
    F -- area --> I[AreaChart]
    F -- pie --> J[PieChart]
    F -- scatter --> K[ScatterChart]
```

The model never copies raw data into the chart spec. It only names the `resultId` and the columns to plot, and the server attaches the rows.

---

## 10. Analysis report (living doc)

```mermaid
sequenceDiagram
    actor U as User
    participant C as Client
    participant S as Server
    participant R as Report service
    participant DB as MongoDB

    U->>C: Open "Report" tab (or click Download)
    C->>S: GET /api/conversations/:id/report (or ?format=md)
    S->>S: requireAuth, owner check
    S->>DB: Load conversation, dataset snapshots, RunLogs
    S->>R: buildReport(data)
    R->>R: Overview, data used, tools used, how it works
    R->>R: Per-question log, stats, notable events
    R->>R: Redact secrets and paths, cap previews
    R-->>S: Markdown + stats
    alt format=md
        S-->>C: File download (analysis-report-title-date.md)
    else default
        S-->>C: JSON { markdown, stats }
        C->>C: Render with react-markdown
    end
```

Because the report is built from stored traces each time, it is never out of date and cannot drift from what the agent really did.

---

## 11. Delete a dataset

```mermaid
sequenceDiagram
    actor U as User
    participant C as Client
    participant S as Server
    participant FS as Disk
    participant DB as MongoDB

    U->>C: Click delete, confirm
    C->>S: DELETE /api/datasets/:id
    S->>DB: Find dataset where id AND userId match
    alt Not found / not owner
        S-->>C: 404
    else Owner
        S->>FS: Remove CSV file
        S->>DB: Delete dataset metadata
        S->>DB: Mark conversations that used it as readOnly
        S-->>C: 204
        C->>C: Remove from list, show read-only banner in affected chats
    end
```

Conversations, messages, and run logs are kept (with the stored schema snapshot), so past reports still work. A 404 is returned for another user's dataset so its existence is not revealed.

---

## 12. Error states summary

| Situation | HTTP / event | What the user sees |
|---|---|---|
| Not logged in | 401 | Redirect to login |
| Wrong credentials | 401 | "Invalid email or password" |
| Too many login attempts | 429 | "Try again in a few minutes" |
| Too many files / file too large / wrong type | 413 / 415 / 422 | Per-file error in the upload list |
| One CSV in a batch cannot be parsed | 201 with an error entry | That file shows "Could not read this CSV" and the reason; others succeed |
| Dataset not yours | 404 | "Dataset not found" |
| More than 5 datasets selected | 422 | "Select up to 5 datasets" |
| Conversation is read-only | 409 | Banner: "A dataset in this chat was deleted" |
| SQL rejected or failed 3 times | SSE `error` | Friendly message + last error in an expandable section |
| Query timeout | SSE `error` | "That query took too long, try narrowing the question" |
| Gemini rate limit or outage | SSE `error` | "The AI service is busy, please retry in a moment" |
| Client stops the stream | aborted | Run saved as `aborted` in the report |
