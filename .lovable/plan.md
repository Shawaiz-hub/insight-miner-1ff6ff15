# Backend config, resilient health checks, and Team Management

## 1. Fix the CORS failure (root cause is backend-side)

The browser error is not a frontend bug: the Databricks app does not return
`Access-Control-Allow-Origin` for `https://advance-data-mining.vercel.app`.
`backend/forecast/app.yaml` currently sets `FRONTEND_URL` to the Vercel origin, so
the deployed app is running an older config or the env var was not applied.

Work:
- Keep `FRONTEND_URL=https://advance-data-mining.vercel.app` and add the Lovable
  preview/published origins to `CORS_ORIGINS` in `app.yaml`.
- Make the CORS allow-list tolerant: strip trailing slashes, allow all
  `*.vercel.app` preview origins via regex, and log the effective list at startup.
- Frontend: treat a CORS/network failure as "unreachable" instead of an error
  spam loop (see retries below) and show a clear hint in the admin panel that
  `FRONTEND_URL` must match the requesting origin.

The final fix requires re-deploying the Databricks app with the updated
`app.yaml` — the checklist page below makes that explicit.

## 2. Deprecated meta tag

`index.html`: add `<meta name="mobile-web-app-capable" content="yes">` alongside
the legacy Apple tag.

## 3. Admin-editable backend URL (runtime override)

- Store the URL under a new public setting key `backend_config`
  (`{ apiBaseUrl, forecastApiUrl }`) so the whole app — not just admins — reads it.
- Migration: extend the public-read policy on `site_settings` to include
  `backend_config`.
- New `src/lib/backendConfig.ts`: resolves the effective base URL as
  saved setting -> env var -> production default, normalised without trailing
  slashes, cached in memory + localStorage for instant boot.
- `src/config/api.ts` endpoint builders become functions that use the resolved
  base, so changing the URL in admin takes effect without a rebuild.
- Admin Settings gains a "Backend Endpoints" card showing the exact resolved
  `VITE_API_BASE_URL` and `VITE_FORECAST_API_URL` values (env value, saved
  override, effective value) with copy buttons, plus editable inputs for both.

## 4. Health check with exponential backoff

`src/config/api.ts` / new `useBackendHealth` hook:
- Retry on failure with delays 1s, 2s, 4s, 8s (max 4 attempts, jittered).
- Status stays `checking` during retries and only becomes `disconnected` after
  all attempts fail; a single success resets the counter to `connected`.
- Expose `attempt`, `lastError`, and manual `retry()` for the admin UI.

## 5. Databricks deployment checklist page

New `/admin/deployment` page listing pass/fail checks:
- `/api/health` reachable from the current origin (detects CORS separately from
  network failure)
- `FRONTEND_URL` reported by the health payload equals
  `https://advance-data-mining.vercel.app`
- Forecast service health + model list
- Resolved API base / forecast base printed verbatim
- Copy-ready `app.yaml` env block and deploy commands
The backend `/api/health` payload is extended with `frontendUrl` and
`corsOrigins` so the page can verify configuration instead of guessing.

## 6. Team Management

Database (migration, with GRANTs + RLS):
- `team_members`: image_url, full_name, role, short_bio, description, email,
  phone, location, department, experience, education, skills (text[]),
  linkedin_url, github_url, portfolio_url, facebook_url, instagram_url,
  display_order, is_featured, is_active, timestamps.
- Public `SELECT` where `is_active = true`; admin-only full access.
- Public storage bucket `team-images` with admin-only write policies.

Admin `/admin/team`:
- Table (order, avatar, name, role, status, actions) with drag-and-drop
  reordering that persists `display_order`.
- Add/Edit dialog with every field above, image upload (preview, replace,
  delete, client-side resize to 800x800 and compression to WebP/JPEG).
- Activate/Deactivate, Preview, Delete.
- Sidebar link added.

Homepage:
- New `TeamSection` registered as a `home_sections` type (`team`) so it can be
  reordered/disabled from Admin > Homepage Sections.
- Cards: 4 per row desktop / 2 tablet / 1 mobile, image hover zoom, card lift,
  animated social icons, fade-slide on scroll, skills chips, "View Profile".
- Profile modal: large image, name, role, bio, skills, experience, education,
  department/location, social links. No Twitter/X icon (per project rule).

## 7. More settings features

Admin Settings gets grouped cards:
- General (site name, description, contact email, default OG image)
- Backend endpoints + health (section 3/4)
- SEO defaults (meta title suffix, default description, robots toggle)
- Feature flags (blog, forecasting, team section on/off)
- Maintenance mode banner text
- Footer links (existing) + copyright text
All persisted under `general_settings`, with public flags mirrored into a
publicly readable key so the site can honour them.

## Technical notes

- No changes to `src/integrations/supabase/client.ts` or auth flow.
- Existing forecasting/mining logic untouched; only URL resolution changes.
- Team images optimised in the browser before upload to keep storage small.
