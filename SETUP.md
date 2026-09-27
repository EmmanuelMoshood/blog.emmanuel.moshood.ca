# Setup & deployment guide

Everything here is free on Cloudflare's free tier (D1, R2, and Pages all have
generous free allowances) plus whatever you're already paying for your
domain.

## 0. Prerequisites

- A Cloudflare account (free) — https://dash.cloudflare.com/sign-up
- Your domain's DNS already on Cloudflare (or at least able to add a CNAME)
- Node.js 20+ and `npm` on your own machine
- `npm install -g wrangler` (Cloudflare's CLI), then `wrangler login`

## 1. Create the D1 database

```bash
cd blog-app
npx wrangler d1 create blog-db
```

This prints a `database_id`. Copy it into **both**
`apps/public/wrangler.toml` and `apps/admin/wrangler.toml`, replacing
`REPLACE_WITH_YOUR_D1_DATABASE_ID`.

Then apply the schema:

```bash
npx wrangler d1 execute emm-blog-db --remote --file=./cloudflare/schema.sql
```

If your database predates the byline columns, also apply the migration (new
databases created from `schema.sql` above already have them):

```bash
npx wrangler d1 execute emm-blog-db --remote --file=./cloudflare/migrations/0001_add_author.sql
```

## 2. Create the R2 bucket (for cover images / screenshots)

```bash
npx wrangler r2 bucket create emm-blog-post-images
```

In the Cloudflare dashboard: **R2 → emm-blog-post-images → Settings → Public
Access → Allow Access**. Cloudflare gives you a public `https://pub-XXXX.r2.dev`
URL — copy it into `apps/admin/wrangler.toml` as `R2_PUBLIC_BASE_URL`.

(Optional, nicer URLs later: map a custom domain like `images.yourdomain.com`
to the bucket instead of the `r2.dev` URL.)

## 3. Install dependencies

```bash
npm install
```

Run this on your own machine (this step needs full npm registry access).

## 4. Local development

```bash
cp apps/public/.env.example apps/public/.env
cp apps/admin/.env.example apps/admin/.dev.vars
# edit apps/admin/.dev.vars and set a real ADMIN_PASSWORD
```

Local dev uses a local D1 emulator (via wrangler) rather than your real
database, so it's safe to experiment. Both apps' `astro.config.mjs` point
their emulator state at the same shared folder — `<repo root>/.wrangler/state/`
— so a post written in the local admin app immediately shows up on the local
public site too, just like production.

That local database starts out empty, so apply the schema to it once before
starting the dev servers — otherwise the site fails with
`D1_ERROR: no such table: posts`. Run this from either app directory (it
writes to the shared folder either way):

```bash
(cd apps/admin && npx wrangler d1 execute emm-blog-db --local --persist-to ../../.wrangler/state --file=../../cloudflare/schema.sql)
```

To inspect or query the shared local database directly, use the same
`--persist-to ../../.wrangler/state` flag from either app directory — without
it, `wrangler d1 execute --local` falls back to a private, empty database
scoped to whichever app directory you ran it from. To preview real content
locally instead of local test data, point at the remote database
(`--remote`), or just deploy.

```bash
npm run dev:public   # http://localhost:4321
npm run dev:admin    # http://localhost:4322
```

## 5. Deploy both sites to Cloudflare Pages

From the repo root:

```bash
npm run build:public
npx wrangler pages deploy apps/public/dist --project-name=blog-public

npm run build:admin
npx wrangler pages deploy apps/admin/dist --project-name=blog-admin
```

The first deploy of each will ask to create the Pages project — say yes.

### Set the admin password as a secret (don't put it in wrangler.toml)

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name=blog-admin
```

### Bind D1 and R2 to each Pages project

Cloudflare Pages needs bindings configured in the dashboard too (the
`wrangler.toml` file configures local dev; production bindings for Pages are
set under **Pages project → Settings → Functions**):

- **blog-public** project → Functions → D1 database bindings → add `DB` →
  `blog-db`
- **blog-admin** project → Functions → D1 database bindings → add `DB` →
  `blog-db`; R2 bucket bindings → add `IMAGES` → `blog-post-images`;
  Environment variables → add `R2_PUBLIC_BASE_URL` (the `r2.dev` URL from
  step 2)

## 6. Point your subdomains

In your Cloudflare DNS (or Pages dashboard → Custom domains):

- **blog-public** project → Custom domains → add `blog.yourdomain.com`
- **blog-admin** project → Custom domains → add `admin.yourdomain.com`

Cloudflare handles the CNAME + HTTPS certificate automatically once you add
these as custom domains on each Pages project.

## 7. (Strongly recommended) Add Cloudflare Access as a second lock on the door

The admin app already requires your password (step 5). For a free extra
layer — so bots hammering `admin.yourdomain.com` never even reach your
login page — put the whole subdomain behind Cloudflare Access:

1. Cloudflare dashboard → **Zero Trust → Access → Applications → Add an
   application → Self-hosted**
2. Domain: `admin.yourdomain.com`
3. Policy: **Allow** → Include → **Emails** → your own email address only
4. Save

Now visiting `admin.yourdomain.com` first asks for a one-time code sent to
your email, *then* your app's own password screen. Free for up to 50 users.

## 8. Writing posts

Go to `admin.yourdomain.com` → log in → **New post**. Fill in a title,
optional custom slug, excerpt, byline (author name + optional link), tags
(comma-separated), an optional cover image/screenshot, and the body in
Markdown. Leave "Published" unchecked to save it as a draft only visible in
the admin dashboard; check it to make it live on `blog.yourdomain.com`
immediately.

The published post renders with a byline reading
`By <author> • <date> • <N> min read`. Leave the author blank to use the site
default, and note that read time is calculated from the content — there's no
field for it. The first paragraph gets a drop cap, so open with a short line
rather than a heading; `##` headings, bullet lists, `code`, **bold**, and
links all render as you'd expect.

## Ongoing costs

At personal-blog scale (a handful of posts, modest traffic) you will stay
entirely inside:

- **Pages**: unlimited requests/bandwidth on the free tier
- **D1**: 5GB storage, 5M rows read/day free
- **R2**: 10GB storage, no egress fees, free tier covers casual image hosting

If you ever wildly exceed these, Cloudflare's paid tiers are still
inexpensive — but you're very unlikely to for a personal blog.
