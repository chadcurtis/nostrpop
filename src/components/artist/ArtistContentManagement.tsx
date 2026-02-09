import { useState, useEffect, useRef } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { User, Save, Eye, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
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
  const { mutateAsync: uploadFile } = useUploadFile();
  const queryClient = useQueryClient();
  const headerImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('My Story');
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [headerImage, setHeaderImage] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isUploading, setIsUploading] = useState(false);

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
      const eventHeaderImage = artistEvent.tags.find(t => t[0] === 'image')?.[1] || '';
      const eventGalleryImages = artistEvent.tags.filter(t => t[0] === 'gallery').map(t => t[1]);
      
      setTitle(eventTitle);
      setContent(artistEvent.content);
      setHeaderImage(eventHeaderImage);
      setGalleryImages(eventGalleryImages);
    }
  }, [artistEvent]);

  const handleHeaderImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File is larger than 10MB. Please choose a smaller file.');
      return;
    }

    setIsUploading(true);
    try {
      const tags = await uploadFile(file);
      const imageUrl = tags[0][1];
      setHeaderImage(imageUrl);
      toast.success('Header image uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload header image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name} is larger than 10MB. Skipped.`);
        continue;
      }

      try {
        const tags = await uploadFile(file);
        const imageUrl = tags[0][1];
        uploadedUrls.push(imageUrl);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setGalleryImages(prev => [...prev, ...uploadedUrls]);
    setIsUploading(false);
    toast.success(`${uploadedUrls.length} image(s) uploaded!`);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

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

    if (headerImage) {
      tags.push(['image', headerImage]);
    }

    // Add gallery images
    galleryImages.forEach(imgUrl => {
      tags.push(['gallery', imgUrl]);
    });

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

          {/* Header Image */}
          <div className="space-y-2">
            <Label>Header Image</Label>
            {headerImage ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                  <img
                    src={headerImage}
                    alt="Header"
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setHeaderImage('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  type="url"
                  placeholder="Or paste image URL"
                  value={headerImage}
                  onChange={(e) => setHeaderImage(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  ref={headerImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleHeaderImageUpload}
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => headerImageInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Header Image
                    </>
                  )}
                </Button>
                <Input
                  type="url"
                  placeholder="Or paste image URL"
                  value={headerImage}
                  onChange={(e) => setHeaderImage(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Gallery Images */}
          <div className="space-y-2">
            <Label>Gallery Images</Label>
            
            {galleryImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {galleryImages.map((imgUrl, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                    <img
                      src={imgUrl}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeGalleryImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleGalleryUpload}
              disabled={isUploading}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add Gallery Images
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              {galleryImages.length > 0 
                ? `${galleryImages.length} image(s) in gallery`
                : 'Upload multiple images to create a photo gallery'}
            </p>
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
