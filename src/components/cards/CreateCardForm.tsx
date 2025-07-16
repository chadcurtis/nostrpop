import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUpload } from './FileUpload';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { LoginArea } from '@/components/auth/LoginArea';
import { isAllowedCreator } from '@/config/creators';
import { Loader2, Sparkles, Lock, Share2 } from 'lucide-react';
import { nip19 } from 'nostr-tools';

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
  shareToNostr: boolean;
  shareMessage: string;
}

export function CreateCardForm() {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm<CardFormData>({
    defaultValues: {
      shareToNostr: true, // Default to sharing
      shareMessage: ''
    }
  });

  const watchedCategory = watch('category');
  const watchedShareToNostr = watch('shareToNostr');

  // Check if current user is allowed to create cards
  const canCreateCards = user && isAllowedCreator(user.pubkey);

  const onSubmit = (data: CardFormData) => {
    console.log('🎯 Form submitted with data:', data);

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create cards.",
        variant: "destructive"
      });
      return;
    }

    if (!canCreateCards) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create cards.",
        variant: "destructive"
      });
      return;
    }

    // Create unique identifier for the card
    const cardId = `card-${Date.now()}`;

    // Create tags for the card
    const tags = [
      ['d', cardId], // Unique identifier for addressable event
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

    // Create the card content
    const cardContent = {
      title: data.title,
      description: data.description,
      category: data.category,
      pricing: 'free', // Always free
      images: uploadedFiles,
      created_at: new Date().toISOString()
    };

    createEvent({
      kind: 30402, // Addressable event for cards
      content: JSON.stringify(cardContent),
      tags
    }, {
      onSuccess: (event) => {
        console.log('✅ Card created successfully:', event);
        toast({
          title: "Card Created! 🎉",
          description: "Your beautiful ecard has been created successfully.",
        });

        // Share to Nostr if requested
        if (data.shareToNostr) {
          console.log('📢 Sharing to Nostr...', { shareToNostr: data.shareToNostr, shareMessage: data.shareMessage });
          shareCardToNostr(event, data, cardId);
        } else {
          console.log('❌ Not sharing to Nostr (shareToNostr is false)');
        }

        reset();
        setUploadedFiles([]);
      },
      onError: (error) => {
        toast({
          title: "Creation Failed",
          description: "Failed to create card. Please try again.",
          variant: "destructive"
        });
        console.error('Card creation error:', error);
      }
    });
  };

  const shareCardToNostr = (cardEvent: { id: string }, formData: CardFormData, cardId: string) => {
    console.log('🚀 shareCardToNostr called with:', { cardEvent, formData, cardId });

    if (!user) {
      console.log('❌ No user found for sharing');
      return;
    }

    setIsSharing(true);

    try {
      // Generate naddr for the card
      const naddr = nip19.naddrEncode({
        identifier: cardId,
        pubkey: user.pubkey,
        kind: 30402,
      });

      // Create the card URL
      const cardUrl = `${window.location.origin}/card/${naddr}`;

      // Create share message
      const customMessage = formData.shareMessage.trim();
      const shareContent = customMessage
        ? `${customMessage}\n\n🎨 "${formData.title}"\n${cardUrl}\n\n#ecard #${formData.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`
        : `Just created a beautiful new ${formData.category} ecard! 🎨\n\n"${formData.title}"\n\n${cardUrl}\n\n#ecard #${formData.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      // Create kind 1 note to share the card
      createEvent({
        kind: 1,
        content: shareContent,
        tags: [
          ['t', 'ecard'],
          ['t', formData.category.toLowerCase().replace(/[^a-z0-9]/g, '')],
          ['e', cardEvent.id, '', 'mention'], // Reference the card event
          ['a', `30402:${user.pubkey}:${cardId}`, '', 'mention'], // Reference the addressable event
        ]
      }, {
        onSuccess: () => {
          console.log('✅ Successfully shared to Nostr');
          toast({
            title: "Shared to Nostr! 📢",
            description: "Your new ecard has been shared with the Nostr community.",
          });
          setIsSharing(false);
        },
        onError: (error) => {
          console.error('Share to Nostr error:', error);
          toast({
            title: "Share Failed",
            description: "Card was created but sharing to Nostr failed. You can share it manually later.",
            variant: "destructive"
          });
          setIsSharing(false);
        }
      });
    } catch (error) {
      console.error('Error generating share content:', error);
      toast({
        title: "Share Failed",
        description: "Failed to generate share content. You can share the card manually later.",
        variant: "destructive"
      });
      setIsSharing(false);
    }
  };

  if (!user) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <Sparkles className="h-12 w-12 mx-auto text-purple-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Create Amazing POP Cards</h3>
              <p className="text-muted-foreground">
                Log in to start creating beautiful digital cards for any occasion.
              </p>
            </div>
            <LoginArea className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canCreateCards) {
    return (
      <Card className="border-dashed border-2 border-red-200 dark:border-red-800">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <Lock className="h-12 w-12 mx-auto text-red-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-400">Access Restricted</h3>
              <p className="text-red-600 dark:text-red-300">
                POP Card creation is currently limited to authorized users only. You can still browse and enjoy all the beautiful cards created by others!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Card Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-medium">
          Ecard Title *
        </Label>
        <Input
          id="title"
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
        <Label htmlFor="description" className="text-base font-medium">
          Description *
        </Label>
        <Textarea
          id="description"
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
          onValueChange={(value) => setValue('category', value, { shouldValidate: true })}
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
        <input
          type="hidden"
          {...register('category', { required: 'Please select a category' })}
        />
        {errors.category && (
          <p className="text-sm text-red-500">{errors.category.message}</p>
        )}
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label className="text-base font-medium">
          Upload Images
        </Label>
        <FileUpload
          onFilesUploaded={setUploadedFiles}
          uploadedFiles={uploadedFiles}
        />
      </div>

      {/* Share to Nostr Option */}
      <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="shareToNostr"
            checked={watchedShareToNostr}
            onCheckedChange={(checked) => setValue('shareToNostr', !!checked, { shouldValidate: true })}
          />
          <input
            type="hidden"
            {...register('shareToNostr')}
          />
          <Label htmlFor="shareToNostr" className="text-base font-medium flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share to Nostr Community
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Automatically share your new ecard with the Nostr community to spread joy and showcase your creation.
        </p>

        {watchedShareToNostr && (
          <div className="space-y-2">
            <Label htmlFor="shareMessage" className="text-sm font-medium">
              Custom Share Message (optional)
            </Label>
            <Textarea
              id="shareMessage"
              placeholder="Add a personal message when sharing your card... (leave empty for default message)"
              rows={3}
              {...register('shareMessage')}
              className="text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground">
              If left empty, we'll create a nice default message for you.
            </p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          type="submit"
          size="lg"
          className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-medium"
          disabled={isPending || isSharing || !isValid}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Your Card...
            </>
          ) : isSharing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sharing to Nostr...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Create Beautiful POP Card
            </>
          )}
        </Button>

        {watchedShareToNostr && !isPending && !isSharing && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Your card will be created and then shared to the Nostr community
          </p>
        )}

        {(isPending || isSharing) && watchedShareToNostr && (
          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isPending ? 'Creating your beautiful card...' : 'Sharing to Nostr community...'}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}