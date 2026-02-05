import { useState, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { User, Save, Eye } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';

const DEFAULT_CONTENT = `# My Story

I have been drawing since childhood, like many of us, and I have never stopped drawing because it is what I love to do most in my life. I mostly drew cartoon designs, and when I completed 8 years of art school (4 years in graphic/media design and 4 years in animation and film), you can still see that illustration style in my work, whether it's in graphic designs or animations.

Creating vector designs and using Adobe Illustrator is the foundation of most of my work. I have been sketching on the iPad (using Procreate) in recent years, but of course, I still use old-school pencil and paper.

Around 2020, I wanted to draw more than just cartoons and tell stories through my art. I began drawing simpler human-like figures. A friend of mine had a sticker machine to print outlines, which allowed me to bring my art to life. During this time, my art style evolved more and more toward this pop art style, and I named it **BitPopArt**.

People often associate the cartoons and, more specifically, the simple figures with the artist Keith Haring. While I use what we call outline figures (consisting of only lines and colors), my intention was never to reference him. As an artist, one's work will always remind others of something, and that is perfectly fine. This is the style that makes me happy.

For me, this style allows me to tell more art stories without losing my cartoon side, and these outline figures were a convenient way to put them on bags, T-shirts, and my camper van, where I conducted my first Art Tour in 2022/23. In 2023, I began developing this style even further.

## Bitcoin

The 'Bit' in BitPopArt stands for Bitcoin. I have been a supporter of Bitcoin since I studied and learned what Bitcoin is. For me it stands for **Freedom**.

## Travel

I get inspiration from around the world. I have traveled to **88 countries** in my life, and many of them more than once. I can say that I've experienced a wide range of cultures. Humans, in general, serve as a significant source of inspiration for me. It's fascinating to observe how we behave, how we perceive the world, and how unique and unpredictable humans can be.

## Nostr

Nostr is a simple, open protocol that enables global, decentralized, and censorship-resistant social media.

Follow me at BitPopArt:  
**npub1gwa27rpgum8mr9d30msg8cv7kwj2lhav2nvmdwh3wqnsa5vnudxqlta2sz**`;

export function ArtistContentManagement() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('My Story');
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Fetch artist page content
  const { data: artistEvent } = useQuery({
    queryKey: ['artist-page-admin', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return null;
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{ kinds: [30023], authors: [user.pubkey], '#d': ['artist-page'], limit: 1 }],
        { signal }
      );

      return events[0] || null;
    },
    enabled: !!user?.pubkey,
  });

  // Load existing content into form
  useEffect(() => {
    if (artistEvent) {
      const eventTitle = artistEvent.tags.find(t => t[0] === 'title')?.[1] || 'My Story';
      setTitle(eventTitle);
      setContent(artistEvent.content);
    }
  }, [artistEvent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Please enter content');
      return;
    }

    const tags: string[][] = [
      ['d', 'artist-page'],
      ['title', title],
      ['t', 'artist'],
      ['published_at', Math.floor(Date.now() / 1000).toString()],
    ];

    createEvent(
      {
        kind: 30023,
        content: content,
        tags,
      },
      {
        onSuccess: () => {
          toast.success('Artist page updated!');
          queryClient.invalidateQueries({ queryKey: ['artist-page'] });
          queryClient.invalidateQueries({ queryKey: ['artist-page-admin'] });
        },
        onError: (error) => {
          console.error('Publish error:', error);
          toast.error('Failed to update artist page');
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="h-6 w-6 mr-2" />
          Artist Page Content
        </CardTitle>
        <CardDescription>
          Update your artist story and bio (supports Markdown formatting)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Page Title</Label>
            <Input
              id="title"
              placeholder="My Story"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="content">Content (Markdown)</Label>
                <Textarea
                  id="content"
                  placeholder="Write your story using Markdown..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Supports Markdown: **bold**, *italic*, ## headings, [links](url), etc.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <Card className="min-h-[500px]">
                <CardContent className="pt-6">
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Artist Page
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open('/artist', '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Live
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
