# VestryHub Super-Admin Guide

> **This is your god-mode control panel.** Only you (the platform developer) have access to this area. No church admin can see or reach these pages.

---

## How to Access

**Locally (while building):**

Your Vite dev server is confirmed running on port 8080. Use:
```
http://localhost:8080/superadmin
```

You can also reach it from other devices on your network
(e.g. testing on your phone while dev server runs on your computer):
```
http://10.255.255.254:8080/superadmin
http://172.31.193.2:8080/superadmin
```
> All three URLs point to the same local app.
> The network URLs only work when your dev server is running.

**On production (after deployment):**
```
www.vestryhub.com/superadmin
```

You will be redirected to login if you are not signed in. Once
signed in with **your account** (the one with `is_super_admin = true`
in the database), you land on the super-admin dashboard.

> **No church admin can access this area.** If someone who is not
> a super-admin types this URL, they see a 403 Forbidden page — nothing else.

---

## First-Time Setup

### The SQL Query

```sql
UPDATE users
SET is_super_admin = true
WHERE email = 'your@email.com';  replace the email from your@email.com to victornguyodev@gmail.com -> supabase email you created the account with
```

Replace `your@email.com` with the email you used to register on VestryHub. You only ever run this once per environment (once locally, once on production).

---

### When Do I Run This Query?

**The simple rule:**
```
SQL query runs AFTER the column exists in the database.
The column exists AFTER the migration runs.
The migration runs AFTER you push/deploy.
```

**DO NOT run the query while you are still building locally
and the migration has not run yet.** If the `is_super_admin`
column does not exist, the query will fail with:
```
ERROR: column "is_super_admin" does not exist
```

---

### The Full Deployment Sequence

```
WHILE BUILDING (right now):
1. Kiro builds the feature
2. You test it locally
3. You commit the changes
4. Keep building other features...
5. More commits...

WHEN YOU ARE READY TO DEPLOY (future):
6. Push to GitHub → Vercel/Railway builds it
7. Migrations run automatically on the server
   (is_super_admin column now exists in production DB)
8. Open Supabase Dashboard (app.supabase.com)
   → your project → SQL Editor
9. Run the query with your real email
10. Open www.vestryhub.com/superadmin
11. It works ✅
```

---

### Testing the Super-Admin Panel Locally (Right Now)

If you want to test `/superadmin` on your local machine
**before** deploying, you can — but you need to do it
against your **local** database, not production.

**Check 1 — Does the column exist locally?**

Go to your local Supabase dashboard (usually `localhost:54323`)
→ Table Editor → find your `users` table → look for
`is_super_admin` column.

```
Column exists?
→ YES → move to Check 2
→ NO  → tell Kiro to run the migration locally first,
         then come back to Check 2
```

**Check 2 — Does your local account have the flag?**

Go to local Supabase → SQL Editor → run:
```sql
SELECT email, is_super_admin FROM users;
```

```
Your email shows is_super_admin = true?
→ YES → go to http://localhost:8080/superadmin right now ✅
→ NO  → run the update query on localhost:54323,
         then try again
```

---

### Local vs Production — Two Separate Worlds

Think of them as completely isolated from each other:

```
LOCAL (your computer)
├── Database:  your local Supabase instance
├── URL:       http://localhost:8080/superadmin
├── SQL runs:  localhost:54323 → SQL Editor
└── Changes here NEVER affect production

PRODUCTION (live website)
├── Database:  Supabase cloud project
├── URL:       www.vestryhub.com/superadmin
├── SQL runs:  app.supabase.com → your project → SQL Editor
└── Changes here NEVER affect local
```

You will run the SQL query **twice total** across the
lifetime of VestryHub — once locally for testing, once
on production when you deploy. They are independent.

| Situation | Where to run SQL | URL to access |
|-----------|-----------------|---------------|
| Testing locally | localhost:54323 | http://localhost:8080/superadmin |
| Live production | app.supabase.com | www.vestryhub.com/superadmin |

---

### Still Building — Am I Ready to Run It?

```
Still building locally, not deployed yet?
→ Only run it locally (localhost:54323) for testing.
→ Do NOT worry about production yet.

Migration not run yet locally?
→ Ask Kiro: "Has the is_super_admin migration run?
   Does the column exist in the users table?"
→ If NO: tell Kiro to run it, then run the SQL.

Ready to go live?
→ Deploy → migrations run → run SQL on app.supabase.com
→ That is the final, permanent production setup.
```

---

## The Pages and What They Do

### `/superadmin` — Dashboard

**What you see:**
- Total churches registered on the platform
- How many are on the Free plan vs paid plans
- Pending storage upgrade requests (highlighted in amber if any)
- Platform-wide storage bar: "12.4 GB of 100 GB used"
- Recent activity feed: last 10 actions across all churches

**What you do here:**
- Get a quick health check of the whole platform
- Spot churches that need attention (storage almost full, upgrade pending)

