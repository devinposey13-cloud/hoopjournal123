import { useState, useRef } from 'react';
import { Upload, Plus, Video, Loader2, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface AddClipDialogProps {
  onAddClip: (file: File, title: string, description?: string, isPublic?: boolean) => Promise<any>;
}

export function AddClipDialog({ onAddClip }: AddClipDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Please upload a video under 100MB.');
      e.target.value = '';
      return;
    }
    
    setVideoFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;

    setUploading(true);
    try {
      await onAddClip(videoFile, title || 'Untitled Clip', description || undefined, isPublic);
      setOpen(false);
      setTitle('');
      setDescription('');
      setVideoFile(null);
      setIsPublic(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Upload Clip
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upload Video Clip</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {videoFile ? (
              <div className="space-y-2">
                <Video className="w-10 h-10 mx-auto text-primary" />
                <p className="text-sm font-medium">{videoFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload video
                </p>
                <p className="text-xs text-muted-foreground">
                  MP4, MOV, or WebM (Max 100MB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Game-winning shot vs Eagles"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context about this clip..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Globe className="w-4 h-4 text-primary" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
              <div>
                <Label htmlFor="public-toggle" className="text-sm font-medium cursor-pointer">
                  {isPublic ? 'Public' : 'Private'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? 'Anyone can see this clip in Explore' : 'Only you can see this clip'}
                </p>
              </div>
            </div>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <Button
            type="submit"
            disabled={!videoFile || uploading}
            className="w-full gradient-primary font-semibold"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Clip'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
