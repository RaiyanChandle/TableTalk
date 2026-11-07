# TableTalk — Complete Production Deployment & Multi-Project Operations Guide

This document is the permanent DevOps reference manual and runbook for **TableTalk** and all future applications hosted on this Oracle Cloud Infrastructure (OCI) server.

---

## 1. Production Server & Infrastructure Specification

| Attribute | Production Value |
|---|---|
| **Cloud Provider** | Oracle Cloud Infrastructure (OCI) |
| **Operating System** | Ubuntu 24.04 LTS |
| **Public IPv4 Address** | `132.226.187.245` |
| **Primary Domain** | `r2cstack.site` (Namecheap Registrar) |
| **Active Subdomain** | `tabletalk.r2cstack.site` |
| **Live Production URL** | `https://tabletalk.r2cstack.site` |
| **SSH Default User** | `ubuntu` |
| **SSH Access Command** | `ssh -i C:\Users\RAIYAN\.ssh\oci_tabletalk.key ubuntu@132.226.187.245` |
| **Web Server & Reverse Proxy** | Nginx (`/etc/nginx/sites-available/tabletalk`) |
| **Process Manager** | PM2 (`tabletalk-backend`, autostart on system boot) |
| **Database** | MongoDB Community Server (local on `127.0.0.1:27017`) |
| **SSL / TLS Certificate** | Let's Encrypt (Certbot, auto-renewing via systemd timer) |

---

## 2. Server Port Allocation Map

| Application / Purpose | Domain / Subdomain | Public Ports | Internal Port | Process Name | Hosting Strategy |
|---|---|---|---|---|---|
| **TableTalk (Frontend)** | `tabletalk.r2cstack.site` | **80, 443** | N/A | Static | Served directly by Nginx from `/var/www/tabletalk/frontend/dist` |
| **TableTalk (Backend)** | `tabletalk.r2cstack.site/api` | **Blocked** | `127.0.0.1:8001` | `tabletalk-backend` | PM2 Node/Express process reverse-proxied by Nginx |
| **Project 2 (Future)** | `project2.r2cstack.site` | **80, 443** | `127.0.0.1:8002` | `project2-backend` | Static Nginx frontend + PM2 backend |
| **Project 3 (Future)** | `project3.r2cstack.site` | **80, 443** | `127.0.0.1:8003` | `project3-backend` | Static Nginx frontend + PM2 backend |
| **Project 4 (Future)** | `project4.r2cstack.site` | **80, 443** | `127.0.0.1:8004` | `project4-backend` | Static Nginx frontend + PM2 backend |
| **Vite Dev Server Port** | `localhost` | **Blocked** | `5173` | *Unused* | **STRICTLY RESERVED** (Never used in production) |

---

## 3. Server Directory Architecture

All applications reside inside `/var/www/` owned by `ubuntu:ubuntu`:

```
/var/www/
├── tabletalk/                             <-- Current Application
│   ├── frontend/
│   │   ├── dist/                          <-- Static build served by Nginx (index.html, assets/)
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env                           (VITE_API_URL=)
│   ├── backend/
│   │   ├── dist/                          <-- Compiled TypeScript JavaScript (index.js)
│   │   ├── src/
│   │   ├── storage/                       <-- Internal user storage
│   │   ├── ecosystem.config.cjs           <-- PM2 configuration file
│   │   ├── package.json
│   │   └── .env                           (PORT=8001, MONGODB_URI=..., GOOGLE_API_KEY=...)
│   └── uploads/                           <-- Dedicated uploads folder outside web root
│
├── project2/                              <-- Future Project 2 (Isolated)
│   ├── frontend/dist/
│   ├── backend/
│   │   └── ecosystem.config.cjs           (PORT=8002, process: project2-backend)
│   └── uploads/
│
└── project3/                              <-- Future Project 3 (Isolated)
```

---

## 4. Complete Chronicle of All Deployment Steps Executed

### Phase 1: Provisioning & Network Security
1. **VM Creation**: Provisioned an Ubuntu 24.04 LTS instance named `tabletalk-server` with an assigned Public IP (`132.226.187.245`).
2. **SSH Key Pair**: Generated and downloaded `oci_tabletalk.key`. Configured Windows permissions with `icacls .\oci_tabletalk.key /inheritance:r /grant:r "$($env:USERNAME):(R)"`.
3. **Oracle Cloud VCN Security Rules**: Added Ingress Rules to the VCN Default Security List:
   - Source: `0.0.0.0/0` (CIDR), Protocol: `TCP`, Destination Port Range: `80-443` (HTTP & HTTPS) and `22` (SSH).

### Phase 2: Ubuntu System Initialization & Hardening
1. **System Updates**: Ran `sudo apt update && sudo apt upgrade -y`.
2. **Build Tools**: Installed `git`, `curl`, `build-essential`, `ufw`, `iptables-persistent`.
3. **Runtimes Installed**:
   - Node.js LTS (v22 via NodeSource) and npm.
   - PM2 globally (`sudo npm install -g pm2`).
   - Python 3, pip, and venv (`python3`, `python3-pip`, `python3-venv`).
