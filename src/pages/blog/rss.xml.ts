import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../../config';
import { getPublishedPosts } from '../../lib/blog';

export async function GET(context: APIContext) {
  const posts = (await getPublishedPosts()).filter((post) => !post.data.draft);

  return rss({
    title: `${SITE.name} Blog`,
    description: `${SITE.name} の技術ブログ`,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: `/blog/${post.id}/`,
    })),
    customData: '<language>ja</language>',
  });
}
