import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useToast } from '@/hooks/useToast';
import { Upload, X, FileImage, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesUploaded: (urls: string[]) => void;
  uploadedFiles: string[];
}

export function FileUpload({ onFilesUploaded, uploadedFiles }: FileUploadProps) {
  const { mutateAsync: uploadFile } = useUploadFile();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = acceptedFiles.map(async (file) => {
        // Simulate progress for each file
        const progressIncrement = 100 / acceptedFiles.length;

        try {
          const [[_, url]] = await uploadFile(file);
          setUploadProgress((prev) => prev + progressIncrement);
          return url;
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}. Please try again.`,
            variant: "destructive"
          });
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((url): url is string => url !== null);

      if (successfulUploads.length > 0) {
        const newFiles = [...uploadedFiles, ...successfulUploads];
        onFilesUploaded(newFiles);

        toast({
          title: "Upload Successful! 📸",
          description: `${successfulUploads.length} file(s) uploaded successfully.`,
        });
      }
    } catch {
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [uploadFile, uploadedFiles, onFilesUploaded, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading
  });

  const removeFile = (indexToRemove: number) => {
    const newFiles = uploadedFiles.filter((_, index) => index !== indexToRemove);
    onFilesUploaded(newFiles);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragActive
            ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500",
          uploading && "pointer-events-none opacity-50"
        )}
      >
        <CardContent className="py-12 px-8">
          <input {...getInputProps()} />
          <div className="text-center space-y-4">
            {uploading ? (
              <>
                <Loader2 className="h-12 w-12 mx-auto text-purple-500 animate-spin" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Uploading files...</p>
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                  <p className="text-sm text-muted-foreground">{Math.round(uploadProgress)}% complete</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 mx-auto text-purple-500" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {isDragActive ? "Drop files here..." : "Upload images for your card"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm">
                  <FileImage className="mr-2 h-4 w-4" />
                  Choose Files
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Uploaded Images ({uploadedFiles.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedFiles.map((url, index) => (
              <div key={index} className="relative group">
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-square relative">
                      <img
                        src={url}
                        alt={`Uploaded image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}