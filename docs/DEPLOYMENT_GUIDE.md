# TableTalk — Master Deployment & Multi-Project Server Runbook

This document is the definitive production guide for **TableTalk** on Oracle Cloud Infrastructure (OCI). It documents the live infrastructure, provides an operational runbook for pushing updates, and serves as an architectural blueprint for deploying future applications on this server without conflicts.

---

## 1. Live Deployment Snapshot & Metadata

| Parameter | Value | Notes |
|---|---|---|
| **Server Host** | Oracle Cloud Infrastructure (OCI) | Compute Instance |
| **Operating System** | Ubuntu 24.04 LTS | Canonical Minimal / Server |
| **Public IPv4 Address** | `132.226.187.245` | Static / Assigned via OCI Ephemeral IP |
| **Primary Domain** | `r2cstack.site` | Registered with Namecheap |
| **Application URL** | `https://tabletalk.r2cstack.site` | Active HTTPS with Let's Encrypt |
| **Backend Internal Address** | `127.0.0.1:8001` | Bound strictly to localhost; never public |
| **Database** | MongoDB Community Server (v7.0) | Localhost `127.0.0.1:27017/tabletalk_prod` |
| **Process Manager** | PM2 | Managed under service `tabletalk-backend` |
| **Web Server / Reverse Proxy** | Nginx | Serves static frontend on 80/443, proxies `/api/` |
| **SSL / TLS Certificate** | Let's Encrypt | Auto-renewing via Certbot |
| **Reserved Development Port** | `5173` | **Strictly preserved**; never used in production |

---

## 2. Server Directory Architecture

All applications on this server follow a modular, isolated directory structure under `/var/www/`.

```
/var/www/
│
├── tabletalk/                              <-- TableTalk Root
│   ├── frontend/
│   │   ├── dist/                           <-- Production static assets served by Nginx
│   │   │   ├── index.html
│   │   │   └── assets/
│   │   ├── src/
│   │   ├── package.json
│   │   └── .env                            <-- VITE_API_URL=
│   │
│   ├── backend/
│   │   ├── dist/                           <-- Compiled production JavaScript
│   │   │   └── index.js
│   │   ├── src/
│   │   ├── package.json
│   │   ├── ecosystem.config.cjs            <-- PM2 runtime configuration
│   │   └── .env                            <-- Production secrets (PORT=8001, keys)
│   │
│   └── uploads/                            <-- Multi-CSV isolated upload directory
│
├── project2/                               <-- Blueprint for Future Project 2
│   ├── frontend/dist/
│   ├── backend/ (Port 8002)
│   └── uploads/
│
└── project3/                               <-- Blueprint for Future Project 3
    ├── frontend/dist/
    ├── backend/ (Port 8003)
    └── uploads/
```

### Security & Ownership Rules
- All directories under `/var/www/` are owned by `ubuntu:ubuntu`:
  ```bash
  sudo chown -R ubuntu:ubuntu /var/www
  ```
- Uploaded CSVs are stored in `/var/www/tabletalk/uploads/` and are **never** placed inside public web directories.
- Environment files (`.env`) have permissions restricted to the owner:
  ```bash
  chmod 600 /var/www/tabletalk/backend/.env
  ```

---

## 3. Port Allocation Map (Multi-Project)

To prevent port collisions, backend services are assigned dedicated localhost ports:

| Project | Subdomain / URL | Frontend Hosting | Backend Local Port | PM2 Process Name | Database |
|---|---|---|---|---|---|
| **TableTalk** | `tabletalk.r2cstack.site` | `/var/www/tabletalk/frontend/dist` | `127.0.0.1:8001` | `tabletalk-backend` | `127.0.0.1:27017/tabletalk_prod` |
| **Project 2** | `project2.r2cstack.site` | `/var/www/project2/frontend/dist` | `127.0.0.1:8002` | `project2-backend` | Isolated DB / SQLite / Postgres |
| **Project 3** | `project3.r2cstack.site` | `/var/www/project3/frontend/dist` | `127.0.0.1:8003` | `project3-backend` | Isolated DB / SQLite / Postgres |
| **Project 4** | `project4.r2cstack.site` | `/var/www/project4/frontend/dist` | `127.0.0.1:8004` | `project4-backend` | Isolated DB / SQLite / Postgres |
| *Reserved* | *(Localhost only)* | *Unallocated* | `5173` | *None* | *Reserved for local Vite dev* |

