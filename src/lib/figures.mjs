/**
 * Sätteri hast plugin (Astro 7's default Markdown processor): turn images that
 * sit on their own line into <figure> elements with an optional <figcaption>.
 * No dependencies.
 *
 * Two ways to write a caption:
 *
 *   1. Image title (what Decap CMS's image button writes):
 *        ![Alt text](/images/uploads/shot.png "Caption text")
 *
 *   2. An italic paragraph directly below the image, which can contain Markdown
 *      such as `code`, **bold** or links:
 *        ![Alt text](/images/uploads/shot.png)
 *        *Caption with `inline code` and a [link](https://example.com).*
 *
 * Images inside a sentence are left inline. Every image gets
 * loading="lazy" and decoding="async".
 */

/** @param {any} node */
const isBlank = (node) => node?.type === 'text' && !String(node.value ?? '').trim();

/** Non-whitespace children of an element. @param {any} node */
const content = (node) => (node?.children ?? []).filter((/** @type {any} */ child) => !isBlank(child));

/** The element if `node` is a `tagName` element. @param {any} node @param {string} tagName */
const isElement = (node, tagName) => node?.type === 'element' && node.tagName === tagName;

/** The single child if `node` is a <p> containing exactly one `tagName` element. @param {any} node @param {string} tagName */
function soleChild(node, tagName) {
  if (!isElement(node, 'p')) return undefined;
  const kids = content(node);
  return kids.length === 1 && isElement(kids[0], tagName) ? kids[0] : undefined;
}

/** @type {{ name: string, element: { filter: string[], visit: (node: any, ctx: any) => void } }} */
const figures = {
  name: 'figures',
  element: {
    filter: ['p', 'img'],
    visit(node, ctx) {
      if (node.tagName === 'img') {
        ctx.setProperty(node, 'loading', 'lazy');
        ctx.setProperty(node, 'decoding', 'async');
        return;
      }

      const kids = content(node);
      const img = kids.length >= 1 && kids.length <= 2 && isElement(kids[0], 'img') ? kids[0] : undefined;
      if (!img) return;

      /** @type {any[] | undefined} */
      let caption;
      if (kids.length === 2) {
        // Image with *caption* on the very next line: both land in one paragraph.
        if (!isElement(kids[1], 'em')) return;
        caption = kids[1].children;
      } else {
        // Image alone; caption from an italic-only paragraph right after it…
        const siblings = ctx.parent(node)?.children ?? [];
        let next;
        for (let i = (ctx.indexOf(node) ?? -1) + 1; i < siblings.length; i++) {
          if (!isBlank(siblings[i])) {
            next = siblings[i];
            break;
          }
        }
        const em = soleChild(next, 'em');
        if (em) {
          caption = em.children;
          ctx.removeNode(next);
        }
      }

      const { title, ...props } = img.properties ?? {};
      if (!caption && title) {
        // …or from the image title.
        caption = [{ type: 'text', value: String(title) }];
      }

      const image = {
        type: 'element',
        tagName: 'img',
        // Keep the title as a tooltip only when it isn't already the caption.
        properties: { ...props, ...(title && !caption ? { title } : {}), loading: 'lazy', decoding: 'async' },
        children: [],
      };
      ctx.replaceNode(node, {
        type: 'element',
        tagName: 'figure',
        properties: {},
        children: caption
          ? [image, { type: 'element', tagName: 'figcaption', properties: {}, children: caption }]
          : [image],
      });
    },
  },
};

export default figures;