4. **Firewall Lockdown**:
   - `sudo ufw allow 22/tcp`
   - `sudo ufw allow 80/tcp`
   - `sudo ufw allow 443/tcp`
   - `sudo ufw --force enable`
   - Fixed Oracle Cloud's default OS-level iptables reject rule:
     ```bash
     sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
     sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
     sudo netfilter-persistent save
     ```
5. **Nginx Installed**: Installed and enabled `nginx` (`sudo systemctl enable nginx`).

### Phase 3: Repository & Directory Setup
1. Created `/var/www/tabletalk/` with `sudo chown -R ubuntu:ubuntu /var/www`.
2. Cloned git repository directly into `/var/www/tabletalk`.
3. Created `/var/www/tabletalk/uploads` for secure CSV quarantine.

### Phase 4: Database & Backend Deployment (Port 8001 + PM2)
1. **MongoDB Installed**: Configured MongoDB 7.0 repo, installed `mongodb-org`, enabled and started `mongod` on `127.0.0.1:27017`.
2. **Dependencies & Build**: Ran `npm install` and `npm run build` in `/var/www/tabletalk/backend` to generate `dist/`.
3. **Environment Setup**: Created `/var/www/tabletalk/backend/.env` with `PORT=8001`, `NODE_ENV=production`, `CLIENT_ORIGIN=https://tabletalk.r2cstack.site`, and `GOOGLE_API_KEY`. Protected with `chmod 600 .env`.
4. **PM2 Ecosystem Configuration** (`/var/www/tabletalk/backend/ecosystem.config.cjs`):
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'tabletalk-backend',
         script: 'dist/index.js',
         cwd: '/var/www/tabletalk/backend',
         instances: 1,
         autorestart: true,
         watch: false,
         max_memory_restart: '1G',
         env: {
           NODE_ENV: 'production',
           PORT: 8001,
         },
       },
     ],
   };
   ```
5. **Autostart on Reboot**: Executed `pm2 start ecosystem.config.cjs`, `pm2 save`, and `pm2 startup` systemd hooks.
6. **Log Rotation**: Installed `pm2-logrotate` (capped to 10MB, max 10 files).

### Phase 5: Production Frontend Static Build
1. In `/var/www/tabletalk/frontend`:
   - Configured `.env` with `VITE_API_URL=` (empty string so requests use relative `/api` on the same domain).
   - Ran `npm install` and `npm run build` to generate `/var/www/tabletalk/frontend/dist/`.
   - Port 5173 was left completely untouched.

### Phase 6 & 7: Nginx Configuration & Let's Encrypt SSL
1. Created `/etc/nginx/sites-available/tabletalk` and symlinked to `/etc/nginx/sites-enabled/tabletalk`. Removed default placeholder site.
2. Configured Namecheap Advanced DNS `A Record`: Host `tabletalk` &rarr; IP `132.226.187.245`.
3. Installed Certbot (`sudo apt install -y certbot python3-certbot-nginx`).
4. Ran `sudo certbot --nginx -d tabletalk.r2cstack.site` which configured SSL and HTTP-to-HTTPS redirects automatically.

---

## 5. Active Nginx Configuration (`/etc/nginx/sites-available/tabletalk`)

Below is the complete, active configuration for TableTalk:

```nginx
# HTTP - Redirect all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name tabletalk.r2cstack.site;
    return 301 https://$host$request_uri;
}

# HTTPS - Production Web & Reverse Proxy
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tabletalk.r2cstack.site;

    # SSL Certificates managed by Certbot
    ssl_certificate /etc/letsencrypt/live/tabletalk.r2cstack.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tabletalk.r2cstack.site/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 1. Frontend: Serve React production static build
    root /var/www/tabletalk/frontend/dist;
    index index.html;

    # Maximum upload size for multi-CSV ingestion
    client_max_body_size 100M;

    # SPA client-side routing fallback (prevents 404 on page refresh)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Backend Reverse Proxy: Forward /api/ to PM2 on 127.0.0.1:8001
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;

        # Standard Proxy Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE (Server-Sent Events) Streaming Configuration
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;

        # Long-running analytical query timeouts
        proxy_read_timeout 600s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
    }
}
```

---

## 6. How to Deploy Future Projects (Step-by-Step Blueprint)

When you are ready to deploy **Project 2** (e.g. `project2.r2cstack.site`), follow this exact sequence without touching TableTalk:

### Step 1: Allocate Port and Subdomain
- Subdomain: `project2.r2cstack.site`
- Backend Port: `127.0.0.1:8002`
- Directory: `/var/www/project2`

### Step 2: Namecheap DNS Record
In Namecheap Advanced DNS, add:
- **Type**: `A Record`
- **Host**: `project2`
- **Value**: `132.226.187.245`
- **TTL**: `Automatic`

### Step 3: Clone Project into Its Own Directory
```bash
# Inside your Oracle Cloud SSH terminal:
mkdir -p /var/www/project2
git clone https://github.com/<your-user>/<project2-repo>.git /var/www/project2
```

### Step 4: Configure & Launch Project 2 Backend with PM2
1. Create `/var/www/project2/backend/.env` setting `PORT=8002`.
2. Build the backend:
   ```bash
   cd /var/www/project2/backend
   npm install && npm run build # (Or if Python: python3 -m venv venv && pip install -r requirements.txt)
   ```
3. Create `/var/www/project2/backend/ecosystem.config.cjs`:
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'project2-backend',
         script: 'dist/index.js', # (Or python: 'venv/bin/gunicorn -b 127.0.0.1:8002 app:app')
         cwd: '/var/www/project2/backend',
         instances: 1,
         autorestart: true,
         env: {
           NODE_ENV: 'production',
           PORT: 8002,
         },
       },
     ],
   };
   ```
