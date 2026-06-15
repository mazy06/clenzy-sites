import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveSiteByHost, getPost } from '@/lib/api';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site) return {};
  const post = await getPost(site.id, params.slug, site.defaultLocale);
  if (!post) return {};
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || undefined;
  const ogImage = post.seoOgImageUrl || post.coverImageUrl || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title, description, type: 'article',
      images: ogImage ? [ogImage] : undefined,
      publishedTime: post.publishedAt ?? undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site) notFound();
  const post = await getPost(site.id, params.slug, site.defaultLocale);
  if (!post) notFound();

  // TODO SEO (P1.2) : ajouter le JSON-LD schema.org/Article via une injection <script> revue
  // (contenu JSON contrôlé + échappement `<` → `<`). Le SEO de base (title/meta/OG) est porté
  // par generateMetadata ci-dessus.
  const published = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('fr-FR') : null;

  return (
    <article className="bkly-article">
      <h1>{post.title}</h1>
      {published ? <div className="bkly-article__meta">{published}</div> : null}
      <div className="bkly-article__body">{post.body}</div>
    </article>
  );
}
