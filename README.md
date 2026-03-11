# Live Chat App

## Run locally

```bash
npm install
npm start
```

Open:
- Local: `http://localhost:3000`
- LAN (same Wi-Fi): `http://<your-lan-ip>:3000`

## Share with friends on the internet (quick public URL)

### Option 1: Cloudflare Tunnel (temporary public URL)

```bash
cloudflared tunnel --url http://localhost:3000
```

Set `PUBLIC_URL` to the generated `https://...trycloudflare.com` URL and restart server:

```bash
PUBLIC_URL=https://your-public-url.trycloudflare.com npm start
```

PowerShell:

```powershell
$env:PUBLIC_URL="https://your-public-url.trycloudflare.com"
npm start
```

### Option 2: Deploy with permanent public domain

Deploy to a Node host (Render, Railway, VPS, etc.), then set:

- `PUBLIC_URL=https://chat.yourdomain.com`
- `CORS_ORIGINS=https://chat.yourdomain.com`

If your frontend and backend are on different domains, add both origins in `CORS_ORIGINS` (comma-separated).

## Environment variables

- `PORT` (default: `3000`)
- `HOST` (default: `0.0.0.0`)
- `PUBLIC_URL` (optional public invite domain/url shown in UI)
- `CORS_ORIGINS` (optional comma-separated origin allowlist)
