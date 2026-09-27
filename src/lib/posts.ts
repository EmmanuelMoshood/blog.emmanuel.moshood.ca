import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/**
 * All posts, newest first. Drafts are visible in `astro dev` but excluded
 * from production builds (listings, RSS, sitemap and static paths all use this).
 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => !(import.meta.env.PROD && data.draft));
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const WORDS_PER_MINUTE = 220;

export function readingTime(body: string | undefined): string {
  const text = (body ?? '')
    .replace(/```[\s\S]*?```/g, ' ') // code blocks are skimmed, not read
    .replace(/<[^>]+>/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');
  const words = text.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
}