---

## 4. Complete Step-by-Step Deployment History

### Phase 1: Oracle Cloud Compute & Network Security
1. **VM Provisioning**: Launched an Ubuntu 24.04 LTS instance with an assigned public IPv4 (`132.226.187.245`).
2. **SSH Key Pair**: Downloaded the private `.key` file and restricted local Windows permissions:
   ```powershell
   icacls .\oci_tabletalk.key /inheritance:r
   icacls .\oci_tabletalk.key /grant:r "$($env:USERNAME):(R)"
   ```
3. **OCI VCN Ingress Rules**: Added rules in the default security list for the subnet:
   - Port 22 (SSH)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Source: `0.0.0.0/0` (CIDR)

### Phase 2: Ubuntu Server Initialization & Hardening
1. **Package Updates**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl wget git build-essential ufw software-properties-common ca-certificates gnupg
   ```
2. **Runtimes Installed**:
   - Node.js LTS (v22 via NodeSource) and npm.
   - PM2 globally (`sudo npm install -g pm2`).
   - Python 3, pip, and venv (`sudo apt install -y python3 python3-pip python3-venv`).
3. **Firewall & Network Hardening (UFW & iptables)**:
   - Configured UFW to allow only SSH, HTTP, and HTTPS:
     ```bash
     sudo ufw allow 22/tcp
     sudo ufw allow 80/tcp
     sudo ufw allow 443/tcp
     sudo ufw --force enable
     ```
   - Aligned Oracle Cloud's default Ubuntu `iptables` chains to prevent connection timeouts:
     ```bash
     sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
     sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
     sudo apt install -y iptables-persistent
     sudo netfilter-persistent save
     ```
4. **Nginx Installed**:
   ```bash
   sudo apt install -y nginx
   sudo systemctl enable nginx && sudo systemctl start nginx
   ```

### Phase 3: Directory Architecture & Git Setup
1. Created `/var/www/tabletalk` and set ownership:
   ```bash
   sudo mkdir -p /var/www/tabletalk/uploads
   sudo chown -R ubuntu:ubuntu /var/www
   ```
2. Cloned the repository from GitHub into `/var/www/tabletalk`.

### Phase 4: Backend Production Setup (Port 8001 + PM2)
1. **MongoDB Community Server**: Installed locally and bound to `127.0.0.1:27017`.
   ```bash
   curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes
   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   sudo apt update && sudo apt install -y mongodb-org
   sudo systemctl enable mongod && sudo systemctl start mongod
   ```
2. **Compiled Backend TypeScript**:
   ```bash
   cd /var/www/tabletalk/backend
   npm install
   npm run build
   ```
3. **Configured Environment File (`/var/www/tabletalk/backend/.env`)**:
   - `PORT=8001`
   - `NODE_ENV=production`
   - `CLIENT_ORIGIN=https://tabletalk.r2cstack.site`
   - `MONGODB_URI=mongodb://127.0.0.1:27017/tabletalk_prod`
   - `GOOGLE_API_KEY=...`
4. **Configured PM2 (`ecosystem.config.cjs`)**:
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
5. **Started PM2 & Enabled Boot Persistence**:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup  # (executed the output sudo command)
   pm2 install pm2-logrotate
   ```

### Phase 5: Frontend Production Build (Static Nginx)
1. **Configured Frontend `.env`**: Set `VITE_API_URL=` (empty string so requests use relative `/api` paths).
2. **Built Static Files**:
   ```bash
   cd /var/www/tabletalk/frontend
   npm install
   npm run build
   ```
   *(Generated production bundle in `/var/www/tabletalk/frontend/dist` without running any dev server).*

### Phase 6: Nginx Modular Configuration & Reverse Proxy
1. Created `/etc/nginx/sites-available/tabletalk` (detailed in Section 5).
2. Enabled the site:
   ```bash
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo ln -sf /etc/nginx/sites-available/tabletalk /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

