import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ARTIST_PUBKEY = '7d33ba57d8a6e8869a1f1d5215254597594ac0dbfeb01b690def8c461b82db35'; // traveltelly's pubkey

export default function Artist() {
  const { nostr } = useNostr();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useSeoMeta({
    title: 'Artist - BitPopArt',
    description: 'Learn about the artist behind BitPopArt - Johannes Oppewal, world traveler and Bitcoin PopArt creator',
  });

  // Fetch artist page content (kind 30023 with artist identifier)
  const { data: artistContent, isLoading } = useQuery({
    queryKey: ['artist-page'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{ kinds: [30023], authors: [ARTIST_PUBKEY], '#d': ['artist-page'], limit: 1 }],
        { signal }
      );

      if (events.length > 0) {
        return events[0];
      }

      // Default content if no Nostr event found
      return null;
    },
  });

  const getContent = (): string => {
    if (artistContent) {
      return artistContent.content;
    }

    // Default My Story content
    return `# My Story

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
  };

  const getTitle = (): string => {
    if (artistContent) {
      return artistContent.tags.find(t => t[0] === 'title')?.[1] || 'Artist';
    }
    return 'My Story';
  };

  const getHeaderImage = (): string | null => {
    if (artistContent) {
      return artistContent.tags.find(t => t[0] === 'image')?.[1] || null;
    }
    return null;
  };

  const getGalleryImages = (): string[] => {
    if (artistContent) {
      return artistContent.tags.filter(t => t[0] === 'gallery').map(t => t[1]);
    }
    return [];
  };

  const headerImage = getHeaderImage();
  const galleryImages = getGalleryImages();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      {/* Header Image */}
      {headerImage && (
        <div className="w-full h-64 md:h-96 overflow-hidden">
          <img
            src={headerImage}
            alt="Artist Header"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <User className="h-10 w-10 text-purple-600 mr-3" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Artist
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Meet Johannes Oppewal - World traveler and Bitcoin PopArt creator
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="text-3xl">{getTitle()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <ReactMarkdown>{getContent()}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Gallery */}
            {galleryImages.length > 0 && (
              <Card className="max-w-4xl mx-auto mt-8">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center">
                    <ImageIcon className="h-6 w-6 mr-2" />
                    Gallery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryImages.map((imgUrl, index) => (
                      <div
                        key={index}
                        className="relative aspect-square overflow-hidden rounded-lg cursor-pointer group"
                        onClick={() => setSelectedImage(imgUrl)}
                      >
                        <img
                          src={imgUrl}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Image Lightbox */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl p-0">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Gallery"
                className="w-full h-auto"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Nostr & BitPopArt {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}
