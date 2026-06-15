import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { resolveSiteByHost, getPost } from '@/lib/api';
import { renderMarkdown } from '@/lib/markdown';
import { JsonLd, buildAlternates, resolveLocale, articleSchema } from '@/lib/seo';

export const revalidate = 300;

type SearchParams = { [key: string]: string | string[] | undefined };

export async function generateMetadata(
  { params, searchParams }: { params: { slug: string }; searchParams: SearchParams },
): Promise<Metadata> {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site) return {};
  const locale = resolveLocale(site, searchParams.lang);
  const post = await getPost(site.id, params.slug, locale);
  if (!post) return {};
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || undefined;
  const ogImage = post.seoOgImageUrl || post.coverImageUrl || undefined;
  return {
    title,
    description,
    alternates: buildAlternates(`/blog/${post.slug}`, site, locale),
    openGraph: {
      title, description, type: 'article',
      images: ogImage ? [ogImage] : undefined,
      publishedTime: post.publishedAt ?? undefined,
    },
  };
}

export default async function ArticlePage(
  { params, searchParams }: { params: { slug: string }; searchParams: SearchParams },
) {
  const host = headers().get('host') ?? '';
  const site = await resolveSiteByHost(host);
  if (!site) notFound();
  const locale = resolveLocale(site, searchParams.lang);
  const post = await getPost(site.id, params.slug, locale);
  if (!post) notFound();

  const published = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('fr-FR') : null;

  return (
    <article className="bkly-article">
      <JsonLd data={articleSchema(site, post, `https://${host}/blog/${post.slug}`)} />
      <h1>{post.title}</h1>
      {published ? <div className="bkly-article__meta">{published}</div> : null}
      <div className="bkly-article__body">{renderMarkdown(post.body)}</div>
    </article>
  );
}
