# Bedtime Stories — full setup guide

Follow these in order. Steps 1–4 give you a working app locally (story
generation + Google sign-in + admin CRM). Step 5 is only needed to actually
test/take payments.

## 0. Install & run

```bash
npm install
npm run dev
```
Opens at http://localhost:5173. It will run, but sign-in/story generation/admin
won't work until the keys below are filled into `.env` (copy `.env.example` to
`.env` if you haven't already).

## 1. Anthropic API key (story generation)

1. Go to https://console.anthropic.com → **API Keys** → Create Key.
2. Put it in `.env`:
   ```
   VITE_ANTHROPIC_API_KEY=sk-ant-...
   ```

## 2. Google OAuth Client ID (sign-in)

1. Go to https://console.cloud.google.com → create/select a project.
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (dev)
   - your production URL once you have one (e.g. `https://yourapp.vercel.app`)
5. Create it, copy the **Client ID** (looks like `xxxx.apps.googleusercontent.com`).
6. Put it in `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   ```

## 3. Supabase (accounts, credits, admin CRM)

This is the real backend — without it there are no cross-device accounts, no
admin page, and no CRM.

1. Go to https://supabase.com/dashboard → **New project**. Pick any name/region,
   set a database password (you won't need it day-to-day).
2. Once it's ready: **Project Settings → API**. Copy two values into `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...   (the "anon public" key)
   ```
3. On the same page, copy the **`service_role`** key (marked secret) into `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
   Never put this one behind `VITE_` — it must never reach the browser.
4. **Authentication → Sign In / Providers → Google**: toggle it on, and under
   "Authorized Client IDs" paste the *same* Google Client ID from step 2. This
   lets the app hand Google's sign-in token straight to Supabase.
5. **SQL Editor → New query**: open [`supabase/schema.sql`](supabase/schema.sql)
   from this repo, paste its full contents, and click **Run**. This creates
   every table, security policy, and function the app needs. Safe to re-run.
   - By default, `claudeonly0607@gmail.com` is auto-flagged as admin the
     moment that account first signs in. To use a different email, edit the
     line `(new.email = 'claudeonly0607@gmail.com')` inside the
     `handle_new_user()` function in that file *before* running it — or run
     this afterward for any account already created:
     ```sql
     update public.profiles set is_admin = true where email = 'you@example.com';
     ```
6. Restart `npm run dev` (Vite needs a restart to pick up new `.env` values),
   sign in with Google in the app, and check **Table Editor → profiles** in
   Supabase — you should see your row with `credits = 3`. If that email
   matches step 5, you'll also see an "Admin" link in the app's nav.

## 4. Razorpay (selling credit packs)

1. Go to https://dashboard.razorpay.com → **Settings → API Keys** → Generate
   Test/Live keys.
2. Put the **Key ID** in `.env` twice (client-visible + server-side — same
   value, different var names) and the **Key Secret** once (server-only):
   ```
   VITE_RAZORPAY_KEY_ID=rzp_test_xxxx
   RAZORPAY_KEY_ID=rzp_test_xxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxx
   ```

## 5. Testing payments locally

`api/create-order.js` and `api/verify-payment.js` are **Vercel serverless
functions** — plain `vite dev` does not run them. To exercise the buy-credits
flow locally you need the Vercel CLI:

```bash
npm i -g vercel
vercel dev
```
(first run will ask you to link/create a Vercel project — any answers are fine
for local testing). It reads the same `.env` file.

Otherwise, just deploy (next section) and test there.

## 6. Deploying (Vercel)

```bash
npm i -g vercel   # if not already installed
vercel
```
Then, in the Vercel dashboard for the new project → **Settings →
Environment Variables**, add every variable from your `.env` file (all of
them — both the `VITE_`-prefixed ones and the server-only ones). Redeploy
after adding them. Also add the deployed URL to the Google OAuth "Authorized
JavaScript origins" (step 2.4).

## Quick reference — where each key is used

| Variable | Used by |
|---|---|
| `VITE_ANTHROPIC_API_KEY` | Browser → Claude API (story text) |
| `VITE_GOOGLE_CLIENT_ID` | Browser → Google Sign-In |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Browser + `api/*.js` → Supabase (accounts/credits/CRM) |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/verify-payment.js` only (credits a user after a verified payment) |
| `VITE_RAZORPAY_KEY_ID` | Browser → Razorpay checkout widget |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | `api/create-order.js`, `api/verify-payment.js` |

## Making someone else an admin later

```sql
update public.profiles set is_admin = true where email = 'someone@example.com';
```
Run in Supabase's SQL Editor. They need to have signed in at least once first
(so their `profiles` row exists).