4. Start with PM2:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

### Step 5: Build Project 2 Frontend
```bash
cd /var/www/project2/frontend
npm install && npm run build
# Generates /var/www/project2/frontend/dist
```

### Step 6: Create Independent Nginx Configuration
Create `/etc/nginx/sites-available/project2`:
```bash
sudo nano /etc/nginx/sites-available/project2
```
Paste this configuration:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name project2.r2cstack.site;

    root /var/www/project2/frontend/dist;
    index index.html;
    client_max_body_size 50M;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it and reload Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/project2 /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Step 7: Issue SSL Certificate
```bash
sudo certbot --nginx -d project2.r2cstack.site
```
Certbot will issue the certificate and enable HTTPS on port 443 for Project 2 without touching TableTalk!

---

## 7. What NOT to Do (Golden Rules & Pitfalls)

1. **NEVER run `npm run dev` or launch the Vite development server in production**:
   - Always run `npm run build` and let Nginx serve the static files in `dist/`.
   - Running `npm run dev` wastes server memory, uses excessive CPU, lacks production bundling optimizations, and occupies port 5173.
2. **NEVER expose backend ports (`8001`, `8002`, `8003`) in Oracle Security Lists or UFW**:
   - Backends must listen strictly on `127.0.0.1`.
   - Only Nginx on ports `80` and `443` should face the public internet.
3. **NEVER put `.env` files in Git**:
   - Your `.env` files contain MongoDB URIs, JWT secrets, and Gemini API keys.
   - Always create `.env` manually on the server with `chmod 600 .env`.
4. **NEVER put all projects in a single Nginx file**:
   - Always create separate files in `/etc/nginx/sites-available/<project_name>`.
   - This ensures an edit or mistake in one project cannot crash Nginx for your other websites.
5. **ALWAYS test Nginx before reloading**:
   - Always run `sudo nginx -t` before `sudo systemctl reload nginx`.
6. **NEVER forget `pm2 save`**:
   - Whenever you start, stop, or add a process in PM2, run `pm2 save` so the process list is preserved if the server reboots.
7. **NEVER expose uploaded CSV files directly in a public web directory**:
   - Uploads live in `/var/www/tabletalk/uploads` (or `backend/storage`), safely isolated from public web URLs.

---

## 8. Workflow: How to Push Code Updates to TableTalk

Whenever you make changes to TableTalk on your local machine, follow this simple, repeatable workflow:

### Step 1: On Your Local Windows Machine
Commit and push your code to GitHub:
```powershell
git add .
git commit -m "feat(ui): update landing page and analytics charts"
git push origin main
```

### Step 2: SSH into Your Oracle Cloud Server
```powershell
ssh -i C:\Users\RAIYAN\.ssh\oci_tabletalk.key ubuntu@132.226.187.245
```

### Step 3: Pull Latest Changes
```bash
cd /var/www/tabletalk
git pull origin main
```

### Step 4: Rebuild Frontend (if frontend code changed)
```bash
cd /var/www/tabletalk/frontend
npm install # Only needed if you added new packages
npm run build
```
*(No Nginx restart is needed! Nginx automatically serves the updated `dist/` files immediately).*

### Step 5: Rebuild & Restart Backend (if backend code changed)
```bash
cd /var/www/tabletalk/backend
npm install # Only needed if you added new packages
npm run build
pm2 restart tabletalk-backend
```

### Step 6: Verify
```bash
pm2 status
pm2 logs tabletalk-backend --lines 20 --nostream
```
Open `https://tabletalk.r2cstack.site` in your browser and verify your updates!

---

## 9. Useful Everyday Maintenance Commands

```bash
# Check PM2 processes
pm2 status

# View live backend logs (Ctrl+C to exit)
pm2 logs tabletalk-backend

# Restart TableTalk backend
pm2 restart tabletalk-backend

# Check Nginx error logs if a web request fails
sudo tail -f /var/log/nginx/error.log

# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check MongoDB status
sudo systemctl status mongod

# Check free disk space and memory
df -h
free -m
```