---

### `/superadmin/churches` — All Churches

**What you see:**
- A table of every church registered on VestryHub
- Columns: Church Name | Plan | Storage Used | Members | Registered Date | Status

**What you do here:**
- View all churches at a glance
- Click a church name to see its details
- Suspend or reactivate a church if needed

---

### `/superadmin/storage-requests` — Storage Upgrades

**This is the page you will use most often.**

**What you see:**

```
┌──────────────────────────────────────────────────────┐
│  Church Hope Nairobi                                 │
│  Current Plan:    Free (200 MB)                      │
│  Requested Plan:  Pro (5 GB) — $15/mo                │
│  Requested:       2 hours ago                        │
│                                                      │
│  Storage Used:    187 MB of 200 MB (94%)             │
│                                                      │
│  [Approve Upgrade]        [Decline]                  │
└──────────────────────────────────────────────────────┘
```

**Your workflow when a church wants more storage:**

```
Step 1 — Church clicks "Request Upgrade" in their Church Media page
         and selects the plan they want (e.g. Pro at $15/mo)

Step 2 — You receive a notification:
         "Church Hope Nairobi has requested a storage upgrade"

Step 3 — You contact them (or they contact you) and agree on payment
         Accept payment via Stripe, M-Pesa, bank transfer, etc.

Step 4 — Payment received ✓

Step 5 — You open /superadmin/storage-requests in your browser

Step 6 — You find their request and click "Approve Upgrade"

Step 7 — A confirmation dialog appears:
         "Upgrade Church Hope Nairobi from Free (200 MB)
          to Pro (5 GB)? This cannot be undone."
         You click Confirm.

Step 8 — Done. In that instant:
         ✓ Their storage limit increases to 5 GB
         ✓ Their StorageBar updates automatically
         ✓ Any blocked uploads are unblocked
         ✓ They receive a notification: "Storage upgraded! 🎉"
```

**The whole approval takes about 10 seconds on your end.**

---

## Storage Plans Reference

| Plan | Storage | You Charge Churches |
|------|---------|-------------------|
| Free | 200 MB | $0/mo |
| Starter | 1 GB | $5/mo |
| Pro | 5 GB | $15/mo |
| Growth | 20 GB | $35/mo |

> You buy 100 GB from Supabase at $25/mo and resell it in chunks. This gives you healthy margin as you grow.

---

## Platform Storage Bar Explained

On your dashboard you will see something like this:

```
Platform Storage
[████████░░░░░░░░░░░░] 12.4 GB of 100 GB used (12%)
```

- **12.4 GB** = combined storage used by ALL churches on your platform
- **100 GB** = your Supabase Pro plan allocation

When this bar hits ~80%, it is time to either:
- Upgrade your own Supabase plan (to get more total storage), or
- Encourage churches to delete old unused media

---

## Who Sees What — Quick Reference

| Feature | Church Admin | You (Super-Admin) |
|---------|-------------|-------------------|
| Their church storage bar | ✅ Yes | ✅ Yes |
| Other churches' storage | ❌ No | ✅ Yes |
| Platform-wide storage | ❌ No | ✅ Yes |
| Request upgrade | ✅ Yes | ❌ N/A |
| Approve upgrade | ❌ No | ✅ Yes |
| Super-admin panel | ❌ No | ✅ Yes |
| Church features (members, announcements, etc.) | ✅ Yes | ❌ Not via superadmin |

---

## Security Notes

- The `/superadmin` URL is **not linked anywhere** in the regular app — no button, no menu item, nothing. You access it by typing it directly.
- Even if a church admin guesses the URL, the server returns 403 Forbidden — no data is exposed.
- The protection happens at two levels: the frontend redirects non-super-admins away, AND the backend API rejects requests without the super-admin flag. Both layers must be in place.
- Never share your super-admin account credentials. If you need a second super-admin (e.g. a co-founder), run the SQL update for their email separately.

---

## Quick Cheat Sheet

```
Your dev server runs on port 8080 (confirmed):
  http://localhost:8080/superadmin         → local dashboard
  http://localhost:8080/superadmin/churches        → local churches
  http://localhost:8080/superadmin/storage-requests → local storage

Your daily use on production:
  www.vestryhub.com/superadmin                    → Platform health overview
  www.vestryhub.com/superadmin/churches           → See all churches
  www.vestryhub.com/superadmin/storage-requests   → Approve paid storage upgrades

One-time setup (run AFTER migration):
  UPDATE users SET is_super_admin = true WHERE email = 'your@email.com';
  → Run on localhost:54323 for local testing
  → Run on app.supabase.com for production

Approve an upgrade:
  1. Church pays you
  2. Open /superadmin/storage-requests
  3. Find their request → click Approve
  4. Done in 10 seconds
```

---

*This guide covers the initial super-admin feature set. More sections (billing, feature flags, platform announcements) will be added as VestryHub grows.*
