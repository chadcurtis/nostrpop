import { useState, useRef, useEffect, useCallback } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { LoginArea } from '@/components/auth/LoginArea';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { useToast } from '@/hooks/useToast';
import { RelaySelector } from '@/components/RelaySelector';
import {
  Paintbrush,
  Zap,
  Download,
  Share2,
  Users,
  Grid3X3,
  Palette,
  Eye,
  Undo,
  Redo,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Move
} from 'lucide-react';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

// Canvas dimensions: 10,000 x 10,000 = 100 million pixels
const CANVAS_WIDTH = 10000;
const CANVAS_HEIGHT = 10000;
const TOTAL_PIXELS = CANVAS_WIDTH * CANVAS_HEIGHT;
const SAT_PER_PIXEL = 1;

// Event kind for canvas pixels (using addressable event kind)
const CANVAS_PIXEL_KIND = 30100;

interface PixelData {
  x: number;
  y: number;
  color: string;
  author: string;
  timestamp: number;
}

interface PendingPixel extends PixelData {
  id: string;
}

function Canvas100M() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { toast } = useToast();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState('#FF00FF');
  const [zoom, setZoom] = useState(10); // Start more zoomed in to see pixels better
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [pendingPixels, setPendingPixels] = useState<PendingPixel[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Fetch all painted pixels from Nostr
  const { data: pixels, isLoading: pixelsLoading, refetch: refetchPixels } = useQuery({
    queryKey: ['canvas-100m-pixels'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      
      const events = await nostr.query([
        {
          kinds: [CANVAS_PIXEL_KIND],
          limit: 5000 // Fetch in batches
        }
      ], { signal });

      const pixelData: PixelData[] = events
        .map(event => {
          try {
            const content = JSON.parse(event.content);
            const xTag = event.tags.find(([name]) => name === 'x')?.[1];
            const yTag = event.tags.find(([name]) => name === 'y')?.[1];
            const colorTag = event.tags.find(([name]) => name === 'color')?.[1];

            if (!xTag || !yTag || !colorTag) return null;

            return {
              x: parseInt(xTag),
              y: parseInt(yTag),
              color: colorTag,
              author: event.pubkey,
              timestamp: event.created_at
            };
          } catch (error) {
            console.warn('Failed to parse pixel event:', error);
            return null;
          }
        })
        .filter(Boolean) as PixelData[];

      return pixelData;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  // Get unique contributors
  const contributors = pixels ? Array.from(new Set(pixels.map(p => p.author))) : [];
  const paintedPixels = (pixels?.length || 0) + pendingPixels.length;
  const percentPainted = ((paintedPixels / TOTAL_PIXELS) * 100).toFixed(4);

  // Draw canvas (base pixels)
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw existing pixels
    if (pixels) {
      pixels.forEach(pixel => {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(pixel.x, pixel.y, 1, 1);
      });
    }
  }, [pixels]);

  // Draw overlay (pending pixels) - updates independently for live preview
  useEffect(() => {
    if (!overlayCanvasRef.current) return;
    
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas.getContext('2d');
    
    if (!overlayCtx) return;

    // Clear overlay
    overlayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw pending pixels with bright colors for visibility
    pendingPixels.forEach(pixel => {
      overlayCtx.fillStyle = pixel.color;
      overlayCtx.fillRect(pixel.x, pixel.y, 1, 1);
      
      // Add a bright border for better visibility
      overlayCtx.strokeStyle = '#FFFFFF';
      overlayCtx.lineWidth = 0.2;
      overlayCtx.strokeRect(pixel.x, pixel.y, 1, 1);
    });
  }, [pendingPixels]);

  // Draw grid
  useEffect(() => {
    if (!gridCanvasRef.current || !showGrid) return;
    
    const gridCanvas = gridCanvasRef.current;
    const gridCtx = gridCanvas.getContext('2d');
    
    if (!gridCtx) return;

    // Clear grid
    gridCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Only show grid when zoomed in enough to see individual pixels
    if (zoom >= 5) {
      gridCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      gridCtx.lineWidth = 0.05;

      // Draw vertical lines
      for (let x = 0; x <= CANVAS_WIDTH; x += 10) {
        gridCtx.beginPath();
        gridCtx.moveTo(x, 0);
        gridCtx.lineTo(x, CANVAS_HEIGHT);
        gridCtx.stroke();
      }

      // Draw horizontal lines
      for (let y = 0; y <= CANVAS_HEIGHT; y += 10) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, y);
        gridCtx.lineTo(CANVAS_WIDTH, y);
        gridCtx.stroke();
      }
    }
  }, [showGrid, zoom]);

  // Handle canvas click to paint pixel
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to paint on the canvas.",
        variant: "destructive"
      });
      return;
    }

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate pixel coordinates accounting for zoom and pan
    const viewportX = e.clientX - rect.left;
    const viewportY = e.clientY - rect.top;
    
    // Convert viewport coordinates to canvas coordinates
    const canvasX = (viewportX / zoom) - (pan.x / zoom);
    const canvasY = (viewportY / zoom) - (pan.y / zoom);
    
    // Scale to actual canvas size
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    const x = Math.floor(canvasX * scaleX);
    const y = Math.floor(canvasY * scaleY);

    // Bounds check
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
      return;
    }

    // Check if pixel is already painted
    const isAlreadyPainted = pixels?.some(p => p.x === x && p.y === y) || 
                             pendingPixels.some(p => p.x === x && p.y === y);

    if (isAlreadyPainted) {
      toast({
        title: "Pixel Already Painted",
        description: "You can't paint over someone else's pixel!",
        variant: "destructive"
      });
      return;
    }

    // Add to pending pixels
    const newPixel: PendingPixel = {
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      color: selectedColor,
      author: user.pubkey,
      timestamp: Math.floor(Date.now() / 1000)
    };

    setPendingPixels(prev => [...prev, newPixel]);
    
    // Show a subtle toast (less intrusive)
    console.log(`Pixel painted at (${x}, ${y})`);
  }, [user, selectedColor, pixels, pendingPixels, pan, zoom, toast]);

  // Undo last pixel
  const handleUndo = () => {
    setPendingPixels(prev => prev.slice(0, -1));
  };

  // Clear all pending pixels
  const handleClear = () => {
    setPendingPixels([]);
    setShowPreview(false);
  };

  // Publish pixels to Nostr
  const handlePublish = async () => {
    if (!user || pendingPixels.length === 0) return;

    try {
      // Create events for each pixel
      const events = pendingPixels.map(pixel => ({
        kind: CANVAS_PIXEL_KIND,
        content: JSON.stringify({
          x: pixel.x,
          y: pixel.y,
          color: pixel.color
        }),
        tags: [
          ['d', `${pixel.x}-${pixel.y}`], // Unique identifier for this pixel
          ['x', pixel.x.toString()],
          ['y', pixel.y.toString()],
          ['color', pixel.color],
          ['t', '100m-canvas'],
          ['alt', `Painted pixel at (${pixel.x}, ${pixel.y}) on the 100M Canvas`]
        ],
        created_at: pixel.timestamp,
      }));

      // Sign and publish all events
      for (const eventData of events) {
        const signedEvent = await user.signer.signEvent(eventData);
        await nostr.event(signedEvent, { signal: AbortSignal.timeout(5000) });
      }

      const totalSats = pendingPixels.length * SAT_PER_PIXEL;

      toast({
        title: "Pixels Published!",
        description: `${pendingPixels.length} pixels published for ${totalSats} sats! (Payment integration coming soon)`,
      });

      // Clear pending pixels and refetch
      setPendingPixels([]);
      setShowPreview(false);
      refetchPixels();
    } catch (error) {
      console.error('Failed to publish pixels:', error);
      toast({
        title: "Publication Failed",
        description: "Failed to publish your pixels. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Print canvas at 300 DPI
  const handlePrint = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>100M Canvas - Print at 300 DPI</title>
            <style>
              @media print {
                @page { size: auto; margin: 0; }
                body { margin: 0; }
                img { width: 100%; height: auto; image-rendering: pixelated; }
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Share functionality
  const handleShare = async () => {
    const shareText = `I painted on the Nostr 100M Canvas! 🎨 Join me and claim your pixels at nostrpop.art`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '100M Canvas - Nostr Art Project',
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        // User cancelled or share failed
        copyToClipboard(shareText + ' ' + shareUrl);
      }
    } else {
      copyToClipboard(shareText + ' ' + shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Share text copied! Paste it anywhere to spread the word.",
    });
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 10));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.1));

  useSeoMeta({
    title: '100M Canvas - Collaborative Nostr Art Project',
    description: 'Paint on a 100 million pixel canvas with the Nostr community. 1 sat per pixel. Collaborative digital art on the blockchain.',
  });

  const totalCost = pendingPixels.length * SAT_PER_PIXEL;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-orange-900/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Grid3X3 className="h-12 w-12 text-purple-600 mr-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
              100M Canvas
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-4">
            A collaborative art project on Nostr. Paint pixel by pixel on a 100 million pixel canvas!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Badge variant="secondary" className="text-base px-4 py-2">
              <Zap className="w-4 h-4 mr-2 text-yellow-500" />
              {SAT_PER_PIXEL} sat per pixel
            </Badge>
            <Badge variant="outline" className="text-base px-4 py-2">
              <Grid3X3 className="w-4 h-4 mr-2" />
              {CANVAS_WIDTH.toLocaleString()} × {CANVAS_HEIGHT.toLocaleString()} pixels
            </Badge>
            <Badge variant="outline" className="text-base px-4 py-2">
              <Paintbrush className="w-4 h-4 mr-2" />
              {percentPainted}% painted
            </Badge>
            <Badge variant="outline" className="text-base px-4 py-2">
              <Users className="w-4 h-4 mr-2" />
              {contributors.length} artists
            </Badge>
          </div>
        </div>

        {/* Login Prompt */}
        {!user && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="font-semibold text-purple-700 dark:text-purple-300 mb-1">
                    Ready to Paint?
                  </h3>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Log in with your Nostr account to start painting on the canvas
                  </p>
                </div>
                <LoginArea className="max-w-48" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Canvas</CardTitle>
                    <CardDescription>
                      Click to paint pixels. {user ? 'You can paint multiple pixels before publishing!' : 'Login to start painting.'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={handleZoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-16 text-center">{Math.round(zoom * 10)}x</span>
                    <Button variant="outline" size="sm" onClick={handleZoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={showGrid ? "secondary" : "outline"} 
                      size="sm" 
                      onClick={() => setShowGrid(!showGrid)}
                      className="ml-2"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pixelsLoading ? (
                  <Skeleton className="w-full aspect-square" />
                ) : (
                  <div className="relative overflow-hidden border-2 border-purple-200 dark:border-purple-800 rounded-lg bg-white">
                    <div
                      className="relative cursor-crosshair"
                      style={{
                        width: '100%',
                        aspectRatio: '1',
                        transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                        transformOrigin: '0 0',
                        transition: 'none'
                      }}
                    >
                      {/* Base canvas - permanent pixels */}
                      <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      
                      {/* Grid canvas - grid overlay */}
                      {showGrid && (
                        <canvas
                          ref={gridCanvasRef}
                          width={CANVAS_WIDTH}
                          height={CANVAS_HEIGHT}
                          className="absolute top-0 left-0 w-full h-full pointer-events-none"
                          style={{ imageRendering: 'crisp-edges' }}
                        />
                      )}
                      
                      {/* Overlay canvas - pending pixels */}
                      <canvas
                        ref={overlayCanvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      
                      {/* Click target - transparent layer on top */}
                      <div
                        onClick={handleCanvasClick}
                        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                        style={{ touchAction: 'none' }}
                      />
                    </div>
                  </div>
                  
                  {/* Pixel coordinates display */}
                  {pendingPixels.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground text-center">
                      {pendingPixels.length} pixel{pendingPixels.length !== 1 ? 's' : ''} pending
                    </div>
                  )}
                )}
              </CardContent>
            </Card>

            {/* Pending Pixels Preview */}
            {pendingPixels.length > 0 && (
              <Card className="mt-6 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-purple-700 dark:text-purple-300">
                      Pending Pixels ({pendingPixels.length})
                    </span>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={handleUndo} disabled={pendingPixels.length === 0}>
                        <Undo className="h-4 w-4 mr-2" />
                        Undo
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleClear}>
                        <X className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription className="text-purple-600 dark:text-purple-400">
                    Total cost: {totalCost} sats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => setShowPreview(!showPreview)}
                      variant={showPreview ? "secondary" : "outline"}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showPreview ? 'Hide' : 'Show'} Preview
                    </Button>
                    <Button className="flex-1" onClick={handlePublish}>
                      <Check className="h-4 w-4 mr-2" />
                      Publish & Pay {totalCost} sats
                    </Button>
                  </div>
                  {showPreview && (
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <h4 className="font-semibold mb-2">Your Pixels:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                        {pendingPixels.map((pixel, idx) => (
                          <div key={pixel.id} className="flex items-center space-x-2 text-xs">
                            <div 
                              className="w-6 h-6 border rounded" 
                              style={{ backgroundColor: pixel.color }}
                            />
                            <span>({pixel.x}, {pixel.y})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tools & Info */}
          <div className="space-y-6">
            {/* Color Picker */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Color Picker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full h-32 rounded-lg cursor-pointer"
                  />
                  <div className="text-center">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">
                      {selectedColor}
                    </code>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#000000', '#FFFFFF', '#FF8800', '#8800FF'].map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className="w-full aspect-square rounded-lg border-2 hover:scale-110 transition-transform"
                        style={{ 
                          backgroundColor: color,
                          borderColor: selectedColor === color ? '#6366f1' : 'transparent'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" variant="outline" onClick={handlePrint}>
                  <Download className="h-4 w-4 mr-2" />
                  Print Canvas (300 DPI)
                </Button>
                <Button className="w-full" variant="outline" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Project
                </Button>
              </CardContent>
            </Card>

            {/* Contributors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Artists ({contributors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contributors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No artists yet. Be the first!</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {contributors.slice(0, 20).map(pubkey => (
                      <ContributorBadge key={pubkey} pubkey={pubkey} />
                    ))}
                    {contributors.length > 20 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{contributors.length - 20} more artists
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Relay Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Relay</CardTitle>
              </CardHeader>
              <CardContent>
                <RelaySelector className="w-full" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>100M Canvas - A Nostr Collaborative Art Project</p>
          <p className="mt-2">
            Vibed with <a href="https://soapbox.pub/mkstack" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">MKStack</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function ContributorBadge({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(pubkey);
  const profileImage = metadata?.picture;

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {profileImage ? (
        <img src={profileImage} alt={displayName} className="w-6 h-6 rounded-full" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <Users className="w-3 h-3 text-white" />
        </div>
      )}
      <span className="text-xs font-medium truncate">{displayName}</span>
    </div>
  );
}

export default Canvas100M;
