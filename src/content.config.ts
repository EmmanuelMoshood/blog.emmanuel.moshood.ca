import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Decap CMS writes "" (not nothing) when an optional field is cleared.
// Treat "" and null as "not set" so those posts still validate.
const unset = (value: unknown) => (value === '' || value === null ? undefined : value);

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  // Keep in sync with the Decap CMS fields in public/admin/config.yml.
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.preprocess(unset, z.coerce.date().optional()),
    tags: z.preprocess(unset, z.array(z.string()).default([])),
    // A path such as /images/uploads/foo.png (served from public/) or a full URL.
    heroImage: z.preprocess(unset, z.string().optional()),
    draft: z.preprocess(unset, z.boolean().default(false)),
  }),
});

export const collections = { blog };
