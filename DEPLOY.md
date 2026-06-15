# Deploying to Render

This repo is deploy-ready: a single **web service** builds the React client and
serves it together with the Express API. Config lives in [`render.yaml`](render.yaml).

You'll do two things I can't do for you (they need your accounts): **push to
GitHub** and **click Deploy on Render**. Everything else is already set up.

---

## 1. Push to GitHub (one time)

The repo is already initialized and committed locally. Create an empty GitHub
repo (no README/license), then from this folder:

```sh
cd "$HOME/Desktop/Artificial Intelligence/WEEK2"

# point at your new GitHub repo (replace USER/REPO)
git remote add origin https://github.com/USER/REPO.git
git branch -M main
git push -u origin main
```

(If `git push` asks for a password, use a GitHub Personal Access Token, or run
`gh auth login` if you have the GitHub CLI.)

---

## 2. Deploy on Render (Blueprint — 3 clicks)

1. Go to <https://dashboard.render.com> and sign in (free account is fine).
2. **New → Blueprint**.
3. Connect your GitHub and select the repo you just pushed.
4. Render detects `render.yaml` and shows the service
   **yourspotrented-reporting**. Click **Apply / Create**.
5. Wait ~2–4 minutes for the first build. When it's live, Render gives you a
   permanent URL like:

   ```
   https://yourspotrented-reporting.onrender.com
   ```

That URL is your always-on live dashboard. Open it, upload your CSVs, generate
the report, export PDF — exactly like local.

---

## What `render.yaml` does

| Setting | Value | Why |
|---|---|---|
| `buildCommand` | `npm install --include=dev && npm run build` | installs workspaces incl. Vite/Tailwind, then builds `client/dist` |
| `startCommand` | `npm start` | runs the Express server, which serves the built client + API |
| `healthCheckPath` | `/api/health` | Render pings this to confirm the app is up |
| `NODE_ENV` | `production` | server serves the built client |
| `NODE_VERSION` | `20.18.1` | matches local |
| `plan` | `free` | no cost (note: free services sleep after ~15 min idle and cold-start on next visit) |

The app is **stateless** — uploads are processed in memory, nothing is stored —
so no database is needed.

---

## Updating the live site later

Any push to `main` triggers an automatic redeploy (`autoDeploy: true`):

```sh
git add -A && git commit -m "your change" && git push
```

---

## Notes & options

- **Free tier sleeps.** First visit after idle takes ~30–60s to wake. Upgrade to
  a paid instance (Render dashboard) for always-on.
- **Custom domain:** Render → your service → Settings → Custom Domains.
- **Persistence (optional):** the app can store reports in PostgreSQL later — see
  `server/db/schema.sql`. Add a Render PostgreSQL instance, set `PERSIST=true`
  and `DATABASE_URL`, and wire it in.
- **No secrets required** for the current feature set (the AI summary is
  template-based and runs offline).
