# VPS deployment (production)

This is the recommended long-term setup: **one VPS**, **Caddy** for HTTPS + static files, **Node** for API and WebSocket on localhost only.

Players use:

```text
https://yourgame.example.com/?mmo=online
```

When the game is served over HTTPS on your real domain, the client automatically uses the **same origin** for API/WebSocket (no `MMO_CONFIG` edit required). Override with `window.MMO_CONFIG` or `?api=` if needed.

---

## What you need

- A VPS (Ubuntu 22.04/24.04 LTS is fine; 1–2 GB RAM is enough for a beta)
- A domain name (`yourgame.example.com`) with DNS **A record** → VPS public IP
- SSH access as root or sudo

---

## 1. Server packages

```bash
sudo apt update
sudo apt install -y git curl

# Node.js 22 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

---

## 2. App user and directories

```bash
sudo useradd --system --home /opt/browser-rpg --shell /usr/sbin/nologin browser-rpg || true
sudo mkdir -p /opt/browser-rpg /var/lib/browser-rpg
sudo chown -R browser-rpg:browser-rpg /opt/browser-rpg /var/lib/browser-rpg
```

---

## 3. Deploy game files

On your **dev machine**, from the repo root:

```bash
rsync -av --exclude server/node_modules --exclude .git \
  ./ user@YOUR_VPS_IP:/opt/browser-rpg/
```

Or clone on the VPS:

```bash
sudo -u browser-rpg git clone YOUR_REPO_URL /opt/browser-rpg
```

Install server dependencies:

```bash
cd /opt/browser-rpg/server
sudo -u browser-rpg npm ci --omit=dev
```

---

## 4. Environment file

```bash
sudo cp /opt/browser-rpg/deploy/env.example /opt/browser-rpg/server/.env
sudo nano /opt/browser-rpg/server/.env
```

Set at minimum:

- `JWT_SECRET` — long random string (`openssl rand -base64 48`)
- `DATABASE_PATH=/var/lib/browser-rpg/game.db`
- `HOST=127.0.0.1` (API not exposed except via Caddy)

```bash
sudo chown browser-rpg:browser-rpg /opt/browser-rpg/server/.env
sudo chmod 600 /opt/browser-rpg/server/.env
```

---

## 5. systemd service

```bash
sudo cp /opt/browser-rpg/deploy/browser-rpg.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now browser-rpg
sudo systemctl status browser-rpg
```

Check API locally:

```bash
curl -s http://127.0.0.1:3001/api/health | jq
```

---

## 6. Caddy (HTTPS + static + proxy)

Edit `deploy/Caddyfile`: replace `yourgame.example.com` and confirm `root` is `/opt/browser-rpg`.

```bash
sudo cp /opt/browser-rpg/deploy/Caddyfile /etc/caddy/Caddyfile
# Or merge into your existing Caddy config
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy obtains Let's Encrypt certificates automatically.

Open in a browser: `https://yourgame.example.com/?mmo=online`

---

## 7. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Do **not** expose port 3001 publicly.

---

## 8. Backups

SQLite lives at `DATABASE_PATH` (default `/var/lib/browser-rpg/game.db`).

```bash
sudo -u browser-rpg sqlite3 /var/lib/browser-rpg/game.db ".backup '/var/lib/browser-rpg/backups/game-$(date +%F).db'"
```

Add a daily cron job for that path.

---

## Updates (new version)

```bash
# rsync or git pull new files to /opt/browser-rpg
cd /opt/browser-rpg/server && sudo -u browser-rpg npm ci --omit=dev
sudo systemctl restart browser-rpg
# Static files are served by Caddy from /opt/browser-rpg — no extra step
```

---

## How players connect

1. Share the URL: `https://yourgame.example.com/?mmo=online`
2. Each person **registers** / logs in
3. On the world map: **Party invite** → accept
4. Stand on the **same tile** → host starts fight → other player accepts **fight invite**

---

## Troubleshooting

| Symptom | Check |
|--------|--------|
| 502 on `/api` | `systemctl status browser-rpg`, `curl http://127.0.0.1:3001/api/health` |
| WebSocket fails | Caddy `/presence` block; browser DevTools → Network → WS |
| Login works locally only | Using `?mmo=online` on the **public** domain, not `file://` |
| CORS errors | Use same-origin (default on VPS); or set `CORS_ORIGIN` to your site URL |

---

## Optional: split static to CDN later

Keep Node on the VPS. Put only static assets on Cloudflare Pages and set:

```html
<script>
  window.MMO_CONFIG = { mode: "online", apiBaseUrl: "https://yourgame.example.com" };
</script>
```

before `mmo/config.js`, and `CORS_ORIGIN` on the server.
