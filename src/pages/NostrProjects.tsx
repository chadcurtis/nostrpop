import { useSeoMeta } from '@unhead/react';
import { useNostrProjects } from '@/hooks/useNostrProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Users, ArrowRight, Zap } from 'lucide-react';

export default function NostrProjects() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useNostrProjects();

  useSeoMeta({
    title: 'Nostr Projects - Join Collaborative Art',
    description: 'Join collaborative art projects on Nostr. Choose your image and add your identity to amazing artworks.',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Users className="h-10 w-10 text-purple-600 mr-3" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Nostr Projects
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join collaborative art projects! Choose your image, add your Nostr identity, and be part of something amazing.
          </p>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-56 w-full" />
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800"
                onClick={() => navigate(`/nostr-projects/${project.id}`)}
              >
                {/* Image Grid Preview */}
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                  <div className="grid grid-cols-2 gap-1 h-full p-2">
                    {project.images.slice(0, 4).map((img, index) => (
                      <div
                        key={index}
                        className="relative overflow-hidden rounded-lg"
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
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
                  <CardTitle className="text-2xl group-hover:text-purple-600 transition-colors flex items-center justify-between">
                    {project.title}
                    <Badge variant="default" className="gap-1">
                      <Zap className="h-3 w-3" />
                      {project.price_sats.toLocaleString()}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="line-clamp-3 text-base">
                    {project.description}
                  </CardDescription>
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      {project.images.length} images
                    </Badge>
                    {project.author_handle && (
                      <Badge variant="outline">
                        {project.author_handle}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground">
                Check back soon for new collaborative art projects!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Powered by Nostr & Bitcoin Lightning ⚡</p>
        </div>
      </div>
    </div>
  );
}
