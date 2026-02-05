import { useSeoMeta } from '@unhead/react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Tag, ArrowRight, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import type { NostrEvent } from '@nostrify/nostrify';

export default function Blog() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  useSeoMeta({
    title: 'News - BitPopArt',
    description: 'Read latest news and insights from BitPopArt on Bitcoin, art, and creativity',
  });

  // Fetch all blog posts (kind 30023)
  const { data: blogPosts = [], isLoading } = useQuery({
    queryKey: ['blog-posts-public', user?.pubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // If user is logged in, show their posts, otherwise show from specific authors
      const filters = user?.pubkey
        ? [{ kinds: [30023], authors: [user.pubkey], limit: 50 }]
        : [{ kinds: [30023], limit: 50 }];

      const events = await nostr.query(filters, { signal });
      return events.sort((a, b) => b.created_at - a.created_at);
    },
  });

  const getArticleTitle = (event: NostrEvent): string => {
    return event.tags.find(t => t[0] === 'title')?.[1] || 'Untitled';
  };

  const getArticleSummary = (event: NostrEvent): string => {
    return event.tags.find(t => t[0] === 'summary')?.[1] || event.content.slice(0, 200) + '...';
  };

  const getArticleImage = (event: NostrEvent): string | undefined => {
    return event.tags.find(t => t[0] === 'image')?.[1];
  };

  const getArticleTags = (event: NostrEvent): string[] => {
    return event.tags.filter(t => t[0] === 't').map(t => t[1]);
  };

  const getArticleId = (event: NostrEvent): string => {
    return event.tags.find(t => t[0] === 'd')?.[1] || event.id;
  };

  const getPublishedDate = (event: NostrEvent): Date => {
    const publishedAt = event.tags.find(t => t[0] === 'published_at')?.[1];
    return publishedAt ? new Date(parseInt(publishedAt) * 1000) : new Date(event.created_at * 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            News
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Latest news on Bitcoin, art, and creativity
          </p>
        </div>

        {/* Blog Posts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : blogPosts.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Posts Yet</h3>
              <p className="text-muted-foreground">
                Check back soon for new content!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post) => {
              const title = getArticleTitle(post);
              const summary = getArticleSummary(post);
              const image = getArticleImage(post);
              const tags = getArticleTags(post);
              const articleId = getArticleId(post);
              const publishedDate = getPublishedDate(post);

              return (
                <Link key={post.id} to={`/blog/${articleId}`}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden">
                    {image && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={image}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <time>{format(publishedDate, 'MMMM d, yyyy')}</time>
                      </div>
                      <h2 className="text-2xl font-bold group-hover:text-purple-600 transition-colors line-clamp-2">
                        {title}
                      </h2>
                      <p className="text-muted-foreground line-clamp-3">
                        {summary}
                      </p>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="flex items-center text-purple-600 group-hover:text-purple-700 transition-colors pt-2">
                        <span className="text-sm font-medium">Read more</span>
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
