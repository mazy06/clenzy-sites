import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveSiteByHost, listPosts } from '@/lib/api';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  const title = site ? `Blog — ${site.name}` : 'Blog';
  return { title, alternates: { canonical: '/blog' } };
}

export default async function BlogIndex() {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site) notFound();
  const posts = await listPosts(site.id);
  return (
    <div className="bkly-blog">
      <h1 className="bkly-blog__title">Blog</h1>
      <ul className="bkly-blog__list">
        {posts.map((p) => (
          <li key={p.slug} className="bkly-blog__item">
            <Link href={`/blog/${p.slug}`}>
              <h2>{p.title}</h2>
              {p.excerpt ? <p>{p.excerpt}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
