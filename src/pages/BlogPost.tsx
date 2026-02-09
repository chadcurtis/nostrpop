import { useParams, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Calendar, Tag, ArrowLeft, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { NostrEvent } from '@nostrify/nostrify';
import ReactMarkdown from 'react-markdown';

export default function BlogPost() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  // Fetch the specific blog post
  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', articleId, user?.pubkey],
    queryFn: async (c) => {
      if (!articleId) return null;
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query by d tag (identifier)
      const filters = user?.pubkey
        ? [{ kinds: [30023], authors: [user.pubkey], '#d': [articleId] }]
        : [{ kinds: [30023], '#d': [articleId] }];

      const events = await nostr.query(filters, { signal });
      return events[0] || null;
    },
    enabled: !!articleId,
  });

  const getArticleTitle = (event: NostrEvent): string => {
    return event.tags.find(t => t[0] === 'title')?.[1] || 'Untitled';
  };

  const getArticleSummary = (event: NostrEvent): string => {
    return event.tags.find(t => t[0] === 'summary')?.[1] || '';
  };

  const getArticleImage = (event: NostrEvent): string | undefined => {
    return event.tags.find(t => t[0] === 'image')?.[1];
  };

  const getArticleTags = (event: NostrEvent): string[] => {
    return event.tags.filter(t => t[0] === 't').map(t => t[1]);
  };

  const getPublishedDate = (event: NostrEvent): Date => {
    const publishedAt = event.tags.find(t => t[0] === 'published_at')?.[1];
    return publishedAt ? new Date(parseInt(publishedAt) * 1000) : new Date(event.created_at * 1000);
  };

  const getSourceUrl = (event: NostrEvent): string | undefined => {
    return event.tags.find(t => t[0] === 'r')?.[1];
  };

  // Set SEO metadata
  const seoTitle = post ? getArticleTitle(post) : undefined;
  const seoSummary = post ? getArticleSummary(post) : undefined;
  const seoImage = post ? getArticleImage(post) : undefined;

  useSeoMeta({
    title: seoTitle ? `${seoTitle} - BitPopArt Blog` : 'Blog Post - BitPopArt',
    description: seoSummary || (post ? post.content.slice(0, 160) : 'Read this article on BitPopArt'),
    ogTitle: seoTitle,
    ogDescription: seoSummary,
    ogImage: seoImage,
    twitterCard: post ? 'summary_large_image' : undefined,
    twitterTitle: seoTitle,
    twitterDescription: seoSummary,
    twitterImage: seoImage,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Skeleton className="h-12 w-32 mb-8" />
          <Skeleton className="h-64 w-full mb-8 rounded-lg" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold mb-4">Article Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The article you're looking for doesn't exist or hasn't been published yet.
              </p>
              <Button onClick={() => navigate('/blog')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const title = getArticleTitle(post);
  const summary = getArticleSummary(post);
  const image = getArticleImage(post);
  const tags = getArticleTags(post);
  const publishedDate = getPublishedDate(post);
  const sourceUrl = getSourceUrl(post);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/blog')}
          className="mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Button>

        {/* Article */}
        <article>
          <Card className="overflow-hidden">
            {/* Featured Image */}
            {image && (
              <div className="w-full h-96 overflow-hidden">
                <img
                  src={image}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <CardContent className="p-8 md:p-12">
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time>{format(publishedDate, 'MMMM d, yyyy')}</time>
                </div>
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-purple-600 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Original
                  </a>
                )}
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {title}
              </h1>

              {/* Summary */}
              {summary && (
                <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                  {summary}
                </p>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator className="mb-8" />

              {/* Content */}
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <ReactMarkdown>{post.content}</ReactMarkdown>
              </div>

              <Separator className="mt-12 mb-8" />

              {/* Footer */}
              <div className="text-center">
                <Button onClick={() => navigate('/blog')} variant="outline" size="lg">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to All Posts
                </Button>
              </div>
            </CardContent>
          </Card>
        </article>
      </div>
    </div>
  );
}
