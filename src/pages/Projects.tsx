import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { ShareToNostrButton } from '@/components/ShareToNostrButton';
import { ClawstrShare } from '@/components/ClawstrShare';
import { ZapButton } from '@/components/ZapButton';
import { FolderKanban, Sparkles, ArrowRight, Users, Zap, Award, Share2 } from 'lucide-react';
import { useNostrProjects } from '@/hooks/useNostrProjects';
import { useBadges } from '@/hooks/useBadges';
import type { ProjectData } from '@/lib/projectTypes';

const ADMIN_PUBKEY = '7d33ba57d8a6e8869a1f1d5215254597594ac0dbfeb01b690def8c461b82db35';

// Built-in projects
const BUILTIN_PROJECTS = [
  {
    id: '21k-art',
    name: '21K Art',
    description: 'Exclusive artwork collection priced at 21,000 sats - celebrating Bitcoin\'s 21 million supply cap',
    thumbnail: '', // Will use default gradient
    url: '/21k-art',
    isBuiltIn: true,
  },
  {
    id: '100m-canvas',
    name: '100M Canvas',
    description: 'Collaborative pixel art project on a massive 100 million pixel canvas',
    thumbnail: '',
    url: '/canvas',
    isBuiltIn: true,
  },
  {
    id: 'cards',
    name: 'POP Cards',
    description: 'Create and share beautiful Good Vibes cards for any occasion',
    thumbnail: '',
    url: '/cards',
    isBuiltIn: true,
  },
];

