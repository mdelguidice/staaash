# staaash phone inbox

A Cloudflare Worker that holds what you save from your phone until the Mac app picks it up. It uses D1 for the list and R2 for the images, and serves the phone app at `/app`. Plan and decisions: `../docs/phase-3-phone-inbox-plan.md`.

## Set up (once)

```bash
cd ~/staaash/worker && ./setup.sh
```

It asks you to log in to Cloudflare the first time. Then it creates the database and image bucket, deploys, and prints the inbox address and two tokens. The tokens appear once and aren't saved anywhere.

- **Mac:** staaash › Settings › Phone inbox. Paste the address and the desktop token, then click Test connection.
- **Phone:** open `<address>/app` in Chrome, tap ⋮ › Install app, open it, and paste the phone token.

## Later

- Deploy code changes: `./setup.sh`. Your tokens stay the same.
- New tokens (if one leaks or you lose them): `./setup.sh --rotate`, then paste both again.
- Tests: `npm test` (runs in the Workers runtime locally; no account needed).
- Run it locally: put `PHONE_TOKEN=…` and `DESKTOP_TOKEN=…` (16+ characters each) in `.dev.vars`, then run `npx wrangler d1 migrations apply staaash-inbox --local && npx wrangler dev`.

## API

| Route | Token | Does |
|---|---|---|
| `POST /items` | phone | multipart `client_id`, `saved_at`, `url`/`text`/`title`, `note`, `image`×≤10 (≤15 MB each) |
| `GET /phone/check` | phone | 200 if the token is right |
| `GET /items?limit=` | desktop | unsynced items, oldest first, plus `pending` |
| `GET /images/items/…` | desktop | one image |
| `POST /items/:id/synced` | desktop | mark synced (the item and its images are kept) |
| `GET /health` | none | liveness |