### Phase 7: Namecheap DNS & Let's Encrypt SSL
1. **Namecheap DNS Record**:
   - Type: `A Record`
   - Host: `tabletalk`
   - Value: `132.226.187.245`
   - TTL: `Automatic`
2. **SSL Installation**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d tabletalk.r2cstack.site
   ```
3. **Renewal Automation**: Verified renewal timer:
   ```bash
   sudo certbot renew --dry-run
   ```

---

## 5. Active Nginx Configuration Details

The production configuration lives in `/etc/nginx/sites-available/tabletalk` and is symlinked to `/etc/nginx/sites-enabled/tabletalk`.

```nginx
# ==============================================================================
# Nginx Configuration for TableTalk
# File: /etc/nginx/sites-available/tabletalk
# ==============================================================================

# HTTP — Redirect all non-secure traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name tabletalk.r2cstack.site;

    return 301 https://$host$request_uri;
}

# HTTPS — Main Application Block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tabletalk.r2cstack.site;

    # SSL Certificates managed by Certbot
    ssl_certificate /etc/letsencrypt/live/tabletalk.r2cstack.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tabletalk.r2cstack.site/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 1. Frontend: Serve production static files directly
    root /var/www/tabletalk/frontend/dist;
    index index.html;

    # Maximum file upload size (matches our 100MB multi-CSV backend cap)
    client_max_body_size 100M;

    # SPA Client-Side Routing Fallback
    # Routes like /login, /register, /app resolve cleanly without 404
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static asset caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
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

        # Server-Sent Events (SSE) Streaming Optimization
        # Essential for token-by-token streaming and live query step status
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;

        # Extended timeouts for complex multi-table SQL queries
        proxy_read_timeout 600s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
    }
}
```

---

## 6. How to Push Updates to TableTalk (The Repeatable Git Runbook)

When you make changes to TableTalk locally and want to deploy them, follow this manual deployment workflow.

### Step 1: Push from Your Local Computer (Windows)
In your local terminal (`d:\Projects\SQLRag`):
```powershell
# 1. Check status
git status

# 2. Stage and commit your changes
git add .
git commit -m "feat: description of changes"

# 3. Push to GitHub
git push origin main
```

### Step 2: SSH into Oracle Cloud
```powershell
ssh -i C:\Users\RAIYAN\.ssh\oci_tabletalk.key ubuntu@132.226.187.245
```

### Step 3: Pull Changes on Server
```bash
cd /var/www/tabletalk
git pull origin main
```

### Step 4: Rebuild Frontend (If Frontend Files Changed)
```bash
cd /var/www/tabletalk/frontend
npm install
npm run build
```
*(Nginx automatically serves the updated `dist/` immediately. You do NOT need to restart Nginx).*

### Step 5: Rebuild & Restart Backend (If Backend Files Changed)
```bash
cd /var/www/tabletalk/backend
npm install
npm run build
pm2 restart tabletalk-backend
```

### Step 6: Verify Deployment
```bash
# Check PM2 process health
pm2 status

# View recent backend logs
pm2 logs tabletalk-backend --lines 20 --nostream

# Test API health
curl -i https://tabletalk.r2cstack.site/api/health
```

---

## 7. Blueprint: How to Deploy a New Project (e.g. Project 2)

When you are ready to deploy your second application (`project2`) on this same server, follow these exact steps without disturbing TableTalk.

### Step 1: Namecheap DNS Setup
1. Open **Namecheap** &rarr; **Advanced DNS**.
2. Add an **A Record**:
   - **Type**: `A Record`
   - **Host**: `project2` *(or whatever subdomain you want)*
   - **Value**: `132.226.187.245`
   - **TTL**: `Automatic`

### Step 2: Create Project Directory on Server
```bash
sudo mkdir -p /var/www/project2
sudo chown -R ubuntu:ubuntu /var/www/project2
cd /var/www/project2