export default function Projects() {
  const { nostr } = useNostr();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [_selectedProject, _setSelectedProject] = useState<string | null>(null);

  useSeoMeta({
    title: 'Projects - BitPopArt',
    description: 'Explore creative projects by BitPopArt including 21K Art, 100M Canvas, POP Cards and more',
  });

  // Fetch Nostr Projects (collaborative art)
  const { data: nostrProjects = [] } = useNostrProjects();

  // Fetch POP Badges
  const { data: badges = [] } = useBadges();

  // Fetch custom projects from Nostr
  const { data: customProjects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{ kinds: [36171], authors: [ADMIN_PUBKEY], '#t': ['bitpopart-project'], limit: 50 }],
        { signal }
      );

      const projects: ProjectData[] = events
        .map((event): ProjectData | null => {
          try {
            const content = JSON.parse(event.content);
            const id = event.tags.find(t => t[0] === 'd')?.[1];
            const name = event.tags.find(t => t[0] === 'name')?.[1] || content.name;
            const thumbnail = event.tags.find(t => t[0] === 'image')?.[1] || content.thumbnail;
            const url = event.tags.find(t => t[0] === 'r')?.[1] || content.url;
            const order = event.tags.find(t => t[0] === 'order')?.[1];
            const featured = event.tags.find(t => t[0] === 'featured')?.[1] === 'true';

            if (!id || !name) return null;

            return {
              id,
              event,
              name,
              description: content.description || '',
              thumbnail: thumbnail || '',
              url,
              author_pubkey: event.pubkey,
              created_at: new Date(event.created_at * 1000).toISOString(),
              order: order ? parseInt(order) : undefined,
              featured,
            };
          } catch {
            return null;
          }
        })
        .filter((p): p is ProjectData => p !== null)
        .sort((a, b) => (a.order || 999) - (b.order || 999));

      return projects;
    },
  });

  // Combine built-in and custom projects
  const allProjects = [...BUILTIN_PROJECTS, ...customProjects];

  const handleProjectClick = (project: typeof BUILTIN_PROJECTS[0] | ProjectData) => {
    if ('isBuiltIn' in project && project.isBuiltIn) {
      navigate(project.url);
    } else if ('url' in project && project.url) {
      if (project.url.startsWith('http')) {
        window.open(project.url, '_blank');
      } else {
        navigate(project.url);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <FolderKanban className="h-10 w-10 text-purple-600 mr-3" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Projects
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Explore creative projects and collaborations
          </p>
        </div>

        {/* Regular Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {allProjects.map((project, index) => (
              <Card
                key={project.id}
                className="group overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800"
                onClick={() => handleProjectClick(project)}
              >
                {/* Thumbnail */}
                <div className="relative h-56 overflow-hidden">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div 
                      className="w-full h-full bg-gradient-to-br from-purple-400 via-pink-400 to-indigo-400 dark:from-purple-600 dark:via-pink-600 dark:to-indigo-600 flex items-center justify-center"
                      style={{
                        backgroundImage: `linear-gradient(135deg, 
                          ${['#a855f7', '#ec4899', '#6366f1', '#8b5cf6', '#f472b6'][index % 5]} 0%, 
                          ${['#ec4899', '#6366f1', '#8b5cf6', '#f472b6', '#a855f7'][index % 5]} 100%)`
                      }}
                    >
                      <span className="text-6xl opacity-90">
                        {index === 0 ? '⚡' : index === 1 ? '🎨' : index === 2 ? '💝' : '✨'}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProjectClick(project);
                      }}
                    >
                      Explore Project
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <CardHeader>
                  <CardTitle className="text-2xl group-hover:text-purple-600 transition-colors flex items-center justify-between">
                    {project.name}
                    {('isBuiltIn' in project && project.isBuiltIn) && (
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Core
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 text-base">
                    {project.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Nostr Projects Section */}
          {nostrProjects.length > 0 && (
            <div className="mt-16 max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-purple-600 mr-3" />
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
                    Nostr Projects
                  </h2>
                </div>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Collaborative art projects - Join by selecting an image and paying in sats
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nostrProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="group overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800"
                    onClick={() => navigate(`/nostr-projects/${project.id}`)}
                  >
                    {/* Image Grid Preview */}
                    <div className="relative h-56 overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                      <div className="grid grid-cols-2 gap-1 h-full p-2">
                        {project.images.slice(0, 4).map((img, index) => (
                          <div key={index} className="relative overflow-hidden rounded-lg">
                            <img
                              src={img}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Zap button overlay */}
                      {project.event && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div onClick={(e) => e.stopPropagation()}>
                            <ZapButton
                              authorPubkey={project.event.pubkey}
                              event={project.event}
                              eventTitle={project.title}
                              size="sm"
                              variant="default"
                              className="bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-lg h-8 w-8 p-0"
                              showLabel={false}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          variant="secondary"
                          size="lg"
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/nostr-projects/${project.id}`);
                          }}
                        >
                          Join Project
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-2xl group-hover:text-purple-600 transition-colors flex-1">
                          {project.title}
                        </CardTitle>
                        {isAdmin && project.event && (
                          <div className="flex gap-1">
                            <ShareToNostrButton
                              url={`/nostr-projects/${project.id}`}
                              title={project.title}
                              description={project.description}
                              image={project.images[0]}
                              variant="ghost"
                              size="icon"
                            />
                            <ClawstrShare
                              event={project.event}
                              contentType="project"
                              trigger={
                                <Button variant="ghost" size="icon">
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default" className="gap-1">
                          <Zap className="h-3 w-3" />
                          {project.price_sats.toLocaleString()}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-3 text-base">
                        {project.description}
                      </CardDescription>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant="outline" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          {project.images.length} images
                        </Badge>
                        <Badge variant="secondary">Collaborative</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Badges Section */}
          {badges.length > 0 && (
            <div className="mt-16 max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <Award className="h-8 w-8 text-yellow-600 mr-3" />
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                    Badges
                  </h2>
                </div>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Collect exclusive badges - Buy with sats and add to your Nostr profile
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {badges.slice(0, 6).map((badge) => (
                  <Card
                    key={badge.id}
                    className="group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-800"
                    onClick={() => navigate(`/badges#${badge.id}`)}
                  >
                    {/* Badge Image */}
                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20">
                      <img
                        src={badge.image_url}
                        alt={badge.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Content */}
                    <CardHeader className="pb-3 pt-3">
                      <CardTitle className="text-sm group-hover:text-purple-600 transition-colors truncate">
                        {badge.title}
                      </CardTitle>
                      <Badge variant="default" className="gap-1 w-fit">
                        <Zap className="h-3 w-3" />
                        <span className="text-xs">{badge.price_sats.toLocaleString()}</span>
                      </Badge>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {badges.length > 6 && (
                <div className="text-center mt-6">
                  <Button variant="outline" asChild>
                    <a href="/badges" className="flex items-center space-x-2">
                      <Award className="h-4 w-4" />
                      <span>View All Badges</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
        )}

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Nostr & BitPopArt {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
