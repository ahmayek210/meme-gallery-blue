# blup galeri

Turkish, private-circle meme gallery. The static frontend deploys to GitHub Pages; a Neon Function is the sole API boundary for PostgreSQL and Object Storage.

## Deploy

1. Install / sign into the official CLI: `npx neon@latest login`, then initialize `npx neon@latest init --project-name meme-gallery-v2 --region-id aws-eu-central-1 --services functions,object-storage`.
2. Apply `migrations/001_initial.sql` using the generated pooled `DATABASE_URL`.
3. Set the Function environment: `MANAGEMENT_PASSWORD_HASH` is SHA-256 of `blupsilsunublup` concatenated with a random `SESSION_SECRET`; also set `SESSION_SECRET`, `ALLOWED_ORIGIN`, and the Neon Object Storage values used by the Function.
4. Deploy the backend with `npx neon@latest deploy`. Put the resulting HTTPS Function URL into repository Actions variable `VITE_API_URL`, enable GitHub Pages with source **GitHub Actions**, then push main.

The password itself is never committed or sent to GitHub Pages. Change `SESSION_SECRET` and delete `management_sessions` to revoke all devices.
