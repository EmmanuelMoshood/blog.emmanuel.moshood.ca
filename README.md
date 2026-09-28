# blog.emmanuel.moshood.ca

Emmanuel's blog about a career in DevOps, platform engineering and MLOps. It's a static site built with
[Astro](https://astro.build) and TypeScript (strict), with no UI framework: plain CSS, Markdown content, RSS and a sitemap.

- **Site:** https://blog.emmanuel.moshood.ca
- **Node:** 22 (see `.nvmrc`; Astro 7 requires Node ≥ 22.12)

## Local development

```bash
nvm use            # or install Node 22 some other way
npm install
npm run dev        # http://localhost:4321
```

| Command           | What it does                                                   |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Dev server with hot reload. **Draft posts are visible here.**  |
| `npm run build`   | Type-checks (`astro check`), then builds the static site to `dist/` |
| `npm run preview` | Serves `dist/` locally so you can check the production build   |
| `npm run check`   | Type-check `.astro`/`.ts` files and content frontmatter only   |

## Project layout

```
public/
  admin/                 # Decap CMS: index.html (loads the CMS) + config.yml
  images/uploads/        # images referenced from posts as /images/uploads/<file> (CMS uploads land here)
src/
  content.config.ts      # "blog" collection + Zod frontmatter schema
  content/blog/          # posts (.md / .mdx) — the filename is the URL slug
  components/            # BaseHead (SEO/OG), Sidebar, PostCard, PostGrid, TagList…
  layouts/               # BaseLayout, BlogPost
  lib/posts.ts           # getPosts() (drops drafts in prod), tagSlug(), readingTime()
  pages/                 # /, /blog, /blog/[slug], /tags/[tag], /about, 404, rss.xml
  styles/global.css      # all styles; CSS variables, always-light theme
functions/
  api/auth.ts            # GET /api/auth: start GitHub OAuth for Decap (Cloudflare Pages Function)
  api/callback.ts        # GET /api/callback: finish OAuth, popup handshake with the CMS
  _lib/                  # shared helpers + minimal Pages types (not routes)
.github/workflows/       # build.yml: npm ci + build on pull requests
astro.config.mjs         # site URL, sitemap, Shiki (github-light), dev rewrite for /admin
wrangler.toml            # Cloudflare Pages config (output dir, non-secret vars)
.dev.vars.example        # template for local Pages Functions env vars
```

## Customizing

The sidebar name, tagline, photo and social links live in `src/consts.ts`:

- `AVATAR`: set it to e.g. `'/images/avatar.jpg'` and add the file to `public/images/`. Until then the sidebar shows your initials.
- `SOCIAL`: fill in your LinkedIn and GitHub URLs. Empty values are hidden.

Cards use `heroImage` as their cover. Posts without one get a neutral placeholder showing their first tag.

## Writing a post

1. Create `src/content/blog/my-post-slug.md`. The filename becomes the URL: `/blog/my-post-slug/`.
2. Add frontmatter:

   ```yaml
   ---
   title: 'My post title'
   description: 'One or two sentences, used for listings, RSS and SEO/Open Graph.'
   pubDate: 2026-10-01
   updatedDate: 2026-10-05          # optional
   tags: ['kubernetes', 'mlops']    # optional, defaults to []
   heroImage: '/images/uploads/my-hero.png'  # optional; also og:image, so use PNG/JPG ~1200×630
   draft: true                      # optional, defaults to false
   ---
   ```

3. Write Markdown below it. Fenced code blocks get syntax highlighting (Shiki) (`github-light`): ` ```yaml `, ` ```bash `, ` ```ts `, ` ```python `, and so on.
4. **Images:** put files in `public/images/uploads/` and reference them with an absolute path:

   ```md
   ![Alt text describing the image](/images/uploads/my-diagram.png)
   ```

   Files in `public/` are copied as-is and are not optimized, so resize and compress them before you commit.
5. **Drafts:** `draft: true` posts appear in `npm run dev` with a "Draft" badge. Production builds leave them out of
   every listing, tag page, RSS, the sitemap and the generated routes. To publish, set `draft: false` or remove the line.

Reading time is calculated from the post body, so it doesn't go in frontmatter. The build fails if frontmatter doesn't
match the schema in `src/content.config.ts`. That's intentional.

## Editing with Decap CMS

[Decap CMS](https://decapcms.org) is a static admin at **`/admin`** (`public/admin/`). It edits the same Markdown files
in `src/content/blog/` and commits them to GitHub. The site stays fully static.

### Editing locally (no GitHub login)

`public/admin/config.yml` sets `local_backend: true`. When the CMS runs on `localhost`, it looks for a local proxy
server and uses it in place of GitHub. Run the site and the proxy side by side:

```bash
npm run dev
```

```bash
npx decap-server
```

Then open http://localhost:4321/admin and click **Login**. Changes are written straight to your working tree, so
review them with `git diff` and commit as usual.

- **Publishing mode:** plain `decap-server` only supports simple publishing, so the CMS switches from
  `editorial_workflow` to `simple` locally (the browser console says so). To try the Draft → In review → Ready board
  locally, set the environment variable `MODE=git` before starting `decap-server`. That creates local `cms/…` branches.
- **On the live site:** `local_backend` is ignored. Locally, if `decap-server` isn't running, the CMS falls back to
  GitHub login.

### Production

At https://blog.emmanuel.moshood.ca/admin the CMS uses the GitHub backend with the editorial workflow. Each post
becomes a `cms/blog/<slug>` branch and pull request, and publishing merges it into `main`, which triggers a deploy.

GitHub login uses two Cloudflare Pages Functions in this repo. There's no separate Worker and no dependencies:

| Route           | File                        | What it does                                                                                   |
| --------------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| `/api/auth`     | `functions/api/auth.ts`     | Sets a random `state` in a 10-minute HttpOnly, Secure, SameSite=Lax cookie, then redirects to GitHub's consent screen |
| `/api/callback` | `functions/api/callback.ts` | Checks `state` against the cookie, exchanges the code for a token, and hands it to the CMS    |

The callback page does Decap's popup handshake: it posts `authorizing:github`, waits for the CMS window to reply, then
sends `authorization:github:success:{"token":…,"provider":"github"}` (or `…:error:{"message":…}`) to that window's
origin. It only releases a token when the reply comes from the window that opened it **and** from the site's own origin.
Without that check, another website could open `/api/auth` and collect the token of anyone who had already authorized
the app. As a result, the CMS login works from `https://blog.emmanuel.moshood.ca/admin` only, not from `*.pages.dev`
preview URLs.

#### One-time setup

1. **Create a GitHub OAuth App:** GitHub → Settings → Developer settings → OAuth Apps → *New OAuth App*.
   - Homepage URL: `https://blog.emmanuel.moshood.ca`
   - Authorization callback URL: `https://blog.emmanuel.moshood.ca/api/callback`

   Then copy the **Client ID** and generate a **client secret**.
2. **Set the environment variables** on the Cloudflare Pages project (production). Set both credentials as
   encrypted secrets, either in the dashboard (*Settings → Variables and Secrets → Add → Encrypt*) or with wrangler:

   ```bash
   npx wrangler pages secret put GITHUB_CLIENT_ID --project-name blog-emmanuel-moshood
   ```

   ```bash
   npx wrangler pages secret put GITHUB_CLIENT_SECRET --project-name blog-emmanuel-moshood
   ```

   | Variable               | Required | Where it lives                  | Value                                                        |
   | ---------------------- | -------- | ------------------------------- | ------------------------------------------------------------ |
   | `GITHUB_CLIENT_ID`     | yes      | Pages secret                    | OAuth App client ID                                          |
   | `GITHUB_CLIENT_SECRET` | yes      | Pages secret (**never commit**) | OAuth App client secret                                      |
   | `GITHUB_SCOPE`         | no       | `wrangler.toml` `[vars]`        | `public_repo` (default) for a public repo, or `repo` if the repo is private |

   Because the repo has a `wrangler.toml`, Pages takes plain (non-secret) variables from its `[vars]` section, not
   from the dashboard. Change `GITHUB_SCOPE` there. Secrets are unaffected.
3. **Redeploy** so the functions pick up the new variables, then open `/admin` and choose *Login with GitHub*.

#### Testing the functions locally (optional)

Everyday local editing uses `decap-server` (see above) and needs none of this. To exercise the real OAuth flow on
your machine, create a second OAuth App with the callback URL `http://localhost:8788/api/callback`, copy
`.dev.vars.example` to `.dev.vars` (gitignored), and fill in that app's credentials. Then run:

```bash
npm run build
```

```bash
npx wrangler pages dev
```

That serves `dist/` plus the functions on http://localhost:8788.

### Keeping the CMS and the schema in sync

The fields in `public/admin/config.yml` mirror the Zod schema in `src/content.config.ts`. If you change one, change the
other.

- **Dates:** stored as date-only (`YYYY-MM-DD`). The site renders dates in UTC, and Decap's default (local time plus
  an offset) would show an evening post on the next day.
- **Cleared fields:** when you clear an optional field, Decap writes `""` instead of leaving it out. The schema treats
  `""` and `null` as "not set", so those posts still validate.

## Continuous integration

`.github/workflows/build.yml` runs `npm ci && npm run build` on every pull request to `main`, including the PRs that
Decap's editorial workflow opens. The build includes `astro check` and schema validation of every post, drafts
included, so broken frontmatter, a bad date or a type error fails the check before anything is merged. To enforce
that, turn on branch protection for `main` (*Settings → Branches*) and require the **Type-check and build** check.

The workflow only builds. It never deploys.

## Deploy

The site deploys to **Cloudflare Pages**, which builds and deploys on every push to `main` and makes a preview for
other branches. Pages is also what runs the OAuth functions in `functions/`. Deploys aren't handled by GitHub Actions.

Canonical URLs, RSS and the sitemap all use `site` in `astro.config.mjs`. Update it if the domain ever changes.

**First-time setup:**

1. Cloudflare dashboard → *Workers & Pages → Create → Pages → Connect to Git* → pick this repo. Name the project
   `blog-emmanuel-moshood`, the same as `name` in `wrangler.toml`.
2. Build settings:
   - Framework preset: *Astro*
   - Build command: `npm run build`
   - Build output directory: `dist` (also set as `pages_build_output_dir` in `wrangler.toml`)
   - Node version comes from `.nvmrc` (22). If your build image ignores it, set the `NODE_VERSION=22` build variable.
3. Add the OAuth secrets from [One-time setup](#one-time-setup) above.
4. *Custom domains* → add `blog.emmanuel.moshood.ca`.

After the first deploy, check `/rss.xml`, `/sitemap-index.xml` and `/admin`, and submit the sitemap in Google Search
Console.
