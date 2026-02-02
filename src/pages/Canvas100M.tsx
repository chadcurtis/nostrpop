import { useState, useRef, useEffect, useCallback } from 'react';
import { useSeoMeta } from '@unhead/react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { LoginArea } from '@/components/auth/LoginArea';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { useToast } from '@/hooks/useToast';
import { RelaySelector } from '@/components/RelaySelector';
import { useLightningPayment } from '@/hooks/usePayment';
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
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Sparkles
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
  blockHeight?: number;
}

interface PendingPixel extends PixelData {
  id: string;
}

function Canvas100M() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const { createInvoice, invoice, isLoading: paymentLoading, clearInvoice } = useLightningPayment();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState('#FF00FF');
  const [pendingPixels, setPendingPixels] = useState<PendingPixel[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [payingWithAlby, setPayingWithAlby] = useState(false);
  
  // Display settings
  const DISPLAY_SIZE = 500; // Canvas element size in pixels
  const [viewSize, setViewSize] = useState(500); // How many canvas pixels to show (zoom level)
  const [viewX, setViewX] = useState(0); // Top-left X coordinate of viewport
  const [viewY, setViewY] = useState(0); // Top-left Y coordinate of viewport
  
  // Image upload
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [imageScale, setImageScale] = useState(100);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  // Fetch current Bitcoin block height
  useEffect(() => {
    const fetchBlockHeight = async () => {
      try {
        const response = await fetch('https://blockchain.info/q/getblockcount');
        const blockHeight = await response.json();
        setCurrentBlockHeight(blockHeight);
      } catch (error) {
        console.error('Failed to fetch block height:', error);
        // Fallback to a reasonable estimate if API fails
        setCurrentBlockHeight(null);
      }
    };

    fetchBlockHeight();
    // Refresh every 10 minutes (average block time is ~10 min)
    const interval = setInterval(fetchBlockHeight, 600000);
    return () => clearInterval(interval);
  }, []);

  // Generate QR code when invoice is created
  useEffect(() => {
    if (invoice && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        invoice.payment_request,
        {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [invoice]);

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
            const blockTag = event.tags.find(([name]) => name === 'block')?.[1];

            if (!xTag || !yTag || !colorTag) return null;

            return {
              x: parseInt(xTag),
              y: parseInt(yTag),
              color: colorTag,
              author: event.pubkey,
              timestamp: event.created_at,
              blockHeight: blockTag ? parseInt(blockTag) : undefined
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

  // Draw the viewport
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);

    // Calculate scale factor (how many display pixels per canvas pixel)
    const scale = DISPLAY_SIZE / viewSize;

    // Draw grid (every 10 canvas pixels)
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    const gridSpacing = 10 * scale;
    for (let i = 0; i <= DISPLAY_SIZE; i += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, DISPLAY_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(DISPLAY_SIZE, i);
      ctx.stroke();
    }

    // Draw existing pixels
    if (pixels) {
      pixels.forEach(pixel => {
        // Convert from global coordinates to viewport coordinates
        const localX = (pixel.x - viewX) * scale;
        const localY = (pixel.y - viewY) * scale;
        
        // Only draw if in viewport
        if (pixel.x >= viewX && pixel.x < viewX + viewSize && pixel.y >= viewY && pixel.y < viewY + viewSize) {
          ctx.fillStyle = pixel.color;
          ctx.fillRect(localX, localY, scale, scale);
        }
      });
    }

    // Draw pending pixels
    pendingPixels.forEach(pixel => {
      const localX = (pixel.x - viewX) * scale;
      const localY = (pixel.y - viewY) * scale;
      
      if (pixel.x >= viewX && pixel.x < viewX + viewSize && pixel.y >= viewY && pixel.y < viewY + viewSize) {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(localX, localY, scale, scale);
      }
    });

    // Draw image preview if uploaded
    if (uploadedImage) {
      const scaledWidth = Math.floor((uploadedImage.width * imageScale) / 100);
      const scaledHeight = Math.floor((uploadedImage.height * imageScale) / 100);
      const maxDimension = 100;
      const imgScale = Math.min(1, maxDimension / Math.max(scaledWidth, scaledHeight));
      const finalWidth = Math.floor(scaledWidth * imgScale);
      const finalHeight = Math.floor(scaledHeight * imgScale);
      
      // Check if image is in viewport
      if (imagePosition.x + finalWidth >= viewX && imagePosition.x < viewX + viewSize &&
          imagePosition.y + finalHeight >= viewY && imagePosition.y < viewY + viewSize) {
        const imgX = (imagePosition.x - viewX) * scale;
        const imgY = (imagePosition.y - viewY) * scale;
        const imgW = finalWidth * scale;
        const imgH = finalHeight * scale;
        
        ctx.globalAlpha = 0.7;
        ctx.drawImage(uploadedImage, imgX, imgY, imgW, imgH);
        ctx.globalAlpha = 1.0;
      }
    }
  }, [pixels, pendingPixels, viewX, viewY, viewSize, uploadedImage, imageScale, imagePosition]);

  // Navigation
  const moveView = (dx: number, dy: number) => {
    setViewX(prev => Math.max(0, Math.min(CANVAS_WIDTH - viewSize, prev + dx)));
    setViewY(prev => Math.max(0, Math.min(CANVAS_HEIGHT - viewSize, prev + dy)));
  };

  const handleZoomIn = () => {
    setViewSize(prev => {
      const newSize = Math.max(50, Math.floor(prev / 2));
      // Adjust viewport to keep it centered
      setViewX(x => Math.max(0, Math.min(CANVAS_WIDTH - newSize, x + (prev - newSize) / 2)));
      setViewY(y => Math.max(0, Math.min(CANVAS_HEIGHT - newSize, y + (prev - newSize) / 2)));
      return newSize;
    });
  };

  const handleZoomOut = () => {
    setViewSize(prev => {
      const newSize = Math.min(5000, prev * 2);
      // Adjust viewport to keep it centered
      setViewX(x => Math.max(0, Math.min(CANVAS_WIDTH - newSize, x - (newSize - prev) / 2)));
      setViewY(y => Math.max(0, Math.min(CANVAS_HEIGHT - newSize, y - (newSize - prev) / 2)));
      return newSize;
    });
  };



  // Handle canvas click - SIMPLE AND DIRECT
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Don't paint if image is loaded (use Apply button instead)
    if (uploadedImage) return;

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
    
    // Get click coordinates relative to canvas element
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert to pixel coordinates within the viewport
    const scale = DISPLAY_SIZE / viewSize;
    const localX = Math.floor(clickX / rect.width * DISPLAY_SIZE / scale);
    const localY = Math.floor(clickY / rect.height * DISPLAY_SIZE / scale);
    
    // Convert to global canvas coordinates
    const globalX = viewX + localX;
    const globalY = viewY + localY;

    // Bounds check
    if (globalX < 0 || globalX >= CANVAS_WIDTH || globalY < 0 || globalY >= CANVAS_HEIGHT) {
      return;
    }

    // Check if already painted
    const isAlreadyPainted = pixels?.some(p => p.x === globalX && p.y === globalY);
    if (isAlreadyPainted) {
      toast({
        title: "Pixel Already Painted",
        description: "Someone already painted here!",
        variant: "destructive"
      });
      return;
    }

    // Check if in pending
    const existingIndex = pendingPixels.findIndex(p => p.x === globalX && p.y === globalY);
    
    const newPixel: PendingPixel = {
      id: `${Date.now()}-${Math.random()}`,
      x: globalX,
      y: globalY,
      color: selectedColor,
      author: user.pubkey,
      timestamp: Math.floor(Date.now() / 1000),
      blockHeight: currentBlockHeight || undefined
    };

    if (existingIndex >= 0) {
      setPendingPixels(prev => {
        const updated = [...prev];
        updated[existingIndex] = newPixel;
        return updated;
      });
    } else {
      setPendingPixels(prev => [...prev, newPixel]);
    }

    toast({
      title: "✓ Pixel Added",
      description: `Position: (${globalX}, ${globalY})`,
    });
  }, [user, selectedColor, pixels, pendingPixels, toast, currentBlockHeight, viewX, viewY, viewSize, uploadedImage]);

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setUploadedImage(img);
        setImagePosition({ x: viewX + 50, y: viewY + 50 }); // Start near current view
        toast({
          title: "Image Loaded",
          description: "Position the image, then click 'Apply to Canvas'.",
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Apply image to canvas as pixels
  const handleApplyImage = () => {
    if (!uploadedImage || !user) return;

    try {
      const tempCanvas = document.createElement('canvas');
      const scaledWidth = Math.floor((uploadedImage.width * imageScale) / 100);
      const scaledHeight = Math.floor((uploadedImage.height * imageScale) / 100);
      
      const maxDimension = 100;
      const scale = Math.min(1, maxDimension / Math.max(scaledWidth, scaledHeight));
      const finalWidth = Math.floor(scaledWidth * scale);
      const finalHeight = Math.floor(scaledHeight * scale);
      
      tempCanvas.width = finalWidth;
      tempCanvas.height = finalHeight;
      
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.drawImage(uploadedImage, 0, 0, finalWidth, finalHeight);
      const imageData = tempCtx.getImageData(0, 0, finalWidth, finalHeight);
      const newPixels: PendingPixel[] = [];
      
      for (let y = 0; y < finalHeight; y++) {
        for (let x = 0; x < finalWidth; x++) {
          const index = (y * finalWidth + x) * 4;
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];
          const a = imageData.data[index + 3];
          
          if (a < 128) continue;
          
          const canvasX = imagePosition.x + x;
          const canvasY = imagePosition.y + y;
          
          if (canvasX < 0 || canvasX >= CANVAS_WIDTH || canvasY < 0 || canvasY >= CANVAS_HEIGHT) continue;
          
          const isInNewPixels = newPixels.some(p => p.x === canvasX && p.y === canvasY);
          if (isInNewPixels) continue;
          
          const isAlreadyPainted = pixels?.some(p => p.x === canvasX && p.y === canvasY) || 
                                   pendingPixels.some(p => p.x === canvasX && p.y === canvasY);
          if (isAlreadyPainted) continue;
          
          const color = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          
          newPixels.push({
            id: `${Date.now()}-${x}-${y}`,
            x: canvasX,
            y: canvasY,
            color,
            author: user.pubkey,
            timestamp: Math.floor(Date.now() / 1000),
            blockHeight: currentBlockHeight || undefined
          });
        }
      }

      setPendingPixels(prev => [...prev, ...newPixels]);
      setUploadedImage(null);
      
      toast({
        title: "Image Applied!",
        description: `${newPixels.length} pixels added to your canvas!`,
      });
    } catch (error) {
      console.error('Failed to apply image:', error);
      toast({
        title: "Image Application Failed",
        description: "Failed to convert image to pixels.",
        variant: "destructive"
      });
    }
  };

  // Undo last pixel
  const handleUndo = () => {
    setPendingPixels(prev => prev.slice(0, -1));
  };

  // Clear all pending pixels
  const handleClear = () => {
    setPendingPixels([]);
    setShowPreview(false);
  };

  // Start fresh - clear pending pixels and move to empty area
  const handleStartFresh = () => {
    setPendingPixels([]);
    setShowPreview(false);
    setUploadedImage(null);
    // Move to a random empty area of the canvas
    const randomX = Math.floor(Math.random() * (CANVAS_WIDTH - viewSize));
    const randomY = Math.floor(Math.random() * (CANVAS_HEIGHT - viewSize));
    setViewX(randomX);
    setViewY(randomY);
    toast({
      title: "Canvas Reset",
      description: "Moved to a fresh area. Start painting!",
    });
  };

  // Publish pixels to Nostr
  const handlePublish = async () => {
    if (!user || pendingPixels.length === 0) return;

    const totalSats = pendingPixels.length * SAT_PER_PIXEL;

    try {
      // Create Lightning invoice for payment
      await createInvoice({
        amount: totalSats,
        currency: 'SAT',
        description: `${pendingPixels.length} pixel${pendingPixels.length > 1 ? 's' : ''} on 100M Canvas`,
        productId: 'canvas-pixels'
      });

      setShowPaymentDialog(true);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast({
        title: "Payment Error",
        description: "Failed to create Lightning invoice. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Pay with Alby extension
  const handlePayWithAlby = async () => {
    if (!invoice) return;

    setPayingWithAlby(true);
    try {
      // Check if WebLN is available (Alby extension)
      if (typeof window.webln !== 'undefined') {
        await window.webln.enable();
        const result = await window.webln.sendPayment(invoice.payment_request);
        
        if (result.preimage) {
          toast({
            title: "Payment Successful! ⚡",
            description: "Publishing your pixels to Nostr...",
          });
          await publishPixelsToNostr();
        }
      } else {
        toast({
          title: "Alby Not Found",
          description: "Please install the Alby browser extension to use this feature.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Alby payment error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process payment with Alby.",
        variant: "destructive"
      });
    } finally {
      setPayingWithAlby(false);
    }
  };

  // Actually publish pixels after payment
  const publishPixelsToNostr = async () => {
    if (!user || pendingPixels.length === 0) return;

    try {
      // Create events for each pixel
      const events = pendingPixels.map(pixel => ({
        kind: CANVAS_PIXEL_KIND,
        content: JSON.stringify({
          x: pixel.x,
          y: pixel.y,
          color: pixel.color,
          block_height: pixel.blockHeight
        }),
        tags: [
          ['d', `${pixel.x}-${pixel.y}`], // Unique identifier for this pixel
          ['x', pixel.x.toString()],
          ['y', pixel.y.toString()],
          ['color', pixel.color],
          ['t', '100m-canvas'],
          ...(pixel.blockHeight ? [['block', pixel.blockHeight.toString()]] : []),
          ['alt', `Painted pixel at (${pixel.x}, ${pixel.y}) on the 100M Canvas at Bitcoin block ${pixel.blockHeight || 'unknown'}`]
        ],
        created_at: pixel.timestamp,
      }));

      // Sign and publish all events
      for (const eventData of events) {
        const signedEvent = await user.signer.signEvent(eventData);
        await nostr.event(signedEvent, { signal: AbortSignal.timeout(5000) });
      }

      toast({
        title: "Pixels Published! ⚡",
        description: `${pendingPixels.length} pixels published successfully!`,
      });

      // Clear pending pixels and refetch
      setPendingPixels([]);
      setShowPreview(false);
      setShowPaymentDialog(false);
      clearInvoice();
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
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-4">
            A collaborative art project on Nostr. Paint pixel by pixel on a 100 million pixel canvas!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm mb-6">
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
            {currentBlockHeight && (
              <Badge variant="secondary" className="text-base px-4 py-2 bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                <div className="w-2 h-2 rounded-full bg-orange-500 mr-2 animate-pulse" />
                Block: {currentBlockHeight.toLocaleString()}
              </Badge>
            )}
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
                    <span className="text-sm text-muted-foreground min-w-20 text-center">
                      {viewSize}x{viewSize}px
                    </span>
                    <Button variant="outline" size="sm" onClick={handleZoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <div className="ml-4 flex items-center space-x-1">
                      <Button variant="outline" size="sm" onClick={() => moveView(-50, 0)}>
                        ←
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => moveView(0, -50)}>
                        ↑
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => moveView(0, 50)}>
                        ↓
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => moveView(50, 0)}>
                        →
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleStartFresh}
                      className="ml-4"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      New Canvas
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pixelsLoading ? (
                  <Skeleton className="w-full aspect-square" />
                ) : (
                  <div className="relative">
                    <div className="text-xs text-muted-foreground mb-2 flex justify-between">
                      <span>Viewport: ({viewX}, {viewY}) to ({viewX + viewSize}, {viewY + viewSize})</span>
                      <span>Zoom: {(500 / viewSize * 100).toFixed(0)}%</span>
                    </div>
                    <div className="border-2 border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden bg-white">
                      <canvas
                        ref={canvasRef}
                        width={DISPLAY_SIZE}
                        height={DISPLAY_SIZE}
                        onClick={handleCanvasClick}
                        className="w-full h-full"
                        style={{ 
                          imageRendering: 'pixelated',
                          cursor: uploadedImage ? 'default' : 'crosshair'
                        }}
                      />
                    </div>
                  </div>
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
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Your Pixels:</h4>
                        {pendingPixels[0]?.blockHeight && (
                          <Badge variant="secondary" className="text-xs">
                            Block: {pendingPixels[0].blockHeight.toLocaleString()}
                          </Badge>
                        )}
                      </div>
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
            {/* Image Upload */}
            <Card className="border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="h-5 w-5 mr-2" />
                  Upload Image
                </CardTitle>
                <CardDescription>
                  {uploadedImage ? 'Position your image on canvas' : 'Upload an image and convert it to pixels'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!uploadedImage && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/20 dark:file:text-purple-300"
                    disabled={!user}
                  />
                )}
                
                {uploadedImage && (
                  <div className="space-y-3">
                    <div className="aspect-square border-2 border-purple-200 rounded-lg overflow-hidden bg-white">
                      <img 
                        src={uploadedImage.src} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium mb-1 block">Scale: {imageScale}%</label>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        value={imageScale}
                        onChange={(e) => setImageScale(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium mb-1 block">X: {imagePosition.x}</label>
                        <div className="flex space-x-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setImagePosition(prev => ({ ...prev, x: Math.max(0, prev.x - 10) }))}
                            className="flex-1"
                          >
                            ←
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setImagePosition(prev => ({ ...prev, x: Math.min(CANVAS_WIDTH - 100, prev.x + 10) }))}
                            className="flex-1"
                          >
                            →
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Y: {imagePosition.y}</label>
                        <div className="flex space-x-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setImagePosition(prev => ({ ...prev, y: Math.max(0, prev.y - 10) }))}
                            className="flex-1"
                          >
                            ↑
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setImagePosition(prev => ({ ...prev, y: Math.min(CANVAS_HEIGHT - 100, prev.y + 10) }))}
                            className="flex-1"
                          >
                            ↓
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setUploadedImage(null)}
                        className="flex-1"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleApplyImage}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Apply to Canvas
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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

        {/* About Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
            About the 100M Canvas
          </h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50/50 to-yellow-50/50 dark:from-orange-900/10 dark:to-yellow-900/10">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-700 dark:text-orange-300">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center mr-3">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  Why 100 Million Pixels?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-orange-600 dark:text-orange-400 leading-relaxed">
                  <strong>100 million satoshis = 1 Bitcoin.</strong> This canvas is a living demonstration of Bitcoin's divisibility and the power of micropayments. Each pixel represents one satoshi, making this a 1 BTC artwork when complete! Every pixel is timestamped with the Bitcoin block height for eternal proof of creation.
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-700 dark:text-purple-300">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  The Power of Decentralization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-purple-600 dark:text-purple-400 leading-relaxed">
                  This project showcases the power of <strong>Nostr</strong> (decentralized social protocol), <strong>Lightning Network</strong> (instant Bitcoin payments), and <strong>collaborative art</strong>—all without centralized control. Your pixels are stored on Nostr relays, owned by you forever.
                </p>
              </CardContent>
            </Card>

            <Card className="border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50/50 to-red-50/50 dark:from-pink-900/10 dark:to-red-900/10">
              <CardHeader>
                <CardTitle className="flex items-center text-pink-700 dark:text-pink-300">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center mr-3">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  Art Meets Technology
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-pink-600 dark:text-pink-400 leading-relaxed">
                  Every pixel you paint is a Nostr event, timestamped and cryptographically signed. No one can paint over your pixels—they're protected by the protocol. This is digital art with true ownership and permanence.
                </p>
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-500" />
              Pay with Lightning
            </DialogTitle>
            <DialogDescription>
              Scan this invoice with your Lightning wallet to publish your pixels
            </DialogDescription>
          </DialogHeader>
          
          {invoice ? (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-orange-600">
                    {invoice.amount_sats.toLocaleString()} sats
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {pendingPixels.length} pixel{pendingPixels.length > 1 ? 's' : ''} × {SAT_PER_PIXEL} sat
                  </div>
                </div>

                {/* QR Code */}
                <div className="bg-white rounded-lg flex items-center justify-center mb-4 p-4">
                  <canvas
                    ref={qrCanvasRef}
                    className="max-w-full h-auto"
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(invoice.payment_request);
                    toast({
                      title: "Invoice Copied!",
                      description: "Paste it into your Lightning wallet to pay.",
                    });
                  }}
                >
                  Copy Invoice
                </Button>
              </div>

              {/* Alby Payment Button */}
              <Button
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-semibold"
                onClick={handlePayWithAlby}
                disabled={payingWithAlby}
              >
                {payingWithAlby ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Pay with Alby
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPaymentDialog(false);
                    clearInvoice();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={publishPixelsToNostr}
                >
                  <Check className="h-4 w-4 mr-2" />
                  I've Paid
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Scan QR code or click "I've Paid" after sending payment
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Creating invoice...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
