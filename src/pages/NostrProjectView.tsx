import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { useNostrProject, useNostrProjectParticipants } from '@/hooks/useNostrProjects';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Zap, Users, Check } from 'lucide-react';
import { nip19 } from 'nostr-tools';

export default function NostrProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { mutate: createEvent } = useNostrPublish();
  
  const { data: project, isLoading } = useNostrProject(projectId || '');
  const { data: participants = [] } = useNostrProjectParticipants(projectId || '');
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [npub, setNpub] = useState('');
  const [handle, setHandle] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  useSeoMeta({
    title: project ? `${project.title} - Join Nostr Project` : 'Nostr Project',
    description: project?.description || 'Join this collaborative art project on Nostr',
  });

  const handleJoinProject = async () => {
    if (!project || !selectedImage || !npub.trim()) {
      setError('Please select an image and provide your npub');
      return;
    }

    // Validate npub format
    try {
      const decoded = nip19.decode(npub.trim());
      if (decoded.type !== 'npub') {
        setError('Invalid npub format. Please provide a valid Nostr npub.');
        return;
      }
    } catch {
      setError('Invalid npub format. Please provide a valid Nostr npub.');
      return;
    }

    setError('');

    // Create participant event
    createEvent({
      kind: 38172,
      content: JSON.stringify({
        payment_proof: 'pending',
      }),
      tags: [
        ['p', project.id], // Reference to project
        ['npub', npub.trim()],
        ...(handle.trim() ? [['handle', handle.trim()]] : []),
        ['image', selectedImage],
        ['t', 'nostr-project-participant'],
      ],
    });

    setShowSuccess(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
              <p className="text-muted-foreground mb-6">
                This project doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate('/nostr-projects')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold">Thanks for Supporting This Project!</h2>
              <p className="text-lg text-muted-foreground">
                I will share soon that your image is added to the artwork on Nostr.
              </p>
              
              <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="py-6">
                  <p className="text-lg font-semibold mb-2">Follow @BitPopArt</p>
                  <p className="text-sm text-muted-foreground font-mono break-all">
                    npub1gwa27rpgum8mr9d30msg8cv7kwj2lhav2nvmdwh3wqnsa5vnudxqlta2sz
                  </p>
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/nostr-projects')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
                <Button variant="outline" onClick={() => setShowSuccess(false)}>
                  View Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/nostr-projects')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left: Project Info & Image Selection */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">{project.title}</CardTitle>
                <CardDescription className="text-base">
                  {project.description}
                </CardDescription>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="default" className="gap-1 text-base px-3 py-1">
                    <Zap className="h-4 w-4" />
                    {project.price_sats.toLocaleString()} sats
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-4 w-4" />
                    {participants.length} joined
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Choose Your Image</CardTitle>
                <CardDescription>
                  Select one of the images below to add to the collaborative artwork
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {project.images.map((img, index) => (
                    <div
                      key={index}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-4 transition-all ${
                        selectedImage === img
                          ? 'border-purple-500 scale-95'
                          : 'border-transparent hover:border-purple-300'
                      }`}
                      onClick={() => setSelectedImage(img)}
                    >
                      <img
                        src={img}
                        alt={`Option ${index + 1}`}
                        className="w-full h-32 object-cover"
                      />
                      {selectedImage === img && (
                        <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Join Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Join This Project</CardTitle>
                <CardDescription>
                  Add your Nostr identity and pay to participate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Npub */}
                <div className="space-y-2">
                  <Label htmlFor="npub">Your Npub *</Label>
                  <Input
                    id="npub"
                    value={npub}
                    onChange={(e) => setNpub(e.target.value)}
                    placeholder="npub1..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Your Nostr public key (npub format)
                  </p>
                </div>

                {/* Handle */}
                <div className="space-y-2">
                  <Label htmlFor="handle">Your Nostr Handle</Label>
                  <Input
                    id="handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="@yourname"
                  />
                  <p className="text-sm text-muted-foreground">
                    Optional: Your Nostr handle or username
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Summary */}
                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="py-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Price:</span>
                        <span className="text-sm font-bold">{project.price_sats.toLocaleString()} sats</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Image selected:</span>
                        <span className="text-sm">{selectedImage ? '✓ Yes' : '✗ No'}</span>
                      </div>
                      {project.author_handle && (
                        <div className="pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            By {project.author_handle}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleJoinProject}
                  disabled={!selectedImage || !npub.trim()}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Pay {project.price_sats.toLocaleString()} Sats & Join
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Get your image and Nostr name added to the artwork
                </p>
              </CardContent>
            </Card>

            {/* Participants List */}
            {participants.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Participants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {participants.slice(0, 5).map((participant, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2 rounded-lg bg-accent/50"
                      >
                        <img
                          src={participant.selected_image_url}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {participant.participant_handle || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {participant.participant_npub.slice(0, 16)}...
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
