import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from './FileUpload';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Edit, Loader2, Save } from 'lucide-react';
import { isAllowedCreator } from '@/config/creators';
import type { NostrEvent } from '@nostrify/nostrify';

const CARD_CATEGORIES = [
  'GM/GN',
  'Fun',
  'Birthday',
  'Thank You',
  'Holiday',
  'Get Well Soon',
  'Congratulations',
  'Sympathy',
  'Anniversary',
  'Wedding',
  'Engagement',
  'Baby/New Baby',
  'Love/Romance',
  'Friendship',
  'Thinking of You',
  'Farewell/Goodbye',
  'Graduation',
  'Humor/Funny',
  'Inspiration/Motivation',
  "Mother's & Father's Day",
  'Others'
];



interface CardFormData {
  title: string;
  description: string;
  category: string;
}

interface CardData {
  title: string;
  description: string;
  category: string;
  pricing: string;
  images: string[];
  created_at: string;
}

interface EditCardDialogProps {
  cardEvent: NostrEvent;
  cardData: CardData;
  onCardUpdated?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditCardDialog({ cardEvent, cardData, onCardUpdated, children, open, onOpenChange }: EditCardDialogProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(cardData.images || []);
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm<CardFormData>({
    defaultValues: {
      title: cardData.title,
      description: cardData.description,
      category: cardData.category
    }
  });

  const watchedCategory = watch('category');

  // Check if current user is allowed to edit cards
  const canEditCards = user && isAllowedCreator(user.pubkey);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      reset({
        title: cardData.title,
        description: cardData.description,
        category: cardData.category
      });
      setUploadedFiles(cardData.images || []);
    }
  }, [isOpen, cardData, reset]);

  const onSubmit = (data: CardFormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to edit cards.",
        variant: "destructive"
      });
      return;
    }

    // Check if user owns this card and is allowed to edit
    if (cardEvent.pubkey !== user.pubkey) {
      toast({
        title: "Permission Denied",
        description: "You can only edit your own cards.",
        variant: "destructive"
      });
      return;
    }

    if (!canEditCards) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit cards.",
        variant: "destructive"
      });
      return;
    }

    // Get the original 'd' tag value to maintain the same identifier
    const dTag = cardEvent.tags.find(([name]) => name === 'd')?.[1];
    if (!dTag) {
      toast({
        title: "Error",
        description: "Card identifier not found.",
        variant: "destructive"
      });
      return;
    }

    // Create tags for the updated card
    const tags = [
      ['d', dTag], // Keep the same identifier for addressable event
      ['title', data.title],
      ['category', data.category],
      ['pricing', 'free'], // Always free
      ['t', 'ecard'], // For filtering
      ['t', data.category.toLowerCase().replace(/[^a-z0-9]/g, '')], // Category tag
    ];

    // Add image tags if files were uploaded
    uploadedFiles.forEach(url => {
      tags.push(['image', url]);
    });

    // Create the updated card content
    const updatedCardContent = {
      title: data.title,
      description: data.description,
      category: data.category,
      pricing: 'free', // Always free
      images: uploadedFiles,
      created_at: cardData.created_at, // Keep original creation date
      updated_at: new Date().toISOString() // Add update timestamp
    };

    createEvent({
      kind: 30402, // Same addressable event kind
      content: JSON.stringify(updatedCardContent),
      tags
    }, {
      onSuccess: () => {
        toast({
          title: "Card Updated! ✨",
          description: "Your card has been successfully updated.",
        });
        setIsOpen(false);
        onCardUpdated?.();
      },
      onError: (error) => {
        toast({
          title: "Update Failed",
          description: "Failed to update card. Please try again.",
          variant: "destructive"
        });
        console.error('Card update error:', error);
      }
    });
  };

  // Only show edit option if user owns the card and is allowed to edit
  if (!user || cardEvent.pubkey !== user.pubkey || !canEditCards) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        {children || (
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Card
          </DialogTitle>
          <DialogDescription>
            Make changes to your card. This will update the existing card.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Card Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-base font-medium">
              Card Title *
            </Label>
            <Input
              id="edit-title"
              placeholder="Enter a catchy title for your card..."
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 3, message: 'Title must be at least 3 characters' }
              })}
              className="text-base"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description" className="text-base font-medium">
              Description *
            </Label>
            <Textarea
              id="edit-description"
              placeholder="Write a heartfelt message or description for your card..."
              rows={4}
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 10, message: 'Description must be at least 10 characters' }
              })}
              className="text-base resize-none"
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label className="text-base font-medium">
              Choose Category *
            </Label>
            <Select
              value={watchedCategory}
              onValueChange={(value) => setValue('category', value)}
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select a category for your card..." />
              </SelectTrigger>
              <SelectContent>
                {CARD_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">Please select a category</p>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label className="text-base font-medium">
              Update Images
            </Label>
            <FileUpload
              onFilesUploaded={setUploadedFiles}
              uploadedFiles={uploadedFiles}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium"
              disabled={isPending || !isValid}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Card
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}