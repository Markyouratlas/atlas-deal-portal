# Atlas Channel Partner Deal Portal — Deployment Guide

Live URL: `deals.youratlas.com`

---

## Step 1 — Supabase: Create a new project (2 min)

1. Go to **https://supabase.com/dashboard**
2. Click **New Project** (or use an existing one)
3. Name it `atlas-deal-portal`, pick a strong DB password, choose a region close to your users
4. Wait ~60 seconds for it to spin up

### Run the database migration

5. In the sidebar click **SQL Editor** → **New Query**
6. Open `supabase-migration.sql` from this folder in any text editor
7. Copy ALL the contents, paste into the SQL editor
8. Click **Run**
9. You should see **"Success. No rows returned."**

### Grab your API keys

10. Sidebar → **Settings** → **API** (under Configuration)
11. Copy these two values — you'll need them for Vercel:
    - **Project URL** → looks like `https://abcdefg.supabase.co`
    - **anon / public key** → the long `eyJ...` string

### Disable email confirmation (recommended for now)

12. Sidebar → **Authentication** → **Providers** → **Email**
13. Toggle OFF **"Confirm email"** (you can turn this back on later)
14. This lets you sign up and immediately use the portal without checking email

---

## Step 2 — GitHub: Push the code (2 min)

1. Go to **https://github.com/new**
2. Name: `atlas-deal-portal`, Private, click **Create repository**
3. On the next page, click **"uploading an existing file"**
4. Drag in ALL the files/folders from this zip:
   - `src/` folder (with all subfolders)
   - `public/` folder
   - `index.html`
   - `package.json`
   - `vite.config.js`
   - `tailwind.config.js`
   - `postcss.config.js`
   - `.gitignore`
   - `.env.example`
   - `supabase-migration.sql`
5. Commit message: `Initial deploy`
6. Click **Commit changes**

---

## Step 3 — Vercel: Deploy (2 min)

1. Go to **https://vercel.com/new**
2. Click **Import** next to `atlas-deal-portal`
3. **Framework Preset**: should auto-detect **Vite** — if not, select it
4. Expand **Environment Variables** and add these two:

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_ID.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJ...your-anon-key...` |

5. Click **Deploy**
6. Wait ~90 seconds for the build to go green
7. Click **Visit** to verify it loads (you'll see the login screen with the aurora effect)

---

## Step 4 — Namecheap: Connect `deals.youratlas.com` (3 min)

1. In **Vercel**: go to your project → **Settings** → **Domains**
2. Type `deals.youratlas.com` and click **Add**
3. Vercel will show you a CNAME record to create

4. In **Namecheap**: go to **Domain List** → `youratlas.com` → **Manage** → **Advanced DNS**
5. Click **Add New Record**:
   - **Type:** CNAME Record
   - **Host:** `deals`
   - **Value:** `cname.vercel-dns.com.`
   - **TTL:** Automatic
6. Save. Wait 5–30 minutes for DNS propagation
7. Back in Vercel, the domain should show a green checkmark + SSL auto-provisions

---

## Step 5 — Create your admin account (1 min)

1. Go to `deals.youratlas.com`
2. Click **Create Account** and sign up with Heather's email (or yours for testing)
3. You'll be logged in as a **partner** by default
4. Go back to **Supabase** → **SQL Editor** → New Query:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'heather@youratlas.com';
```

5. Click **Run**
6. Refresh the portal — you'll now see the **Admin Pipeline** view

For additional admins, run the same UPDATE with their email.

---

## How it works

- **Partners** sign up → register deals → see their own pipeline
- **Admins** see ALL deals → update status → add notes → book demos
- **Real-time**: both dashboards auto-update via Supabase subscriptions
- **Qualification flags**: green/red auto-calculated based on Heather's criteria
  - Call volume ≥ 50/week → green
  - Doesn't connect 100% 24/7 → green (Atlas can help)
  - Avg value ≥ $1,000 → green

---

## Files in this project

```
atlas-deal-portal/
├── public/
│   ├── favicon.png          ← Atlas bolt icon
│   ├── logo-color.svg       ← Purple Atlas logo
│   └── logo-white.svg       ← White Atlas logo (login screen)
├── src/
│   ├── components/
│   │   ├── AdminDashboard.jsx
│   │   ├── AuthScreen.jsx
│   │   ├── DealDetail.jsx
│   │   ├── DealForm.jsx
│   │   ├── NotificationSettings.jsx
│   │   ├── PartnerDashboard.jsx
│   │   ├── Sidebar.jsx
│   │   └── UI.jsx
│   ├── lib/
│   │   ├── constants.js
│   │   └── supabase.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── .gitignore
└── supabase-migration.sql
```
