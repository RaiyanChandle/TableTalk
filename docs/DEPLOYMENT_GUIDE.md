# TableTalk — Oracle Cloud Infrastructure (OCI) Deployment Guide

This document tracks our step-by-step production deployment of **TableTalk** on Oracle Cloud Infrastructure (OCI).

---

## 1. Target Architecture & Port Allocation

- **Server**: Ubuntu 24.04 LTS on Oracle Cloud Compute.
- **Reverse Proxy & Web Server**: Nginx (handling HTTP :80 and HTTPS :443 with Let's Encrypt SSL via Certbot).
- **Process Manager**: PM2 (global, with systemd startup hook for automatic boot persistence).
- **Domain**: Custom domain/subdomain via Namecheap Advanced DNS (e.g. `tabletalk.yourdomain.com`).
- **No Docker / No CI/CD**: Manual Git pull workflow directly on the host.

### Port Allocation Map
| Service / Project | Domain / Subdomain | Internal Port | Managed By | Publicly Exposed? |
|---|---|---|---|---|
| **TableTalk Frontend** | `tabletalk.<domain>` | N/A (Static files in `/var/www/tabletalk/frontend/dist`) | Nginx | Yes (80, 443) |
| **TableTalk Backend** | `tabletalk.<domain>/api` | `127.0.0.1:8001` | PM2 (`tabletalk-backend`) | **NO** (Reverse Proxied) |
| **Project 2 (Future)** | `project2.<domain>` | `127.0.0.1:8002` | PM2 (`project2-backend`) | **NO** |
| **Project 3 (Future)** | `project3.<domain>` | `127.0.0.1:8003` | PM2 (`project3-backend`) | **NO** |
| *Reserved (Dev)* | Localhost only | `5173` | Unallocated | **NO** |

---

## 2. Deployment Roadmap & Phase Checklist

- [ ] **Phase 1: Oracle Cloud Compute Instance & Network Security**
  - [ ] Choose Region & VM Shape (Always Free AMD / Ampere A1).
  - [ ] Set up Virtual Cloud Network (VCN), Internet Gateway, and Subnet.
  - [ ] Configure Ingress Rules in OCI Security List (Ports 22, 80, 443).
  - [ ] Generate SSH key pair and launch Ubuntu 24.04 LTS instance.
  - [ ] Establish SSH connection from local machine.
- [ ] **Phase 2: Ubuntu Server Initialization & Hardening**
  - [ ] Update packages and install core build tools (Git, Curl, UFW).
  - [ ] Install Node.js LTS, npm, and PM2 globally.
  - [ ] Install Python 3, pip, and venv utilities.
  - [ ] Configure UFW firewall rules (Allow 22, 80, 443; Deny direct backend ports).
  - [ ] Install Nginx web server and verify running status.
- [ ] **Phase 3: Directory Architecture & Git Setup**
  - [ ] Create modular directory structure under `/var/www/`.
  - [ ] Configure SSH key / Deploy token for repository cloning.
  - [ ] Clone repository into `/var/www/tabletalk/`.
- [ ] **Phase 4: Backend Production Setup (Port 8001 + PM2)**
  - [ ] Inspect environment variables (`.env`).
  - [ ] Build production backend distribution.
  - [ ] Create `ecosystem.config.cjs` bound to `127.0.0.1:8001`.
  - [ ] Start backend with PM2 (`tabletalk-backend`).
  - [ ] Configure PM2 startup script and log rotation.
- [ ] **Phase 5: Frontend Production Build (Static Nginx)**
  - [ ] Build frontend into static `/dist` directory (`npm run build`).
  - [ ] Configure production API URL.
- [ ] **Phase 6: Nginx Modular Configuration**
  - [ ] Create `/etc/nginx/sites-available/tabletalk`.
  - [ ] Configure reverse proxy to `127.0.0.1:8001` with streaming SSE support and 100MB upload limits.
  - [ ] Symlink to `sites-enabled` and test configuration (`nginx -t`).
- [ ] **Phase 7: Namecheap DNS & Let's Encrypt SSL**
  - [ ] Configure Namecheap A Record pointing subdomain to OCI Public IP.
  - [ ] Verify DNS propagation via `dig` / `nslookup`.
  - [ ] Run Certbot for SSL certificate and HTTP-to-HTTPS redirect.
  - [ ] Test automatic certificate renewal.
- [ ] **Phase 8: End-to-End Verification & Runbook**
  - [ ] Verify frontend, chat streaming, CSV upload, DuckDB sandbox, and reports over HTTPS.
  - [ ] Document repeatable Git deployment procedure for future updates.