# Clone the new project repository
git clone <PROJECT2_GITHUB_URL> /var/www/project2
```

### Step 3: Configure Project 2 Backend Port (e.g., 8002)
1. Create `/var/www/project2/backend/.env`:
   ```bash
   PORT=8002
   NODE_ENV=production
   # other environment variables...
   ```
2. Create `/var/www/project2/backend/ecosystem.config.cjs`:
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'project2-backend',
         script: 'dist/index.js', # (or app.py / gunicorn for Python)
         cwd: '/var/www/project2/backend',
         instances: 1,
         autorestart: true,
         env: {
           PORT: 8002,
           NODE_ENV: 'production',
         },
       },
     ],
   };
   ```
3. Start under PM2:
   ```bash
   cd /var/www/project2/backend
   npm install && npm run build
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

### Step 4: Build Project 2 Frontend
```bash
cd /var/www/project2/frontend
npm install
npm run build
# (Creates /var/www/project2/frontend/dist)
```

### Step 5: Create Project 2 Nginx Configuration
Create a dedicated file in `/etc/nginx/sites-available/project2`:
```bash
sudo tee /etc/nginx/sites-available/project2 > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name project2.r2cstack.site;

    # Static frontend
    root /var/www/project2/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend reverse proxy on 8002
    location /api/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

Enable the site and reload Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/project2 /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Step 6: Generate SSL with Certbot for Project 2
```bash
sudo certbot --nginx -d project2.r2cstack.site
```
*Certbot will automatically add HTTPS configuration to `project2` without modifying `tabletalk`!*

---

## 8. What NOT to Do (The Golden Rules)

To maintain a healthy, reliable multi-project server, adhere strictly to these rules:

1. **NEVER run `npm run dev` or launch Vite development servers in production.**
   - Vite dev servers consume unnecessary memory, lack HTTP/2 optimization, and do not belong in production.
   - Always run `npm run build` and let Nginx serve the `dist/` static files directly.
2. **NEVER bind backend processes to `0.0.0.0` or expose backend ports publicly.**
   - All backends must bind strictly to `127.0.0.1:<PORT>` (e.g. `127.0.0.1:8001`, `127.0.0.1:8002`).
   - Only ports 22, 80, and 443 should ever be open publicly in UFW and OCI Security Lists.
3. **NEVER use port `5173`.**
   - Port 5173 is explicitly reserved for future local tooling. Never allocate it to an Nginx block or backend process.
4. **NEVER edit files inside `/etc/nginx/sites-enabled/` directly.**
   - Always write and edit configurations inside `/etc/nginx/sites-available/<project_name>`.
   - Symlink to `sites-enabled` with `sudo ln -sf ...`.
   - Always run `sudo nginx -t` before reloading Nginx to avoid bringing down active websites with syntax typos.
5. **NEVER commit `.env` files, API keys, or uploaded CSV files to GitHub.**
   - Maintain `.env` files exclusively on the server with `chmod 600`.
6. **NEVER delete or overwrite another project's PM2 process or Nginx file.**
   - When running PM2 commands, always specify the process name (e.g., `pm2 restart tabletalk-backend`), never use `pm2 restart all` unless explicitly intending to reboot every application on the machine.

---

## 9. Useful Troubleshooting Commands

### Process Management (PM2)
```bash
# View all running processes and memory/CPU usage
pm2 status

# Real-time streaming logs for TableTalk
pm2 logs tabletalk-backend

# Restart TableTalk backend
pm2 restart tabletalk-backend

# View PM2 startup script configuration
pm2 startup
```

### Web Server (Nginx)
```bash
# Test configuration syntax for errors
sudo nginx -t

# Gracefully reload configuration (zero downtime)
sudo systemctl reload nginx

# View real-time web traffic access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Database (MongoDB)
```bash
# Check MongoDB status
sudo systemctl status mongod --no-pager

# Restart MongoDB
sudo systemctl restart mongod
```

### SSL (Certbot)
```bash
# Check all active SSL certificates and expiry dates
sudo certbot certificates

# Test automatic certificate renewal
sudo certbot renew --dry-run
```

### Server Resources
```bash
# Check disk usage
df -h

# Check RAM and CPU usage
free -m
htop
```
