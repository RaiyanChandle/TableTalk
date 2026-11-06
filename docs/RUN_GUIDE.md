# RUN_GUIDE.md — How to Run AI Data Analyst

This guide provides step-by-step instructions to configure, run, and verify the AI Data Analyst application locally on Windows, macOS, or Linux.

---

## 1. Prerequisites

Before running the project, ensure you have the following installed:

1. **Node.js**: v20 or higher recommended (`node -v`).
2. **MongoDB**: Local MongoDB instance running on port `27017` or a MongoDB Atlas connection string.
   - *Windows*: Ensure the MongoDB service is running (`net start MongoDB` or via Windows Services).
   - *macOS/Linux*: `brew services start mongodb-community` or `systemctl start mongod`.
3. **Google Gemini API Key**:
   - Obtain a key from [Google AI Studio](https://aistudio.google.com/).

---

## 2. Environment Setup

The repository consists of two independent applications: `backend/` and `frontend/`. Both require their own `.env` configuration file.

### Backend Environment Configuration
1. Navigate to the backend directory and copy the template:
   ```powershell
   cd backend
   cp .env.example .env
   ```
2. Open `backend/.env` and update the required variables:
   - `GOOGLE_API_KEY`: Paste your Gemini API key from Google AI Studio.
   - `JWT_SECRET`: A secure random string (at least 32 characters).
   - `MONGODB_URI`: `mongodb://localhost:27017/ai-data-analyst` (or your Atlas URI).
   - `PORT`: `4000` (default).
   - `CLIENT_ORIGIN`: `http://localhost:5173`.

> **Note**: The backend uses Zod validation at startup. If `GOOGLE_API_KEY` or `JWT_SECRET` is missing, the server will intentionally fail fast with a helpful validation message.

### Frontend Environment Configuration
1. Navigate to the frontend directory and copy the template:
   ```powershell
   cd frontend
   cp .env.example .env
   ```
2. In development, `VITE_API_URL` is left empty so the Vite development proxy (`/api` &rarr; `http://localhost:4000`) routes requests seamlessly without cross-origin cookie restrictions.

---

## 3. Running the Project in Development

You will need **two separate terminal windows** (one for backend, one for frontend).

### Terminal 1: Backend Server (Port 4000)

```powershell
# Navigate into backend directory
cd backend

# Install dependencies (if not already done)
npm install

# Start development server with live reload (tsx watch)
npm run dev
```

**Expected output**:
```
✅ Connected to MongoDB: 127.0.0.1
🚀 Backend server listening on port 4000 in development mode
🌐 CORS enabled for origin: http://localhost:5173
```

### Terminal 2: Frontend Client (Port 5173)

```powershell
# Navigate into frontend directory
cd frontend

# Install dependencies (if not already done)
npm install

# Start Vite development server
npm run dev
```

**Expected output**:
```
  VITE v8.3.5  ready in 150 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 4. Verification & Health Check

1. **Verify Backend Health**:
   - Open your browser or use curl to check:
     ```
     http://localhost:4000/api/health
     ```
   - Expected JSON response:
     ```json
     {
       "status": "ok",
       "timestamp": "2026-11-01T10:30:00.000Z",
       "database": "connected"
     }
     ```

2. **Access the Web App**:
   - Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Build & Quality Scripts

Both projects contain independent build, linting, and formatting commands:

### Backend Scripts
| Command | Action |
|---|---|
| `npm run dev` | Runs the server in watch mode (`tsx watch src/index.ts`) |
| `npm run build` | Compiles TypeScript files into `dist/` |
| `npm start` | Runs the compiled output (`node dist/index.js`) |
| `npm run lint` | Runs ESLint checks on `src/` |
| `npm run format` | Formats code using Prettier |

### Frontend Scripts
| Command | Action |
|---|---|
| `npm run dev` | Starts Vite dev server with hot module replacement |
| `npm run build` | Runs TypeScript type checking (`tsc -b`) and Vite production bundle |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs ESLint on frontend source files |

---

## 6. Troubleshooting Common Issues

### 1. PowerShell Script Execution Error (`npm.ps1 cannot be loaded`)
If PowerShell reports:
```
File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled
```
**Fix**: Use `npm.cmd` instead of `npm`, or update the execution policy for your current user:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 2. MongoDB Connection Failed (`ECONNREFUSED 127.0.0.1:27017`)
**Fix**: Ensure your local MongoDB service is started:
- Windows (Admin PowerShell): `net start MongoDB`
- Or specify an Atlas connection string in `backend/.env`: `MONGODB_URI=mongodb+srv://...`

### 3. Missing API Key (`Invalid or missing environment variables`)
**Fix**: Open `backend/.env` and ensure `GOOGLE_API_KEY` is populated with a valid key.

