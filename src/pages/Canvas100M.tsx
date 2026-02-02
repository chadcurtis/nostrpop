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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedColor, setSelectedColor] = useState('#FF00FF');
  const [zoom, setZoom] = useState(33.3); // Start at 333% (33.3x) to clearly see pixels
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [pendingPixels, setPendingPixels] = useState<PendingPixel[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [imageScale, setImageScale] = useState(100);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null);

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

  // Draw canvas (base pixels with grid background)
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // First, fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid lines for better visibility
    const gridSize = 100; // Grid every 100 pixels
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw existing pixels on top of the grid
    if (pixels) {
      pixels.forEach(pixel => {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(pixel.x, pixel.y, 1, 1);
      });
    }
  }, [pixels]);

  // Draw overlay (pending pixels + image preview) - updates independently for live preview
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
      
      // Add a bright border for better visibility when zoomed in
      if (zoom >= 5) {
        overlayCtx.strokeStyle = '#FFFFFF';
        overlayCtx.lineWidth = 0.2;
        overlayCtx.strokeRect(pixel.x, pixel.y, 1, 1);
      }
    });

    // Draw image preview overlay if image is loaded
    if (uploadedImage) {
      const scaledWidth = Math.floor((uploadedImage.width * imageScale) / 100);
      const scaledHeight = Math.floor((uploadedImage.height * imageScale) / 100);
      
      // Limit size
      const maxDimension = 100;
      const scale = Math.min(1, maxDimension / Math.max(scaledWidth, scaledHeight));
      const finalWidth = Math.floor(scaledWidth * scale);
      const finalHeight = Math.floor(scaledHeight * scale);
      
      // Draw semi-transparent image preview
      overlayCtx.globalAlpha = 0.7;
      overlayCtx.drawImage(
        uploadedImage,
        imagePosition.x,
        imagePosition.y,
        finalWidth,
        finalHeight
      );
      overlayCtx.globalAlpha = 1.0;
      
      // Draw border around image preview
      overlayCtx.strokeStyle = '#8B5CF6'; // Purple border
      overlayCtx.lineWidth = 2;
      overlayCtx.strokeRect(imagePosition.x, imagePosition.y, finalWidth, finalHeight);
      
      // Draw corner handles for resizing
      const handleSize = 10;
      overlayCtx.fillStyle = '#8B5CF6';
      // Top-left
      overlayCtx.fillRect(imagePosition.x - handleSize/2, imagePosition.y - handleSize/2, handleSize, handleSize);
      // Top-right
      overlayCtx.fillRect(imagePosition.x + finalWidth - handleSize/2, imagePosition.y - handleSize/2, handleSize, handleSize);
      // Bottom-left
      overlayCtx.fillRect(imagePosition.x - handleSize/2, imagePosition.y + finalHeight - handleSize/2, handleSize, handleSize);
      // Bottom-right
      overlayCtx.fillRect(imagePosition.x + finalWidth - handleSize/2, imagePosition.y + finalHeight - handleSize/2, handleSize, handleSize);
    }
  }, [pendingPixels, zoom, uploadedImage, imageScale, imagePosition]);

  // Update view canvas for better preview
  useEffect(() => {
    if (!viewCanvasRef.current || !canvasRef.current || !overlayCanvasRef.current) return;
    
    const viewCanvas = viewCanvasRef.current;
    const viewCtx = viewCanvas.getContext('2d');
    
    if (!viewCtx) return;

    // Draw base pixels
    viewCtx.drawImage(canvasRef.current, 0, 0);
    
    // Draw pending pixels on top
    if (overlayCanvasRef.current) {
      viewCtx.drawImage(overlayCanvasRef.current, 0, 0);
    }
  }, [pixels, pendingPixels]);

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

  // Handle canvas mouse down for image dragging or pixel painting
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    
    // Get click position relative to the canvas container
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // The transform is: scale(zoom) translate(pan.x, pan.y) with origin at (0,0)
    // To reverse: subtract pan (which is in zoomed pixels), then divide by zoom
    // Then convert from container coordinates to canvas pixel coordinates
    const containerSize = rect.width; // Square container
    
    // Reverse the transformations
    const canvasX = (clickX - pan.x * zoom) / zoom;
    const canvasY = (clickY - pan.y * zoom) / zoom;
    
    // Convert from container coordinates to canvas pixel coordinates
    const x = Math.floor((canvasX / containerSize) * CANVAS_WIDTH);
    const y = Math.floor((canvasY / containerSize) * CANVAS_HEIGHT);

    // If image is loaded, check if click is on the image to start dragging
    if (uploadedImage) {
      const scaledWidth = Math.floor((uploadedImage.width * imageScale) / 100);
      const scaledHeight = Math.floor((uploadedImage.height * imageScale) / 100);
      const maxDimension = 100;
      const scale = Math.min(1, maxDimension / Math.max(scaledWidth, scaledHeight));
      const finalWidth = Math.floor(scaledWidth * scale);
      const finalHeight = Math.floor(scaledHeight * scale);
      
      // Check if click is within image bounds
      if (x >= imagePosition.x && x <= imagePosition.x + finalWidth &&
          y >= imagePosition.y && y <= imagePosition.y + finalHeight) {
        setIsDraggingImage(true);
        setDragStart({ x: x - imagePosition.x, y: y - imagePosition.y });
        return;
      }
    }
  }, [uploadedImage, imageScale, imagePosition]);

  // Handle canvas mouse move for image dragging
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!isDraggingImage || !uploadedImage) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const containerSize = rect.width;
    
    // Reverse the transformations
    const canvasX = (clickX - pan.x * zoom) / zoom;
    const canvasY = (clickY - pan.y * zoom) / zoom;
    
    // Convert to canvas pixel coordinates
    const x = Math.floor((canvasX / containerSize) * CANVAS_WIDTH);
    const y = Math.floor((canvasY / containerSize) * CANVAS_HEIGHT);

    // Update image position
    setImagePosition({
      x: Math.max(0, Math.min(x - dragStart.x, CANVAS_WIDTH - 100)),
      y: Math.max(0, Math.min(y - dragStart.y, CANVAS_HEIGHT - 100))
    });
  }, [isDraggingImage, uploadedImage, dragStart]);

  // Handle canvas mouse up
  const handleCanvasMouseUp = useCallback(() => {
    setIsDraggingImage(false);
  }, []);

  // Handle canvas click to paint pixel
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    // Don't paint if we were dragging an image
    if (isDraggingImage) return;
    
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
    
    // Get click position relative to the canvas container
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const containerSize = rect.width;
    
    // Reverse the transformations: subtract pan (in zoomed pixels), then divide by zoom
    const canvasX = (clickX - pan.x * zoom) / zoom;
    const canvasY = (clickY - pan.y * zoom) / zoom;
    
    // Convert to canvas pixel coordinates
    const x = Math.floor((canvasX / containerSize) * CANVAS_WIDTH);
    const y = Math.floor((canvasY / containerSize) * CANVAS_HEIGHT);

    // Bounds check
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
      console.log(`Out of bounds: (${x}, ${y})`);
      return;
    }

    // Check if pixel is already painted (more lenient check)
    const isAlreadyPainted = pixels?.some(p => p.x === x && p.y === y);

    if (isAlreadyPainted) {
      toast({
        title: "Pixel Already Painted",
        description: "You can't paint over someone else's pixel!",
        variant: "destructive"
      });
      return;
    }

    // Check if already in pending pixels (allow re-painting your own pending pixels with new color)
    const existingPendingIndex = pendingPixels.findIndex(p => p.x === x && p.y === y);
    
    // Add to pending pixels
    const newPixel: PendingPixel = {
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      color: selectedColor,
      author: user.pubkey,
      timestamp: Math.floor(Date.now() / 1000),
      blockHeight: currentBlockHeight || undefined
    };

    if (existingPendingIndex >= 0) {
      // Replace existing pending pixel with new color
      setPendingPixels(prev => {
        const updated = [...prev];
        updated[existingPendingIndex] = newPixel;
        return updated;
      });
      console.log(`Pixel updated at (${x}, ${y}) with color ${selectedColor}`);
    } else {
      // Add new pending pixel
      setPendingPixels(prev => [...prev, newPixel]);
      console.log(`Pixel painted at (${x}, ${y}) at Bitcoin block ${currentBlockHeight || 'unknown'}`);
    }
  }, [user, selectedColor, pixels, pendingPixels, toast, currentBlockHeight, isDraggingImage, uploadedImage]);

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
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 50));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.1));

  // Arrow key controls for image position
  useEffect(() => {
    if (!uploadedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1; // Shift for faster movement
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setImagePosition(prev => ({ ...prev, y: Math.max(0, prev.y - step) }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setImagePosition(prev => ({ ...prev, y: Math.min(CANVAS_HEIGHT - 100, prev.y + step) }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setImagePosition(prev => ({ ...prev, x: Math.max(0, prev.x - step) }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setImagePosition(prev => ({ ...prev, x: Math.min(CANVAS_WIDTH - 100, prev.x + step) }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uploadedImage]);

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
        setImagePosition({ x: 100, y: 100 }); // Start at a visible position
        toast({
          title: "Image Loaded",
          description: "Drag the image on canvas or use arrow keys to position it. Then click 'Apply to Canvas'.",
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
      // Create temporary canvas to process image
      const tempCanvas = document.createElement('canvas');
      const scaledWidth = Math.floor((uploadedImage.width * imageScale) / 100);
      const scaledHeight = Math.floor((uploadedImage.height * imageScale) / 100);
      
      // Limit size to prevent too many pixels at once
      const maxDimension = 100;
      const scale = Math.min(1, maxDimension / Math.max(scaledWidth, scaledHeight));
      const finalWidth = Math.floor(scaledWidth * scale);
      const finalHeight = Math.floor(scaledHeight * scale);
      
      tempCanvas.width = finalWidth;
      tempCanvas.height = finalHeight;
      
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Draw scaled image
      tempCtx.drawImage(uploadedImage, 0, 0, finalWidth, finalHeight);
      
      // Get pixel data
      const imageData = tempCtx.getImageData(0, 0, finalWidth, finalHeight);
      const newPixels: PendingPixel[] = [];
      
      // Convert image to pixels
      for (let y = 0; y < finalHeight; y++) {
        for (let x = 0; x < finalWidth; x++) {
          const index = (y * finalWidth + x) * 4;
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];
          const a = imageData.data[index + 3];
          
          // Skip transparent pixels
          if (a < 128) continue;
          
          const canvasX = imagePosition.x + x;
          const canvasY = imagePosition.y + y;
          
          // Skip if out of bounds
          if (canvasX < 0 || canvasX >= CANVAS_WIDTH || canvasY < 0 || canvasY >= CANVAS_HEIGHT) continue;
          
          // Check if already painted (don't skip, just don't add duplicates in this batch)
          const isInNewPixels = newPixels.some(p => p.x === canvasX && p.y === canvasY);
          if (isInNewPixels) continue;
          
          // Check if already on canvas or pending
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
                    <span className="text-sm text-muted-foreground min-w-16 text-center">{Math.round(zoom * 100)}%</span>
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
                  <>
                    <div className="relative overflow-hidden border-2 border-purple-200 dark:border-purple-800 rounded-lg bg-white dark:bg-gray-800">
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
                        {/* Base canvas - permanent pixels with grid background */}
                        <canvas
                          ref={canvasRef}
                          width={CANVAS_WIDTH}
                          height={CANVAS_HEIGHT}
                          className="absolute top-0 left-0 w-full h-full pointer-events-none"
                          style={{ imageRendering: 'pixelated', backgroundColor: 'transparent' }}
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
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                          className="absolute top-0 left-0 w-full h-full"
                          style={{ 
                            touchAction: 'none',
                            cursor: uploadedImage ? (isDraggingImage ? 'grabbing' : 'grab') : 'crosshair'
                          }}
                        />
                      </div>
                    </div>
                  </>
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
                    
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg text-xs space-y-1">
                      <p className="font-semibold text-purple-700 dark:text-purple-300">💡 Position Controls:</p>
                      <p>• <strong>Drag</strong> on canvas to move</p>
                      <p>• <strong>Arrow keys</strong> for precise position</p>
                      <p>• Hold <strong>Shift</strong> for faster movement</p>
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
                        onClick={handleApplyImage} 
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        size="sm"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Apply to Canvas
                      </Button>
                      <Button 
                        onClick={() => {
                          setUploadedImage(null);
                          setImagePosition({ x: 0, y: 0 });
                        }} 
                        variant="outline"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {!user && (
                  <p className="text-xs text-muted-foreground">Login required to upload images</p>
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
