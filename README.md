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
  images/uploads/        # images referenced from posts as /images/uploads/<file>
src/
  content.config.ts      # "blog" collection + Zod frontmatter schema
  content/blog/          # posts (.md / .mdx) — the filename is the URL slug
  components/            # BaseHead (SEO/OG), Sidebar, PostCard, PostGrid, TagList…
  layouts/               # BaseLayout, BlogPost
  lib/posts.ts           # getPosts() (drops drafts in prod), tagSlug(), readingTime()
  pages/                 # /, /blog, /blog/[slug], /tags/[tag], /about, 404, rss.xml
  styles/global.css      # all styles; CSS variables, always-light theme
astro.config.mjs         # site URL, sitemap, Shiki (github-light)
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

## Deploy

The output is a fully static site in `dist/`, so any static host works. Canonical URLs, RSS and the sitemap all use
`site` in `astro.config.mjs`; update it if the domain ever changes.

**Build settings (any host):**

- Build command: `npm run build`
- Output directory: `dist`
- Node version: `22` (most hosts read `.nvmrc`; otherwise set `NODE_VERSION=22`)

**Cloudflare Pages:** connect the Git repo, choose the *Astro* preset (or use the settings above), then add
`blog.emmanuel.moshood.ca` under *Custom domains*. You can also deploy by hand:

```bash
npm run build
npx wrangler pages deploy dist --project-name=blog-emmanuel
```

**Netlify / Vercel / GitHub Pages** work too, with the same build command and output directory. For GitHub Pages, use
the official `withastro/action` workflow and add a `public/CNAME` containing `blog.emmanuel.moshood.ca`.

After the first deploy, check `/rss.xml` and `/sitemap-index.xml`, and submit the sitemap in Google Search Console.
